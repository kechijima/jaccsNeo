<script setup lang="ts">
import { ref, watch } from 'vue'

export interface MentionItem {
  type:      'all' | 'group' | 'user'
  id:        string
  label:     string
  sublabel?: string
  avatar?:   string
  color?:    string
}

const props = defineProps<{
  items:   MentionItem[]
  command: (item: { id: string; label: string }) => void
}>()

const selectedIndex = ref(0)

const selectItem = (index: number) => {
  const item = props.items[index]
  if (item) {
    props.command({ id: item.id, label: item.label })
  }
}

const onKeyDown = ({ event }: { event: KeyboardEvent }) => {
  if (event.key === 'ArrowUp') {
    selectedIndex.value = (selectedIndex.value + props.items.length - 1) % props.items.length
    return true
  }
  if (event.key === 'ArrowDown') {
    selectedIndex.value = (selectedIndex.value + 1) % props.items.length
    return true
  }
  if (event.key === 'Enter') {
    selectItem(selectedIndex.value)
    return true
  }
  return false
}

defineExpose({ onKeyDown })

watch(() => props.items, () => {
  selectedIndex.value = 0
})
</script>

<template>
  <div class="bg-white border border-gray-200 rounded-xl shadow-xl min-w-[220px] max-h-[280px] overflow-y-auto z-50">
    <template v-if="items.length">
      <button
        v-for="(item, index) in items"
        :key="item.id"
        class="w-full text-left px-3 py-2.5 text-sm transition-colors flex items-center gap-2.5"
        :class="index === selectedIndex
          ? 'bg-primary-50 text-primary-700'
          : 'text-gray-700 hover:bg-gray-50'"
        @click="selectItem(index)"
      >
        <!-- 全体アイコン -->
        <span
          v-if="item.type === 'all'"
          class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 text-sm"
        >🌐</span>

        <!-- グループアイコン -->
        <span
          v-else-if="item.type === 'group'"
          class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white text-xs font-bold"
          :class="item.color ?? 'bg-indigo-500'"
        >G</span>

        <!-- ユーザーアバター -->
        <span
          v-else
          class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold"
        >{{ item.avatar ?? item.label[0] }}</span>

        <!-- テキスト -->
        <div class="min-w-0">
          <p class="font-medium truncate leading-tight">{{ item.label }}</p>
          <p v-if="item.sublabel" class="text-[11px] text-gray-400 truncate leading-tight">{{ item.sublabel }}</p>
        </div>

        <!-- 種別バッジ -->
        <span
          v-if="item.type === 'all'"
          class="ml-auto shrink-0 text-[10px] rounded-full bg-gray-100 text-gray-500 px-1.5 py-0.5"
        >全体</span>
        <span
          v-else-if="item.type === 'group'"
          class="ml-auto shrink-0 text-[10px] rounded-full bg-indigo-50 text-indigo-600 px-1.5 py-0.5"
        >グループ</span>
      </button>
    </template>
    <div v-else class="px-3 py-3 text-sm text-gray-400 text-center">
      見つかりません
    </div>
  </div>
</template>
