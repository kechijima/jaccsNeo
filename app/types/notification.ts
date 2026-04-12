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
