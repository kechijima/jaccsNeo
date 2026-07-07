import { LIFE_INSURANCE_CASES } from '~/data/lifeInsuranceData'
import type { LifeInsuranceCase, LifeInsuranceCaseInput } from '~/types/lifeInsurance'

export const useLifeInsuranceCases = () => {
  const cases = useState<LifeInsuranceCase[]>('lifeInsuranceCases:list', () => [...LIFE_INSURANCE_CASES])

  const getByCustomerId = (customerId: Ref<string> | string) =>
    computed(() => cases.value.filter(c => c.customerId === unref(customerId)))

  const getById = (id: Ref<string> | string) =>
    computed(() => cases.value.find(c => c.id === unref(id)) ?? null)

  const create = (input: LifeInsuranceCaseInput): string => {
    const id = `li-local-${Date.now()}`
    const now = new Date()
    cases.value.unshift({ id, ...input, createdAt: now, updatedAt: now })
    return id
  }

  const update = (id: string, patch: Partial<LifeInsuranceCaseInput>): void => {
    const idx = cases.value.findIndex(c => c.id === id)
    if (idx < 0) return
    cases.value[idx] = { ...cases.value[idx], ...patch, updatedAt: new Date() }
  }

  return { cases, getByCustomerId, getById, create, update }
}
