<script setup lang="ts">
// ユーザーアイコンの共通コンポーネント。写真（avatarUrl）が設定されていれば
// それを表示し、未設定の場合は頭文字をグループごとの色（useGroupLabels）で
// 塗った円で代替する。色分けにより、写真未設定でも所属グループがある程度
// 見分けられるようにする
import { useGroupLabels } from '~/composables/useGroupLabels'

const props = withDefaults(defineProps<{
  avatarUrl?:   string | null
  displayName?: string | null
  groupId?:     string | null
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
</script>

<template>
  <img
    v-if="avatarUrl"
    :src="avatarUrl"
    alt=""
    class="rounded-full object-cover shrink-0"
    :class="sizeClass"
  />
  <div
    v-else
    class="rounded-full flex items-center justify-center text-white font-semibold shrink-0"
    :class="[sizeClass, getGroupColor(groupId)]"
  >{{ initial }}</div>
</template>
