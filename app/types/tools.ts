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
  genre?: string
  // 公開範囲。未設定・空配列の場合は制限なし（全員に公開）。通常グループはGroupIdを、
  // 専門チームは`team:<specialTeamId>`形式の文字列を格納し、同じ配列内で区別する
  visibleGroupIds?: string[]
  // 視聴に必要な最低タイトル（例: 'EM1'）。未設定なら制限なし。TITLE_OPTIONSの序列で判定する
  minTitleLevel?: string
  createdByUid: string
  createdByName: string
  createdAt: Timestamp
}

export interface ManagedVideoForm {
  title: string
  description?: string
  url: string
  genre?: string
  visibleGroupIds?: string[]
  minTitleLevel?: string
}

// ===================================================
// 業務ツールアプリ: ファイル管理
// ===================================================
export interface ManagedFile {
  id: string
  title: string   // 未設定の過去データはファイル名で代替表示する
  name: string
  url: string
  size: number
  contentType?: string
  // 公開範囲。未設定・空配列の場合は制限なし（全員に公開）。動画配信と同じ形式
  // （通常グループはGroupIdを、専門チームは`team:<specialTeamId>`形式の文字列で格納）
  visibleGroupIds?: string[]
  // 閲覧に必要な最低タイトル（例: 'EM1'）。未設定なら制限なし。TITLE_OPTIONSの序列で判定する
  minTitleLevel?: string
  uploadedByUid: string
  uploadedByName: string
  createdAt: Timestamp
}

export interface ManagedFileForm {
  title: string
  creatorUid: string
  creatorName: string
  visibleGroupIds?: string[]
  minTitleLevel?: string
}
