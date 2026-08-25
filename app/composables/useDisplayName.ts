import { useGroupLabels } from '~/composables/useGroupLabels'
import type { AppUser } from '~/types/user'

export type DisplayNameSource = Pick<AppUser, 'displayName' | 'lastName' | 'firstName' | 'kumiaiName' | 'position' | 'groupId'>

// 全ユーザー共通の表記名フォーマット:「組合名　姓名《プラン等》[グループ名]」
// 例: ラトラクロス　宮﨑慶太《Sプラン》[Reterace]
// 各要素（組合名・プラン・グループ）が未設定の場合はその部分を省略する。
// 「プラン」にはpositionフィールド（役職。Sプラン/Bプランの他EM/PM/MM等の
// 役職も含まれる）をそのまま使う
export const useDisplayName = () => {
  const { getGroupLabel, ensureLoaded } = useGroupLabels()
  // グループ名の解決にはgroups一覧が必要。未取得なら裏で読み込みを開始する
  // （呼び出し側は待たなくてよい。読み込み完了後はgetGroupLabelの参照が
  // 更新され、リアクティブに再描画される）
  ensureLoaded()

  const format = (u: DisplayNameSource): string => {
    const name = (u.lastName || u.firstName)
      ? `${u.lastName ?? ''}${u.firstName ?? ''}`
      : u.displayName

    let result = ''
    if (u.kumiaiName) result += `${u.kumiaiName}　`
    result += name
    if (u.position) result += `《${u.position}》`
    const groupLabel = getGroupLabel(u.groupId)
    if (groupLabel) result += `[${groupLabel}]`
    return result
  }

  return { format }
}
