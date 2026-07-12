import { useGroupLabels } from '~/composables/useGroupLabels'
import type { AnnouncementScope } from '~/types/announcement'

// お知らせの公開範囲ラベル・配色（「全体」は固定、グループはgroupsコレクションから動的に解決する）
export const useAnnouncementScope = () => {
  const { getGroupLabel, getGroupBadgeClass, ensureLoaded } = useGroupLabels()

  const scopeLabel = (scope: AnnouncementScope): string =>
    scope === 'all' ? '全体' : getGroupLabel(scope)

  const scopeBadgeClass = (scope: AnnouncementScope): string =>
    scope === 'all' ? 'bg-green-100 text-green-700' : getGroupBadgeClass(scope)

  return { scopeLabel, scopeBadgeClass, ensureLoaded }
}
