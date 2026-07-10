import type { Timestamp } from 'firebase/firestore'
import type { GroupId, UserRole } from './user'

export type SpaceType = 'group' | 'kumiai' | 'special' | 'all'

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
  isArchived: boolean
  isPinned?: boolean
  headerImage?: string
  pinnedPostId?: string
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
}

export interface PostForm {
  content: string
  attachments?: PostAttachment[]
}
