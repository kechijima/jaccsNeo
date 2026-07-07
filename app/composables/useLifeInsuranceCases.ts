import { LIFE_INSURANCE_CASES } from '~/data/lifeInsuranceData'
import type { LifeInsuranceCase } from '~/types/lifeInsurance'

export const useLifeInsuranceCases = () => {
  const cases = useState<LifeInsuranceCase[]>('lifeInsuranceCases:list', () => [...LIFE_INSURANCE_CASES])

  const getByCustomerId = (customerId: Ref<string> | string) =>
    computed(() => cases.value.filter(c => c.customerId === unref(customerId)))

  const getById = (id: Ref<string> | string) =>
    computed(() => cases.value.find(c => c.id === unref(id)) ?? null)

  return { cases, getByCustomerId, getById }
}
