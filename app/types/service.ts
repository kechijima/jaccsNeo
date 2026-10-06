import type { Timestamp } from 'firebase/firestore'

export type ServiceStatus = 'consulting' | 'considering' | 'contracted' | 'completed' | 'failed'

export type ServiceType =
  | 'lifeInsurance'
  | 'fireInsurance'
  | 'autoInsurance'
  | 'realEstatePurchase'
  | 'realEstateSale'
  | 'realEstateRental'
  | 'homeLoan'
  | 'jobChange'
  | 'seniorPlanning'
  | 'communication'
  | 'hikari'
  | 'moving'
  | 'renovation'
  | 'travel'
  | 'bridal'
  | 'legal'
  | 'inheritance'
  | 'companySetup'
  | 'waterServer'

export const SERVICE_LABELS: Record<string, string> = {
  lifeInsurance:     '生命保険',
  fireInsurance:     '火災保険',
  autoInsurance:     '自動車保険（ソニー損保）',
  realEstatePurchase:'不動産購入',
  realEstateSale:    '不動産売却',
  realEstateRental:  '不動産賃貸',
  homeLoan:          '住宅ローン',
  jobChange:         '転職',
  seniorPlanning:    'シニアプランニング',
  communication:     '通信回線',
  hikari:            'ピカラ光',
  moving:            '引越し',
  renovation:        'リフォーム',
  travel:            '旅行',
  bridal:            '結婚式場紹介',
  legal:             '法務関係',
  inheritance:       '相続・遺言',
  companySetup:      '法人設立',
  waterServer:       'ウォーターサーバー',
}

// 固定18種＋生命保険の、既定のカテゴリ分類（アプリ管理でAppDefにカテゴリが
// 設定されていない場合のフォールバックとして使用）
export const SERVICE_CATEGORY_MAP: Record<string, string> = {
  lifeInsurance:      '保険',
  fireInsurance:      '保険',
  autoInsurance:      '自動車関連',
  realEstatePurchase: '住宅関連',
  realEstateSale:     '住宅関連',
  realEstateRental:   '住宅関連',
  homeLoan:           '住宅関連',
  jobChange:          'キャリア',
  seniorPlanning:     'キャリア',
  communication:      '通信関係',
  hikari:             '通信関係',
  moving:             'ライフイベント',
  renovation:         '住宅関連',
  travel:             'ライフイベント',
  bridal:             'ライフイベント',
  waterServer:        '光熱費関連',
  legal:              '法務案件',
  inheritance:        '法務案件',
  companySetup:       '事業者',
}

