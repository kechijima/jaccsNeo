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

  // 認証状態の監視（アプリ起動時に一度だけ呼ぶ）
  const initAuth = () => {
    const { $auth } = useNuxtApp()
    return new Promise<void>((resolve) => {
      onAuthStateChanged($auth, async (firebaseUser) => {
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
