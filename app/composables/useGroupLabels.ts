import { useGroups } from '~/composables/useGroups'

// グループが増えても破綻しないよう、表示順に巡回して割り当てる配色パレット
// （先頭3色は既存のReterace/Miraito/Assetと同じ配色）
const COLOR_CLASSES = ['bg-indigo-500', 'bg-sky-500', 'bg-amber-500', 'bg-emerald-500', 'bg-rose-500', 'bg-purple-500', 'bg-teal-500']
const BADGE_CLASSES = [
  'bg-indigo-50 text-indigo-700',
  'bg-sky-50 text-sky-700',
  'bg-amber-50 text-amber-700',
  'bg-emerald-50 text-emerald-700',
  'bg-rose-50 text-rose-700',
  'bg-purple-50 text-purple-700',
  'bg-teal-50 text-teal-700',
]

const capitalize = (id: string) => id.charAt(0).toUpperCase() + id.slice(1)

// グループ名・配色をどの画面からも参照できる共有ストア（groupsコレクションを一度だけ取得しキャッシュする）
export const useGroupLabels = () => {
  const { fetchGroups } = useGroups()

  const groups  = useState<{ id: string; name: string }[]>('groupLabels:list', () => [])
  const loaded  = useState<boolean>('groupLabels:loaded', () => false)
  const loading = useState<boolean>('groupLabels:loading', () => false)

  const ensureLoaded = async (force = false) => {
    if (loaded.value && !force) return
    loading.value = true
    try {
      groups.value = (await fetchGroups()).map(g => ({ id: g.id, name: g.name }))
      loaded.value = true
    } finally {
      loading.value = false
    }
  }

  const getGroupLabel = (id?: string | null): string => {
    if (!id) return ''
    return groups.value.find(g => g.id === id)?.name ?? capitalize(id)
  }

  const getGroupIndex = (id?: string | null): number => {
    if (!id) return -1
    return groups.value.findIndex(g => g.id === id)
  }

  const getGroupColor = (id?: string | null): string => {
    const idx = getGroupIndex(id)
    if (idx < 0) return 'bg-gray-400'
    return COLOR_CLASSES[idx % COLOR_CLASSES.length]
  }

  const getGroupBadgeClass = (id?: string | null): string => {
    const idx = getGroupIndex(id)
    if (idx < 0) return 'bg-gray-100 text-gray-600'
    return BADGE_CLASSES[idx % BADGE_CLASSES.length]
  }

  return { groups, loading, loaded, ensureLoaded, getGroupLabel, getGroupColor, getGroupBadgeClass }
}
