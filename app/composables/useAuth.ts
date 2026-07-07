import {
  signInWithEmailAndPassword,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  type User as FirebaseUser,
} from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { useAuthStore } from '~/stores/auth'
import type { AppUser } from '~/types/user'

// モックセッションの保存キー（リロードしてもログイン状態を維持する）
const MOCK_SESSION_KEY = 'jaccsneo:mock-session'

export const useAuth = () => {
  const authStore = useAuthStore()
  const router = useRouter()

  // Firestoreからユーザー情報を取得
  const fetchUserDoc = async (firebaseUser: FirebaseUser): Promise<AppUser | null> => {
    const { $db } = useNuxtApp()
    const ref = doc($db, 'users', firebaseUser.uid)
    const snap = await getDoc(ref)
    if (!snap.exists()) return null

    const data = snap.data()
    return {
      uid:          firebaseUser.uid,
      email:        firebaseUser.email ?? '',
      displayName:  data.displayName ?? firebaseUser.displayName ?? '',
      avatarUrl:    data.avatarUrl,
      role:         data.role ?? 'general',
      specialTeams: data.specialTeams ?? [],
      groupId:      data.groupId,
      kumiaiId:     data.kumiaiId,
      position:     data.position,
      createdAt:    data.createdAt?.toDate?.() ?? new Date(),
      updatedAt:    data.updatedAt?.toDate?.() ?? new Date(),
    }
  }

  // Firebase Storage/Firestoreのセキュリティルール（認証必須）を満たすため
  // 匿名認証でFirebaseセッションを確立する（失敗・応答なしでもモック動作は継続）
  const ensureAnonymousAuth = async () => {
    try {
      const { $auth } = useNuxtApp()
      if ($auth.currentUser) return
      await Promise.race([
        signInAnonymously($auth),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)),
      ])
    } catch (e: any) {
      // Firebase未接続・未設定・タイムアウトでもモック動作は継続するが、
      // Storage等の認証必須操作が失敗する原因になるためコンソールには残す
      // （例: Firebaseコンソールで匿名認証プロバイダが無効になっていると
      //   auth/admin-restricted-operation や auth/operation-not-allowed になる）
      console.warn('匿名認証に失敗しました（Firebase Storageへのアップロード等が失敗する可能性があります）:', e?.code ?? e)
    }
  }

  // localStorage からモックセッションを復元
  const restoreMockSession = (): AppUser | null => {
    if (!import.meta.client) return null
    try {
      const saved = localStorage.getItem(MOCK_SESSION_KEY)
      if (!saved) return null
      const user = JSON.parse(saved) as AppUser
      user.createdAt = new Date(user.createdAt)
      user.updatedAt = new Date(user.updatedAt)
      return user
    } catch {
      localStorage.removeItem(MOCK_SESSION_KEY)
      return null
    }
  }

  // 認証状態の監視（アプリ起動時に一度だけ呼ぶ）
  const initAuth = () => {
    // モックセッションがあれば即復元（リロードでログインが切れないように）
    const mockSession = restoreMockSession()
    if (mockSession) {
      authStore.setUser(mockSession)
      authStore.setInitialized(true)
      // 匿名認証が未確立のセッション（例: 匿名認証を有効化する前にログインしていた場合）
      // でも次回アクセス時に自動で確立されるようにする。初期化はブロックしない。
      ensureAnonymousAuth()
      return Promise.resolve()
    }

    const { $auth } = useNuxtApp()
    return new Promise<void>((resolve) => {
      // Firebaseに接続できない場合でもスプラッシュ画面で固まらないようにタイムアウトを設ける
      const timeout = setTimeout(() => {
        authStore.setInitialized(true)
        resolve()
      }, 3000)

      onAuthStateChanged($auth, async (firebaseUser) => {
        clearTimeout(timeout)
        if (firebaseUser) {
          const user = await fetchUserDoc(firebaseUser)
          authStore.setUser(user)
        } else {
          authStore.setUser(null)
        }
        authStore.setInitialized(true)
        resolve()
      })
    })
  }

  // ログイン (モック版)
  const login = async (email: string, _password: string) => {
    authStore.setLoading(true)
    try {
      // モックアップ用に認証をスキップし、ダミーユーザーをセットして強制遷移
      const mockUser: AppUser = {
        uid: 'mock-user-123',
        email: email || 'test@example.com',
        displayName: 'テストユーザー',
        role: 'system_admin',
        specialTeams: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      authStore.setUser(mockUser)
      // セッションを保存してリロード後もログイン状態を維持する
      if (import.meta.client) {
        localStorage.setItem(MOCK_SESSION_KEY, JSON.stringify(mockUser))
      }
      await ensureAnonymousAuth()
      await router.push('/dashboard')
    } finally {
      authStore.setLoading(false)
    }
  }

  // ログアウト
  const logout = async () => {
    // モックセッションを破棄
    if (import.meta.client) {
      localStorage.removeItem(MOCK_SESSION_KEY)
    }
    // Firebaseサインアウトは失敗してもログアウト処理を続行する
    try {
      const { $auth } = useNuxtApp()
      await signOut($auth)
    } catch {
      // Firebase未接続でも無視
    }
    authStore.setUser(null)
    await router.push('/login')
  }

  // パスワードリセットメール送信
  const sendPasswordReset = async (email: string) => {
    const { $auth } = useNuxtApp()
    await sendPasswordResetEmail($auth, email)
  }

  return {
    login,
    logout,
    initAuth,
    sendPasswordReset,
  }
}
