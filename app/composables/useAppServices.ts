import type { Customer } from '~/types/customer'
import { useCustomerStore } from './useCustomerStore'

// アプリのサービスキー → 顧客データ(CSV由来)のservicesフィールド対応
const SERVICE_KEY_ALIAS: Record<string, string> = {
  hikari: 'pikaraHikari',
}

export interface DerivedCase {
  id: string
  customerId: string
  customerName: string
  customerNameKana: string
  status: string
  assignedFpName: string
  updatedAt: Date | { toDate: () => Date }
}

export const useAppServices = () => {
  const { customers } = useCustomerStore()

  const resolveKey = (serviceType: string) => SERVICE_KEY_ALIAS[serviceType] ?? serviceType

  // 指定サービスに対応データを持つ顧客一覧（パーソナルデータ → アプリ連動）
  const getCasesForType = (serviceType: string): DerivedCase[] => {
    const key = resolveKey(serviceType)
    return customers.value
      .filter(c => (c.services as any)?.[key])
      .map(c => ({
        id:               `${c.id}-${key}`,
        customerId:       c.id,
        customerName:     c.name,
        customerNameKana: c.nameKana ?? '',
        status:           (c.services as any)[key] as string,
        assignedFpName:   c.assignedFpName ?? '',
        updatedAt:        c.updatedAt,
      }))
  }

  const countForType = (serviceType: string) => {
    const key = resolveKey(serviceType)
    return customers.value.filter(c => (c.services as any)?.[key]).length
  }

  const getServiceValue = (customer: Customer | null, serviceType: string): string =>
    customer ? ((customer.services as any)?.[resolveKey(serviceType)] ?? '') : ''

  return { getCasesForType, countForType, getServiceValue, resolveKey }
}
