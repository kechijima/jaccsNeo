import type { Timestamp } from 'firebase/firestore'

export interface AppFieldDef {
  id: string
  type: string
  label: string
  required: boolean
  options: string[]
}

// アプリ管理（フォームビルダー）で作成・管理するアプリ定義
export interface AppDef {
  id: string
  name: string
  description?: string
  fields: AppFieldDef[]
  ownerUid?: string        // アプリ責任者（データの登録・編集・削除を通知）
  staffUids: string[]      // アプリ担当者
  sourceServiceType?: string  // 案件データの保存・連携先キー。未指定の場合は自分自身のIDを使う
  category?: string       // 「アプリ」一覧でのカテゴリ（例: '保険'）。未設定時は自動分類にフォールバック
  isPublished: boolean     // 公開（利用可能）かどうか。falseの場合は下書き扱い
  createdBy: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export type AppDefInput = Omit<AppDef, 'id' | 'createdAt' | 'updatedAt'>
