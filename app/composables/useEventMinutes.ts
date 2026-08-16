/**
 * イベント（種別「会議」）の議事録機能
 * events/{eventId}/minutes サブコレクションを利用する
 */
import {
  collection, doc, addDoc, updateDoc, getDocs, query, orderBy,
  serverTimestamp, type DocumentData,
} from 'firebase/firestore'
import type { EventMinutes } from '~/types/event'
import { useAuthStore } from '~/stores/auth'

const toDate = (val: any): Date => val?.toDate?.() ?? (val instanceof Date ? val : new Date())

const toMinutes = (id: string, data: DocumentData): EventMinutes => ({
  id,
  content:    data.content ?? '',
  authorUid:  data.authorUid ?? '',
  authorName: data.authorName ?? '',
  createdAt:  toDate(data.createdAt),
})

export const useEventMinutes = (eventId: string) => {
  const { $db } = useNuxtApp()
  const authStore = useAuthStore()

  const minutesCol = () => collection($db, 'events', eventId, 'minutes')

  // 新しい議事録が先頭に来る（新着順）
  const minutes = useState<EventMinutes[]>(`eventMinutes:${eventId}`, () => [])
  const loading = useState<boolean>(`eventMinutesLoading:${eventId}`, () => false)
  const loaded  = useState<boolean>(`eventMinutesLoaded:${eventId}`, () => false)

  const fetchMinutes = async (force = false) => {
    if (loaded.value && !force) return
    loading.value = true
    try {
      const snap = await getDocs(query(minutesCol(), orderBy('createdAt', 'desc')))
      minutes.value = snap.docs.map(d => toMinutes(d.id, d.data()))
      loaded.value = true
    } finally {
      loading.value = false
    }
  }

  const addMinutes = async (content: string): Promise<void> => {
    const authorUid = authStore.user?.uid ?? ''
    const authorName = authStore.user?.displayName ?? ''
    const ref = await addDoc(minutesCol(), {
      content,
      authorUid,
      authorName,
      createdAt: serverTimestamp(),
    })
    minutes.value = [{ id: ref.id, content, authorUid, authorName, createdAt: new Date() }, ...minutes.value]
  }

  const updateMinutes = async (minutesId: string, content: string): Promise<void> => {
    await updateDoc(doc($db, 'events', eventId, 'minutes', minutesId), {
      content,
      updatedAt: serverTimestamp(),
    })
    const idx = minutes.value.findIndex(m => m.id === minutesId)
    if (idx >= 0) minutes.value[idx] = { ...minutes.value[idx], content }
  }

  return { minutes, loading, fetchMinutes, addMinutes, updateMinutes }
}
