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
  // 新しい担当（directorUid × kumiaiName × role）へ付け替える。
  // 同姓同名の取り違えを防ぐため、ディレクター・メンバーともuidで判定することを基本とし、
  // uidが記録されていない過去データ（静的移行分）のみ従来通り名前で判定する
  const upsertDirectorAssignment = async (params: {
    directorUid: string
    directorName: string
    kumiaiName: string
    role: DirectorRole
    memberUid: string
    memberName: string
  }): Promise<void> => {
    const { directorUid, directorName, kumiaiName, role, memberUid, memberName } = params
    if (!directorUid || !directorName?.trim() || !kumiaiName?.trim() || !memberUid || !memberName?.trim()) return

    await fetchAll()

    const batch = writeBatch($db)
    let touched = false

    // 既存行はuidが記録されていればuidで、無ければ従来通り名前で特定する
    // （同じ判定基準を除外ループ・既存行検索の両方で使い、同一行を「別の担当」と
    // 誤認して削除対象にしてしまわないようにする。uidが記録されていない過去データ
    // （静的移行分）だけがdirectorNameでの判定対象になる）
    const isSameTarget = (row: DirectorIndexRow) =>
      row.kumiaiName === kumiaiName && (row.directorUid ? row.directorUid === directorUid : row.directorName === directorName)

    // 別の担当（ディレクター・組合）に付いていた場合はそちらから外す
    for (const row of rows.value) {
      if (row.role !== role) continue
      if (isSameTarget(row)) continue
      const matchedByUid = (row.memberUids ?? []).includes(memberUid)
      const matchedByName = row.memberNames.includes(memberName)
      if (!matchedByUid && !matchedByName) continue
      const nextNames = row.memberNames.filter(n => n !== memberName)
      const nextUids = (row.memberUids ?? []).filter(u => u !== memberUid)
      if (nextNames.length === 0) {
        batch.delete(doc($db, COLLECTION, row.id))
      } else {
        batch.update(doc($db, COLLECTION, row.id), { memberNames: nextNames, memberUids: nextUids })
      }
      touched = true
    }

    const existing = rows.value.find(r => r.role === role && isSameTarget(r))
    if (existing) {
      const alreadyByUid = (existing.memberUids ?? []).includes(memberUid)
      const alreadyByName = existing.memberNames.includes(memberName)
      if (!alreadyByUid || !alreadyByName) {
        batch.update(doc($db, COLLECTION, existing.id), {
          memberNames: alreadyByName ? existing.memberNames : [...existing.memberNames, memberName],
          memberUids:  alreadyByUid ? (existing.memberUids ?? []) : [...(existing.memberUids ?? []), memberUid],
          directorUid,
          yearMonth:   currentYearMonth(),
        })
        touched = true
      }
    } else {
      const newRef = doc(collection($db, COLLECTION))
      batch.set(newRef, {
        yearMonth:   currentYearMonth(),
        directorUid,
        directorName,
        kumiaiName,
        role,
        memberNames: [memberName],
        memberUids:  [memberUid],
      })
      touched = true
    }

    if (touched) {
      await batch.commit()
      await fetchAll(true)
    }
  }

  // 組合員の脱退が承認された際、ディレクター逆引きの担当メンバー一覧から除外する。
  // uidが分かっている場合はuidで判定し、同姓同名の別メンバーを誤って除外しないようにする
  // （uidが記録されていない過去データ（静的移行分）は従来通り名前で判定する）
  const removeMemberFromIndex = async (memberUid: string, memberName: string): Promise<void> => {
    if (!memberName?.trim()) return

    await fetchAll()

    const batch = writeBatch($db)
    let touched = false

    for (const row of rows.value) {
      const matchedByUid = !!memberUid && (row.memberUids ?? []).includes(memberUid)
      const matchedByName = row.memberNames.includes(memberName)
      if (!matchedByUid && !matchedByName) continue
      const nextNames = row.memberNames.filter(n => n !== memberName)
      const nextUids = (row.memberUids ?? []).filter(u => u !== memberUid)
      if (nextNames.length === 0) {
        batch.delete(doc($db, COLLECTION, row.id))
      } else {
        batch.update(doc($db, COLLECTION, row.id), { memberNames: nextNames, memberUids: nextUids })
      }
      touched = true
    }

    if (touched) {
      await batch.commit()
      await fetchAll(true)
    }
  }

  // 過去（本機能追加前）に脱退承認されたメンバーが、ディレクター逆引きに
  // 残ったままになっているケースの一括クリーンアップ（管理画面から手動実行）。
  // uidが記録されている行はuidで脱退者を特定し、同姓同名の在籍者を巻き込まないようにする
  // （uidが記録されていない過去データ（静的移行分）のみ従来通り名前で判定する）
  const cleanupWithdrawnMembers = async (): Promise<{ removedNames: string[]; touchedRows: number }> => {
    const users = await fetchUsers()
    const withdrawnUids = new Set(users.filter(u => u.isWithdrawn).map(u => u.uid))
    const withdrawnNames = new Set(users.filter(u => u.isWithdrawn).map(u => u.displayName).filter(Boolean))

    await fetchAll()

    const batch = writeBatch($db)
    const removedNames = new Set<string>()
    let touchedRows = 0

    for (const row of rows.value) {
      const uids = row.memberUids ?? []
      // uidが判明していて、かつ脱退していない（なお在籍中の）メンバーの名前は、
      // 同姓同名の脱退者がいても誤って一緒に除外しないよう保護する
      const activeTrackedNames = new Set(
        uids.filter(u => !withdrawnUids.has(u)).map(uid => users.find(u => u.uid === uid)?.displayName).filter((n): n is string => !!n),
      )
      const nextNames = row.memberNames.filter(n => !withdrawnNames.has(n) || activeTrackedNames.has(n))
      const nextUids = uids.filter(u => !withdrawnUids.has(u))
      if (nextNames.length === row.memberNames.length) continue
      row.memberNames.filter(n => !nextNames.includes(n)).forEach(n => removedNames.add(n))
      if (nextNames.length === 0) {
        batch.delete(doc($db, COLLECTION, row.id))
      } else {
        batch.update(doc($db, COLLECTION, row.id), { memberNames: nextNames, memberUids: nextUids })
      }
      touchedRows++
    }

    if (touchedRows > 0) {
      await batch.commit()
      await fetchAll(true)
    }

    return { removedNames: [...removedNames], touchedRows }
  }

  // 現在のusersコレクション（kumiaiName・mainSupporterUid・subSupporterUid）を正として、
  // ディレクター逆引きインデックスを総点検・再同期する。何らかの理由で反映が漏れていた
  // （例: 対象メンバーに組合が未設定のタイミングで担当設定された等）担当関係を、
  // ユーザーデータの現在値から再構築して埋め合わせる（管理画面から手動実行）
  const resyncAllFromUsers = async (): Promise<{ synced: number; skipped: number }> => {
    const users = await fetchUsers()
    const byUid = new Map(users.map(u => [u.uid, u]))

    let synced = 0
    let skipped = 0
    for (const u of users) {
      if (u.isWithdrawn || !u.kumiaiName) { skipped++; continue }
      for (const role of ['main', 'sub'] as const) {
        const supporterUid = role === 'main' ? u.mainSupporterUid : u.subSupporterUid
        if (!supporterUid) continue
        const director = byUid.get(supporterUid)
        if (!director) continue
        await upsertDirectorAssignment({
          directorUid:  director.uid,
          directorName: director.displayName,
          kumiaiName:   u.kumiaiName,
          role,
          memberUid:    u.uid,
          memberName:   u.displayName,
        })
        synced++
      }
    }
    return { synced, skipped }
  }

  return {
    rows, loading, loaded, fetchAll, seedFromStatic, searchByDirector, directorNames,
    upsertDirectorAssignment, removeMemberFromIndex, cleanupWithdrawnMembers, resyncAllFromUsers,
  }
}
