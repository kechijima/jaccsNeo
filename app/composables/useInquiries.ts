/**
 * 業務ツールアプリ: 問い合わせ管理
 * inquiries コレクションを利用する簡易CRUD
 */
import {
  collection, doc, addDoc, updateDoc, deleteDoc, getDocs, query, orderBy,
  serverTimestamp, type DocumentData,
} from 'firebase/firestore'
import type { Inquiry, InquiryForm, InquiryStatus } from '~/types/tools'
import { useAuthStore } from '~/stores/auth'

const toInquiry = (id: string, data: DocumentData): Inquiry => ({
  id,
  subject:       data.subject ?? '',
  content:       data.content ?? '',
  status:        data.status ?? 'open',
  createdByUid:  data.createdByUid ?? '',
  createdByName: data.createdByName ?? '',
  createdAt:     data.createdAt,
  updatedAt:     data.updatedAt,
})

export const useInquiries = () => {
  const { $db } = useNuxtApp()
  const authStore = useAuthStore()

  const inquiriesCol = () => collection($db, 'inquiries')

  const fetchInquiries = async (): Promise<Inquiry[]> => {
    const snap = await getDocs(query(inquiriesCol(), orderBy('createdAt', 'desc')))
    return snap.docs.map(d => toInquiry(d.id, d.data()))
  }

  const createInquiry = async (form: InquiryForm): Promise<string> => {
    const ref = await addDoc(inquiriesCol(), {
      subject:       form.subject,
      content:       form.content,
      status:        'open' as InquiryStatus,
      createdByUid:  authStore.user?.uid ?? '',
      createdByName: authStore.user?.displayName ?? '',
      createdAt:     serverTimestamp(),
      updatedAt:     serverTimestamp(),
    })
    return ref.id
  }

  const updateInquiryStatus = async (id: string, status: InquiryStatus): Promise<void> => {
    await updateDoc(doc($db, 'inquiries', id), { status, updatedAt: serverTimestamp() })
  }

  const deleteInquiry = async (id: string): Promise<void> => {
    await deleteDoc(doc($db, 'inquiries', id))
  }

  return { fetchInquiries, createInquiry, updateInquiryStatus, deleteInquiry }
}
