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

// 繰り返し設定（Googleカレンダー風: 毎週◯曜日 / 毎月◯日）。会議種別のイベントのみ設定可能
export type RecurrenceFrequency = 'weekly' | 'monthly'

export interface EventRecurrence {
  frequency: RecurrenceFrequency
  interval: number          // ◯週間ごと・◯ヶ月ごと（1 = 毎週・毎月）
  byWeekdays?: number[]     // frequency:'weekly'の場合の曜日（0=日〜6=土）
  endDate?: string          // 繰り返しの終了日（YYYY-MM-DD、任意）
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
  recurrence?: EventRecurrence
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
  kumiaiId?: string
  category: EventCategory
  recurrence?: EventRecurrence
  attendeeCount: number
  myStatus?: AttendanceStatus
}

export interface EventAttendee {
  uid: string
  displayName: string
  status: AttendanceStatus
  updatedAt: Timestamp
}

// 議事録（種別「会議」のイベントのみ投稿可能。1つのイベントに複数件、時系列で蓄積する）
export interface EventMinutes {
  id: string
  content: string
  authorUid: string
  authorName: string
  createdAt: Date
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
  recurrence?: EventRecurrence
}
