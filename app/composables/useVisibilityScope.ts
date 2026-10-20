import { useGroups } from '~/composables/useGroups'
import { useSpecialTeams } from '~/composables/useSpecialTeams'
import type { Group } from '~/types/group'
import type { SpecialTeamDef } from '~/types/specialTeam'

// 動画配信・ファイル管理等、公開範囲（グループ・専門チーム単位）の設定UIを持つ
// 複数の業務ツールアプリ画面で共通して使う選択肢読み込み・ラベル解決ロジック
export const useVisibilityScope = () => {
  const { fetchGroups } = useGroups()
  const { fetchAll: fetchSpecialTeams } = useSpecialTeams()

  const groups      = useState<Group[]>('visibilityScope:groups', () => [])
  const specialTeams = useState<SpecialTeamDef[]>('visibilityScope:specialTeams', () => [])
  const loaded      = useState<boolean>('visibilityScope:loaded', () => false)

  const ensureLoaded = async (force = false) => {
    if (loaded.value && !force) return
    const [g, t] = await Promise.all([fetchGroups().catch(() => []), fetchSpecialTeams().catch(() => [])])
    groups.value = g
    specialTeams.value = t
    loaded.value = true
  }

  const groupLabel = (id: string) => groups.value.find(g => g.id === id)?.name
    ?? specialTeams.value.find(t => `team:${t.id}` === id)?.name
    ?? id

  return { groups, specialTeams, ensureLoaded, groupLabel }
}
