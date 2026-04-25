import type { Customer, CustomerSummary, CustomerForm } from '~/types/customer'
import { useAuthStore } from '~/stores/auth'

export const useCustomers = () => {
  const store     = useCustomerStore()
  const authStore = useAuthStore()

  const toSummary = (c: Customer): CustomerSummary => ({
    id:             c.id,
    kintoneId:      c.kintoneId,
    type:           c.type ?? 'individual',
    name:           c.name ?? '',
    nameKana:       c.nameKana,
    tel:            c.tel,
    email:          c.email,
    address:        c.address,
    assignedFpName: c.assignedFpName,
    relationship:   c.relationship,
    stage:          c.stage,
    status1:        c.status1,
    updatedAt:      c.updatedAt,
  })

  // ===== 一覧取得 =====
  const fetchCustomers = async (opts?: { searchName?: string; assignedFpId?: string }) => {
    let list = store.customers.value

    if (!authStore.isEm2Above && !authStore.isBoard && !authStore.isSystemAdmin) {
      list = list.filter(c => c.assignedFpId === (authStore.user?.uid ?? 'mock-user-123'))
    } else if (opts?.assignedFpId) {
      list = list.filter(c => c.assignedFpId === opts.assignedFpId)
    }

    if (opts?.searchName) {
      const q = opts.searchName.toLowerCase()
      list = list.filter(c => c.name.toLowerCase().includes(q))
    }

    return { customers: list.map(toSummary), lastVisible: null, hasMore: false }
  }

  // ===== 名前検索 =====
  const searchByName = async (nameQuery: string) => {
    const q = nameQuery.toLowerCase()
    return store.customers.value
      .filter(c => c.name.toLowerCase().includes(q))
      .slice(0, 20)
      .map(toSummary)
  }

  // ===== 1件取得 =====
  const fetchCustomer = async (id: string): Promise<Customer | null> => {
    return store.customers.value.find(c => c.id === id) ?? null
  }

  // ===== 新規作成 =====
  const createCustomer = async (form: CustomerForm): Promise<string> => {
    return store.create(
      form,
      authStore.user?.uid ?? 'mock-user-123',
      authStore.user?.displayName ?? 'テストユーザー',
    )
  }

  // ===== 更新 =====
  const updateCustomer = async (id: string, form: Partial<CustomerForm>): Promise<void> => {
    store.update(id, form)
  }

  // ===== 削除 =====
  const deleteCustomer = async (id: string): Promise<void> => {
    store.remove(id)
  }

  // ===== バルクインポート =====
  const bulkImport = async (customers: CustomerForm[]): Promise<{ success: number; errors: string[] }> => {
    customers.forEach(c => store.create(c, authStore.user?.uid ?? '', authStore.user?.displayName ?? ''))
    return { success: customers.length, errors: [] }
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
