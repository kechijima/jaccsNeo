import { useUsers } from '~/composables/useUsers'
import { useCustomerStore } from '~/composables/useCustomerStore'
import { usePortalStore } from '~/composables/usePortalStore'
import { useAppServices } from '~/composables/useAppServices'
import { useLifeInsuranceCases } from '~/composables/useLifeInsuranceCases'
import { useReferrals } from '~/composables/useReferrals'
import { useGroups } from '~/composables/useGroups'
import { useGroupLabels } from '~/composables/useGroupLabels'
import { useAuthStore } from '~/stores/auth'
import { SERVICE_LABELS } from '~/types/service'
import type { AppUser, GroupId } from '~/types/user'

const toDate = (val: any): Date | null => {
  if (!val) return null
  const date: Date = typeof val?.toDate === 'function' ? val.toDate() : val
  return date instanceof Date && !isNaN(date.getTime()) ? date : null
}

const isThisMonth = (val: any): boolean => {
  const date = toDate(val)
  if (!date) return false
  const now = new Date()
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()
}

// 「未成約」は「成約」を部分文字列として含むため、除外パターンで明示的に弾く
const CONTRACT_RE = /成約|○|済/
const NOT_CONTRACT_RE = /未成約|不成立|見送/
const isContracted = (status: string) => CONTRACT_RE.test(status) && !NOT_CONTRACT_RE.test(status)

export interface GroupStat {
  id: GroupId
  label: string
  color: string
  memberCount: number
  newPersonalData: number
  activityReports: number
}

export interface ServiceStat {
  type: string
  label: string
  postCount: number
  contractCount: number
}

// 新規顧客獲得数推移（直近6ヶ月・グループ別）の1ヶ月分
export interface MonthlyTrendPoint {
  month: string              // 表示用ラベル（例: '4月'）
  byGroup: Record<GroupId, number>
  total: number
}

export interface FpRankingRow {
  uid: string | null
  name: string
  groupLabel: string
  position: string
  contracts: number
}

// 個人ダッシュボード（一般FP向け）の当月実績
export interface MyStats {
  activityCount: number   // 当月の活動報告件数
  contractCount: number   // 当月の成約数（生命保険＋その他アプリの案件合計）
  referralCount: number   // 当月の紹介獲得数
}

