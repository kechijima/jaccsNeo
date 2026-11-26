import {
  collection, doc, getDocs, addDoc, updateDoc, deleteDoc,
  serverTimestamp, query, orderBy, where, limit, startAfter, documentId,
  getCountFromServer,
  type DocumentData, type QueryDocumentSnapshot,
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

  // ===== ページ単位での取得（全件取得を避け、まず上位N件だけ表示したい場面向け） =====
  const CUSTOMERS_PAGE_SIZE = 25
  const fetchCustomersPage = async (
    cursor?: QueryDocumentSnapshot,
  ): Promise<{ customers: Customer[]; lastDoc: QueryDocumentSnapshot | null; hasMore: boolean }> => {
    const constraints = [orderBy('updatedAt', 'desc'), limit(CUSTOMERS_PAGE_SIZE)]
    if (cursor) constraints.push(startAfter(cursor))
    const snap = await getDocs(query(customersCol(), ...constraints))
    return {
      customers: snap.docs.map(d => toCustomer(d.id, d.data())),
      lastDoc: snap.docs[snap.docs.length - 1] ?? null,
      hasMore: snap.docs.length === CUSTOMERS_PAGE_SIZE,
    }
  }

  // 顧客の総件数だけを取得する（プロダクトアプリ一覧の「登録顧客数」表示等、
  // 一覧データ本体が不要な場面向け。全件ダウンロードを避ける）
  const fetchCustomerCount = async (): Promise<number> => {
    const snap = await getCountFromServer(customersCol())
    return snap.data().count
  }

  // 指定したIDの顧客だけをまとめて取得する（案件一覧の各ページに紐づく顧客名の解決など、
  // 全顧客を読み込まずに必要な分だけ引きたい場面向け）
  const fetchCustomersByIds = async (ids: string[]): Promise<Customer[]> => {
    const uniqueIds = [...new Set(ids)]
    if (uniqueIds.length === 0) return []
    const snaps = await Promise.all(
      chunk(uniqueIds, CHUNK_SIZE).map(c => getDocs(query(customersCol(), where(documentId(), 'in', c)))),
    )
    return snaps.flatMap(snap => snap.docs.map(d => toCustomer(d.id, d.data())))
  }

  // 指定した担当FP（uid・氏名のどちらか一致）の顧客のみを取得する（パーソナルデータ
  // 一覧のデフォルト表示・アポ状況分析など、全件取得が不要な場面向け）。共有キャッシュ
  // （customers/loaded）には書き込まず、呼び出し元にローカルな結果のみ返す。
  // assignedFpId（uid）優先で突合し、uid未設定の過去データ（CSV取込分等）を
  // 取りこぼさないようassignedFpName（氏名）でも並行して問い合わせ、結果をマージする。
  // Firestoreのin演算子は最大30件までのため、30件を超える場合は分割して並列取得する
  const CHUNK_SIZE = 30
  const chunk = <T,>(arr: T[], size: number): T[][] => {
    const out: T[][] = []
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
    return out
  }
  const fetchScopedCustomers = async (uids: string[], names: string[]): Promise<Customer[]> => {
    const queries = [
      ...chunk(uids, CHUNK_SIZE).map(c => getDocs(query(customersCol(), where('assignedFpId', 'in', c)))),
      ...chunk(names, CHUNK_SIZE).map(c => getDocs(query(customersCol(), where('assignedFpName', 'in', c)))),
    ]
    const snaps = await Promise.all(queries)
    const map = new Map<string, Customer>()
    for (const snap of snaps) {
      for (const d of snap.docs) if (!map.has(d.id)) map.set(d.id, toCustomer(d.id, d.data()))
    }
    return [...map.values()]
  }

  // fetchScopedCustomersの単一ユーザー版（自分一人分だけを取得したい場合のショートハンド）
  const fetchMyCustomers = (uid: string, displayName?: string): Promise<Customer[]> =>
    fetchScopedCustomers([uid], displayName ? [displayName] : [])

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

  return {
    customers, loading, loaded, ensureLoaded, fetchMyCustomers, fetchScopedCustomers,
    fetchCustomersPage, fetchCustomersByIds, getById, create, update, remove,
  }
}
