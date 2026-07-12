export type UserRole = 'system_admin' | 'board' | 'em2_above' | 'general'

export type SpecialTeam = 'real_estate' | 'non_life_insurance'

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

  createdAt: Date
  updatedAt: Date
}

export interface AuthState {
  user:        AppUser | null
  initialized: boolean
  loading:     boolean
}
