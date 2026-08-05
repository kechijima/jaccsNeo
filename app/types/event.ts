import type { Timestamp } from 'firebase/firestore'
import type { GroupId } from './user'

export type AttendanceStatus = 'attending' | 'not_attending' | 'pending'

export type EventScope = 'all' | 'group' | 'kumiai' | 'space'

// イベントの種別（会議/イベント/その他）。グループの配色とは別軸のタグとして表示する
export type EventCategory = 'meeting' | 'event' | 'other'
export const EVENT_CATEGORY_LABELS: Record<EventCategory, string> = {
  meeting: '会議',
  event:   'イベント',
  other:   'その他',
}

export interface Event {
  id: string
  title: string
  description?: string
  startAt: Timestamp
  endAt?: Timestamp
  location?: string
  scope: EventScope
  groupId?: GroupId
  kumiaiId?: string
  spaceId?: string
  postId?: string   // 掲示板（イベントスペース）の投稿から連携作成された場合の投稿ID
  category: EventCategory
  createdBy: string
  createdByName: string
  attendeeCount: number
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface EventSummary {
  id: string
  title: string
  startAt: Timestamp
  endAt?: Timestamp
  location?: string
  scope: EventScope
  groupId?: GroupId
  category: EventCategory
  attendeeCount: number
  myStatus?: AttendanceStatus
}

export interface EventAttendee {
  uid: string
  displayName: string
  status: AttendanceStatus
  updatedAt: Timestamp
}

export interface EventForm {
  title: string
  description?: string
  startAt: string   // ISO datetime string for form
  endAt?: string
  location?: string
  scope: EventScope
  groupId?: GroupId
  kumiaiId?: string
  spaceId?: string
  postId?: string
  category: EventCategory
}
