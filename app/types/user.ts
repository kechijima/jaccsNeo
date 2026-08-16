import type { NotificationPrefs } from './notification'

export type UserRole = 'system_admin' | 'board' | 'em2_above' | 'general'

export type SpecialTeam = 'real_estate' | 'non_life_insurance'

// タイトル（旧: 役職）の選択肢
export const TITLE_OPTIONS = [
  'Sプラン', 'Bプラン',
  'EM1', 'EM2', 'EM3', 'EM4',
  'PM1', 'PM3', 'PM6', 'PM9', 'PM12',
  'MM1', 'MM2', 'MM3', 'MM4', 'MM5', 'MM6',
] as const

// グループはFirestoreの groups コレクションで動的に追加できるため、固定の列挙型ではなくstringとする
export type GroupId = string

export interface AppUser {
  uid:          string
  email:        string
  displayName:  string
  avatarUrl?:   string
  role:         UserRole
  specialTeams: SpecialTeam[]
  groupId?:     GroupId
  kumiaiId?:    string
  kumiaiName?:  string
  position?:    string
  isActive?:    boolean

  // ── 組合員の脱退（申請承認で設定される。trueの場合はシステムを利用できない） ──
  isWithdrawn?:  boolean
  withdrawnAt?:  Date

  // ── 基本情報 ──────────────────────────────────────────────────────────
  lastName?:       string
  firstName?:      string
  lastNameKana?:   string
  firstNameKana?:  string
  mobile?:         string
  employeeId?:     string
  joinDate?:       string   // YYYY-MM-DD
  birthday?:       string   // YYYY-MM-DD
  kumiaiJoinDate?: string   // YYYY-MM
  localArea?:      string
  snsUrl?:         string

  // ── 組織・サポート ────────────────────────────────────────────────────
  supportPerson?: string
  mainSupporterUid?: string   // メインサポート（組織図の上位者）のuid
  subSupporterUid?:  string   // サブサポート（任意）のuid

  // ── 属性 ──────────────────────────────────────────────────────────────
  businessContent?:  string
  salaryContent?:    string
  hometownArea?:     string
  currentArea?:      string
  hobbies?:          string

  // ── 個人口座 ──────────────────────────────────────────────────────────
  resonaAccount?:    string   // りそな口座（支店名・口座番号）
  sbiAccount?:       string   // SBI口座（口座番号）
  otherBankName?:    string   // 上記以外の銀行名
  otherBankBranch?:  string   // 支店名
  otherBankAccount?: string   // 口座番号
  yuuchoInfo?:       string   // ゆうちょ加入情報

  // ── 法人情報 ──────────────────────────────────────────────────────────
  corporateName?:        string
  corporateAccount?:     string   // 法人口座（メイン）
  corporateSbiAccount?:  string   // 法人SBI口座
  invoiceNumber?:        string

  // ── プロフィール ──────────────────────────────────────────────────────
  selfIntro?:  string
  dreamGoal?:  string   // 夢・目標

  // ── お気に入り（ダッシュボードで優先表示） ────────────────────────────
  favoriteAppIds?:   string[]
  favoriteSpaceIds?: string[]

  // ── 表示設定 ──────────────────────────────────────────────────────────
  themeColor?: 'blue' | 'yellow'

  // ── 通知設定（種別ごとにアプリ内通知を受け取るかどうか。未設定時は全てtrue扱い） ──
  notificationPrefs?: NotificationPrefs

  // ── push通知（FCM）用のデバイストークン（同一ユーザーが複数端末を使う場合に備え配列） ──
  fcmTokens?: string[]

  // ── 組合員プラン（申請承認で変更される） ──────────────────────────────
  membershipPlan?: string

  // ── 初回ログイン時のアプリ内ガイドを表示済みかどうか ──────────────────
  onboardingSeen?: boolean

  createdAt: Date
  updatedAt: Date
}

export interface AuthState {
  user:        AppUser | null
  initialized: boolean
  // Firebaseから実際にログイン状態の応答を受け取れたか（タイムアウトで
  // initializedになった場合はfalseのまま。誤ってログアウト扱いしないための区別）
  confirmed:   boolean
  loading:     boolean
}
