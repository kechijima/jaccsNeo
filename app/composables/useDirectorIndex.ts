import { collection, doc, getDocs, writeBatch, type DocumentData } from 'firebase/firestore'
import { DIRECTOR_INDEX_DATA } from '~/data/directorIndexData'
import type { DirectorIndexRow } from '~/types/directorIndex'

const COLLECTION = 'directorIndex'

const toRow = (id: string, data: DocumentData): DirectorIndexRow => ({ id, ...data }) as DirectorIndexRow

// ディレクター（サポート者）×組合×役割の検索インデックス。Firestoreのdirector Indexコレクションで管理する
export const useDirectorIndex = () => {
  const { $db } = useNuxtApp()

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

  return { rows, loading, loaded, fetchAll, seedFromStatic, searchByDirector, directorNames }
}
