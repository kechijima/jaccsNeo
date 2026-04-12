<script setup lang="ts">
import { ref, watch } from 'vue'
const props = defineProps<{
  items: any[]
  command: (item: any) => void
}>()

const selectedIndex = ref(0)

const selectItem = (index: number) => {
  const item = props.items[index]
  if (item) {
    props.command({ id: item.uid, label: item.displayName })
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
  <div class="card p-1 shadow-xl bg-white border border-gray-200 min-w-[160px] max-h-[240px] overflow-y-auto z-50">
    <template v-if="items.length">
      <button
        v-for="(item, index) in items"
        :key="item.uid"
        class="w-full text-left px-3 py-2 text-sm rounded-lg transition-colors flex items-center gap-2"
        :class="index === selectedIndex ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700 hover:bg-gray-50'"
        @click="selectItem(index)"
      >
        <span class="avatar-xs bg-gray-100 text-gray-400 text-[10px]">{{ item.displayName[0] }}</span>
        {{ item.displayName }}
      </button>
    </template>
    <div v-else class="px-3 py-2 text-sm text-gray-400">
      ユーザーが見つかりません
    </div>
  </div>
</template>
