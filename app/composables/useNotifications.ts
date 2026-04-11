import {
  collection,
  doc,
  getDocs,
  updateDoc,
  query,
  orderBy,
  limit,
  where,
  onSnapshot,
  writeBatch,
  type Unsubscribe,
  type DocumentData,
} from 'firebase/firestore'
import type { Notification } from '~/types/notification'
import { useAuthStore } from '~/stores/auth'

const toNotif = (id: string, data: DocumentData): Notification => ({ id, ...data }) as Notification

export const useNotifications = () => {
  const { $db } = useNuxtApp()
  const authStore = useAuthStore()

  const notifCol = () => {
    const uid = authStore.user?.uid
    if (!uid) throw new Error('Not logged in')
    return collection($db, 'notifications', uid, 'items')
  }

  // ===== 通知一覧（リアルタイム） =====
  const subscribeNotifications = (callback: (notifs: Notification[]) => void): Unsubscribe => {
    const q = query(notifCol(), orderBy('createdAt', 'desc'), limit(50))
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map(d => toNotif(d.id, d.data())))
    })
  }

  // ===== 未読件数（リアルタイム） =====
  const subscribeUnreadCount = (callback: (count: number) => void): Unsubscribe => {
    const q = query(notifCol(), where('isRead', '==', false))
    return onSnapshot(q, (snap) => {
      callback(snap.size)
    })
  }

  // ===== 既読にする =====
  const markAsRead = async (notifId: string): Promise<void> => {
    const uid = authStore.user?.uid
    if (!uid) return
    await updateDoc(doc($db, 'notifications', uid, 'items', notifId), { isRead: true })
  }

  // ===== 全て既読 =====
  const markAllAsRead = async (): Promise<void> => {
    const uid = authStore.user?.uid
    if (!uid) return

    const q = query(notifCol(), where('isRead', '==', false))
    const snap = await getDocs(q)
    if (snap.empty) return

    const batch = writeBatch($db)
    snap.docs.forEach(d => {
      batch.update(d.ref, { isRead: true })
    })
    await batch.commit()
  }

  return {
    subscribeNotifications,
    subscribeUnreadCount,
    markAsRead,
    markAllAsRead,
  }
}
