import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  orderBy,
  limit,
  serverTimestamp,
  type DocumentData,
} from 'firebase/firestore'
import type { Meeting, MeetingSummary, MeetingForm } from '~/types/meeting'
import { useAuthStore } from '~/stores/auth'

const toMeeting = (id: string, data: DocumentData): Meeting => ({ id, ...data }) as Meeting

export const useMeetings = () => {
  const { $db } = useNuxtApp()
  const authStore = useAuthStore()

  const meetingsCol = () => collection($db, 'meetings')

  // ===== 会議一覧 =====
  const fetchMeetings = async (): Promise<MeetingSummary[]> => {
    const q = query(meetingsCol(), orderBy('date', 'desc'), limit(50))
    const snap = await getDocs(q)
    return snap.docs.map(d => {
      const data = d.data()
      return {
        id:               d.id,
        date:             data.date,
        spaceName:        data.spaceName,
        totalNewClients:  data.totals?.newClients  ?? 0,
        totalContracts:   data.totals?.contracts   ?? 0,
        totalActivities:  data.totals?.activities  ?? 0,
        participantCount: data.reports?.length ?? 0,
        createdAt:        data.createdAt,
      } as MeetingSummary
    })
  }

  // ===== 1件取得 =====
  const fetchMeeting = async (meetingId: string): Promise<Meeting | null> => {
    const snap = await getDoc(doc($db, 'meetings', meetingId))
    if (!snap.exists()) return null
    return toMeeting(snap.id, snap.data())
  }

  // ===== 作成 =====
  const createMeeting = async (form: MeetingForm): Promise<string> => {
    const reports = form.reports.map(r => ({
      ...r,
      newClients:  r.newClients  ?? 0,
      contracts:   r.contracts   ?? 0,
      activities:  r.activities  ?? 0,
    }))

    const totals = {
      newClients:  reports.reduce((s, r) => s + r.newClients,  0),
      contracts:   reports.reduce((s, r) => s + r.contracts,   0),
      activities:  reports.reduce((s, r) => s + r.activities,  0),
    }

    const ref = await addDoc(meetingsCol(), {
      date:          form.date,
      spaceId:       form.spaceId ?? null,
      spaceName:     form.spaceId ? null : null, // will be filled from space lookup
      memo:          form.memo ?? '',
      reports,
      totals,
      createdBy:     authStore.user?.uid,
      createdByName: authStore.user?.displayName,
      createdAt:     serverTimestamp(),
      updatedAt:     serverTimestamp(),
    })
    return ref.id
  }

  // ===== 更新 =====
  const updateMeeting = async (meetingId: string, form: Partial<MeetingForm>): Promise<void> => {
    const updates: any = { updatedAt: serverTimestamp() }

    if (form.reports) {
      const reports = form.reports.map(r => ({
        ...r,
        newClients:  r.newClients  ?? 0,
        contracts:   r.contracts   ?? 0,
        activities:  r.activities  ?? 0,
      }))
      updates.reports = reports
      updates.totals = {
        newClients:  reports.reduce((s, r) => s + r.newClients,  0),
        contracts:   reports.reduce((s, r) => s + r.contracts,   0),
        activities:  reports.reduce((s, r) => s + r.activities,  0),
      }
    }

    if (form.date)  updates.date  = form.date
    if (form.memo !== undefined) updates.memo = form.memo

    await updateDoc(doc($db, 'meetings', meetingId), updates)
  }

  return {
    fetchMeetings,
    fetchMeeting,
    createMeeting,
    updateMeeting,
  }
}
