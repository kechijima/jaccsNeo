import type { GroupId } from './user'

// 公開範囲：全体 or 特定グループ限定
export type AnnouncementScope = 'all' | GroupId

export interface Announcement {
  id: string
  title: string
  body: string
  scope: AnnouncementScope
  isPublished: boolean
  authorName: string
  publishedAt: Date
  createdAt: Date
  updatedAt: Date
}

export type AnnouncementInput = Omit<Announcement, 'id' | 'createdAt' | 'updatedAt'>

export const ANNOUNCEMENT_SCOPE_LABELS: Record<AnnouncementScope, string> = {
  all:      '全体',
  reterace: 'Reterace',
  miraito:  'Miraito',
  asset:    'Asset',
}

export const ANNOUNCEMENT_SCOPE_COLORS: Record<AnnouncementScope, string> = {
  all:      'bg-green-100 text-green-700',
  reterace: 'bg-indigo-100 text-indigo-700',
  miraito:  'bg-sky-100 text-sky-700',
  asset:    'bg-amber-100 text-amber-700',
}
