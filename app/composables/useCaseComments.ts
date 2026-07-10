/**
 * 生命保険案件（lifeInsuranceCases）のコメント機能
 * lifeInsuranceCases/{caseId}/comments サブコレクションを利用する
 */
import {
  collection, doc, addDoc, getDocs, query, orderBy, limit, startAfter,
  serverTimestamp, type DocumentData, type QueryDocumentSnapshot,
} from 'firebase/firestore'
import { useAuthStore } from '~/stores/auth'

export interface CaseComment {
  id: string
  content: string
  authorUid: string
  authorName: string
  createdAt: Date
}

const PAGE_SIZE = 10

const toDate = (val: any): Date => val?.toDate?.() ?? (val instanceof Date ? val : new Date())

const toComment = (id: string, data: DocumentData): CaseComment => ({
  id,
  content:    data.content ?? '',
  authorUid:  data.authorUid ?? '',
  authorName: data.authorName ?? '',
  createdAt:  toDate(data.createdAt),
})

export const useCaseComments = (caseId: string) => {
  const { $db } = useNuxtApp()
  const authStore = useAuthStore()

  const commentsCol = () => collection($db, 'lifeInsuranceCases', caseId, 'comments')

  // 表示順は古い→新しい（会話として自然な並び）。ページングは新しい側から遡って取得する
  const comments  = useState<CaseComment[]>(`caseComments:${caseId}`, () => [])
  const loading   = useState<boolean>(`caseCommentsLoading:${caseId}`, () => false)
  const loadingMore = useState<boolean>(`caseCommentsLoadingMore:${caseId}`, () => false)
  const hasMore   = useState<boolean>(`caseCommentsHasMore:${caseId}`, () => true)
  const loaded    = useState<boolean>(`caseCommentsLoaded:${caseId}`, () => false)
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
