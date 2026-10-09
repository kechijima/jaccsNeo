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
import { useOperationLog } from '~/composables/useOperationLog'

export const useAuth = () => {
  const authStore = useAuthStore()
  const router = useRouter()
  const route = useRoute()

  // Firestoreからユーザー情報を取得。
  // F5等でのリロード直後はFirestoreのネットワーク接続がまだ確立していない
  // ことがあり、getDocが一時的に失敗する（client is offline等）ことがある。
  // IndexedDBを無効化しているためオフラインキャッシュへのフォールバックも
  // 効かず、ここで即座にエラーとして諦めるとFirebase Auth自体は復元できて
  // いても「ログアウトした」扱いになってしまっていた（F5更新で時々ログアウト
  // する不具合の一因）。少し待って数回リトライすることでこれを回避する
  const FETCH_USER_RETRY_DELAYS = [500, 1500, 3000]
  const fetchUserDoc = async (firebaseUser: FirebaseUser): Promise<AppUser | null> => {
    const { $db } = useNuxtApp()
    const ref = doc($db, 'users', firebaseUser.uid)

    let snap
    for (let attempt = 0; ; attempt++) {
      try {
        snap = await getDoc(ref)
        break
      } catch (e) {
        if (attempt >= FETCH_USER_RETRY_DELAYS.length) throw e
        console.warn(`ユーザー情報の取得に失敗したためリトライします（${attempt + 1}回目）`, e)
        await new Promise(resolve => setTimeout(resolve, FETCH_USER_RETRY_DELAYS[attempt]))
      }
    }
    if (!snap.exists()) return null

    const data = snap.data()
    const user = toAppUser(firebaseUser.uid, data, firebaseUser.email ?? '')
    user.displayName = data.displayName ?? firebaseUser.displayName ?? ''
    return user
  }

  // 認証状態の監視（アプリ起動時に一度だけ呼ぶ）。ログイン・ログアウトの
  // たびにも自動で再発火し続けるため、ユーザー情報の反映はここに一本化している。
  //
  // セッションはbrowserLocalPersistence（firebase.client.ts、localStorageが
  // 使えない環境ではinMemoryPersistenceへ自動フォールバック）のため、画面更新・
  // アプリの再起動をまたいでもログイン状態は維持される。onAuthStateChangedが
  // 復元されたセッションで再発火するのを待つだけでよく、前回ログイン時の
  // プロフィールを別途localStorageにキャッシュして即座に復元するような処理は
  // 不要（Firebase自身の永続化に任せる）
  const initAuth = () => {
    const { $auth } = useNuxtApp()
    // F5等でのリロード時にログイン状態が復元されない不具合の原因調査用の
    // 一時的な診断ログ。再現時にブラウザの開発者ツール（F12）のConsoleタブに
    // 表示される内容で、実際にどの段階で何が起きているかを特定するために使う
    console.info('[authDiag] initAuth開始', { hasAuth: !!$auth, currentUser: $auth?.currentUser?.uid ?? null, path: window.location.pathname })

    return new Promise<void>((resolve) => {
      // firebase.client.tsのプラグインが何らかの理由で$authを提供できなかった場合
      // （Firebase Authの初期化失敗など）、onAuthStateChanged呼び出し自体が例外を
      // 投げてしまう。未ログインとして扱い、以降の画面（ログイン画面等）は
      // 通常どおり表示できるようにする
      if (!$auth) {
        console.error('Firebase Authが利用できないため、未ログイン状態として扱います')
        authStore.setUser(null)
        authStore.setConfirmed(true)
        authStore.setInitialized(true)
        resolve()
        return
      }

      // Firebaseからの応答が遅い/届かない場合でもスプラッシュ画面で固まらないよう
      // タイムアウトを設ける。ただしここでconfirmedまでtrueにしてしまうと、
      // 復元に4秒以上かかっているだけの正常なセッション（低速回線・Firestoreの
      // 初回応答待ち等）が「確定的にログアウト」と誤判定され、authミドルウェアで
      // ログイン画面へ飛ばされてしまう（F5等の通常リロードで時々ログアウトする
      // 不具合の原因だった）。スプラッシュの解除（initialized）だけ行い、confirmed
      // は実際にonAuthStateChangedから応答が来るまで保留する（遅れて発火した際に
      // 下のfinallyで正しく確定させる）
      const splashTimeout = setTimeout(() => {
        authStore.setInitialized(true)
        resolve()
      }, 4000)

      // 万一onAuthStateChangedが本当に一度も発火しない場合に備え、confirmedも
      // 含めて確定させる最終手段のタイムアウト（無期限ハングの防止）。
      // 4秒のタイムアウトより十分長く取り、復元に時間がかかっているだけの
      // 正常なセッションを誤って未ログイン確定させないようにする
      const hardTimeout = setTimeout(() => {
        authStore.setConfirmed(true)
        authStore.setInitialized(true)
      }, 20000)

      onAuthStateChanged($auth, async (firebaseUser) => {
        clearTimeout(splashTimeout)
        clearTimeout(hardTimeout)
        console.info('[authDiag] onAuthStateChanged発火', { firebaseUserUid: firebaseUser?.uid ?? null })
        // fetchUserDocが失敗した場合でも(ネットワーク不調・一時的なFirestoreエラー等)
        // 必ずinitialized/resolveに到達させる。ここが漏れると認証確認を待つ画面
        // （authミドルウェア経由の全ページ）が永久に固まってしまうため
        try {
          if (firebaseUser) {
            const user = await fetchUserDoc(firebaseUser)
            console.info('[authDiag] fetchUserDoc結果', { found: !!user, isWithdrawn: user?.isWithdrawn ?? null })
            if (user?.isWithdrawn) {
              // 脱退フラグが立ったユーザーは、既存セッションが残っていても強制的に
              // ログアウトさせる（組合員の脱退申請が承認された場合など）
              await signOut($auth)
              authStore.setUser(null)
            } else {
              authStore.setUser(user)
            }
          } else {
            authStore.setUser(null)
          }
        } catch (e) {
          console.error('[authDiag] ユーザー情報の取得に失敗しました', e)
          authStore.setUser(null)
        } finally {
          console.info('[authDiag] 確定', { isLoggedIn: !!authStore.user, uid: authStore.user?.uid ?? null })
          authStore.setConfirmed(true)
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
      useOperationLog().log('login').catch(() => {})
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
    await useOperationLog().log('logout').catch(() => {})
    await signOut($auth)
    authStore.setUser(null)
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

  // メール到達性に依存しないパスワード再設定。迷惑メールフォルダ等に振り分けられて
  // リセットメールが届かず、ログインできなくなるケースへの代替手段として、
  // 登録済みのメールアドレスと生年月日（マイページ等で本人が登録した値）が
  // 一致すれば、メールを使わずその場でパスワードを変更できるようにする。
  // 本人確認と実際のパスワード変更は、未ログインの状態からでも呼び出せる
  // Cloud Functions側（functions/index.js の resetPasswordWithDob、Admin SDK使用）
  // で行う。firebase/functionsはこの機能を使うページ（ログイン画面）でのみ
  // 必要になるため動的import()する
  const resetPasswordWithDob = async (email: string, birthday: string, newPassword: string) => {
    const { $firebase } = useNuxtApp()
    const { getFunctions, httpsCallable } = await import('firebase/functions')
    // Cloud Functionsのデプロイリージョン（functions/index.jsのsetGlobalOptionsと揃える）
    const functions = getFunctions($firebase, 'asia-northeast1')
    const fn = httpsCallable<{ email: string; birthday: string; newPassword: string }, { success: boolean }>(
      functions,
      'resetPasswordWithDob',
    )
    await fn({ email, birthday, newPassword })
  }

  return {
    login,
    logout,
    initAuth,
    sendPasswordReset,
    resetPasswordWithDob,
  }
}
