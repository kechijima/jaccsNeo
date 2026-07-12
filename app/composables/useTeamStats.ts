import { useUsers } from '~/composables/useUsers'
import { useCustomerStore } from '~/composables/useCustomerStore'
import { usePortalStore } from '~/composables/usePortalStore'
import { useAppServices } from '~/composables/useAppServices'
import { useLifeInsuranceCases } from '~/composables/useLifeInsuranceCases'
import { useGroups } from '~/composables/useGroups'
import { useGroupLabels } from '~/composables/useGroupLabels'
import { SERVICE_LABELS } from '~/types/service'
import type { AppUser, GroupId } from '~/types/user'

const isThisMonth = (val: any): boolean => {
  if (!val) return false
  const date: Date = typeof val?.toDate === 'function' ? val.toDate() : val
  if (!(date instanceof Date) || isNaN(date.getTime())) return false
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

export interface FpRankingRow {
  uid: string | null
  name: string
  groupLabel: string
  position: string
  contracts: number
}

export const useTeamStats = () => {
  const { fetchUsers } = useUsers()
  const { customers } = useCustomerStore()
  const portalStore = usePortalStore()
  const { getCasesForType, countForType } = useAppServices()
  const { cases: liCases, fetchAll: fetchLiCases } = useLifeInsuranceCases()
  const { fetchGroups } = useGroups()
  const { getGroupColor, ensureLoaded: ensureGroupLabelsLoaded } = useGroupLabels()

  const loading = useState<boolean>('teamStats:loading', () => false)
  const loaded  = useState<boolean>('teamStats:loaded', () => false)
  const users   = useState<AppUser[]>('teamStats:users', () => [])
  const groupStats     = useState<GroupStat[]>('teamStats:groups', () => [])
  const serviceRanking = useState<ServiceStat[]>('teamStats:services', () => [])
  const fpRanking       = useState<FpRankingRow[]>('teamStats:fpRanking', () => [])

  const load = async (force = false) => {
    if (loaded.value && !force) return
    loading.value = true
    try {
      const [allGroups] = await Promise.all([fetchGroups(), fetchLiCases(), portalStore.fetchAllPosts(), ensureGroupLabelsLoaded()])
      users.value = await fetchUsers()

      const byName = new Map(users.value.map(u => [u.displayName, u]))
      const groupLabelById = new Map(allGroups.map(g => [g.id, g.name]))

      // ── グループ別: 人数・当月新規パーソナルデータ・当月活動報告件数 ──
      const groupIds: GroupId[] = allGroups.map(g => g.id)
      groupStats.value = groupIds.map((gid) => {
        const members = users.value.filter(u => u.groupId === gid)
        const memberUids  = new Set(members.map(u => u.uid))
        const memberNames = new Set(members.map(u => u.displayName))

        const newPersonalData = customers.value.filter(c =>
          isThisMonth(c.createdAt) && c.assignedFpName && memberNames.has(c.assignedFpName),
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

      // ── サービス別：登録件数（投稿数）・当月成約数 ──
      const rows: ServiceStat[] = Object.keys(SERVICE_LABELS).map((type) => {
        if (type === 'lifeInsurance') {
          const contractCount = liCases.value.filter(c => isContracted(c.progressStatus ?? '') && isThisMonth(c.updatedAt)).length
          return { type, label: SERVICE_LABELS[type], postCount: liCases.value.length, contractCount }
        }
        const cases = getCasesForType(type)
        const contractCount = cases.filter(c => isContracted(c.status) && isThisMonth(c.updatedAt)).length
        return { type, label: SERVICE_LABELS[type] ?? type, postCount: countForType(type), contractCount }
      })
      serviceRanking.value = rows
        .filter(r => r.postCount > 0)
        .sort((a, b) => b.postCount - a.postCount)
        .slice(0, 8)

      // ── FP別 生命保険成約件数ランキング（今月） ──
      const fpCounts = new Map<string, number>()
      for (const c of liCases.value) {
        if (!c.assignedFpName || !isContracted(c.progressStatus ?? '') || !isThisMonth(c.updatedAt)) continue
        fpCounts.set(c.assignedFpName, (fpCounts.get(c.assignedFpName) ?? 0) + 1)
      }
      fpRanking.value = [...fpCounts.entries()]
        .map(([name, contracts]) => {
          const u = byName.get(name)
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

  return { loading, groupStats, serviceRanking, fpRanking, load }
}