export const useTeamStats = () => {
  const { fetchUsers } = useUsers()
  const { customers, ensureLoaded: ensureCustomersLoaded } = useCustomerStore()
  const portalStore = usePortalStore()
  const { getCasesForType, countForType, allCases, ensureLoaded: ensureAppServicesLoaded } = useAppServices()
  const { cases: liCases, fetchAll: fetchLiCases } = useLifeInsuranceCases()
  const { fetchReferralsByUser } = useReferrals()
  const { fetchGroups } = useGroups()
  const { getGroupColor, ensureLoaded: ensureGroupLabelsLoaded } = useGroupLabels()
  const authStore = useAuthStore()

  const loading = useState<boolean>('teamStats:loading', () => false)
  const loaded  = useState<boolean>('teamStats:loaded', () => false)
  const myStatsLoading = useState<boolean>('teamStats:myStatsLoading', () => false)
  const myStatsLoaded  = useState<boolean>('teamStats:myStatsLoaded', () => false)
  const myStats = useState<MyStats>('teamStats:myStats', () => ({ activityCount: 0, contractCount: 0, referralCount: 0 }))
  const users   = useState<AppUser[]>('teamStats:users', () => [])
  const groupStats     = useState<GroupStat[]>('teamStats:groups', () => [])
  const serviceRanking = useState<ServiceStat[]>('teamStats:services', () => [])
  const fpRanking       = useState<FpRankingRow[]>('teamStats:fpRanking', () => [])
  const monthlyTrend    = useState<MonthlyTrendPoint[]>('teamStats:monthlyTrend', () => [])

  const load = async (force = false) => {
    if (loaded.value && !force) return
    loading.value = true
    try {
      const [allGroups] = await Promise.all([fetchGroups(), fetchLiCases(), portalStore.fetchAllPosts(), ensureGroupLabelsLoaded(), ensureCustomersLoaded(), ensureAppServicesLoaded()])
      users.value = await fetchUsers()

      const byName = new Map(users.value.map(u => [u.displayName, u]))
      const groupLabelById = new Map(allGroups.map(g => [g.id, g.name]))

      // ── グループ別: 人数・当月新規パーソナルデータ・当月活動報告件数 ──
      const groupIds: GroupId[] = allGroups.map(g => g.id)
      // 脱退済みの組合員は集計の対象外とする（人数・新規パーソナルデータ・推移グラフ共通）。
      // 顧客の担当FPは原則assignedFpId（uid）で突合し、同姓同名ユーザーによる誤集計を防ぐ。
      // assignedFpIdが無い過去データ（CSV取込分等）のみ、従来通りassignedFpName（氏名）で突合する
      const groupMemberUids = new Map<GroupId, Set<string>>(
        groupIds.map(gid => [gid, new Set(users.value.filter(u => u.groupId === gid && !u.isWithdrawn).map(u => u.uid))]),
      )
      const groupMemberNames = new Map<GroupId, Set<string>>(
        groupIds.map(gid => [gid, new Set(users.value.filter(u => u.groupId === gid && !u.isWithdrawn).map(u => u.displayName))]),
      )
      const customerBelongsToGroup = (c: typeof customers.value[number], gid: GroupId): boolean => {
        if (c.assignedFpId) return groupMemberUids.get(gid)!.has(c.assignedFpId)
        return !!c.assignedFpName && groupMemberNames.get(gid)!.has(c.assignedFpName)
      }
      groupStats.value = groupIds.map((gid) => {
        const members = users.value.filter(u => u.groupId === gid && !u.isWithdrawn)
        const memberUids  = new Set(members.map(u => u.uid))

        const newPersonalData = customers.value.filter(c =>
          isThisMonth(c.createdAt) && customerBelongsToGroup(c, gid),
        ).length

        const activityReports = portalStore.posts.value.filter(p =>
          isThisMonth(p.createdAt) && memberUids.has(p.authorId),
        ).length

        return {
          id: gid,
          label: groupLabelById.get(gid) ?? gid,
          color: getGroupColor(gid),
          memberCount: members.length,
          newPersonalData,
          activityReports,
        }
      })

      // ── 新規顧客獲得数推移（直近6ヶ月・グループ別、パーソナルデータの登録日基準） ──
      const now = new Date()
      const recentMonths = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
        return { year: d.getFullYear(), month: d.getMonth(), label: `${d.getMonth() + 1}月` }
      })
      monthlyTrend.value = recentMonths.map(({ year, month, label }) => {
        const byGroup: Record<string, number> = {}
        let total = 0
        for (const gid of groupIds) {
          const count = customers.value.filter((c) => {
            const date = toDate(c.createdAt)
            return !!date && date.getFullYear() === year && date.getMonth() === month
              && customerBelongsToGroup(c, gid)
          }).length
          byGroup[gid] = count
          total += count
        }
        return { month: label, byGroup, total }
      })

      // ── サービス別：登録件数（投稿数）・当月成約数 ──
      const rows: ServiceStat[] = Object.keys(SERVICE_LABELS).map((type) => {
        if (type === 'lifeInsurance') {
          const contractCount = liCases.value.filter(c => isContracted(c.progressStatus ?? '') && isThisMonth(c.updatedAt)).length
          return { type, label: SERVICE_LABELS[type], postCount: liCases.value.length, contractCount }
        }
        const cases = getCasesForType(type)
        const contractCount = cases.filter(c => c.status === 'contracted' && isThisMonth(c.updatedAt)).length
        return { type, label: SERVICE_LABELS[type] ?? type, postCount: countForType(type), contractCount }
      })
      serviceRanking.value = rows
        .filter(r => r.postCount > 0)
        .sort((a, b) => b.postCount - a.postCount)
        .slice(0, 8)

      // ── FP別 生命保険成約件数ランキング（今月） ──
      // assignedFpUid（uid）が分かっていればuidで集計し、同姓同名ユーザーの成約が
      // 1人分に合算されたり、表示される所属・役職が別人のものになったりしないようにする。
      // uidが無い過去データ（CSV取込分等）のみ、従来通り氏名で集計する
      const byUid = new Map(users.value.map(u => [u.uid, u]))
      const fpCounts = new Map<string, { name: string; uid: string | null; contracts: number }>()
      for (const c of liCases.value) {
        if (!c.assignedFpName || !isContracted(c.progressStatus ?? '') || !isThisMonth(c.updatedAt)) continue
        const key = c.assignedFpUid ? `uid:${c.assignedFpUid}` : `name:${c.assignedFpName}`
        const entry = fpCounts.get(key)
        if (entry) {
          entry.contracts++
        } else {
          fpCounts.set(key, { name: c.assignedFpName, uid: c.assignedFpUid ?? null, contracts: 1 })
        }
      }
      fpRanking.value = [...fpCounts.values()]
        .map(({ name, uid, contracts }) => {
          const u = uid ? byUid.get(uid) : byName.get(name)
          return {
            uid:        u?.uid ?? null,
            name,
            groupLabel: u?.groupId ? (groupLabelById.get(u.groupId) ?? u.groupId) : '',
            position:   u?.position ?? '',
            contracts,
          }
        })
        .sort((a, b) => b.contracts - a.contracts)
        .slice(0, 10)

      loaded.value = true
    } finally {
      loading.value = false
    }
  }

  // ── 個人ダッシュボード（一般FP）の当月実績 ──
  const loadMyStats = async (force = false) => {
    if (myStatsLoaded.value && !force) return
    const uid = authStore.user?.uid
    const displayName = authStore.user?.displayName
    if (!uid) return
    myStatsLoading.value = true
    try {
      const [, , referrals] = await Promise.all([
        fetchLiCases(),
        ensureAppServicesLoaded(),
        fetchReferralsByUser(uid),
        portalStore.fetchAllPosts(),
      ])

      const activityCount = portalStore.posts.value.filter(p =>
        isThisMonth(p.createdAt) && p.authorId === uid,
      ).length

      // assignedFpUidが分かっている案件はuidで判定し、同姓同名の他人の成約を
      // 自分の実績として（またはその逆で）カウントしないようにする。uidが無い
      // 過去データ（CSV取込分等）のみ従来通り氏名で判定する
      const liContractCount = liCases.value.filter(c =>
        (c.assignedFpUid ? c.assignedFpUid === uid : c.assignedFpName === displayName)
        && isContracted(c.progressStatus ?? '') && isThisMonth(c.updatedAt),
      ).length
      const otherContractCount = allCases.value.filter(c =>
        c.assigneeUid === uid && c.status === 'contracted' && isThisMonth(c.updatedAt),
      ).length

      const referralCount = referrals.filter(r => isThisMonth(r.createdAt)).length

      myStats.value = {
        activityCount,
        contractCount: liContractCount + otherContractCount,
        referralCount,
      }
      myStatsLoaded.value = true
    } finally {
      myStatsLoading.value = false
    }
  }

  return { loading, groupStats, serviceRanking, fpRanking, monthlyTrend, load, myStats, myStatsLoading, loadMyStats }
}
