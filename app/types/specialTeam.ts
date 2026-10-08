import type { Timestamp } from 'firebase/firestore'

// 専門チーム（グループ横断の特別チーム。例: 不動産チーム・損保チーム）。
// 将来的に「専門チームへの所属有無に応じた専用ページの表示」等に拡張できるよう、
// ベタ打ちではなくFirestoreのデータとして管理する
export interface SpecialTeamDef {
  id: string
  name: string
  description?: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface SpecialTeamForm {
  name: string
  description?: string
}
