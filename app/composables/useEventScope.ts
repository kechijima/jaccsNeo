import { useGroupLabels } from '~/composables/useGroupLabels'
import { EVENT_CATEGORY_LABELS, type EventCategory } from '~/types/event'

interface ScopedEvent {
  scope: string
  groupId?: string
}

interface CategorizedEvent {
  category?: EventCategory
}

const CATEGORY_BADGE: Record<EventCategory, string> = {
  meeting: 'bg-sky-100 text-sky-700',
  event:   'bg-primary-100 text-primary-700',
  other:   'bg-gray-100 text-gray-600',
}

const FIXED_LABELS: Record<string, string> = { all: '全体', kumiai: '組合', space: 'スペース' }
const FIXED_BADGE: Record<string, string> = {
  all:    'bg-green-100 text-green-700',
  kumiai: 'bg-purple-100 text-purple-700',
  space:  'bg-amber-100 text-amber-700',
}
const FIXED_DOT: Record<string, string> = {
  all:    'bg-green-500',
  kumiai: 'bg-purple-500',
  space:  'bg-amber-500',
}

// イベントのグループ表示（グループごとに配色を変える）。
// 新形式（scope:'group' + groupId）・旧形式（scopeに直接グループIDが入っている）の両方に対応する
export const useEventScope = () => {
  const { getGroupLabel, getGroupColor, getGroupBadgeClass, ensureLoaded } = useGroupLabels()

  const resolveGroupId = (e: ScopedEvent): string | null => {
    if (e.scope === 'group' && e.groupId) return e.groupId
    if (e.scope && !['all', 'group', 'kumiai', 'space'].includes(e.scope)) return e.scope
    return null
  }

  const scopeLabel = (e: ScopedEvent): string => {
    const gid = resolveGroupId(e)
    if (gid) return `${getGroupLabel(gid)}グループ`
    return FIXED_LABELS[e.scope] ?? e.scope
  }

  const scopeBadgeClass = (e: ScopedEvent): string => {
    const gid = resolveGroupId(e)
    if (gid) return getGroupBadgeClass(gid)
    return FIXED_BADGE[e.scope] ?? 'bg-gray-100 text-gray-600'
  }

  const scopeDotClass = (e: ScopedEvent): string => {
    const gid = resolveGroupId(e)
    if (gid) return getGroupColor(gid)
    return FIXED_DOT[e.scope] ?? 'bg-gray-400'
  }

  // 種別（会議/イベント/その他）はグループの配色とは別軸のタグとして表示する
  const categoryLabel = (e: CategorizedEvent): string =>
    e.category ? (EVENT_CATEGORY_LABELS[e.category] ?? e.category) : ''

  const categoryBadgeClass = (e: CategorizedEvent): string =>
    e.category ? (CATEGORY_BADGE[e.category] ?? 'bg-gray-100 text-gray-600') : 'bg-gray-100 text-gray-600'

  return { scopeLabel, scopeBadgeClass, scopeDotClass, categoryLabel, categoryBadgeClass, ensureLoaded }
}
