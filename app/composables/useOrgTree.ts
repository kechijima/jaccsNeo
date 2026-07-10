import type { AppUser } from '~/types/user'
import { useUsers } from '~/composables/useUsers'

export interface OrgTreeNode {
  user: AppUser
  subSupporter: AppUser | null
  children: OrgTreeNode[]
}

// mainSupporterUid を辺としたツリーを構築する（メインサポートが未設定 or 循環参照のユーザーはルート扱い）
export const buildOrgTree = (users: AppUser[]): OrgTreeNode[] => {
  const byUid = new Map(users.map(u => [u.uid, u]))
  const childrenMap = new Map<string, AppUser[]>()
  const roots: AppUser[] = []

  for (const u of users) {
    const supporterUid = u.mainSupporterUid
    if (supporterUid && supporterUid !== u.uid && byUid.has(supporterUid)) {
      if (!childrenMap.has(supporterUid)) childrenMap.set(supporterUid, [])
      childrenMap.get(supporterUid)!.push(u)
    } else {
      roots.push(u)
    }
  }

  const byName = (a: AppUser, b: AppUser) => a.displayName.localeCompare(b.displayName, 'ja')
  const visited = new Set<string>()

  const build = (u: AppUser): OrgTreeNode => {
    visited.add(u.uid)
    const subSupporter = u.subSupporterUid ? byUid.get(u.subSupporterUid) ?? null : null
    const kids = (childrenMap.get(u.uid) ?? []).filter(c => !visited.has(c.uid))
    return {
      user: u,
      subSupporter,
      children: kids.sort(byName).map(build),
    }
  }

  const nodes = roots.sort(byName).map(build)

  // 循環参照などでツリーに現れなかったユーザーも見失わないようルートとして追加する
  const orphanNodes = users.filter(u => !visited.has(u.uid)).map(build)

  return [...nodes, ...orphanNodes]
}

export const useOrgTree = () => {
  const { fetchUsers } = useUsers()

  const tree    = useState<OrgTreeNode[]>('orgTree:list', () => [])
  const loading = useState<boolean>('orgTree:loading', () => false)
  const loaded  = useState<boolean>('orgTree:loaded', () => false)

  const fetchTree = async (force = false) => {
    if (loaded.value && !force) return
    loading.value = true
    try {
      const users = await fetchUsers()
      tree.value = buildOrgTree(users)
      loaded.value = true
    } finally {
      loading.value = false
    }
  }

  return { tree, loading, fetchTree }
}
