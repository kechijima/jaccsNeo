<script setup lang="ts">
const props = defineProps<{
  modelValue: string
  items: Array<{ id: string; label: string; sublabel?: string }>
  placeholder?: string
  searchPlaceholder?: string
}>()

const emit = defineEmits<{ 'update:modelValue': [string] }>()

const open = ref(false)
const query = ref('')
const containerRef = ref<HTMLElement>()
const searchInputRef = ref<HTMLInputElement>()

const selectedItem = computed(() => props.items.find(i => i.id === props.modelValue) ?? null)

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return props.items
  return props.items.filter(i =>
    i.label.toLowerCase().includes(q) || (i.sublabel ?? '').toLowerCase().includes(q)
  )
})

const toggleOpen = () => {
  open.value = !open.value
}

watch(open, async (isOpen) => {
  if (!isOpen) { query.value = ''; return }
  await nextTick()
  searchInputRef.value?.focus()
})

const select = (id: string) => {
  emit('update:modelValue', id)
  open.value = false
}

const clear = () => {
  emit('update:modelValue', '')
  open.value = false
}

const onClickOutside = (e: MouseEvent) => {
  if (containerRef.value && !containerRef.value.contains(e.target as Node)) open.value = false
}

onMounted(() => document.addEventListener('click', onClickOutside))
onBeforeUnmount(() => document.removeEventListener('click', onClickOutside))
</script>

<template>
  <div ref="containerRef" class="relative">
    <button
      type="button"
      class="input-field text-left flex items-center justify-between gap-2"
      @click="toggleOpen"
    >
      <span class="truncate" :class="selectedItem ? 'text-gray-900' : 'text-gray-400'">
        {{ selectedItem ? (selectedItem.sublabel ? `${selectedItem.label}（${selectedItem.sublabel}）` : selectedItem.label) : (placeholder ?? '（なし）') }}
      </span>
      <Icon name="heroicons:chevron-down" class="h-4 w-4 text-gray-400 shrink-0" />
    </button>

    <div
      v-if="open"
      class="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden"
    >
      <div class="p-2 border-b border-gray-100">
        <input
          ref="searchInputRef"
          v-model="query"
          type="search"
          :placeholder="searchPlaceholder ?? '検索...'"
          class="input-field text-sm py-1.5"
        />
      </div>
      <div class="max-h-56 overflow-y-auto">
        <button
          type="button"
          class="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 text-gray-400"
          @click="clear"
        >（なし）</button>
        <button
          v-for="i in filtered"
          :key="i.id"
          type="button"
          class="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 truncate"
          :class="i.id === modelValue ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700'"
          @click="select(i.id)"
        >
          {{ i.label }}
          <span v-if="i.sublabel" class="text-xs text-gray-400">（{{ i.sublabel }}）</span>
        </button>
        <div v-if="filtered.length === 0" class="px-3 py-4 text-center text-xs text-gray-400">該当する項目がありません</div>
      </div>
    </div>
  </div>
</template>
