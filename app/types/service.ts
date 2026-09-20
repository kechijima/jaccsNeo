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
  autoInsurance:      '保険',
  realEstatePurchase: '不動産',
  realEstateSale:     '不動産',
  realEstateRental:   '不動産',
  homeLoan:           '不動産',
  jobChange:          'キャリア',
  seniorPlanning:     'キャリア',
  communication:      '通信',
  hikari:             '通信',
  moving:             'ライフ',
  renovation:         'ライフ',
  travel:             'ライフ',
  bridal:             'ライフ',
  waterServer:        'ライフ',
  legal:              '法務',
  inheritance:        '法務',
  companySetup:       '法務',
}

// アプリ管理でアプリに設定できるカテゴリと、一覧表示に使う見た目定義
export const APP_CATEGORY_DEFS: Record<string, {
  icon: string; color: string; bgColor: string; badgeColor: string; activeColor: string; borderColor: string
}> = {
  '保険':   { icon: 'heroicons:shield-check', color: 'text-blue-600',   bgColor: 'bg-blue-50',   badgeColor: 'bg-blue-100 text-blue-700',     activeColor: 'bg-blue-600 text-white',   borderColor: 'border-blue-100' },
  '不動産': { icon: 'heroicons:home',         color: 'text-amber-600',  bgColor: 'bg-amber-50',  badgeColor: 'bg-amber-100 text-amber-700',   activeColor: 'bg-amber-500 text-white',  borderColor: 'border-amber-100' },
  'キャリア': { icon: 'heroicons:briefcase',    color: 'text-purple-600', bgColor: 'bg-purple-50', badgeColor: 'bg-purple-100 text-purple-700', activeColor: 'bg-purple-600 text-white', borderColor: 'border-purple-100' },
  '通信':   { icon: 'heroicons:wifi',         color: 'text-sky-600',    bgColor: 'bg-sky-50',    badgeColor: 'bg-sky-100 text-sky-700',       activeColor: 'bg-sky-600 text-white',    borderColor: 'border-sky-100' },
  'ライフ': { icon: 'heroicons:sparkles',     color: 'text-rose-600',   bgColor: 'bg-rose-50',   badgeColor: 'bg-rose-100 text-rose-700',     activeColor: 'bg-rose-500 text-white',   borderColor: 'border-rose-100' },
  '法務':   { icon: 'heroicons:scale',        color: 'text-gray-600',   bgColor: 'bg-gray-100',  badgeColor: 'bg-gray-200 text-gray-700',     activeColor: 'bg-gray-700 text-white',   borderColor: 'border-gray-200' },
  'その他': { icon: 'heroicons:squares-2x2',  color: 'text-teal-600',   bgColor: 'bg-teal-50',   badgeColor: 'bg-teal-100 text-teal-700',     activeColor: 'bg-teal-600 text-white',   borderColor: 'border-teal-100' },
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
  customFields?: Record<string, string | string[]>
}

export interface ServiceSummary {
  serviceType: ServiceType
  caseCount: number
  latestStatus?: ServiceStatus
  latestUpdatedAt?: Timestamp
}
