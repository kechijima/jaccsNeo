import type { Timestamp } from 'firebase/firestore'
import type { GroupId } from './user'

export interface Kumiai {
  id: string
  groupId: GroupId
  name: string
  adminName?: string
  memberCount: number
  displayOrder: number
  // 組合登録前の「準備室」ステータス。申請承認で'preparatory'として作成され、
  // 「準備室→組合」昇格申請の承認で'active'に変わる。未設定は'active'扱い（既存データとの後方互換）
  status?: 'preparatory' | 'active'
  // 組合の解体（申請承認で設定される）。データは残したまま、選択肢からのみ除外する
  isDissolved?: boolean
  dissolvedAt?: Timestamp
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
