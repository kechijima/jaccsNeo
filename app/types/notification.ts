import type { Timestamp } from 'firebase/firestore'

export type NotificationType =
  | 'post_comment'
  | 'post_reaction'
  | 'event_created'
  | 'event_reminder'
  | 'meeting_created'
  | 'system'
  | 'customer_assigned'
  | 'mention'

// 通知カテゴリごとの受信設定（マイページ／設定画面で変更する）
export interface NotificationPrefs {
  mention?: boolean   // 自分がメンションされたとき
  comment?: boolean   // 自分の投稿にコメントがついたとき
  event?: boolean     // イベント・会議が作成/更新されたとき
  system?: boolean    // 申請の承認結果などシステムからのお知らせ
}

export const NOTIFICATION_PREF_LABELS: Record<keyof NotificationPrefs, string> = {
  mention: 'メンションされたとき',
  comment: '自分の投稿にコメントがついたとき',
  event:   'イベント・会議が作成されたとき',
  system:  '申請結果などシステムからのお知らせ',
}

// 通知種別 → 対応する設定カテゴリ
const TYPE_TO_PREF_KEY: Record<NotificationType, keyof NotificationPrefs> = {
  mention:           'mention',
  post_comment:      'comment',
  post_reaction:     'comment',
  event_created:     'event',
  event_reminder:    'event',
  meeting_created:   'event',
  customer_assigned: 'system',
  system:            'system',
}

// 通知を作成してよいか（該当カテゴリの設定がオフでないか）を判定する。未設定時はtrue扱い
export const isNotificationAllowed = (type: NotificationType, prefs?: NotificationPrefs | null): boolean => {
  const key = TYPE_TO_PREF_KEY[type]
  return prefs?.[key] ?? true
}

export interface Notification {
  id: string
  uid: string
  type: NotificationType
  title: string
  body: string
  isRead: boolean
  linkUrl?: string
  relatedId?: string    // postId, eventId, meetingId etc.
  createdAt: Timestamp
}
