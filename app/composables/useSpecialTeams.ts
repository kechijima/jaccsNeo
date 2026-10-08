import {
  collection, doc, getDocs, addDoc, setDoc, deleteDoc,
  serverTimestamp, type DocumentData,
} from 'firebase/firestore'
import type { SpecialTeamDef, SpecialTeamForm } from '~/types/specialTeam'
import { useAuthStore } from '~/stores/auth'

const COLLECTION = 'specialTeams'

// 従来からベタ打ちで存在していた2チーム。DB化前からAppUser.specialTeamsに
// 'real_estate' / 'non_life_insurance' という文字列で保存されているため、
// 同じIDでドキュメントを補うことで、既存ユーザーの所属データをそのまま
// 引き継げるようにする（Firestoreに未登録の場合のみ既定名で補う）
const DEFAULT_TEAMS: { id: string; name: string }[] = [
  { id: 'real_estate',       name: '不動産チーム（未来設計ハウジング）' },
  { id: 'non_life_insurance', name: '損保チーム' },
]

const toTeam = (id: string, data: DocumentData): SpecialTeamDef => ({
  id,
  name:        data.name ?? id,
  description: data.description,
  createdAt:   data.createdAt,
  updatedAt:   data.updatedAt,
})

export const useSpecialTeams = () => {
  const { $db } = useNuxtApp()
  const authStore = useAuthStore()

  const teamsCol = () => collection($db, COLLECTION)

  const fetchAll = async (): Promise<SpecialTeamDef[]> => {
    const snap = await getDocs(teamsCol())
    const rows = snap.docs.map(d => toTeam(d.id, d.data()))
    const fetchedIds = new Set(rows.map(r => r.id))
    for (const def of DEFAULT_TEAMS) {
      if (fetchedIds.has(def.id)) continue
      rows.push({ id: def.id, name: def.name, createdAt: null as any, updatedAt: null as any })
    }
    return rows
  }

  const createTeam = async (form: SpecialTeamForm): Promise<string> => {
    if (!authStore.isBoard) throw new Error('権限がありません')
    const ref = await addDoc(teamsCol(), {
      name:        form.name,
      description: form.description || undefined,
      createdAt:   serverTimestamp(),
      updatedAt:   serverTimestamp(),
    })
    return ref.id
  }

  // 既定2チーム（real_estate/non_life_insurance）はFirestoreに未登録の場合があるため、
  // 存在前提のupdateDocではなくmerge:trueのsetDocで作成・更新どちらにも対応する
  const updateTeam = async (id: string, form: SpecialTeamForm): Promise<void> => {
    if (!authStore.isBoard) throw new Error('権限がありません')
    await setDoc(doc($db, COLLECTION, id), {
      name:        form.name,
      description: form.description || '',
      updatedAt:   serverTimestamp(),
    }, { merge: true })
  }

  const deleteTeam = async (id: string): Promise<void> => {
    if (!authStore.isBoard) throw new Error('権限がありません')
    await deleteDoc(doc($db, COLLECTION, id))
  }

  return { fetchAll, createTeam, updateTeam, deleteTeam }
}
