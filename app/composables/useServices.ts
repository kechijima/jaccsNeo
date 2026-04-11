import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  serverTimestamp,
  type DocumentData,
} from 'firebase/firestore'
import type { ServiceCase, ServiceCaseForm, ServiceType } from '~/types/service'
import { useAuthStore } from '~/stores/auth'

const toCase = (id: string, data: DocumentData): ServiceCase => ({
  id,
  ...data,
}) as ServiceCase

export const useServices = () => {
  const { $db } = useNuxtApp()
  const authStore = useAuthStore()

  const casesRef = (customerId: string, serviceType: ServiceType) =>
    collection($db, 'customers', customerId, 'services', serviceType, 'cases')

  // ===== 案件一覧取得 =====
  const fetchCases = async (customerId: string, serviceType: ServiceType): Promise<ServiceCase[]> => {
    const q = query(casesRef(customerId, serviceType), orderBy('updatedAt', 'desc'))
    const snap = await getDocs(q)
    return snap.docs.map(d => toCase(d.id, d.data()))
  }

  // ===== 全サービスタイプのサマリー =====
  const fetchAllServiceSummaries = async (customerId: string) => {
    const serviceTypes: ServiceType[] = [
      'lifeInsurance', 'fireInsurance', 'autoInsurance',
      'realEstatePurchase', 'realEstateSale', 'realEstateRental',
      'homeLoan', 'jobChange', 'seniorPlanning',
      'communication', 'hikari', 'moving', 'renovation',
      'travel', 'bridal', 'legal', 'inheritance',
      'companySetup', 'waterServer',
    ]

    const results = await Promise.all(
      serviceTypes.map(async (type) => {
        const q = query(casesRef(customerId, type), orderBy('updatedAt', 'desc'), limit(1))
        const snap = await getDocs(q)
        return {
          serviceType: type,
          caseCount: snap.size,
          latestStatus: snap.docs[0]?.data().status,
          latestUpdatedAt: snap.docs[0]?.data().updatedAt,
        }
      })
    )

    return results.filter(r => r.caseCount > 0)
  }

  // ===== 1件取得 =====
  const fetchCase = async (customerId: string, serviceType: ServiceType, caseId: string): Promise<ServiceCase | null> => {
    const ref = doc($db, 'customers', customerId, 'services', serviceType, 'cases', caseId)
    const snap = await getDoc(ref)
    if (!snap.exists()) return null
    return toCase(snap.id, snap.data())
  }

  // ===== 新規作成 =====
  const createCase = async (customerId: string, serviceType: ServiceType, form: ServiceCaseForm): Promise<string> => {
    const ref = await addDoc(casesRef(customerId, serviceType), {
      ...form,
      customerId,
      serviceType,
      createdBy: authStore.user?.uid,
      updatedBy: authStore.user?.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    return ref.id
  }

  // ===== 更新 =====
  const updateCase = async (customerId: string, serviceType: ServiceType, caseId: string, form: Partial<ServiceCaseForm>): Promise<void> => {
    const ref = doc($db, 'customers', customerId, 'services', serviceType, 'cases', caseId)
    await updateDoc(ref, {
      ...form,
      updatedBy: authStore.user?.uid,
      updatedAt: serverTimestamp(),
    })
  }

  // ===== 削除 =====
  const deleteCase = async (customerId: string, serviceType: ServiceType, caseId: string): Promise<void> => {
    await deleteDoc(doc($db, 'customers', customerId, 'services', serviceType, 'cases', caseId))
  }

  return {
    fetchCases,
    fetchAllServiceSummaries,
    fetchCase,
    createCase,
    updateCase,
    deleteCase,
  }
}
