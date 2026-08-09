<script setup lang="ts">
// テキスト入力しつつ、候補一覧からの選択もできるコンボボックス。
// SearchableSelect/SearchableUserSelectと異なりmodelValueは自由入力の文字列
// （組合の管理者名など、必ずしもアプリのユーザーとは限らない項目向け）
const props = defineProps<{
  modelValue: string
  items: string[]
  placeholder?: string
}>()

const emit = defineEmits<{ 'update:modelValue': [string] }>()

const open = ref(false)
const containerRef = ref<HTMLElement>()

const filtered = computed(() => {
  const pool = [...new Set(props.items.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ja'))
  const q = props.modelValue.trim().toLowerCase()
  if (!q) return pool
  return pool.filter(i => i.toLowerCase().includes(q))
})

const onInput = (e: Event) => {
  emit('update:modelValue', (e.target as HTMLInputElement).value)
  open.value = true
}

const select = (value: string) => {
  emit('update:modelValue', value)
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
    <input
      :value="modelValue"
      type="text"
      :placeholder="placeholder"
      class="input-field"
      @input="onInput"
      @focus="open = true"
    />
    <div
      v-if="open && filtered.length > 0"
      class="absolute z-20 mt-1 w-full max-h-56 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg"
    >
      <button
        v-for="v in filtered"
        :key="v"
        type="button"
        class="w-full truncate px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
        @click="select(v)"
      >{{ v }}</button>
    </div>
  </div>
</template>
