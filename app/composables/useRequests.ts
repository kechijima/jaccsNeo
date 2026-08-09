import {
  collection, doc, getDocs, addDoc, updateDoc,
  query, where, orderBy, serverTimestamp, type DocumentData,
} from 'firebase/firestore'
import { REQUEST_TYPE_LABELS, type AppRequest, type RequestForm, type RequestStatus, type RequestType } from '~/types/request'
import type { AppUser } from '~/types/user'
import { useAuthStore } from '~/stores/auth'
import { useNotifications } from '~/composables/useNotifications'
import { useUsers } from '~/composables/useUsers'

const COLLECTION = 'requests'

// 却下された申請を「コピーして再申請」する際に、内容を新規申請フォームへ引き継ぐための一時保存領域
const resubmitDraft = () => useState<{ type: RequestType; payload: Record<string, any> } | null>('requests:resubmit-draft', () => null)

// Firestoreはフィールド値にundefinedを許可せずエラーになるため、送信前に取り除く
const stripUndefined = <T extends Record<string, any>>(obj: T): T => {
  const result = {} as T
  for (const key of Object.keys(obj) as (keyof T)[]) {
    if (obj[key] !== undefined) result[key] = obj[key]
  }
  return result
}

const toRequest = (id: string, data: DocumentData): AppRequest => ({ id, ...data }) as AppRequest

// 申請（組合登録・組合員登録・グループ登録・プラン変更・サポート者変更）と
// 理事会承認フローを管理する。Firestoreの requests コレクションで永続化する
export const useRequests = () => {
  const { $db } = useNuxtApp()
  const authStore = useAuthStore()
  const { sendNotification } = useNotifications()
  const { fetchUsers } = useUsers()

  const requestsCol = () => collection($db, COLLECTION)

  // 新規申請が提出されたことを理事会メンバー・システム管理者へ通知する
  const notifyReviewers = async (type: RequestType, requestId: string): Promise<void> => {
    const users = await fetchUsers().catch(() => [] as AppUser[])
    const currentUid = authStore.user?.uid
    const reviewers = users.filter(u => (u.role === 'board' || u.role === 'system_admin') && u.uid !== currentUid)
    await Promise.all(reviewers.map(u => sendNotification(u.uid, {
      type:      'system',
      title:     '新しい申請があります',
      body:      `${authStore.user?.displayName ?? '申請者'}さんから「${REQUEST_TYPE_LABELS[type]}」の申請が届きました。`,
      linkUrl:   '/requests/approve',
      relatedId: requestId,
    }).catch(() => {})))
  }

  const requests = useState<AppRequest[]>('requests:list', () => [])
  const loading  = useState<boolean>('requests:loading', () => false)
  const loaded   = useState<boolean>('requests:loaded', () => false)

  // ===== 全申請一覧（承認キュー用） =====
  const fetchAll = async (force = false) => {
    if (loaded.value && !force) return
    loading.value = true
    try {
      const snap = await getDocs(query(requestsCol(), orderBy('createdAt', 'desc')))
      requests.value = snap.docs.map(d => toRequest(d.id, d.data()))
      loaded.value = true
    } finally {
      loading.value = false
    }
  }

  // ===== 自分の申請一覧 =====
  const fetchMine = async (): Promise<AppRequest[]> => {
    const uid = authStore.user?.uid
    if (!uid) return []
    const snap = await getDocs(query(requestsCol(), where('requestedBy', '==', uid), orderBy('createdAt', 'desc')))
    return snap.docs.map(d => toRequest(d.id, d.data()))
  }

  // ===== 申請 =====
  const submit = async (form: RequestForm): Promise<string> => {
    const ref = await addDoc(requestsCol(), stripUndefined({
      type:            form.type,
      status:          'pending' as RequestStatus,
      payload:         stripUndefined(form.payload),
      note:            form.note,
      requestedBy:     authStore.user?.uid,
      requestedByName: authStore.user?.displayName,
      requestedAt:     serverTimestamp(),
      createdAt:       serverTimestamp(),
      updatedAt:       serverTimestamp(),
    }))
    await fetchAll(true)
    await notifyReviewers(form.type, ref.id).catch(() => {})
    return ref.id
  }

  // ===== 自分の申請の編集（承認待ちの間のみ。ミス申請の修正用） =====
  const updateMyRequest = async (id: string, form: RequestForm): Promise<void> => {
    await updateDoc(doc($db, COLLECTION, id), {
      type:      form.type,
      payload:   stripUndefined(form.payload),
      note:      form.note ?? '',
      updatedAt: serverTimestamp(),
    })
    const idx = requests.value.findIndex(r => r.id === id)
    if (idx >= 0) requests.value[idx] = { ...requests.value[idx], type: form.type, payload: form.payload, note: form.note }
  }

  // ===== 承認・却下（実データへの反映は呼び出し側で行い、成功後にこれを呼ぶ） =====
  const markReviewed = async (id: string, status: RequestStatus, rejectReason?: string): Promise<void> => {
    await updateDoc(doc($db, COLLECTION, id), stripUndefined({
      status,
      reviewedBy:     authStore.user?.uid,
      reviewedByName: authStore.user?.displayName,
      reviewedAt:     serverTimestamp(),
      rejectReason,
      updatedAt:      serverTimestamp(),
    }))
    const idx = requests.value.findIndex(r => r.id === id)
    if (idx >= 0) requests.value[idx] = { ...requests.value[idx], status, rejectReason }
  }

  const pendingRequests = computed(() => requests.value.filter(r => r.status === 'pending'))

  // ===== 却下申請のコピー再申請 =====
  const setResubmitDraft = (type: RequestType, payload: Record<string, any>) => {
    resubmitDraft().value = { type, payload: { ...payload } }
  }
  const consumeResubmitDraft = () => {
    const draft = resubmitDraft().value
    resubmitDraft().value = null
    return draft
  }

  return {
    requests, loading, loaded, fetchAll, fetchMine, submit, updateMyRequest, markReviewed, pendingRequests,
    setResubmitDraft, consumeResubmitDraft,
  }
}
