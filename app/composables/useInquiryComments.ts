/**
 * 問い合わせ管理（inquiries）のコメント機能
 * inquiries/{inquiryId}/comments サブコレクションを利用する
 */
import {
  collection, doc, addDoc, getDocs, query, orderBy, limit, startAfter,
  serverTimestamp, type DocumentData, type QueryDocumentSnapshot,
} from 'firebase/firestore'
import { useAuthStore } from '~/stores/auth'

export interface InquiryComment {
  id: string
  content: string
  authorUid: string
  authorName: string
  createdAt: Date
}

const PAGE_SIZE = 10

const toDate = (val: any): Date => val?.toDate?.() ?? (val instanceof Date ? val : new Date())

const toComment = (id: string, data: DocumentData): InquiryComment => ({
  id,
  content:    data.content ?? '',
  authorUid:  data.authorUid ?? '',
  authorName: data.authorName ?? '',
  createdAt:  toDate(data.createdAt),
})

export const useInquiryComments = (inquiryId: string) => {
  const { $db } = useNuxtApp()
  const authStore = useAuthStore()

  const commentsCol = () => collection($db, 'inquiries', inquiryId, 'comments')

  // 表示順は古い→新しい（会話として自然な並び）。ページングは新しい側から遡って取得する
  const comments  = useState<InquiryComment[]>(`inquiryComments:${inquiryId}`, () => [])
  const loading   = useState<boolean>(`inquiryCommentsLoading:${inquiryId}`, () => false)
  const loadingMore = useState<boolean>(`inquiryCommentsLoadingMore:${inquiryId}`, () => false)
  const hasMore   = useState<boolean>(`inquiryCommentsHasMore:${inquiryId}`, () => true)
  const loaded    = useState<boolean>(`inquiryCommentsLoaded:${inquiryId}`, () => false)
  let oldestDoc: QueryDocumentSnapshot | null = null

  const fetchInitial = async (force = false) => {
    if (loaded.value && !force) return
    loading.value = true
    try {
      const snap = await getDocs(query(commentsCol(), orderBy('createdAt', 'desc'), limit(PAGE_SIZE)))
      oldestDoc = snap.docs[snap.docs.length - 1] ?? null
      hasMore.value = snap.docs.length === PAGE_SIZE
      comments.value = snap.docs.map(d => toComment(d.id, d.data())).reverse()
      loaded.value = true
    } finally {
      loading.value = false
    }
  }

  // さらに古いコメントを読み込み、一覧の先頭に追加する
  const loadMore = async () => {
    if (!hasMore.value || !oldestDoc || loadingMore.value) return
    loadingMore.value = true
    try {
      const snap = await getDocs(query(commentsCol(), orderBy('createdAt', 'desc'), startAfter(oldestDoc), limit(PAGE_SIZE)))
      oldestDoc = snap.docs[snap.docs.length - 1] ?? oldestDoc
      hasMore.value = snap.docs.length === PAGE_SIZE
      comments.value = [...snap.docs.map(d => toComment(d.id, d.data())).reverse(), ...comments.value]
    } finally {
      loadingMore.value = false
    }
  }

  const addComment = async (content: string): Promise<void> => {
    const authorUid = authStore.user?.uid ?? ''
    const authorName = authStore.user?.displayName ?? ''
    await addDoc(commentsCol(), {
      content,
      authorUid,
      authorName,
      createdAt: serverTimestamp(),
    })
    comments.value = [...comments.value, {
      id: `local-${Date.now()}`, content, authorUid, authorName, createdAt: new Date(),
    }]
  }

  return { comments, loading, loadingMore, hasMore, fetchInitial, loadMore, addComment }
}
