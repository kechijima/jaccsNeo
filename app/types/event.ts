import type { Timestamp } from 'firebase/firestore'
import type { GroupId } from './user'

export type AttendanceStatus = 'attending' | 'not_attending' | 'pending'

export type EventScope = 'all' | 'group' | 'kumiai' | 'space'

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
}
