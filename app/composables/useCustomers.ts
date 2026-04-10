import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  type QueryDocumentSnapshot,
  type DocumentData,
} from 'firebase/firestore'
import type { Customer, CustomerSummary, CustomerForm } from '~/types/customer'
import { useAuthStore } from '~/stores/auth'

const PAGE_SIZE = 50

const toSummary = (id: string, data: DocumentData): CustomerSummary => ({
  id,
  kintoneId:     data.kintoneId,
  type:          data.type ?? 'individual',
  name:          data.name ?? '',
  nameKana:      data.nameKana,
  tel:           data.tel,
  email:         data.email,
  address:       data.address,
  assignedFpName: data.assignedFpName,
  relationship:  data.relationship,
  stage:         data.stage,
  status1:       data.status1,
  updatedAt:     data.updatedAt,
})

const toCustomer = (id: string, data: DocumentData): Customer => ({
  id,
  ...data,
}) as Customer

export const useCustomers = () => {
  const { $db } = useNuxtApp()
  const authStore = useAuthStore()

  const colRef = () => collection($db, 'customers')

  // ===== 一覧取得（ページネーション） =====
  const fetchCustomers = async (opts?: {
    searchName?: string
    assignedFpId?: string
    lastDoc?: QueryDocumentSnapshot
  }) => {
    const constraints: any[] = []

    // ロールに応じてフィルタ
    if (authStore.isEm2Above || authStore.isBoard || authStore.isSystemAdmin) {
      // 全件閲覧可（グループでさらに絞る場合は追加）
      if (opts?.assignedFpId) {
        constraints.push(where('assignedFpId', '==', opts.assignedFpId))
      }
    } else {
      // 一般・専門チーム：自分の担当顧客のみ
      constraints.push(where('assignedFpId', '==', authStore.user?.uid))
    }

    constraints.push(orderBy('updatedAt', 'desc'))
    constraints.push(limit(PAGE_SIZE))

    if (opts?.lastDoc) {
      constraints.push(startAfter(opts.lastDoc))
    }

    const q = query(colRef(), ...constraints)
    const snap = await getDocs(q)

    const customers: CustomerSummary[] = snap.docs.map(d => toSummary(d.id, d.data()))
    const lastVisible = snap.docs[snap.docs.length - 1] ?? null

    return { customers, lastVisible, hasMore: snap.docs.length === PAGE_SIZE }
  }

  // ===== 名前検索（前方一致） =====
  const searchByName = async (nameQuery: string) => {
    const end = nameQuery + '\uf8ff'
    const constraints: any[] = [
      where('name', '>=', nameQuery),
      where('name', '<=', end),
      orderBy('name'),
      limit(20),
    ]

    // 権限フィルタ
    if (!authStore.isEm2Above && !authStore.isBoard && !authStore.isSystemAdmin) {
      constraints.unshift(where('assignedFpId', '==', authStore.user?.uid))
    }

    const q = query(colRef(), ...constraints)
    const snap = await getDocs(q)
    return snap.docs.map(d => toSummary(d.id, d.data()))
  }

  // ===== 1件取得 =====
  const fetchCustomer = async (id: string): Promise<Customer | null> => {
    const ref = doc($db, 'customers', id)
    const snap = await getDoc(ref)
    if (!snap.exists()) return null

    const data = snap.data()

    // 権限チェック：一般は自分の担当のみ
    if (!authStore.isEm2Above && !authStore.isBoard && !authStore.isSystemAdmin) {
      if (data.assignedFpId !== authStore.user?.uid) return null
    }

    return toCustomer(snap.id, data)
  }

  // ===== 新規作成 =====
  const createCustomer = async (form: CustomerForm): Promise<string> => {
    const ref = await addDoc(colRef(), {
      ...form,
      assignedFpId:   form.assignedFpId   ?? authStore.user?.uid,
      assignedFpName: form.assignedFpName ?? authStore.user?.displayName,
      createdBy: authStore.user?.uid,
      updatedBy: authStore.user?.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    return ref.id
  }

  // ===== 更新 =====
  const updateCustomer = async (id: string, form: Partial<CustomerForm>): Promise<void> => {
    const ref = doc($db, 'customers', id)
    await updateDoc(ref, {
      ...form,
      updatedBy: authStore.user?.uid,
      updatedAt: serverTimestamp(),
    })
  }

  // ===== 削除（system_adminのみ） =====
  const deleteCustomer = async (id: string): Promise<void> => {
    if (!authStore.isSystemAdmin) throw new Error('権限がありません')
    await deleteDoc(doc($db, 'customers', id))
  }

  // ===== バルクインポート =====
  const bulkImport = async (customers: CustomerForm[]): Promise<{ success: number; errors: string[] }> => {
    const errors: string[] = []
    let success = 0

    // Firestoreは1回500件制限のため分割
    const chunks = []
    for (let i = 0; i < customers.length; i += 400) {
      chunks.push(customers.slice(i, i + 400))
    }

    for (const chunk of chunks) {
      const promises = chunk.map(async (c, idx) => {
        try {
          await addDoc(colRef(), {
            ...c,
            createdBy: authStore.user?.uid,
            updatedBy: authStore.user?.uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          })
          success++
        } catch (e: any) {
          errors.push(`行${idx + 1}: ${e.message}`)
        }
      })
      await Promise.all(promises)
    }

    return { success, errors }
  }

  return {
    fetchCustomers,
    searchByName,
    fetchCustomer,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    bulkImport,
  }
}
