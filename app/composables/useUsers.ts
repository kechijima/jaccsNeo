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
  type DocumentData,
} from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import type { AppUser, UserRole, SpecialTeam, GroupId } from '~/types/user'
import { useAuthStore } from '~/stores/auth'

const toUser = (id: string, data: DocumentData): AppUser => ({
  uid:          id,
  email:        data.email ?? '',
  displayName:  data.displayName ?? '',
  avatarUrl:    data.avatarUrl,
  role:         data.role ?? 'general',
  specialTeams: data.specialTeams ?? [],
  groupId:      data.groupId,
  kumiaiId:     data.kumiaiId,
  position:     data.position,
  isActive:     data.isActive ?? true,
  createdAt:    data.createdAt?.toDate?.() ?? new Date(),
  updatedAt:    data.updatedAt?.toDate?.() ?? new Date(),
})

export const useUsers = () => {
  const { $db, $functions } = useNuxtApp()
  const authStore = useAuthStore()

  const usersCol = () => collection($db, 'users')

  // ===== 全ユーザー一覧 =====
  const fetchUsers = async (): Promise<AppUser[]> => {
    const q = query(usersCol(), orderBy('displayName', 'asc'))
    const snap = await getDocs(q)
    return snap.docs.map(d => toUser(d.id, d.data()))
  }

  // ===== グループ別ユーザー =====
  const fetchUsersByGroup = async (groupId: GroupId): Promise<AppUser[]> => {
    const q = query(usersCol(), where('groupId', '==', groupId), orderBy('displayName', 'asc'))
    const snap = await getDocs(q)
    return snap.docs.map(d => toUser(d.id, d.data()))
  }

  // ===== 組合別ユーザー =====
  const fetchUsersByKumiai = async (kumiaiId: string): Promise<AppUser[]> => {
    const q = query(usersCol(), where('kumiaiId', '==', kumiaiId), orderBy('displayName', 'asc'))
    const snap = await getDocs(q)
    return snap.docs.map(d => toUser(d.id, d.data()))
  }

  // ===== 1件取得 =====
  const fetchUser = async (uid: string): Promise<AppUser | null> => {
    const snap = await getDoc(doc($db, 'users', uid))
    if (!snap.exists()) return null
    return toUser(snap.id, snap.data())
  }

  // ===== ユーザー情報更新（Firestoreのみ） =====
  const updateUser = async (uid: string, data: {
    displayName?: string
    role?: UserRole
    specialTeams?: SpecialTeam[]
    groupId?: GroupId | null
    kumiaiId?: string | null
    position?: string | null
    isDisabled?: boolean
  }): Promise<void> => {
    if (!authStore.isSystemAdmin) throw new Error('権限がありません')
    await updateDoc(doc($db, 'users', uid), {
      ...data,
      updatedBy: authStore.user?.uid,
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
    createAuthUser,
  }
}
