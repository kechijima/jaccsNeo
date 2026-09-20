import type { Timestamp } from 'firebase/firestore'

export interface AppFieldDef {
  id: string
  type: string
  label: string
  required: boolean
  options: string[]
  // ── ルックアップ設定（type: 'lookup'） ──
  lookupSource?: 'customer' | 'app'  // 参照元: 顧客情報 or 他のアプリ
  lookupCustomerField?: string       // lookupSource='customer'のとき参照する顧客フィールド（例: 'name'）
  lookupAppId?: string               // lookupSource='app'のとき参照するAppDefのID
  lookupFieldKey?: string            // 参照先アプリのフィールドキー（'builtin:status' または カスタムフィールドID）
  // ── 関連レコード一覧設定（type: 'related_records'） ──
  relatedAppId?: string              // 一覧表示するAppDefのID（同一顧客の案件を表示）
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
  staleAlertDays?: number     // 指定日数以上ステータス変更・更新がない場合にアラート通知する。未設定・0以下の場合はアラートなし
  staleAlertStatuses?: string[]  // アラート対象のステータス。未設定時は既定で「相談中」「検討中」
  isPublished: boolean     // 公開（利用可能）かどうか。falseの場合は下書き扱い
  createdBy: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export type AppDefInput = Omit<AppDef, 'id' | 'createdAt' | 'updatedAt'>
