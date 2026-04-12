import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  orderBy,
  type DocumentData,
  serverTimestamp,
} from 'firebase/firestore'
import type { Group, Kumiai } from '~/types/group'
import type { GroupId } from '~/types/user'
import { useAuthStore } from '~/stores/auth'
import { MOCK_ADMIN_GROUPS } from '~/data/mock'

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

  // ===== 全グループ・組合取得 =====
  const fetchGroups = async (): Promise<Group[]> => {
    try {
      const groupIds: GroupId[] = ['reterace', 'miraito', 'asset']

      const groups = await Promise.all(groupIds.map(async (groupId) => {
        const q = query(kumiaiCol(groupId), orderBy('displayOrder', 'asc'))
        const snap = await getDocs(q)
        const kumiai: Kumiai[] = snap.docs.map(d => ({ id: d.id, groupId, ...d.data() }) as Kumiai)

        return {
          id: groupId,
          name: GROUP_NAMES[groupId],
          color: GROUP_COLORS[groupId],
          kumiai,
          memberCount: 0, // populated separately if needed
        } as Group
      }))

      return groups
    } catch (e) {
      console.warn('Using mock groups')
      return MOCK_ADMIN_GROUPS.map(g => ({
        ...g,
        color: GROUP_COLORS[g.id as GroupId],
        kumiai: g.kumiai.map((k: any) => ({ ...k, groupId: g.id, displayOrder: 0, createdAt: new Date(), updatedAt: new Date() }))
      })) as Group[]
    }
  }

  // ===== 組合一覧（グループ指定） =====
  const fetchKumiai = async (groupId: GroupId): Promise<Kumiai[]> => {
    const q = query(kumiaiCol(groupId), orderBy('displayOrder', 'asc'))
    const snap = await getDocs(q)
    return snap.docs.map(d => ({ id: d.id, groupId, ...d.data() }) as Kumiai)
  }

  // ===== 組合作成 =====
  const createKumiai = async (groupId: GroupId, name: string, displayOrder: number): Promise<string> => {
    if (!authStore.isSystemAdmin) throw new Error('権限がありません')
    const ref = await addDoc(kumiaiCol(groupId), {
      groupId,
      name,
      displayOrder,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    return ref.id
  }

  // ===== 組合更新 =====
  const updateKumiai = async (groupId: GroupId, kumiaiId: string, data: { name?: string; displayOrder?: number }): Promise<void> => {
    if (!authStore.isSystemAdmin) throw new Error('権限がありません')
    await updateDoc(doc($db, 'groups', groupId, 'kumiai', kumiaiId), {
      ...data,
      updatedAt: serverTimestamp(),
    })
  }

  return {
    fetchGroups,
    fetchKumiai,
    createKumiai,
    updateKumiai,
    GROUP_NAMES,
  }
}