// アプリ管理でアプリに設定できるカテゴリと、一覧表示に使う見た目定義
export const APP_CATEGORY_DEFS: Record<string, {
  icon: string; color: string; bgColor: string; badgeColor: string; activeColor: string; borderColor: string
}> = {
  '法務案件':     { icon: 'heroicons:scale',           color: 'text-gray-600',   bgColor: 'bg-gray-100',   badgeColor: 'bg-gray-200 text-gray-700',     activeColor: 'bg-gray-700 text-white',   borderColor: 'border-gray-200' },
  '自動車関連':   { icon: 'heroicons:truck',           color: 'text-orange-600', bgColor: 'bg-orange-50',  badgeColor: 'bg-orange-100 text-orange-700', activeColor: 'bg-orange-500 text-white', borderColor: 'border-orange-100' },
  'キャリア':     { icon: 'heroicons:briefcase',        color: 'text-purple-600', bgColor: 'bg-purple-50',  badgeColor: 'bg-purple-100 text-purple-700', activeColor: 'bg-purple-600 text-white', borderColor: 'border-purple-100' },
  'ライフイベント': { icon: 'heroicons:sparkles',       color: 'text-rose-600',   bgColor: 'bg-rose-50',    badgeColor: 'bg-rose-100 text-rose-700',     activeColor: 'bg-rose-500 text-white',   borderColor: 'border-rose-100' },
  '光熱費関連':   { icon: 'heroicons:bolt',            color: 'text-yellow-600', bgColor: 'bg-yellow-50',  badgeColor: 'bg-yellow-100 text-yellow-700', activeColor: 'bg-yellow-500 text-white', borderColor: 'border-yellow-100' },
  '住宅関連':     { icon: 'heroicons:home',            color: 'text-amber-600',  bgColor: 'bg-amber-50',   badgeColor: 'bg-amber-100 text-amber-700',   activeColor: 'bg-amber-500 text-white',  borderColor: 'border-amber-100' },
  '保険':         { icon: 'heroicons:shield-check',     color: 'text-blue-600',   bgColor: 'bg-blue-50',    badgeColor: 'bg-blue-100 text-blue-700',     activeColor: 'bg-blue-600 text-white',   borderColor: 'border-blue-100' },
  'Webサービス':  { icon: 'heroicons:globe-alt',       color: 'text-cyan-600',   bgColor: 'bg-cyan-50',    badgeColor: 'bg-cyan-100 text-cyan-700',     activeColor: 'bg-cyan-600 text-white',   borderColor: 'border-cyan-100' },
  'その他':       { icon: 'heroicons:squares-2x2',     color: 'text-teal-600',   bgColor: 'bg-teal-50',    badgeColor: 'bg-teal-100 text-teal-700',     activeColor: 'bg-teal-600 text-white',   borderColor: 'border-teal-100' },
  '通信関係':     { icon: 'heroicons:wifi',            color: 'text-sky-600',    bgColor: 'bg-sky-50',     badgeColor: 'bg-sky-100 text-sky-700',       activeColor: 'bg-sky-600 text-white',    borderColor: 'border-sky-100' },
  '事業者':       { icon: 'heroicons:building-office',  color: 'text-indigo-600', bgColor: 'bg-indigo-50',  badgeColor: 'bg-indigo-100 text-indigo-700', activeColor: 'bg-indigo-600 text-white', borderColor: 'border-indigo-100' },
  '販売':         { icon: 'heroicons:shopping-bag',    color: 'text-green-600',  bgColor: 'bg-green-50',   badgeColor: 'bg-green-100 text-green-700',   activeColor: 'bg-green-600 text-white',  borderColor: 'border-green-100' },
}

export const APP_CATEGORY_LIST = Object.keys(APP_CATEGORY_DEFS)

export const STATUS_LABELS: Record<ServiceStatus, string> = {
  consulting:  '相談中',
  considering: '検討中',
  contracted:  '成約',
  completed:   '完了',
  failed:      '不成立',
}

export interface ServiceProgressReport {
  id: string
  authorUid: string
  authorName: string
  content: string      // 報告内容（リッチテキスト）
  statusFrom?: ServiceStatus
  statusTo?: ServiceStatus
  attachments?: ServiceAttachment[]
  createdAt: Timestamp
}

export interface ServiceCase {
  id: string
  customerId: string
  serviceType: ServiceType
  status: ServiceStatus
  date?: string          // 対応開始日
  contractDate?: string  // 成約日
  amount?: string        // 金額・保険料
  company?: string       // 会社名・保険会社
  notes?: string         // 備考
  reminderDate?: string  // リマインダー日
  reminderNote?: string  // リマインダー内容
  reminderAudienceUids?: string[]  // リマインダーの通知対象者（未設定時はassigneeUid・plannerUidのみに表示）
  assigneeUid?: string    // 担当者（アプリの責任者・担当者から選択）
  plannerUid?: string     // 担当未来設計士（全ユーザー、またはアプリで許可されたユーザーから選択）
  staleAlertSentFor?: string  // 放置アラートを送信済みのupdatedAt（ISO文字列）。再更新されると自動的に対象外になる
  // アプリ管理（フォームビルダー）でこのserviceTypeに紐づけたAppDefのフィールドID
  // をキーとする入力値。AppDefが設定されていないserviceTypeでは常に空
  customFields?: Record<string, string | string[]>
  attachments?: ServiceAttachment[]
  reports?: ServiceProgressReport[] // 進捗報告
  createdBy: string
  updatedBy: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface ServiceAttachment {
  name: string
  url: string
  size: number
  uploadedAt: Timestamp
}

export interface ServiceCaseForm {
  status: ServiceStatus
  date?: string
  contractDate?: string
  amount?: string
  company?: string
  notes?: string
  reminderDate?: string
  reminderNote?: string
  reminderAudienceUids?: string[]
  assigneeUid?: string
  plannerUid?: string
  customFields?: Record<string, string | string[]>
}

export interface ServiceSummary {
  serviceType: ServiceType
  caseCount: number
  latestStatus?: ServiceStatus
  latestUpdatedAt?: Timestamp
}
