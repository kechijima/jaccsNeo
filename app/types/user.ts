export type UserRole = 'system_admin' | 'board' | 'em2_above' | 'general'

export type SpecialTeam = 'real_estate' | 'non_life_insurance'

export type GroupId = 'reterace' | 'miraito' | 'asset'

export interface AppUser {
  uid:          string
  email:        string
  displayName:  string
  avatarUrl?:   string
  role:         UserRole
  specialTeams: SpecialTeam[]
  groupId?:     GroupId
  kumiaiId?:    string
  position?:    string  // 役職 例: "EM4", "PM6", "MM1"
  createdAt:    Date
  updatedAt:    Date
}

export interface AuthState {
  user:        AppUser | null
  initialized: boolean
  loading:     boolean
}
