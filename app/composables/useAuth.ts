import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  type User as FirebaseUser,
} from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { useAuthStore } from '~/stores/auth'
import type { AppUser } from '~/types/user'
import { toAppUser } from '~/utils/userMapper'

// 前回ログイン時のプロフィールをlocalStorageにキャッシュし、次回起動時は
// Firebaseからの応答を待たずに即座に画面を描画できるようにする
// （体感速度の改善。バックグラウンドで実際の認証状態を確認し、ずれがあれば補正する）
const CACHED_USER_KEY = 'jaccsneo:cached-user'

const cacheUser = (user: AppUser | null) => {
  try {
    if (user) localStorage.setItem(CACHED_USER_KEY, JSON.stringify(user))
    else localStorage.removeItem(CACHED_USER_KEY)
  } catch {
    // プライベートブラウズ等でlocalStorageが使えない場合は無視する
  }
}

const getCachedUser = (): AppUser | null => {
  try {
    const raw = localStorage.getItem(CACHED_USER_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    parsed.createdAt = parsed.createdAt ? new Date(parsed.createdAt) : new Date()
    parsed.updatedAt = parsed.updatedAt ? new Date(parsed.updatedAt) : new Date()
    return parsed as AppUser
  } catch {
    return null
  }
}

export const useAuth = () => {
  const authStore = useAuthStore()
  const router = useRouter()
  const route = useRoute()

  // Firestoreからユーザー情報を取得
  const fetchUserDoc = async (firebaseUser: FirebaseUser): Promise<AppUser | null> => {
    const { $db } = useNuxtApp()
    const ref = doc($db, 'users', firebaseUser.uid)
    const snap = await getDoc(ref)
    if (!snap.exists()) return null

    const data = snap.data()
    const user = toAppUser(firebaseUser.uid, data, firebaseUser.email ?? '')
    user.displayName = data.displayName ?? firebaseUser.displayName ?? ''
    return user
  }

  // 認証状態の監視（アプリ起動時に一度だけ呼ぶ）。ログイン・ログアウトの
  // たびにも自動で再発火し続けるため、ユーザー情報の反映はここに一本化している。
  const initAuth = () => {
    const { $auth } = useNuxtApp()

    // キャッシュがあれば即座に反映してスプラッシュを解除する（体感速度改善）。
    // 実際の認証状態はこの後バックグラウンドで確認し、ずれがあれば補正する
    const cached = getCachedUser()
    if (cached) {
      authStore.setUser(cached)
      authStore.setInitialized(true)
    }

    return new Promise<void>((resolve) => {
      // Firebaseからの応答が遅い/届かない場合でもスプラッシュ画面で固まらないよう
      // タイムアウトを設ける。ただしこれはあくまで「応答待ちを諦めてスプラッシュを
      // 解除する」ためのものであり、「ログアウトと確定する」ものではない
      // （confirmedをtrueにしない）。ここでログアウト扱いにしてしまうと、応答が
      // 少し遅いだけの正常なセッションが、画面更新のたびにログイン画面へ
      // 飛ばされてしまう不具合になるため
      const timeout = setTimeout(() => {
        authStore.setInitialized(true)
        resolve()
      }, 4000)

      onAuthStateChanged($auth, async (firebaseUser) => {
        clearTimeout(timeout)
        // fetchUserDocが失敗した場合でも(ネットワーク不調・一時的なFirestoreエラー等)
        // 必ずinitialized/resolveに到達させる。ここが漏れると認証確認を待つ画面
        // （authミドルウェア経由の全ページ）が永久に固まってしまうため
        try {
          if (firebaseUser) {
            const user = await fetchUserDoc(firebaseUser)
            if (user?.isWithdrawn) {
              // 脱退フラグが立ったユーザーは、既存セッションが残っていても強制的に
              // ログアウトさせる（組合員の脱退申請が承認された場合など）
              await signOut($auth)
              authStore.setUser(null)
              cacheUser(null)
            } else {
              authStore.setUser(user)
              cacheUser(user)
            }
          } else {
            authStore.setUser(null)
            cacheUser(null)
          }
          // Firebaseから実際に応答を受け取れた場合のみ「確定」とする
          authStore.setConfirmed(true)
        } catch (e) {
          console.error('ユーザー情報の取得に失敗しました', e)
          // キャッシュから復元できていた場合、単なる通信エラーでログアウト扱いにしない
          if (!cached) authStore.setUser(null)
          authStore.setConfirmed(true)
        } finally {
          authStore.setInitialized(true)
          resolve()
        }
      })
    })
  }

  // ログイン
  const login = async (email: string, password: string) => {
    authStore.setLoading(true)
    try {
      const { $auth } = useNuxtApp()
      const credential = await signInWithEmailAndPassword($auth, email, password)
      const user = await fetchUserDoc(credential.user)
      if (!user) {
        await signOut($auth)
        throw { code: 'app/profile-not-found' }
      }
      if (user.isWithdrawn) {
        await signOut($auth)
        throw { code: 'app/withdrawn' }
      }
      authStore.setUser(user)
      authStore.setConfirmed(true)
      cacheUser(user)
      const redirect = route.query.redirect
      const target = typeof redirect === 'string' && redirect.startsWith('/') && !redirect.startsWith('//')
        ? redirect
        : '/dashboard'
      await router.push(target)
    } finally {
      authStore.setLoading(false)
    }
  }

  // ログアウト
  const logout = async () => {
    const { $auth } = useNuxtApp()
    await signOut($auth)
    authStore.setUser(null)
    cacheUser(null)
    await router.push('/login')
  }

  // パスワード設定/リセットメール送信。
  // メール自体の文言（件名・本文）はFirebase Consoleのメールテンプレートで管理されており
  // アプリのコードからは変更できないが、パスワード設定完了後にアプリへ戻れるよう
  // continueUrlを指定する（Firebaseのパスワード設定完了ページに「続行」リンクが表示される）
  const sendPasswordReset = async (email: string) => {
    const { $auth } = useNuxtApp()
    await sendPasswordResetEmail($auth, email, {
      url: `${window.location.origin}/login`,
    })
  }

  return {
    login,
    logout,
    initAuth,
    sendPasswordReset,
  }
}
