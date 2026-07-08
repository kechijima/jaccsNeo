import {
  collection, doc, getDocs, addDoc, updateDoc,
  serverTimestamp, writeBatch, type DocumentData,
} from 'firebase/firestore'
import { LIFE_INSURANCE_CASES } from '~/data/lifeInsuranceData'
import type { LifeInsuranceCase, LifeInsuranceCaseInput } from '~/types/lifeInsurance'

const COLLECTION = 'lifeInsuranceCases'

const toDate = (val: any): Date =>
  val?.toDate?.() ?? (val instanceof Date ? val : new Date())

const toCase = (id: string, data: DocumentData): LifeInsuranceCase => ({
  id,
  ...data,
  createdAt: toDate(data.createdAt),
  updatedAt: toDate(data.updatedAt),
}) as LifeInsuranceCase

export const useLifeInsuranceCases = () => {
  const { $db } = useNuxtApp()

  const cases   = useState<LifeInsuranceCase[]>('lifeInsuranceCases:list', () => [])
  const loaded  = useState<boolean>('lifeInsuranceCases:loaded', () => false)
  const loading = useState<boolean>('lifeInsuranceCases:loading', () => false)

  // Firestoreから案件一覧を取得（一度取得すればSPAセッション内はキャッシュを使う）
  const fetchAll = async (force = false) => {
    if (loaded.value && !force) return
    loading.value = true
    try {
      const snap = await getDocs(collection($db, COLLECTION))
      cases.value = snap.docs.map(d => toCase(d.id, d.data()))
      loaded.value = true
    } finally {
      loading.value = false
    }
  }

  const getByCustomerId = (customerId: Ref<string> | string) =>
    computed(() => cases.value.filter(c => c.customerId === unref(customerId)))

  const getById = (id: Ref<string> | string) =>
    computed(() => cases.value.find(c => c.id === unref(id)) ?? null)

  const create = async (input: LifeInsuranceCaseInput): Promise<string> => {
    const ref = await addDoc(collection($db, COLLECTION), {
      ...input,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    const now = new Date()
    cases.value = [{ id: ref.id, ...input, createdAt: now, updatedAt: now }, ...cases.value]
    return ref.id
  }

  const update = async (id: string, patch: Partial<LifeInsuranceCaseInput>): Promise<void> => {
    await updateDoc(doc($db, COLLECTION, id), { ...patch, updatedAt: serverTimestamp() })
    const idx = cases.value.findIndex(c => c.id === id)
    if (idx >= 0) cases.value[idx] = { ...cases.value[idx], ...patch, updatedAt: new Date() }
  }

  // kintone CSVから取り込んだ既存61件をFirestoreへ一括投入する初回移行処理（管理者操作）
  const seedFromStatic = async (): Promise<number> => {
    const chunkSize = 400 // Firestoreの1バッチ上限（500件）未満に収める
    let count = 0
    for (let i = 0; i < LIFE_INSURANCE_CASES.length; i += chunkSize) {
      const batch = writeBatch($db)
      const chunk = LIFE_INSURANCE_CASES.slice(i, i + chunkSize)
      for (const c of chunk) {
        const { id, ...rest } = c
        batch.set(doc($db, COLLECTION, id), rest)
        count++
      }
      await batch.commit()
    }
    await fetchAll(true)
    return count
  }

  return { cases, loading, loaded, fetchAll, getByCustomerId, getById, create, update, seedFromStatic }
}
