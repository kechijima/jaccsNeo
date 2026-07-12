import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  query,
  orderBy,
  type DocumentData,
  serverTimestamp,
} from 'firebase/firestore'
import type { Group, Kumiai } from '~/types/group'
import type { GroupId } from '~/types/user'
import { useAuthStore } from '~/stores/auth'

const GROUP_IDS: GroupId[] = ['reterace', 'miraito', 'asset']

const GROUP_NAMES: Record<GroupId, string> = {
  reterace: 'Reterace',
  miraito: 'Miraito',
  asset: 'Asset',
}

const GROUP_COLORS: Record<GroupId, string> = {
  reterace: 'reterace',
  miraito: 'miraito',
  asset: 'asset',
}

export const useGroups = () => {
  const { $db } = useNuxtApp()
  const authStore = useAuthStore()

  const kumiaiCol = (groupId: GroupId) => collection($db, 'groups', groupId, 'kumiai')

  // ===== 全グループ・組合取得（Reterace/Miraito/Asset の3グループ固定） =====
  const fetchGroups = async (): Promise<Group[]> => {
    return Promise.all(GROUP_IDS.map(async (groupId) => {
      const [groupSnap, kumiaiSnap] = await Promise.all([
        getDoc(doc($db, 'groups', groupId)),
        getDocs(query(kumiaiCol(groupId), orderBy('displayOrder', 'asc'))),
      ])
      const groupData = groupSnap.exists() ? groupSnap.data() : {}
      const kumiai: Kumiai[] = kumiaiSnap.docs.map(d => ({ id: d.id, groupId, ...d.data() }) as Kumiai)

      return {
        id: groupId,
        name: groupData.name ?? GROUP_NAMES[groupId],
        color: GROUP_COLORS[groupId],
        kumiai,
        memberCount: groupData.memberCount ?? 0,
      } as Group
    }))
  }

  // ===== グループ更新（名称・メンバー数） =====
  const updateGroup = async (groupId: GroupId, data: { name?: string; memberCount?: number }): Promise<void> => {
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
    data: { name: string; adminName?: string; memberCount?: number },
    displayOrder = 0,
  ): Promise<string> => {
    if (!authStore.isSystemAdmin) throw new Error('権限がありません')
    const ref = await addDoc(kumiaiCol(groupId), {
      groupId,
      name: data.name,
      adminName: data.adminName ?? '',
      memberCount: data.memberCount ?? 0,
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
    data: { name?: string; adminName?: string; memberCount?: number; displayOrder?: number },
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
    updateGroup,
    fetchKumiai,
    createKumiai,
    updateKumiai,
    deleteKumiai,
    GROUP_NAMES,
  }
}
