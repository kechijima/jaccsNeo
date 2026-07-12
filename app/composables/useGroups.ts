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

  // ===== 全グループ・組合取得（Firestoreに登録された全グループ + 未登録の既定3グループ） =====
  const fetchGroups = async (): Promise<Group[]> => {
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
    return rows
  }

  // ===== グループ作成 =====
  const createGroup = async (name: string): Promise<string> => {
    if (!authStore.isSystemAdmin) throw new Error('権限がありません')
    const ref = await addDoc(groupsCol(), {
      name,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    return ref.id
  }

  // ===== グループ更新（名称） =====
  const updateGroup = async (groupId: GroupId, data: { name?: string }): Promise<void> => {
    if (!authStore.isSystemAdmin) throw new Error('権限がありません')
    await setDoc(doc($db, 'groups', groupId), {
      ...data,
      updatedAt: serverTimestamp(),
    }, { merge: true })
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
    data: { name: string; adminName?: string },
    displayOrder = 0,
  ): Promise<string> => {
    if (!authStore.isSystemAdmin) throw new Error('権限がありません')
    const ref = await addDoc(kumiaiCol(groupId), {
      groupId,
      name: data.name,
      adminName: data.adminName ?? '',
      displayOrder,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    return ref.id
  }

  // ===== 組合更新 =====
  const updateKumiai = async (
    groupId: GroupId,
    kumiaiId: string,
    data: { name?: string; adminName?: string; displayOrder?: number },
  ): Promise<void> => {
    if (!authStore.isSystemAdmin) throw new Error('権限がありません')
    await updateDoc(doc($db, 'groups', groupId, 'kumiai', kumiaiId), {
      ...data,
      updatedAt: serverTimestamp(),
    })
  }

  // ===== 組合削除 =====
  const deleteKumiai = async (groupId: GroupId, kumiaiId: string): Promise<void> => {
    if (!authStore.isSystemAdmin) throw new Error('権限がありません')
    await deleteDoc(doc($db, 'groups', groupId, 'kumiai', kumiaiId))
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
