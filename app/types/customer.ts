import type { Timestamp } from 'firebase/firestore'

export type CustomerType = 'individual' | 'corporate'

export interface FamilyMember {
  name: string
  relationship: string
  dob?: string
  occupation?: string
}

export interface CustomerServices {
  lifeInsurance?: string    // 生命保険
  fireInsurance?: string    // 火災保険
  autoInsurance?: string    // 自動車保険
  realEstateRental?: string // 不動産（賃貸）
  realEstateSale?: string   // 不動産（売買）
  communication?: string    // 通信
  travel?: string           // 旅行
  auto?: string             // 自動車
  utilities?: string        // 光熱費
  solar?: string            // 太陽光
  moving?: string           // 引越し
  furniture?: string        // 家具・家電
  jobChange?: string        // 転職
  renovation?: string       // 住宅リフォーム
  carInspection?: string    // 車検
  legal?: string            // 法務関係
  inheritance?: string      // 相続関係
  bridal?: string           // ブライダル
  funeral?: string          // お葬式
  grave?: string            // お墓
  buddhistAltar?: string    // 現代仏壇・アウトレット
  estateClearing?: string   // 遺品整理
  will?: string             // 公正証書遺言
  inheritanceMeasures?: string // 相続対策一任業務
  loanSupport?: string      // 融資申請サポート
  insuranceConsulting?: string // 保険営業マンコンサルティング
  bankConsulting?: string   // 銀行員独立支援コンサルティング
  pikaraHikari?: string     // ピカラ光
  realEstateLending?: string // 不動産貸出し（家主用）
  accounting?: string       // 会計記帳
  communicationLine?: string // 通信回線
  hpMaintenance?: string    // HP制作-保守運用-サーバー契約
  ma?: string               // M&A
  gift?: string             // ギフト購入
  waterServer?: string      // ウォーターサーバー
  communicationDiagnosis?: string // 通信環境診断
  communicationDiagnosisKato?: string // 通信環境診断(加藤)
  ttMatsuo?: string         // TT松尾総合
  businessCard?: string     // 名刺制作
}

export interface Reminder {
  label: string
  scheduledAt?: string
}

export interface Appointment {
  place?: string
  date?: string   // "YYYY-MM-DD HH:mm" 形式
  note?: string
}

export interface Customer {
  id: string
  kintoneId?: string         // レコード番号（移行用）

  type: CustomerType         // 個人/法人区分

  // ===== 個人基本情報 =====
  name: string               // 氏名（フルネーム）
  nameKana?: string          // フリガナ
  gender?: string            // 性別
  dob?: string               // 生年月日（本人）YYYY-MM-DD
  tel?: string               // ＴＥＬ
  email?: string             // メールアドレス
  postalCode?: string        // 郵便番号
  address?: string           // 住所
  hometown?: string          // 出身
  employer?: string          // 勤務先
  annualIncome?: string      // 年収
  jobType?: string           // 職種
  nationality?: string       // 国籍

  // ===== 家族情報 =====
  familyMembers?: FamilyMember[]  // 家族（最大6名）
  otherFamily?: string            // その他家族

  // ===== 法人情報 =====
  companyName?: string       // 法人名
  companyNameKana?: string   // 法人名（カナ）
  headOffice?: string        // 本店所在地
  companyTel?: string        // TEL（代表番号）
  establishedDate?: string   // 設立年月日
  capital?: string           // 資本金
  fiscalMonth?: string       // 決算月
  industry?: string          // 業種
  annualSales?: string       // 年商
  employees?: string         // 従業員の有無
  ceoName?: string           // 代表取締役氏名（フルネーム）
  ceoNameKana?: string       // 代表取締役氏名（フリガナ）
  ceoPostalCode?: string     // 代表取締役郵便番号
  ceoAddress?: string        // 代表取締役住所

  // ===== 担当・関係性 =====
  assignedFpId?: string      // 担当FP（user UID）
  assignedFpName?: string    // 担当FP名（表示用）
  relationship?: string      // 関係性
  stage?: string             // 段数

  // ===== 紹介 =====
  referralSource?: string    // 紹介元
  referralCount?: number     // 紹介数

  // ===== 活動状況 =====
  one?: string               // ワン
  two?: string               // ツー
  status1?: string           // 状況（ワン）
  status2?: string           // 状況（ツー）
  postFollowStatus?: string  // フォロー以降の状況

  // ===== アポ情報 =====
  appointment1?: Appointment // ワン_アポ
  appointment2?: Appointment // ツー_アポ

  // ===== リマインダー =====
  reminders?: Reminder[]     // 最大3件

  // ===== サービス =====
  services?: CustomerServices

  // ===== SNS・その他 =====
  snsUrl?: string            // SNS/HPのURL

  // ===== 管理情報 =====
  createdBy?: string
  updatedBy?: string
  createdAt: Timestamp | Date
  updatedAt: Timestamp | Date
}

// フォーム用（IDなし、タイムスタンプ省略可）
export type CustomerForm = Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>

