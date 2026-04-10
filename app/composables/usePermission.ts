import { useAuthStore } from '~/stores/auth'
import type { GroupId } from '~/types/user'

export const usePermission = () => {
  const authStore = useAuthStore()

  /** システム管理者かどうか */
  const isSystemAdmin = computed(() => authStore.isSystemAdmin)

  /** 理事会メンバー以上（system_admin | board） */
  const isBoardOrAbove = computed(() => authStore.isBoard)

  /** EM2以上（system_admin | board | em2_above） */
  const isEm2OrAbove = computed(() => authStore.isEm2Above)

  /** 不動産専門チームメンバー */
  const isRealEstateTeam = computed(() => authStore.isSpecialistRealEstate)

  /** 損保専門チームメンバー */
  const isNonLifeTeam = computed(() => authStore.isSpecialistNonLife)

  /**
   * 顧客データへのアクセス権チェック
   * - system_admin: 全員
   * - board: 全員（閲覧のみ）
   * - em2_above: 同グループの顧客
   * - general: 自分の担当顧客のみ
   */
  const canAccessCustomer = (customerAssignedFpId: string, customerGroupId?: GroupId) => {
    const user = authStore.user
    if (!user) return false
    if (authStore.isSystemAdmin || authStore.isBoard) return true
    if (authStore.isEm2Above && customerGroupId === user.groupId) return true
    return customerAssignedFpId === user.uid
  }

  /**
   * 顧客データの編集権チェック（閲覧とは別）
   */
  const canEditCustomer = (customerAssignedFpId: string, customerGroupId?: GroupId) => {
    const user = authStore.user
    if (!user) return false
    if (authStore.isSystemAdmin) return true
    // board は閲覧のみ・編集不可
    if (user.role === 'board') return false
    if (authStore.isEm2Above && customerGroupId === user.groupId) return true
    return customerAssignedFpId === user.uid
  }

  /**
   * CSVインポート権限（system_admin・em2_above以上）
   */
  const canImportCsv = computed(() => authStore.isEm2Above)

  /**
   * CSVエクスポート権限（全ロール可・自分の担当顧客のみ）
   */
  const canExportCsv = computed(() => authStore.isLoggedIn)

  /**
   * ユーザー管理権限（system_adminのみ）
   */
  const canManageUsers = computed(() => authStore.isSystemAdmin)

  /**
   * 全体ダッシュボード閲覧権限（system_admin・board以上）
   */
  const canViewGlobalDashboard = computed(() => authStore.isBoard)

  /**
   * グループダッシュボード閲覧権限（em2_above以上）
   */
  const canViewGroupDashboard = computed(() => authStore.isEm2Above)

  /**
   * 制限コンテンツ（JACCS等）へのアクセス権
   */
  const canAccessRestricted = computed(() => authStore.isSystemAdmin)

  return {
    isSystemAdmin,
    isBoardOrAbove,
    isEm2OrAbove,
    isRealEstateTeam,
    isNonLifeTeam,
    canAccessCustomer,
    canEditCustomer,
    canImportCsv,
    canExportCsv,
    canManageUsers,
    canViewGlobalDashboard,
    canViewGroupDashboard,
    canAccessRestricted,
  }
}
