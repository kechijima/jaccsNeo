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
import type { AppUser } from '~/types/user'
import { useAuthStore } from '~/stores/auth'
import { useUsers } from '~/composables/useUsers'

const toNotif = (id: string, data: DocumentData): Notification => ({ id, ...data }) as Notification

// ── メンション対象 → 通知すべき UID 一覧（実際のFirestoreユーザー一覧を渡す） ──
export const resolveMentionUids = (mentionId: string, users: AppUser[]): string[] => {
  if (mentionId === 'all') {
    return users.map(u => u.uid)
  }
  if (mentionId.startsWith('group:')) {
    const groupId = mentionId.replace('group:', '')
    return users.filter(u => u.groupId === groupId).map(u => u.uid)
  }
  // 個人UID
  return users.find(u => u.uid === mentionId) ? [mentionId] : []
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
  const { fetchUsers } = useUsers()

  const notifCol = () => {
    const uid = authStore.user?.uid
    if (!uid) throw new Error('ログインが必要です')
    return collection($db, 'notifications', uid, 'items')
  }

  // ===== 通知一覧（リアルタイム） =====
  const subscribeNotifications = (callback: (notifs: Notification[]) => void, onError?: (e: unknown) => void): Unsubscribe => {
    const q = query(notifCol(), orderBy('createdAt', 'desc'), limit(50))
    return onSnapshot(
      q,
      (snap) => callback(snap.docs.map(d => toNotif(d.id, d.data()))),
      (e) => { console.error('通知の取得に失敗しました', e); onError?.(e) },
    )
  }

  // ===== 未読件数（リアルタイム） =====
  const subscribeUnreadCount = (callback: (count: number) => void, onError?: (e: unknown) => void): Unsubscribe => {
    const q = query(notifCol(), where('isRead', '==', false))
    return onSnapshot(
      q,
      (snap) => callback(snap.size),
      (e) => { console.error('未読通知数の取得に失敗しました', e); onError?.(e) },
    )
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
    snap.docs.forEach(d => batch.update(d.ref, { isRead: true }))
    await batch.commit()
  }

  // ===== 通知送信 =====
  const sendNotification = async (
    targetUid: string,
    data: { type: NotificationType; title: string; body: string; linkUrl?: string; relatedId?: string },
  ): Promise<void> => {
    if (!targetUid) return
    const col = collection($db, 'notifications', targetUid, 'items')
    await addDoc(col, {
      ...data,
      uid: targetUid,
      isRead: false,
      createdAt: serverTimestamp(),
    })
  }

  // ===== メンション通知を一括送信 =====
  const sendMentionNotifications = async (
    html: string,
    authorName: string,
    spaceId: string,
    postId: string,
    type: 'post' | 'comment' = 'post',
  ): Promise<void> => {
    const mentionIds = extractMentionIds(html)
    if (mentionIds.length === 0) return

    const users = await fetchUsers().catch(() => [] as AppUser[])
    const currentUid = authStore.user?.uid ?? ''
    const sent = new Set<string>()

    for (const mentionId of mentionIds) {
      const uids = resolveMentionUids(mentionId, users)
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
