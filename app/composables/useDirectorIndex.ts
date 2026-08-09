import { collection, doc, getDocs, writeBatch, type DocumentData } from 'firebase/firestore'
import { DIRECTOR_INDEX_DATA } from '~/data/directorIndexData'
import type { DirectorIndexRow, DirectorRole } from '~/types/directorIndex'
import { useUsers } from '~/composables/useUsers'

const COLLECTION = 'directorIndex'

const toRow = (id: string, data: DocumentData): DirectorIndexRow => ({ id, ...data }) as DirectorIndexRow

const currentYearMonth = () => {
  const d = new Date()
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`
}

// ディレクター（サポート者）×組合×役割の検索インデックス。Firestoreのdirector Indexコレクションで管理する
export const useDirectorIndex = () => {
  const { $db } = useNuxtApp()
  const { fetchUsers } = useUsers()

  const rows    = useState<DirectorIndexRow[]>('directorIndex:list', () => [])
  const loaded  = useState<boolean>('directorIndex:loaded', () => false)
  const loading = useState<boolean>('directorIndex:loading', () => false)

  const fetchAll = async (force = false) => {
    if (loaded.value && !force) return
    loading.value = true
    try {
      const snap = await getDocs(collection($db, COLLECTION))
      rows.value = snap.docs.map(d => toRow(d.id, d.data()))
      loaded.value = true
    } finally {
      loading.value = false
    }
  }

  // 添付Excel（検索インデックスシート）から生成した静的データをFirestoreへ一括投入する初回移行処理
  const seedFromStatic = async (): Promise<number> => {
    const chunkSize = 400
    let count = 0
    for (let i = 0; i < DIRECTOR_INDEX_DATA.length; i += chunkSize) {
      const batch = writeBatch($db)
      const chunk = DIRECTOR_INDEX_DATA.slice(i, i + chunkSize)
      for (const row of chunk) {
        const { id, ...rest } = row
        batch.set(doc($db, COLLECTION, id), rest)
        count++
      }
      await batch.commit()
    }
    await fetchAll(true)
    return count
  }

  // ディレクター名で検索（部分一致）— 組合員一覧からの逆引き用
  const searchByDirector = (name: string): DirectorIndexRow[] => {
    const q = name.trim()
    if (!q) return []
    return rows.value.filter(r => r.directorName.includes(q))
  }

  const directorNames = computed(() => [...new Set(rows.value.map(r => r.directorName))].sort((a, b) => a.localeCompare(b, 'ja')))

  // 申請承認によるメインサポート/サブサポートの設定をディレクター逆引きへ反映する。
  // 同じroleで別のディレクター・組合に担当されていた場合はそちらから外し、
  // 新しい担当（directorName × kumiaiName × role）へ付け替える
  const upsertDirectorAssignment = async (params: {
    directorName: string
    kumiaiName: string
    role: DirectorRole
    memberName: string
  }): Promise<void> => {
    const { directorName, kumiaiName, role, memberName } = params
    if (!directorName?.trim() || !kumiaiName?.trim() || !memberName?.trim()) return

    await fetchAll()

    const batch = writeBatch($db)
    let touched = false

    for (const row of rows.value) {
      if (row.role !== role) continue
      if (row.directorName === directorName && row.kumiaiName === kumiaiName) continue
      if (!row.memberNames.includes(memberName)) continue
      const nextNames = row.memberNames.filter(n => n !== memberName)
      if (nextNames.length === 0) {
        batch.delete(doc($db, COLLECTION, row.id))
      } else {
        batch.update(doc($db, COLLECTION, row.id), { memberNames: nextNames })
      }
      touched = true
    }

    const existing = rows.value.find(r => r.role === role && r.directorName === directorName && r.kumiaiName === kumiaiName)
    if (existing) {
      if (!existing.memberNames.includes(memberName)) {
        batch.update(doc($db, COLLECTION, existing.id), {
          memberNames: [...existing.memberNames, memberName],
          yearMonth:   currentYearMonth(),
        })
        touched = true
      }
    } else {
      const newRef = doc(collection($db, COLLECTION))
      batch.set(newRef, {
        yearMonth:   currentYearMonth(),
        directorName,
        kumiaiName,
        role,
        memberNames: [memberName],
      })
      touched = true
    }

    if (touched) {
      await batch.commit()
      await fetchAll(true)
    }
  }

  // 組合員の脱退が承認された際、ディレクター逆引きの担当メンバー一覧から名前を除外する。
  // 除外した結果メンバーが0人になった行は削除する
  const removeMemberFromIndex = async (memberName: string): Promise<void> => {
    if (!memberName?.trim()) return

    await fetchAll()

    const batch = writeBatch($db)
    let touched = false

    for (const row of rows.value) {
      if (!row.memberNames.includes(memberName)) continue
      const nextNames = row.memberNames.filter(n => n !== memberName)
      if (nextNames.length === 0) {
        batch.delete(doc($db, COLLECTION, row.id))
      } else {
        batch.update(doc($db, COLLECTION, row.id), { memberNames: nextNames })
      }
      touched = true
    }

    if (touched) {
      await batch.commit()
      await fetchAll(true)
    }
  }

  // 過去（本機能追加前）に脱退承認されたメンバーが、ディレクター逆引きに
  // 残ったままになっているケースの一括クリーンアップ（管理画面から手動実行）
  const cleanupWithdrawnMembers = async (): Promise<{ removedNames: string[]; touchedRows: number }> => {
    const users = await fetchUsers()
    const withdrawnNames = new Set(users.filter(u => u.isWithdrawn).map(u => u.displayName).filter(Boolean))

    await fetchAll()

    const batch = writeBatch($db)
    const removedNames = new Set<string>()
    let touchedRows = 0

    for (const row of rows.value) {
      const nextNames = row.memberNames.filter(n => !withdrawnNames.has(n))
      if (nextNames.length === row.memberNames.length) continue
      row.memberNames.filter(n => withdrawnNames.has(n)).forEach(n => removedNames.add(n))
      if (nextNames.length === 0) {
        batch.delete(doc($db, COLLECTION, row.id))
      } else {
        batch.update(doc($db, COLLECTION, row.id), { memberNames: nextNames })
      }
      touchedRows++
    }

    if (touchedRows > 0) {
      await batch.commit()
      await fetchAll(true)
    }

    return { removedNames: [...removedNames], touchedRows }
  }

  return {
    rows, loading, loaded, fetchAll, seedFromStatic, searchByDirector, directorNames,
    upsertDirectorAssignment, removeMemberFromIndex, cleanupWithdrawnMembers,
  }
}
