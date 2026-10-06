import type { Timestamp } from 'firebase/firestore'
import type { GroupId, UserRole } from './user'

export type SpaceType = 'report' | 'board' | 'kumiai' | 'event' | 'group' | 'meeting' | 'other'

export interface Space {
  id: string
  name: string
  description?: string
  type: SpaceType
  groupId?: GroupId
  kumiaiId?: string
  memberUids: string[]
  adminUids: string[]
  // メンバー個別指定に加え、権限（役割）やグループ単位でも対象者を指定できる
  targetGroupIds?: GroupId[]
  targetRoles?: UserRole[]
  // 閲覧に必要な最低タイトル（例: 'EM1'）。未設定なら制限なし。TITLE_OPTIONSの序列で判定する
  minTitleLevel?: string
  // 連動するカレンダーの会議（種別「会議」）のイベントID。type:'meeting'のスペースのみ設定可能で、
  // 設定するとスペース上でそのイベントの議事録（全期間分）を閲覧できる
  linkedEventId?: string
  isArchived: boolean
  isPinned?: boolean
  headerImage?: string
  pinnedPostId?: string
  postCount?: number
  createdBy: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface SpaceSummary {
  id: string
  name: string
  type: SpaceType
  groupId?: GroupId
  memberCount: number
  isArchived: boolean
  lastPostAt?: Timestamp
}

export interface Post {
  id: string
  spaceId: string
  authorUid: string
  authorName: string
  content: string
  attachments?: PostAttachment[]
  reactionCounts: Record<string, number>  // emoji -> count
  commentCount: number
  isPinned: boolean
  // 'draft'は投稿者本人にのみ表示される下書き。未設定の既存投稿は'published'扱いとする
  status?: 'draft' | 'published'
  // イベントスペース専用項目（開催日時とカレンダー連携）
  eventStartAt?: Timestamp
  eventEndAt?: Timestamp
  syncToCalendar?: boolean
  linkedEventId?: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface PostAttachment {
  name: string
  url: string
  size: number
}

export interface Reaction {
  postId: string
  emoji: string
  uid: string
  createdAt: Timestamp
}

export interface Comment {
  id: string
  postId: string
  spaceId: string
  authorUid: string
  authorName: string
  content: string
  createdAt: Timestamp
}

export interface SpaceForm {
  name: string
  description?: string
  type: SpaceType
  groupId?: GroupId
  kumiaiId?: string
  isPinned?: boolean
  headerImage?: string
  memberUids?: string[]
  targetGroupIds?: GroupId[]
  targetRoles?: UserRole[]
  minTitleLevel?: string
  linkedEventId?: string
}

export interface PostForm {
  content: string
  attachments?: PostAttachment[]
  eventStartAt?: string   // ISO datetime string（イベントスペースのみ）
  eventEndAt?: string
  syncToCalendar?: boolean
  linkedEventId?: string
  status?: 'draft' | 'published'
}
