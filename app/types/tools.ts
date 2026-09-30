import type { Timestamp } from 'firebase/firestore'

// ===================================================
// 業務ツールアプリ: 問い合わせ管理
// ===================================================
export type InquiryStatus = 'open' | 'in_progress' | 'done'

export const INQUIRY_STATUS_LABELS: Record<InquiryStatus, string> = {
  open:        '未対応',
  in_progress: '対応中',
  done:        '完了',
}

export interface Inquiry {
  id: string
  subject: string
  content: string
  status: InquiryStatus
  createdByUid: string
  createdByName: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface InquiryForm {
  subject: string
  content: string
}

// ===================================================
// 業務ツールアプリ: 動画配信
// ===================================================
export interface ManagedVideo {
  id: string
  title: string
  description?: string
  url: string   // YouTube等の視聴URL（そのままiframe埋め込みで再生する）
  createdByUid: string
  createdByName: string
  createdAt: Timestamp
}

export interface ManagedVideoForm {
  title: string
  description?: string
  url: string
}

// ===================================================
// 業務ツールアプリ: ファイル管理
// ===================================================
export interface ManagedFile {
  id: string
  name: string
  url: string
  size: number
  contentType?: string
  uploadedByUid: string
  uploadedByName: string
  createdAt: Timestamp
}
