export interface PolicyCopyFile {
  name: string   // 元のファイル名
  url: string    // Firebase StorageのダウンロードURL
}

// 生命保険アプリの案件データ型（kintone「生命保険」アプリのCSVエクスポート項目に対応）
export interface LifeInsuranceCase {
  id: string
  recordNumber: string         // レコード番号
  customerId?: string          // マッチしたパーソナルデータのCustomer.id（氏名+フリガナで照合）
  connectedRecordId?: string   // 連動番号（編集厳禁）— kintone側の案件番号

  name: string                 // 氏名（フルネーム）
  nameKana?: string            // フリガナ
  gender?: string              // 性別
  dob?: string                 // 生年月日（本人）

  assignedFpName?: string      // 担当 未来設計士
  faceToFaceStaffName?: string // 面前担当者名

  contractContent?: string     // 契約内容
  planningContent?: string     // プランニング内容
  designRequest?: string       // 設計書依頼（保険内容）
  newOrSwitch?: string         // 新規（無保険状態）or 乗換契約

  desiredApptDates?: string[]  // アポ希望日（最大3件）
  availableWeekdays?: string[] // アポ可能曜日（日程が合わない場合）

  monthlyBudget?: string       // 収支（いくら貯金できるか）
  bonus?: string                // ボーナス
  savings?: string              // 貯蓄
  residenceTypes?: string[]     // 住居（実家・賃貸・持ち家）
  metParents?: string           // 親など（ショッカー）に会ったか
  planningPurpose?: string      // プランニング・目的
  policyCopies?: PolicyCopyFile[] // 保険証券コピー（最大3件、Firebase Storageアップロード）

  meetingDate?: string          // 面前日
  scheduledTime?: string        // 設定時刻
  reminder?: string             // リマインダー

  progressStatus?: string       // 進行状況
  managerNotification?: string  // 責任者通知
  manager?: string              // 責任者

  oneStatus?: string            // ワン（状況）
  twoStatus?: string            // ツー（状況）
  followStatus?: string         // フォロー（状況）

  tel?: string
  updatedBy?: string
  createdBy?: string
  createdAt: Date
  updatedAt: Date
}

// 新規作成フォーム用（id・作成日時等は除く）
export type LifeInsuranceCaseInput = Omit<LifeInsuranceCase, 'id' | 'createdAt' | 'updatedAt'>

export const RESIDENCE_TYPE_OPTIONS = ['実家', '賃貸', '持ち家']
export const WEEKDAY_OPTIONS = ['月', '火', '水', '木', '金', '土', '日']
export const MET_PARENTS_OPTIONS = ['会った', '会ってない', '会う必要がない']
export const NEW_OR_SWITCH_OPTIONS = ['新規', '乗換']
export const PROGRESS_STATUS_OPTIONS = ['未成約', '設計書提出', '契約手続き中', '成約', '不成立']

export const LIFE_INSURANCE_FIELD_LABELS: Record<string, string> = {
  contractContent:     '契約内容',
  planningContent:     'プランニング内容',
  designRequest:       '設計書依頼（保険内容）',
  newOrSwitch:         '新規/乗換',
  monthlyBudget:       '収支（貯金できる額）',
  bonus:               'ボーナス',
  savings:             '貯蓄',
  planningPurpose:     'プランニング・目的',
  progressStatus:      '進行状況',
  manager:             '責任者',
  oneStatus:           'ワン（状況）',
  twoStatus:           'ツー（状況）',
  followStatus:        'フォロー（状況）',
}
