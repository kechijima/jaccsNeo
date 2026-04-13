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
  addDoc,
  serverTimestamp,
  type Unsubscribe,
  type DocumentData,
} from 'firebase/firestore'
import type { Notification, NotificationType } from '~/types/notification'
import { useAuthStore } from '~/stores/auth'
import { MOCK_NOTIFICATIONS, MOCK_ADMIN_USERS } from '~/data/mock'

const toNotif = (id: string, data: DocumentData): Notification => ({ id, ...data }) as Notification

// ── モック通知ストア（ssr:false なのでモジュールレベル ref が安全） ──────
const mockNotifList = ref([...MOCK_NOTIFICATIONS])

// ── メンション対象 → 通知すべき UID 一覧 ──────────────────────────────
export const resolveMentionUids = (mentionId: string): string[] => {
  if (mentionId === 'all') {
    return MOCK_ADMIN_USERS.map(u => u.uid)
  }
  if (mentionId.startsWith('group:')) {
    const groupId = mentionId.replace('group:', '')
    return MOCK_ADMIN_USERS.filter(u => u.groupId === groupId).map(u => u.uid)
  }
  // 個人UID
  return MOCK_ADMIN_USERS.find(u => u.uid === mentionId) ? [mentionId] : []
}

// ── HTML からメンション ID を抽出 ───────────────────────────────────────
export const extractMentionIds = (html: string): string[] => {
  if (typeof window === 'undefined') return []
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  return Array.from(doc.querySelectorAll('[data-type="mention"]'))
    .map(el => el.getAttribute('data-id') ?? '')
    .filter(Boolean)
}

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
    try {
      const q = query(notifCol(), orderBy('createdAt', 'desc'), limit(50))
      return onSnapshot(q, (snap) => {
        callback(snap.docs.map(d => toNotif(d.id, d.data())))
      })
    } catch (e) {
      console.warn('Using mock notifications')
      // モック: リアクティブストアを watchEffect で購読
      const stop = watchEffect(() => {
        callback([...mockNotifList.value].sort(
          (a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0)
        ) as Notification[])
      })
      return stop
    }
  }

  // ===== 未読件数（リアルタイム） =====
  const subscribeUnreadCount = (callback: (count: number) => void): Unsubscribe => {
    try {
      const q = query(notifCol(), where('isRead', '==', false))
      return onSnapshot(q, (snap) => {
        callback(snap.size)
      })
    } catch (e) {
      const stop = watchEffect(() => {
        callback(mockNotifList.value.filter(n => !n.isRead).length)
      })
      return stop
    }
  }

  // ===== 既読にする =====
  const markAsRead = async (notifId: string): Promise<void> => {
    const uid = authStore.user?.uid
    if (!uid) return
    try {
      await updateDoc(doc($db, 'notifications', uid, 'items', notifId), { isRead: true })
    } catch {
      const n = mockNotifList.value.find(n => n.id === notifId)
      if (n) (n as any).isRead = true
    }
  }

  // ===== 全て既読 =====
  const markAllAsRead = async (): Promise<void> => {
    const uid = authStore.user?.uid
    if (!uid) return
    try {
      const q = query(notifCol(), where('isRead', '==', false))
      const snap = await getDocs(q)
      if (snap.empty) return
      const batch = writeBatch($db)
      snap.docs.forEach(d => batch.update(d.ref, { isRead: true }))
      await batch.commit()
    } catch {
      mockNotifList.value.forEach(n => { (n as any).isRead = true })
    }
  }

  // ===== 通知送信 =====
  const sendNotification = async (
    targetUid: string,
    data: { type: NotificationType; title: string; body: string; linkUrl?: string; relatedId?: string }
  ): Promise<void> => {
    try {
      const col = collection($db, 'notifications', targetUid, 'items')
      await addDoc(col, {
        ...data,
        uid: targetUid,
        isRead: false,
        createdAt: serverTimestamp(),
      })
    } catch {
      // モック: 現在のユーザー宛ならリストに追加して通知ページで見えるようにする
      const currentUid = authStore.user?.uid ?? 'mock-user-123'
      if (targetUid === currentUid || targetUid === 'mock-user-123') {
        const ts = { toDate: () => new Date(), seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 }
        mockNotifList.value.unshift({
          id:       `mock-${Date.now()}-${Math.random()}`,
          uid:      targetUid,
          type:     data.type,
          title:    data.title,
          body:     data.body,
          isRead:   false,
          linkUrl:  data.linkUrl,
          relatedId: data.relatedId,
          createdAt: ts,
        } as any)
      }
    }
  }

  // ===== メンション通知を一括送信 =====
  const sendMentionNotifications = async (
    html: string,
    authorName: string,
    spaceId: string,
    postId: string,
    type: 'post' | 'comment' = 'post'
  ): Promise<void> => {
    const mentionIds = extractMentionIds(html)
    if (mentionIds.length === 0) return

    const currentUid = authStore.user?.uid ?? 'mock-user-123'
    const sent = new Set<string>()

    for (const mentionId of mentionIds) {
      const uids = resolveMentionUids(mentionId)
      for (const uid of uids) {
        if (uid === currentUid || sent.has(uid)) continue
        sent.add(uid)
        await sendNotification(uid, {
          type:      'mention',
          title:     'メンションされました',
          body:      `${authorName} さんが${type === 'comment' ? 'コメント' : '投稿'}であなたをメンションしました。`,
          linkUrl:   `/portal/spaces/${spaceId}/posts/${postId}`,
          relatedId: postId,
        })
      }
    }
  }

  return {
    subscribeNotifications,
    subscribeUnreadCount,
    markAsRead,
    markAllAsRead,
    sendNotification,
    sendMentionNotifications,
  }
}
