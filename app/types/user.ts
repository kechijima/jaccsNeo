export type UserRole = 'system_admin' | 'board' | 'em2_above' | 'general'

export type SpecialTeam = 'real_estate' | 'non_life_insurance'

export type GroupId = 'reterace' | 'miraito' | 'asset'

// 銀行口座情報
export interface BankAccount {
  branch: string
  number: string
}

export interface OtherBankAccount {
  bankName:  string
  branch:    string
  type:      string   // 普通・当座など
  number:    string
  holderName: string
}

export interface YuchoAccount {
  storeName: string
  storeCode: string
  type:      string
  number:    string
  holderName: string
}

export interface Supporter {
  mainName?: string
  subName?:  string
}

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
  lastName?:      string
  firstName?:     string
  lastNameKana?:  string
  firstNameKana?: string
  mobile?:        string
  birthday?:      string   // YYYY-MM-DD
  kumiaiJoinDate?: string  // YYYY-MM

  // ── 組織・サポート ────────────────────────────────────────────────────
  supporter?: Supporter

  // ── 属性 ──────────────────────────────────────────────────────────────
  businessContent?:  string
  salaryContent?:    string
  hometownArea?:     string
  currentArea?:      string
  hobbies?:          string

  // ── 個人口座 ──────────────────────────────────────────────────────────
  resonaAccount?:    BankAccount
  sbiAccount?:       BankAccount
  otherBankAccount?: OtherBankAccount
  yuchoAccount?:     YuchoAccount

  // ── 法人情報 ──────────────────────────────────────────────────────────
  corporateName?:           string
  corporateResonaAccount?:  BankAccount
  corporateSbiAccount?:     BankAccount

  // ── プロフィール ──────────────────────────────────────────────────────
  selfIntro?: string   // 100文字以内
  recentGoal?: string

  createdAt: Date
  updatedAt: Date
}

export interface AuthState {
  user:        AppUser | null
  initialized: boolean
  loading:     boolean
}
