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
import type { AppUser, UserRole, SpecialTeam, GroupId } from '~/types/user'
import { useAuthStore } from '~/stores/auth'
import { toAppUser } from '~/utils/userMapper'

// ユーザー作成（管理者操作）を使うページはごく一部のため、firebase/functionsは
// 実際に必要になった時点で初めて動的import()する（アプリ起動時のJS実行コストに含めない）
let functionsPromise: Promise<typeof import('firebase/functions')> | null = null
const loadFunctions = () => {
  if (!functionsPromise) functionsPromise = import('firebase/functions')
  return functionsPromise
}

export const useUsers = () => {
  const { $db, $firebase } = useNuxtApp()
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

  // タイトル（役職）のうちEM1〜EM4は、自分がメイン/サブサポーターに指定されている
  // 人数によって自動的に決まる（1人→EM1、2人→EM2、3人→EM3、4人以上→EM4）。
  // Sプラン・Bプランは対象内で、サポート人数が1人以上になったタイミングで自動的に
  // EM*へ上書きする（0人に戻っても自動では戻さない。手動での再設定を想定）。
  // PM*・MM*はEM4到達後に別基準で手動昇格させるタイトルのため、自動上書きの対象外
  // （既にPM*・MM*になっている人は、サポート人数が変わってもタイトルを変更しない）
  const recalcEmTitle = async (uid: string): Promise<void> => {
    if (!uid) return
    const [mainSnap, subSnap] = await Promise.all([
      getDocs(query(usersCol(), where('mainSupporterUid', '==', uid))),
      getDocs(query(usersCol(), where('subSupporterUid', '==', uid))),
    ])
    const supportedUids = new Set([...mainSnap.docs, ...subSnap.docs].map(d => d.id))
    if (supportedUids.size === 0) return
    const newTitle = `EM${Math.min(supportedUids.size, 4)}`
    const current = await getDoc(doc($db, 'users', uid))
    if (!current.exists()) return
    const currentPosition: string = current.data().position ?? ''
    if (currentPosition.startsWith('PM') || currentPosition.startsWith('MM')) return
    if (currentPosition === newTitle) return
    await updateDoc(doc($db, 'users', uid), { position: newTitle, updatedAt: serverTimestamp() })
  }

  // ===== ユーザー情報更新（管理者・理事会専用。役割・所属など） =====
  const updateUser = async (uid: string, data: {
    displayName?: string
    role?: UserRole
    specialTeams?: SpecialTeam[]
    groupId?: GroupId | null
    kumiaiId?: string | null
    kumiaiName?: string | null
    position?: string | null
    isActive?: boolean
    mainSupporterUid?: string | null
    subSupporterUid?: string | null
    membershipPlan?: string | null
    isWithdrawn?: boolean
  }): Promise<void> => {
    if (!authStore.isBoard) throw new Error('権限がありません')

    // メイン/サブサポーターの変更前の値を控えておく（変更後、旧サポーター側の
    // タイトルも再計算するため）
    const touchesSupport = 'mainSupporterUid' in data || 'subSupporterUid' in data
    let prevMainSupporterUid: string | null = null
    let prevSubSupporterUid: string | null = null
    if (touchesSupport) {
      const before = await getDoc(doc($db, 'users', uid))
      if (before.exists()) {
        prevMainSupporterUid = before.data().mainSupporterUid ?? null
        prevSubSupporterUid = before.data().subSupporterUid ?? null
      }
    }

    await updateDoc(doc($db, 'users', uid), {
      ...data,
      // 脱退が確定したユーザーはアカウントも無効化する（ログイン不可・一覧上も「無効」扱い）
      ...(data.isWithdrawn ? { withdrawnAt: serverTimestamp(), isActive: false } : {}),
      updatedBy: authStore.user?.uid,
      updatedAt: serverTimestamp(),
    })

    if (touchesSupport) {
      const affectedUids = new Set(
        [prevMainSupporterUid, prevSubSupporterUid, data.mainSupporterUid, data.subSupporterUid]
          .filter((v): v is string => !!v),
      )
      await Promise.all([...affectedUids].map(recalcEmTitle))
    }
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

  // ===== 他ユーザーのプロフィール更新（システム管理者のみ許可） =====
  const updateUserProfile = async (targetUid: string, data: Record<string, any>): Promise<void> => {
    if (!authStore.isSystemAdmin) throw new Error('権限がありません')
    await updateDoc(doc($db, 'users', targetUid), {
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
    const { getFunctions, httpsCallable } = await loadFunctions()
    // Cloud Functionsのデプロイリージョン（functions/index.jsのsetGlobalOptionsと揃える）
    const functions = getFunctions($firebase, 'asia-northeast1')
    const fn = httpsCallable<typeof data, { uid: string }>(functions, 'createAuthUser')
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
    updateUserProfile,
    createAuthUser,
  }
}
