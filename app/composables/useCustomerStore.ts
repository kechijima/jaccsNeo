import {
  collection, doc, getDocs, addDoc, updateDoc, deleteDoc,
  serverTimestamp, query, orderBy, type DocumentData,
} from 'firebase/firestore'
import type { Customer, CustomerForm } from '~/types/customer'

const COLLECTION = 'customers'

// Firestoreはフィールド値にundefinedを許可せずエラーになるため、送信前に取り除く
const stripUndefined = <T extends Record<string, any>>(obj: T): T => {
  const result = {} as T
  for (const key of Object.keys(obj) as (keyof T)[]) {
    if (obj[key] !== undefined) result[key] = obj[key]
  }
  return result
}

const toCustomer = (id: string, data: DocumentData): Customer => ({
  id,
  ...data,
  createdAt: data.createdAt?.toDate?.() ?? data.createdAt ?? new Date(),
  updatedAt: data.updatedAt?.toDate?.() ?? data.updatedAt ?? new Date(),
}) as Customer

// 顧客データ（パーソナルデータ）。以前はkintone CSVから生成した実データを
// クライアントのJSバンドルに直接埋め込んでいたが、これは認証を経由せず
// 誰でもダウンロードできてしまう重大な情報漏洩リスクだったため、Firestoreの
// customersコレクションへ移行した（要ログインでのみアクセス可能になる）
export const useCustomerStore = () => {
  const { $db } = useNuxtApp()

  const customersCol = () => collection($db, COLLECTION)

  const customers = useState<Customer[]>('customers:list', () => [])
  const loading   = useState<boolean>('customers:loading', () => false)
  const loaded    = useState<boolean>('customers:loaded', () => false)

  // ===== 一覧取得（初回のみ。以後はキャッシュを使う） =====
  const ensureLoaded = async (force = false) => {
    if (loaded.value && !force) return
    loading.value = true
    try {
      const snap = await getDocs(query(customersCol(), orderBy('updatedAt', 'desc')))
      customers.value = snap.docs.map(d => toCustomer(d.id, d.data()))
      loaded.value = true
    } finally {
      loading.value = false
    }
  }

  const getById = (id: Ref<string> | string) =>
    computed(() => customers.value.find(c => c.id === unref(id)) ?? null)

  const create = async (form: CustomerForm, userId: string, userName: string): Promise<string> => {
    const now = new Date()
    const payload = stripUndefined({
      ...form,
      assignedFpId:   form.assignedFpId   ?? userId,
      assignedFpName: form.assignedFpName ?? userName,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    const ref = await addDoc(customersCol(), payload)
    customers.value.unshift({ id: ref.id, ...form, createdAt: now, updatedAt: now } as Customer)
    return ref.id
  }

  const update = async (id: string, form: Partial<CustomerForm>): Promise<void> => {
    await updateDoc(doc($db, COLLECTION, id), stripUndefined({ ...form, updatedAt: serverTimestamp() }))
    const idx = customers.value.findIndex(c => c.id === id)
    if (idx >= 0) customers.value[idx] = { ...customers.value[idx], ...form, updatedAt: new Date() }
  }

  const remove = async (id: string): Promise<void> => {
    await deleteDoc(doc($db, COLLECTION, id))
    customers.value = customers.value.filter(c => c.id !== id)
  }

  return { customers, loading, loaded, ensureLoaded, getById, create, update, remove }
}
