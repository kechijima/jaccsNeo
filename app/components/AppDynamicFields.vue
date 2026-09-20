<script setup lang="ts">
// アプリ管理（フォームビルダー）で設定したフィールド定義(AppFieldDef[])を元に、
// 実際に入力・保存できるフォームを描画する共通コンポーネント。
// 現時点で対応している項目タイプ: text / textarea / date / time / datetime /
// radio / dropdown / checkbox / multi_select / yes_no / label（表示のみ）/
// space（レイアウトのみ）。
// 未対応（lookup / related_records / group / table / file / record_number）は
// その旨を表示し、値の入力・保存は行わない
import type { AppFieldDef } from '~/types/appDef'

const props = defineProps<{
  fields: AppFieldDef[]
  modelValue: Record<string, string | string[]>
}>()

const emit = defineEmits<{ (e: 'update:modelValue', value: Record<string, string | string[]>): void }>()

const SUPPORTED_TYPES = [
  'text', 'textarea', 'date', 'time', 'datetime',
  'radio', 'dropdown', 'checkbox', 'multi_select', 'yes_no',
]
const isSupported = (type: string) => SUPPORTED_TYPES.includes(type)

const values = computed<Record<string, string | string[]>>({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const getStr = (id: string): string => {
  const v = values.value[id]
  return typeof v === 'string' ? v : ''
}
const setStr = (id: string, v: string) => {
  values.value = { ...values.value, [id]: v }
}
const getArr = (id: string): string[] => {
  const v = values.value[id]
  return Array.isArray(v) ? v : []
}
const toggleArr = (id: string, opt: string) => {
  const curr = getArr(id)
  const next = curr.includes(opt) ? curr.filter(o => o !== opt) : [...curr, opt]
  values.value = { ...values.value, [id]: next }
}
</script>

<template>
  <div class="space-y-4">
    <template v-for="f in fields" :key="f.id">
      <!-- ラベル（説明表示のみ、値は持たない） -->
      <div
        v-if="f.type === 'label'"
        class="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 text-sm text-gray-700 prose prose-sm max-w-none"
        v-html="f.label"
      />
      <!-- スペース -->
      <div v-else-if="f.type === 'space'" class="h-2" />

      <!-- 文字列（1行） -->
      <div v-else-if="f.type === 'text'">
        <label class="block text-sm font-medium text-gray-700 mb-1.5">{{ f.label }}<span v-if="f.required" class="text-red-500 ml-1">*</span></label>
        <input :value="getStr(f.id)" type="text" class="input-field" @input="setStr(f.id, ($event.target as HTMLInputElement).value)" />
      </div>
      <!-- 文字列（複数行） -->
      <div v-else-if="f.type === 'textarea'">
        <label class="block text-sm font-medium text-gray-700 mb-1.5">{{ f.label }}<span v-if="f.required" class="text-red-500 ml-1">*</span></label>
        <textarea :value="getStr(f.id)" rows="3" class="input-field resize-none" @input="setStr(f.id, ($event.target as HTMLTextAreaElement).value)" />
      </div>
      <!-- 日付 -->
      <div v-else-if="f.type === 'date'">
        <label class="block text-sm font-medium text-gray-700 mb-1.5">{{ f.label }}<span v-if="f.required" class="text-red-500 ml-1">*</span></label>
        <input :value="getStr(f.id)" type="date" class="input-field" @input="setStr(f.id, ($event.target as HTMLInputElement).value)" />
      </div>
      <!-- 時刻 -->
      <div v-else-if="f.type === 'time'">
        <label class="block text-sm font-medium text-gray-700 mb-1.5">{{ f.label }}<span v-if="f.required" class="text-red-500 ml-1">*</span></label>
        <input :value="getStr(f.id)" type="time" class="input-field" @input="setStr(f.id, ($event.target as HTMLInputElement).value)" />
      </div>
      <!-- 日時 -->
      <div v-else-if="f.type === 'datetime'">
        <label class="block text-sm font-medium text-gray-700 mb-1.5">{{ f.label }}<span v-if="f.required" class="text-red-500 ml-1">*</span></label>
        <input :value="getStr(f.id)" type="datetime-local" class="input-field" @input="setStr(f.id, ($event.target as HTMLInputElement).value)" />
      </div>
      <!-- ラジオ -->
      <div v-else-if="f.type === 'radio'">
        <label class="block text-sm font-medium text-gray-700 mb-1.5">{{ f.label }}<span v-if="f.required" class="text-red-500 ml-1">*</span></label>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="opt in f.options" :key="opt"
            type="button"
            class="flex items-center gap-1.5 cursor-pointer rounded-lg border px-3 py-2 text-sm transition"
            :class="getStr(f.id) === opt ? 'border-primary-400 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'"
            @click="setStr(f.id, opt)"
          >{{ opt }}</button>
        </div>
      </div>
      <!-- ドロップダウン -->
      <div v-else-if="f.type === 'dropdown'">
        <label class="block text-sm font-medium text-gray-700 mb-1.5">{{ f.label }}<span v-if="f.required" class="text-red-500 ml-1">*</span></label>
        <select :value="getStr(f.id)" class="input-field" @change="setStr(f.id, ($event.target as HTMLSelectElement).value)">
          <option value="">選択してください</option>
          <option v-for="opt in f.options" :key="opt" :value="opt">{{ opt }}</option>
        </select>
      </div>
      <!-- チェックボックス（複数選択） -->
      <div v-else-if="f.type === 'checkbox'">
        <label class="block text-sm font-medium text-gray-700 mb-1.5">{{ f.label }}<span v-if="f.required" class="text-red-500 ml-1">*</span></label>
        <div class="flex flex-wrap gap-2">
          <label
            v-for="opt in f.options" :key="opt"
            class="flex items-center gap-1 cursor-pointer rounded-lg border px-3 py-1.5 text-sm transition"
            :class="getArr(f.id).includes(opt) ? 'border-primary-400 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'"
            @click="toggleArr(f.id, opt)"
          >{{ opt }}</label>
        </div>
      </div>
      <!-- 複数選択 -->
      <div v-else-if="f.type === 'multi_select'">
        <label class="block text-sm font-medium text-gray-700 mb-1.5">{{ f.label }}<span v-if="f.required" class="text-red-500 ml-1">*</span></label>
        <div class="flex flex-wrap gap-2">
          <label
            v-for="opt in f.options" :key="opt"
            class="flex items-center gap-1 cursor-pointer rounded-lg border px-3 py-1.5 text-sm transition"
            :class="getArr(f.id).includes(opt) ? 'border-primary-400 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'"
            @click="toggleArr(f.id, opt)"
          >{{ opt }}</label>
        </div>
      </div>
      <!-- はい/いいえ -->
      <div v-else-if="f.type === 'yes_no'" class="flex items-center gap-2">
        <input
          type="checkbox"
          class="accent-primary-600 rounded h-4 w-4"
          :checked="getStr(f.id) === 'はい'"
          @change="setStr(f.id, ($event.target as HTMLInputElement).checked ? 'はい' : 'いいえ')"
        />
        <label class="text-sm font-medium text-gray-700">{{ f.label }}</label>
      </div>

      <!-- 未対応の項目タイプ -->
      <div v-else-if="!isSupported(f.type)" class="rounded-lg border border-dashed border-gray-200 p-3 text-xs text-gray-400">
        「{{ f.label }}」は現在このフォームでは未対応の項目タイプです（アプリ管理でのみ設定可能）
      </div>
    </template>
  </div>
</template>
