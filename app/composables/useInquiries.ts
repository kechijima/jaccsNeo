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

  // CSV一括インポート専用。送信者（createdByUid/createdByName）・ステータスを
  // 指定できる（CSVに送信者メールアドレス・ステータス列がある場合に対応するため）。
  // 送信者が指定されない場合はインポートを実行した管理者自身の名前で作成する
  const createInquiryAdmin = async (data: {
    subject: string
    content: string
    status?: InquiryStatus
    createdByUid?: string
    createdByName?: string
  }): Promise<string> => {
    if (!authStore.isSystemAdmin) throw new Error('権限がありません')
    const ref = await addDoc(inquiriesCol(), {
      subject:       data.subject,
      content:       data.content,
      status:        data.status ?? 'open',
      createdByUid:  data.createdByUid || authStore.user?.uid || '',
      createdByName: data.createdByName || authStore.user?.displayName || '',
      createdAt:     serverTimestamp(),
      updatedAt:     serverTimestamp(),
    })
    return ref.id
  }

  const updateInquiryStatus = async (id: string, status: InquiryStatus): Promise<void> => {
    if (!authStore.isSystemAdmin) throw new Error('権限がありません')
    await updateDoc(doc($db, 'inquiries', id), { status, updatedAt: serverTimestamp() })
  }

  const deleteInquiry = async (id: string): Promise<void> => {
    await deleteDoc(doc($db, 'inquiries', id))
  }

  return { fetchInquiries, createInquiry, createInquiryAdmin, updateInquiryStatus, deleteInquiry }
}
