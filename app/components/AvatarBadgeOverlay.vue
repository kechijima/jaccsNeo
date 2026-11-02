<script setup lang="ts">
// ポータル（投稿・コメント）のアバターは独自実装（overflow-hidden円の中に直接
// img/頭文字を描画）でUserAvatar.vueを使っていないため、バッジだけを別途
// 重ねて表示するための小さな共有コンポーネント。呼び出し側は、既存のアバター円
// （overflow-hidden）をposition: relativeな非クリップのラッパーで囲み、
// その中にこのコンポーネントを兄弟要素として置く（アバター円自体の中に置くと
// overflow-hiddenでバッジがはみ出す部分が見切れてしまうため）
import { USER_BADGE_OPTIONS, type UserBadge } from '~/types/user'

const props = withDefaults(defineProps<{
  badges?: UserBadge[] | null
  size?: 'xs' | 'sm'
}>(), { size: 'sm' })

const icons = computed(() => (props.badges ?? [])
  .map(b => USER_BADGE_OPTIONS.find(o => o.value === b))
  .filter((o): o is typeof USER_BADGE_OPTIONS[number] => !!o))
</script>

<template>
  <div
    v-if="icons.length > 0"
    class="absolute -bottom-0.5 -right-0.5 flex -space-x-1 pointer-events-none"
  >
    <img
      v-for="b in icons"
      :key="b.value"
      :src="b.icon"
      :alt="b.label"
      :title="b.label"
      class="rounded-full ring-2 ring-white bg-white"
      :class="size === 'xs' ? 'h-2.5 w-2.5' : 'h-3 w-3'"
    />
  </div>
</template>
