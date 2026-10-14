import type { ServiceCase } from '~/types/service'
import { useServices } from './useServices'

export interface DerivedCase {
  id: string
  customerId: string
  status: string
  updatedAt: ServiceCase['updatedAt']
}

// アプリごとの実際の案件レコード（customers/{id}/services/{type}/cases）は
// 画面間で何度も参照されるため、セッション内で一度だけ取得してキャッシュする
const allCases = useState<ServiceCase[]>('appServices:allCases', () => [])
const loaded = useState<boolean>('appServices:loaded', () => false)

export const useAppServices = () => {
  const { fetchAllCases } = useServices()

  const ensureLoaded = async (force = false) => {
    if (loaded.value && !force) return
    allCases.value = await fetchAllCases()
    loaded.value = true
  }

  // 指定サービスタイプの実際の案件一覧
  const getCasesForType = (serviceType: string): DerivedCase[] =>
    allCases.value
      .filter(c => c.serviceType === serviceType)
      .map(c => ({
        id:         c.id,
        customerId: c.customerId,
        status:     c.status,
        updatedAt:  c.updatedAt,
      }))

  const countForType = (serviceType: string) =>
    allCases.value.filter(c => c.serviceType === serviceType).length

  return { getCasesForType, countForType, allCases, ensureLoaded }
}
