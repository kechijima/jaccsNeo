/**
 * v-htmlで表示されたリッチテキスト内の@メンション（Tiptapの
 * <span data-type="mention" data-id="..." data-label="...">）をクリックした際に、
 * 投稿者アイコンクリック時と同じ「マイページを見ますか？」確認モーダルを開く。
 *
 * v-htmlで挿入された要素にはVueのイベントバインドが効かないため、
 * v-htmlを囲む要素に @click="handleMentionClick" を付け、
 * クリックイベントの委譲（event delegation）で判定する。
 */
import { useAuthorProfileModal } from '~/composables/useAuthorProfileModal'

export const useMentionClick = () => {
  const { openAuthorProfile } = useAuthorProfileModal()

  const handleMentionClick = (e: MouseEvent) => {
    const target = (e.target as HTMLElement | null)?.closest('[data-type="mention"]') as HTMLElement | null
    if (!target) return

    const id = target.getAttribute('data-id')
    // 「全体」「特定グループ」宛てのメンションは個人のマイページが存在しないため何もしない
    if (!id || id === 'all' || id.startsWith('group:')) return

    // v-htmlの本文はNuxtLink/ボタン等でラップされていることが多く、メンションクリック時に
    // そちらの遷移・クリック処理まで一緒に発火してしまわないよう止める
    e.preventDefault()
    e.stopPropagation()

    const label = (target.getAttribute('data-label') ?? '').replace(/^@/, '')
    openAuthorProfile(id, label)
  }

  return { handleMentionClick }
}
