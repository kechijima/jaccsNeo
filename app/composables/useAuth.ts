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
    const user = toAppUser(firebaseUser.uid, data, firebaseUser.email ?? '')
    user.displayName = data.displayName ?? firebaseUser.displayName ?? ''
    return user
  }

  // 認証状態の監視（アプリ起動時に一度だけ呼ぶ）。ログイン・ログアウトの
  // たびにも自動で再発火し続けるため、ユーザー情報の反映はここに一本化している。
  const initAuth = () => {
    const { $auth } = useNuxtApp()
    return new Promise<void>((resolve) => {
      // Firebaseに接続できない場合でもスプラッシュ画面で固まらないようにタイムアウトを設ける
      const timeout = setTimeout(() => {
        authStore.setInitialized(true)
        resolve()
      }, 5000)

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
      authStore.setUser(user)
      await router.push('/dashboard')
    } finally {
      authStore.setLoading(false)
    }
  }

  // ログアウト
  const logout = async () => {
    const { $auth } = useNuxtApp()
    await signOut($auth)
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
