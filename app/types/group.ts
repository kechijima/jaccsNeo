import type { Timestamp } from 'firebase/firestore'
import type { GroupId } from './user'

export interface Kumiai {
  id: string
  groupId: GroupId
  name: string
  displayOrder: number
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface Group {
  id: GroupId
  name: string
  color: string      // tailwind color name e.g. 'reterace', 'miraito', 'asset'
  kumiai: Kumiai[]
  memberCount: number
}

export interface RestrictedDoc {
  id: string
  title: string
  category: string
  content: string
  attachments: RestrictedAttachment[]
  accessRoles: string[]   // roles allowed to access
  createdBy: string
  createdByName: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface RestrictedAttachment {
  name: string
  url: string
  size: string
  uploadedAt: string
}

export interface RestrictedAccessLog {
  uid: string
  displayName: string
  accessedAt: Timestamp
}

export interface RestrictedDocForm {
  title: string
  category: string
  content: string
  accessRoles: string[]
}
