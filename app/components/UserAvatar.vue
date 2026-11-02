<script setup lang="ts">
// ユーザーアイコンの共通コンポーネント。写真（avatarUrl）が設定されていれば
// それを表示し、未設定の場合は頭文字をグループごとの色（useGroupLabels）で
// 塗った円で代替する。色分けにより、写真未設定でも所属グループがある程度
// 見分けられるようにする。badgesが指定されていれば、右下に小さく重ねて表示する
import { useGroupLabels } from '~/composables/useGroupLabels'
import { USER_BADGE_OPTIONS, type UserBadge } from '~/types/user'

// ルート要素をバッジ表示用のラッパーdivにするため、$attrs（呼び出し側から渡された
// classなど）は自動継承せず、実際のアバター画像/フォールバック円の方へ明示的に
// 渡す（layouts/default.vueのホバーリング用classがラッパーdivに付いてしまい
// 見た目が崩れるのを防ぐため）
defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<{
  avatarUrl?:   string | null
  displayName?: string | null
  groupId?:     string | null
  badges?:      UserBadge[] | null
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
}>(), { size: 'md' })

const { getGroupColor, ensureLoaded } = useGroupLabels()
ensureLoaded()

const sizeClass = computed(() => ({
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-7 w-7 text-xs',
  md: 'h-9 w-9 text-sm',
  lg: 'h-16 w-16 text-xl',
  xl: 'h-24 w-24 text-3xl',
}[props.size]))

const initial = computed(() => (props.displayName ?? '').charAt(0) || '?')

// 極小サイズ（xs）はバッジを重ねると潰れて見づらいため非表示にする
const badgeIcons = computed(() => {
  if (props.size === 'xs' || !props.badges?.length) return []
  return props.badges
    .map(b => USER_BADGE_OPTIONS.find(o => o.value === b))
    .filter((o): o is typeof USER_BADGE_OPTIONS[number] => !!o)
})

const badgeSizeClass = computed(() => ({
  sm: 'h-3 w-3',
  md: 'h-3.5 w-3.5',
  lg: 'h-5 w-5',
  xl: 'h-6 w-6',
}[props.size as 'sm' | 'md' | 'lg' | 'xl'] ?? 'h-3.5 w-3.5'))
</script>

<template>
  <div class="relative inline-flex shrink-0">
    <img
      v-if="avatarUrl"
      :src="avatarUrl"
      alt=""
      class="rounded-full object-cover shrink-0"
      :class="sizeClass"
      v-bind="$attrs"
    />
    <div
      v-else
      class="rounded-full flex items-center justify-center text-white font-semibold shrink-0"
      :class="[sizeClass, getGroupColor(groupId)]"
      v-bind="$attrs"
    >{{ initial }}</div>

    <div v-if="badgeIcons.length > 0" class="absolute -bottom-0.5 -right-0.5 flex -space-x-1.5 pointer-events-none">
      <img
        v-for="b in badgeIcons"
        :key="b.value"
        :src="b.icon"
        :alt="b.label"
        :title="b.label"
        class="rounded-full ring-2 ring-white bg-white"
        :class="badgeSizeClass"
      />
    </div>
  </div>
</template>
