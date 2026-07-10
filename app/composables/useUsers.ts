import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  orderBy,
  where,
  serverTimestamp,
} from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import type { AppUser, UserRole, SpecialTeam, GroupId } from '~/types/user'
import { useAuthStore } from '~/stores/auth'
import { toAppUser } from '~/utils/userMapper'

export const useUsers = () => {
  const { $db, $functions } = useNuxtApp()
  const authStore = useAuthStore()

  const usersCol = () => collection($db, 'users')

  // ===== 全ユーザー一覧 =====
  const fetchUsers = async (): Promise<AppUser[]> => {
    const q = query(usersCol(), orderBy('displayName', 'asc'))
    const snap = await getDocs(q)
    return snap.docs.map(d => toAppUser(d.id, d.data()))
  }

  // ===== グループ別ユーザー =====
  const fetchUsersByGroup = async (groupId: GroupId): Promise<AppUser[]> => {
    const q = query(usersCol(), where('groupId', '==', groupId), orderBy('displayName', 'asc'))
    const snap = await getDocs(q)
    return snap.docs.map(d => toAppUser(d.id, d.data()))
  }

  // ===== 組合別ユーザー =====
  const fetchUsersByKumiai = async (kumiaiId: string): Promise<AppUser[]> => {
    const q = query(usersCol(), where('kumiaiId', '==', kumiaiId), orderBy('displayName', 'asc'))
    const snap = await getDocs(q)
    return snap.docs.map(d => toAppUser(d.id, d.data()))
  }

  // ===== 1件取得（マイページ・公開プロフィールでも使用） =====
  const fetchUser = async (uid: string): Promise<AppUser | null> => {
    const snap = await getDoc(doc($db, 'users', uid))
    if (!snap.exists()) return null
    return toAppUser(snap.id, snap.data())
  }

  // ===== ユーザー情報更新（管理者専用。役割・所属など） =====
  const updateUser = async (uid: string, data: {
    displayName?: string
    role?: UserRole
    specialTeams?: SpecialTeam[]
    groupId?: GroupId | null
    kumiaiId?: string | null
    position?: string | null
    isDisabled?: boolean
    mainSupporterUid?: string | null
    subSupporterUid?: string | null
  }): Promise<void> => {
    if (!authStore.isSystemAdmin) throw new Error('権限がありません')
    await updateDoc(doc($db, 'users', uid), {
      ...data,
      updatedBy: authStore.user?.uid,
      updatedAt: serverTimestamp(),
    })
  }

  // ===== 自分自身のプロフィール更新（マイページ用。本人のみ許可） =====
  const updateMyProfile = async (data: Record<string, any>): Promise<void> => {
    const uid = authStore.user?.uid
    if (!uid) throw new Error('ログインしてください')
    await updateDoc(doc($db, 'users', uid), {
      ...data,
      updatedBy: uid,
      updatedAt: serverTimestamp(),
    })
  }

  // ===== ユーザー作成（Firebase Auth + Firestoreプロフィール） =====
  // クライアントSDKのcreateUserWithEmailAndPasswordは呼び出した管理者自身の
  // セッションを新規ユーザーに置き換えてしまうため、Admin SDKを使える
  // Cloud Functions（functions/index.js の createAuthUser）経由で作成する。
  const createAuthUser = async (data: {
    email: string
    password: string
    displayName: string
    role: UserRole
    specialTeams: SpecialTeam[]
    groupId?: GroupId | ''
    kumiaiId?: string
    position?: string
  }): Promise<string> => {
    const fn = httpsCallable<typeof data, { uid: string }>($functions, 'createAuthUser')
    const result = await fn(data)
    return result.data.uid
  }

  return {
    fetchUsers,
    fetchUsersByGroup,
    fetchUsersByKumiai,
    fetchUser,
    updateUser,
    updateMyProfile,
    createAuthUser,
  }
}