// 一覧表示用（軽量版）
export interface CustomerSummary {
  id: string
  kintoneId?: string
  type: CustomerType
  name: string
  nameKana?: string
  tel?: string
  email?: string
  address?: string
  assignedFpName?: string
  relationship?: string
  stage?: string
  status1?: string
  updatedAt: Timestamp | Date
}

// CSV列ヘッダー → Customerフィールド マッピング定義
export const CSV_FIELD_MAP: Record<string, string> = {
  'レコード番号':           'kintoneId',
  '氏名（フルネーム）':     'name',
  'フリガナ':               'nameKana',
  '性別':                   'gender',
  '生年月日（本人）':       'dob',
  'ＴＥＬ':                 'tel',
  'メールアドレス':         'email',
  '郵便番号':               'postalCode',
  '住所':                   'address',
  'その他家族':             'otherFamily',
  '出身':                   'hometown',
  '勤務先':                 'employer',
  '年収':                   'annualIncome',
  '関係性':                 'relationship',
  '段数':                   'stage',
  '紹介元':                 'referralSource',
  '紹介数':                 'referralCount',
  'ワン':                   'one',
  'ツー':                   'two',
  '状況（ワン）':           'status1',
  '状況（ツー）':           'status2',
  'フォロー以降の状況':     'postFollowStatus',
  '職種':                   'jobType',
  '国籍':                   'nationality',
  '担当 未来設計士?':       'assignedFpName',
  '更新者':                 'updatedBy',
  'SNS（facebook、ｲﾝｽﾀ、Twitterなど）またはHPのURL': 'snsUrl',
  // 法人
  '法人名':                 'companyName',
  '法人名（カナ）':         'companyNameKana',
  '本店所在地':             'headOffice',
  'TEL（代表番号など）':    'companyTel',
  '設立年月日':             'establishedDate',
  '資本金':                 'capital',
  '決算月':                 'fiscalMonth',
  '業種':                   'industry',
  '年商':                   'annualSales',
  '従業員の有無（パート・アルバイト・派遣含む）': 'employees',
  '代表取締役氏名（フルネーム）': 'ceoName',
  '代表取締役氏名（フリガナ）':   'ceoNameKana',
  '代表取締役郵便番号':     'ceoPostalCode',
  '代表取締役住所':         'ceoAddress',
  'SNSまたはHPのURL':       'snsUrl',
  '個人/法人区分':          '_type',
}

// サービスフィールドのCSV→Firestoreマッピング
export const CSV_SERVICE_MAP: Record<string, keyof CustomerServices> = {
  '生命保険':     'lifeInsurance',
  '火災保険':     'fireInsurance',
  '自動車保険':   'autoInsurance',
  '不動産（賃貸）': 'realEstateRental',
  '不動産（売買）': 'realEstateSale',
  '通信':         'communication',
  '旅行':         'travel',
  '自動車':       'auto',
  '光熱費':       'utilities',
  '太陽光':       'solar',
  '引越し':       'moving',
  '家具・家電':   'furniture',
  '転職':         'jobChange',
  '住宅リフォーム': 'renovation',
  '車検':         'carInspection',
  '法務関係':     'legal',
  '相続関係':     'inheritance',
  'ブライダル':   'bridal',
  'お葬式':       'funeral',
  'お墓':         'grave',
  '現代仏壇・アウトレット': 'buddhistAltar',
  '遺品整理':     'estateClearing',
  '公正証書遺言': 'will',
  '相続対策一任業務': 'inheritanceMeasures',
  '融資申請サポート': 'loanSupport',
  '保険営業マンコンサルティング': 'insuranceConsulting',
  '銀行員独立支援コンサルティング': 'bankConsulting',
  'ピカラ光':     'pikaraHikari',
  '不動産貸出し（家主用）': 'realEstateLending',
  '会計記帳':     'accounting',
  'TT松尾総合':   'ttMatsuo',
  '名刺制作':     'businessCard',
  'M&A':          'ma',
  'ギフト購入':   'gift',
  'ウォーターサーバー': 'waterServer',
  '通信環境診断': 'communicationDiagnosis',
  '通信環境診断(加藤)': 'communicationDiagnosisKato',
  'HP制作-保守運用-サーバー契約(鹿児島)': 'hpMaintenance',
}

// 家族フィールドのCSV列名パターン
export const FAMILY_MEMBER_FIELDS = [
  { nameCol: '氏名',   relCol: '続柄',   dobCol: '生年月日',  occCol: '職業・その他'  },
  { nameCol: '氏名２', relCol: '続柄２', dobCol: '生年月日２', occCol: '職業・その他２' },
  { nameCol: '氏名３', relCol: '続柄３', dobCol: '生年月日３', occCol: '職業・その他３' },
  { nameCol: '氏名４', relCol: '続柄４', dobCol: '生年月日４', occCol: '職業・その他４' },
  { nameCol: '氏名５', relCol: '続柄５', dobCol: '生年月日５', occCol: '職業・その他５' },
  { nameCol: '氏名６', relCol: '続柄６', dobCol: '生年月日６', occCol: '職業・その他６' },
]
