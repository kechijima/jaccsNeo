import {
  collection,
  doc,
  getDocs,
  addDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  type DocumentData,
} from 'firebase/firestore'
import type { Referral, ReferralForm } from '~/types/referral'
import { useAuthStore } from '~/stores/auth'

const toReferral = (id: string, data: DocumentData): Referral => ({ id, ...data }) as Referral

export const useReferrals = () => {
  const { $db } = useNuxtApp()
  const authStore = useAuthStore()

  const referralsCol = () => collection($db, 'referrals')

  // ===== 顧客が紹介した人一覧 =====
  const fetchReferredBy = async (customerId: string): Promise<Referral[]> => {
    const q = query(
      referralsCol(),
      where('fromCustomerId', '==', customerId),
      orderBy('createdAt', 'desc'),
    )
    const snap = await getDocs(q)
    return snap.docs.map(d => toReferral(d.id, d.data()))
  }

  // ===== 顧客を紹介してくれた人一覧 =====
  const fetchReferredTo = async (customerId: string): Promise<Referral[]> => {
    const q = query(
      referralsCol(),
      where('toCustomerId', '==', customerId),
      orderBy('createdAt', 'desc'),
    )
    const snap = await getDocs(q)
    return snap.docs.map(d => toReferral(d.id, d.data()))
  }

  // ===== 紹介関係を登録 =====
  const createReferral = async (
    fromCustomerId: string,
    fromCustomerName: string,
    form: ReferralForm,
    toCustomerName: string,
  ): Promise<string> => {
    const ref = await addDoc(referralsCol(), {
      fromCustomerId,
      fromCustomerName,
      toCustomerId:   form.toCustomerId,
      toCustomerName,
      notes:          form.notes ?? '',
      createdBy:      authStore.user?.uid,
      createdAt:      serverTimestamp(),
    })
    return ref.id
  }

  // ===== 削除 =====
  const deleteReferral = async (referralId: string): Promise<void> => {
    await deleteDoc(doc($db, 'referrals', referralId))
  }

  return {
    fetchReferredBy,
    fetchReferredTo,
    createReferral,
    deleteReferral,
  }
}
