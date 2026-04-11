import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  increment,
  Timestamp,
  type DocumentData,
} from 'firebase/firestore'
import type { Event, EventSummary, EventAttendee, EventForm, AttendanceStatus } from '~/types/event'
import { useAuthStore } from '~/stores/auth'

const toEvent = (id: string, data: DocumentData): Event => ({ id, ...data }) as Event

export const useEvents = () => {
  const { $db } = useNuxtApp()
  const authStore = useAuthStore()

  const eventsCol = () => collection($db, 'events')
  const attendeesCol = (eventId: string) => collection($db, 'events', eventId, 'attendees')

  // ===== イベント一覧 =====
  const fetchEvents = async (opts?: { upcoming?: boolean }): Promise<EventSummary[]> => {
    const constraints: any[] = [orderBy('startAt', opts?.upcoming ? 'asc' : 'desc'), limit(50)]

    if (opts?.upcoming) {
      constraints.unshift(where('startAt', '>=', Timestamp.now()))
    }

    const q = query(eventsCol(), ...constraints)
    const snap = await getDocs(q)

    return snap.docs.map(d => {
      const data = d.data()
      return {
        id:           d.id,
        title:        data.title,
        startAt:      data.startAt,
        endAt:        data.endAt,
        location:     data.location,
        scope:        data.scope,
        groupId:      data.groupId,
        attendeeCount: data.attendeeCount ?? 0,
      } as EventSummary
    })
  }

  // ===== 1件取得 =====
  const fetchEvent = async (eventId: string): Promise<Event | null> => {
    const snap = await getDoc(doc($db, 'events', eventId))
    if (!snap.exists()) return null
    return toEvent(snap.id, snap.data())
  }

  // ===== 作成 =====
  const createEvent = async (form: EventForm): Promise<string> => {
    const startAt = Timestamp.fromDate(new Date(form.startAt))
    const endAt   = form.endAt ? Timestamp.fromDate(new Date(form.endAt)) : null

    const ref = await addDoc(eventsCol(), {
      ...form,
      startAt,
      endAt,
      attendeeCount: 0,
      createdBy:     authStore.user?.uid,
      createdByName: authStore.user?.displayName,
      createdAt:     serverTimestamp(),
      updatedAt:     serverTimestamp(),
    })
    return ref.id
  }

  // ===== 更新 =====
  const updateEvent = async (eventId: string, form: Partial<EventForm>): Promise<void> => {
    const data: any = { ...form, updatedAt: serverTimestamp() }
    if (form.startAt) data.startAt = Timestamp.fromDate(new Date(form.startAt))
    if (form.endAt)   data.endAt   = Timestamp.fromDate(new Date(form.endAt))
    await updateDoc(doc($db, 'events', eventId), data)
  }

  // ===== 削除 =====
  const deleteEvent = async (eventId: string): Promise<void> => {
    await deleteDoc(doc($db, 'events', eventId))
  }

  // ===== 出欠一覧 =====
  const fetchAttendees = async (eventId: string): Promise<EventAttendee[]> => {
    const snap = await getDocs(attendeesCol(eventId))
    return snap.docs.map(d => ({ uid: d.id, ...d.data() }) as EventAttendee)
  }

  // ===== 自分の出欠取得 =====
  const fetchMyAttendance = async (eventId: string): Promise<AttendanceStatus | null> => {
    const uid = authStore.user?.uid
    if (!uid) return null
    const snap = await getDoc(doc($db, 'events', eventId, 'attendees', uid))
    if (!snap.exists()) return null
    return snap.data().status as AttendanceStatus
  }

  // ===== 出欠更新 =====
  const updateAttendance = async (eventId: string, status: AttendanceStatus): Promise<void> => {
    const uid = authStore.user?.uid
    if (!uid) return

    const attendeeRef = doc($db, 'events', eventId, 'attendees', uid)
    const prev = await getDoc(attendeeRef)

    await updateDoc(attendeeRef as any, {
      uid,
      displayName: authStore.user?.displayName,
      status,
      updatedAt:   serverTimestamp(),
    })

    // 出席者数の更新
    const wasAttending = prev.exists() && prev.data().status === 'attending'
    const nowAttending = status === 'attending'
    if (!wasAttending && nowAttending) {
      await updateDoc(doc($db, 'events', eventId), { attendeeCount: increment(1) })
    } else if (wasAttending && !nowAttending) {
      await updateDoc(doc($db, 'events', eventId), { attendeeCount: increment(-1) })
    }
  }

  return {
    fetchEvents,
    fetchEvent,
    createEvent,
    updateEvent,
    deleteEvent,
    fetchAttendees,
    fetchMyAttendance,
    updateAttendance,
  }
}
