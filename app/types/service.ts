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

export const STATUS_LABELS: Record<ServiceStatus, string> = {
  consulting:  '相談中',
  considering: '検討中',
  contracted:  '成約',
  completed:   '完了',
  failed:      '不成立',
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
  attachments?: ServiceAttachment[]
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
}

export interface ServiceSummary {
  serviceType: ServiceType
  caseCount: number
  latestStatus?: ServiceStatus
  latestUpdatedAt?: Timestamp
}
