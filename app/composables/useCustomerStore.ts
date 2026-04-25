import { MOCK_CUSTOMERS } from '~/data/mock'
import type { Customer, CustomerForm } from '~/types/customer'

export const useCustomerStore = () => {
  const customers = useState<Customer[]>('customers:list', () => [...MOCK_CUSTOMERS])

  const getById = (id: Ref<string> | string) =>
    computed(() => customers.value.find(c => c.id === unref(id)) ?? null)

  const create = (form: CustomerForm, userId: string, userName: string): string => {
    const id  = `c-local-${Date.now()}`
    const now = new Date() as any
    customers.value.unshift({
      id,
      ...form,
      assignedFpId:   form.assignedFpId   ?? userId,
      assignedFpName: form.assignedFpName ?? userName,
      createdAt: now,
      updatedAt: now,
    } as Customer)
    return id
  }

  const update = (id: string, form: Partial<CustomerForm>): void => {
    const idx = customers.value.findIndex(c => c.id === id)
    if (idx < 0) return
    customers.value[idx] = { ...customers.value[idx], ...form, updatedAt: new Date() as any }
  }

  const remove = (id: string): void => {
    customers.value = customers.value.filter(c => c.id !== id)
  }

  return { customers, getById, create, update, remove }
}
