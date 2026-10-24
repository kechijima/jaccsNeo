import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore'
import type { Group, Kumiai } from '~/types/group'
import type { GroupId } from '~/types/user'
import { useAuthStore } from '~/stores/auth'
import { useOperationLog } from '~/composables/useOperationLog'

// 従来から使用している3グループ。Firestoreにドキュメントがまだ無くても
// 一覧から消えないよう、見つからない場合はデフォルト名で補う
const DEFAULT_GROUPS: { id: GroupId; name: string }[] = [
  { id: 'reterace', name: 'Reterace' },
  { id: 'miraito', name: 'Miraito' },
  { id: 'asset', name: 'Asset' },
]

export const useGroups = () => {
  const { $db } = useNuxtApp()
  const authStore = useAuthStore()

  const groupsCol = () => collection($db, 'groups')
  const kumiaiCol = (groupId: GroupId) => collection($db, 'groups', groupId, 'kumiai')

  // グループ・組合一覧は多くの画面から呼ばれ、各グループごとにkumiaiサブコレクションも
  // 読み取るため、セッション内でキャッシュしてFirestoreの読み取り回数を抑える
  // （Firebaseの課金は読み取り件数に比例するため）。グループ・組合を変更する操作の後は
  // キャッシュを無効化し、次回のfetchGroups呼び出しで最新データを取り直す
  const groupsCache = useState<Group[]>('groups:list', () => [])
  const groupsCacheLoaded = useState<boolean>('groups:loaded', () => false)
  const invalidateGroupsCache = () => { groupsCacheLoaded.value = false }

  // ===== 全グループ・組合取得（Firestoreに登録された全グループ + 未登録の既定3グループ） =====
  const fetchGroups = async (force = false): Promise<Group[]> => {
    if (groupsCacheLoaded.value && !force) return groupsCache.value
    const groupsSnap = await getDocs(groupsCol())
    const fetchedIds = new Set(groupsSnap.docs.map(d => d.id))

    const rows = await Promise.all(groupsSnap.docs.map(async (gDoc) => {
      const data = gDoc.data()
      const kumiaiSnap = await getDocs(query(kumiaiCol(gDoc.id), orderBy('displayOrder', 'asc')))
      const kumiai: Kumiai[] = kumiaiSnap.docs.map(d => ({ id: d.id, groupId: gDoc.id, ...d.data() }) as Kumiai)
      return {
        id: gDoc.id,
        name: data.name ?? gDoc.id,
        color: gDoc.id,
        kumiai,
        memberCount: 0,
      } as Group
    }))

    // 既定3グループでFirestoreに未登録のものを補う
    for (const def of DEFAULT_GROUPS) {
      if (fetchedIds.has(def.id)) continue
      const kumiaiSnap = await getDocs(query(kumiaiCol(def.id), orderBy('displayOrder', 'asc')))
      const kumiai: Kumiai[] = kumiaiSnap.docs.map(d => ({ id: d.id, groupId: def.id, ...d.data() }) as Kumiai)
      rows.push({ id: def.id, name: def.name, color: def.id, kumiai, memberCount: 0 })
    }

    const order = DEFAULT_GROUPS.map(g => g.id)
    rows.sort((a, b) => {
      const ai = order.indexOf(a.id), bi = order.indexOf(b.id)
      if (ai >= 0 && bi >= 0) return ai - bi
      if (ai >= 0) return -1
      if (bi >= 0) return 1
      return a.name.localeCompare(b.name, 'ja')
    })
    groupsCache.value = rows
    groupsCacheLoaded.value = true
    return rows
  }

  // ===== グループ作成 =====
  const createGroup = async (name: string): Promise<string> => {
    if (!authStore.isBoard) throw new Error('権限がありません')
    const ref = await addDoc(groupsCol(), {
      name,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    useOperationLog().log('group_create', name).catch(() => {})
    invalidateGroupsCache()
    return ref.id
  }

  // ===== グループ更新（名称） =====
  const updateGroup = async (groupId: GroupId, data: { name?: string }): Promise<void> => {
    if (!authStore.isBoard) throw new Error('権限がありません')
    await setDoc(doc($db, 'groups', groupId), {
      ...data,
      updatedAt: serverTimestamp(),
    }, { merge: true })
    invalidateGroupsCache()
  }

  // ===== 組合一覧（グループ指定） =====
  const fetchKumiai = async (groupId: GroupId): Promise<Kumiai[]> => {
    const q = query(kumiaiCol(groupId), orderBy('displayOrder', 'asc'))
    const snap = await getDocs(q)
    return snap.docs.map(d => ({ id: d.id, groupId, ...d.data() }) as Kumiai)
  }

  // ===== 組合作成 =====
  const createKumiai = async (
    groupId: GroupId,
    data: { name: string; adminName?: string; status?: 'preparatory' | 'active' },
    displayOrder = 0,
  ): Promise<string> => {
    if (!authStore.isBoard) throw new Error('権限がありません')
    const ref = await addDoc(kumiaiCol(groupId), {
      groupId,
      name: data.name,
      adminName: data.adminName ?? '',
      status: data.status ?? 'active',
      displayOrder,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    useOperationLog().log('kumiai_create', data.name).catch(() => {})
    invalidateGroupsCache()
    return ref.id
  }

  // ===== 組合更新 =====
  const updateKumiai = async (
    groupId: GroupId,
    kumiaiId: string,
    data: { name?: string; adminName?: string; displayOrder?: number; isDissolved?: boolean; status?: 'preparatory' | 'active' },
  ): Promise<void> => {
    if (!authStore.isBoard) throw new Error('権限がありません')
    await updateDoc(doc($db, 'groups', groupId, 'kumiai', kumiaiId), {
      ...data,
      ...(data.isDissolved ? { dissolvedAt: serverTimestamp() } : {}),
      updatedAt: serverTimestamp(),
    })
    if (data.isDissolved) {
      useOperationLog().log('kumiai_dissolve', `${groupId}/${kumiaiId}`).catch(() => {})
    }
    invalidateGroupsCache()
  }

  // ===== 組合削除 =====
  const deleteKumiai = async (groupId: GroupId, kumiaiId: string): Promise<void> => {
    if (!authStore.isBoard) throw new Error('権限がありません')
    await deleteDoc(doc($db, 'groups', groupId, 'kumiai', kumiaiId))
    invalidateGroupsCache()
  }

  return {
    fetchGroups,
    createGroup,
    updateGroup,
    fetchKumiai,
    createKumiai,
    updateKumiai,
    deleteKumiai,
  }
}
