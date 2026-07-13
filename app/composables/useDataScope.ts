import { useAuthStore } from '~/stores/auth'
import { useUsers } from '~/composables/useUsers'
import type { AppUser } from '~/types/user'

// 自分（rootUid）を起点に、メインサポートの連鎖で自分の配下に入る全ユーザーのuidを再帰的に集める
const collectDescendantUids = (rootUid: string, users: AppUser[]): Set<string> => {
  const childrenByUid = new Map<string, AppUser[]>()
  for (const u of users) {
    if (!u.mainSupporterUid || u.mainSupporterUid === u.uid) continue
    if (!childrenByUid.has(u.mainSupporterUid)) childrenByUid.set(u.mainSupporterUid, [])
    childrenByUid.get(u.mainSupporterUid)!.push(u)
  }

  const result  = new Set<string>()
  const visited = new Set<string>()
  const walk = (uid: string) => {
    if (visited.has(uid)) return
    visited.add(uid)
    for (const child of childrenByUid.get(uid) ?? []) {
      result.add(child.uid)
      walk(child.uid)
    }
  }
  walk(rootUid)
  return result
}

// パーソナルデータ・アポ分析で「自分が閲覧できる担当未来設計士（FP）名」の範囲を決定する
// - 理事会・システム管理者: 制限なし（null）
// - EM2以上: 自分 + 自分がサポートしている（組織図で配下の）メンバー
// - 一般: 自分のみ
export const useDataScope = () => {
  const authStore = useAuthStore()
  const { fetchUsers } = useUsers()

  const scopedFpNames = useState<Set<string> | null>('dataScope:fpNames', () => new Set())
  const loaded  = useState<boolean>('dataScope:loaded', () => false)
  const loading = useState<boolean>('dataScope:loading', () => false)

  const ensureScope = async (force = false) => {
    if (loaded.value && !force) return
    loading.value = true
    try {
      const me = authStore.user
      if (!me) { scopedFpNames.value = new Set(); loaded.value = true; return }

      if (authStore.isBoard) {
        // 理事会・システム管理者は制限なし（isBoardはsystem_adminも含む）
        scopedFpNames.value = null
        loaded.value = true
        return
      }

      const names = new Set<string>([me.displayName])
      if (authStore.isEm2Above) {
        const users = await fetchUsers().catch(() => [])
        const descendantUids = collectDescendantUids(me.uid, users)
        for (const u of users) {
          if (descendantUids.has(u.uid)) names.add(u.displayName)
        }
      }
      scopedFpNames.value = names
      loaded.value = true
    } finally {
      loading.value = false
    }
  }

  const canSeeAll = computed(() => scopedFpNames.value === null)

  const isNameInScope = (name?: string | null): boolean =>
    scopedFpNames.value === null || (!!name && scopedFpNames.value.has(name))

  return { scopedFpNames, loading, loaded, ensureScope, canSeeAll, isNameInScope }
}
