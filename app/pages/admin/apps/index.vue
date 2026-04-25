<script setup lang="ts">
definePageMeta({ middleware: ['auth', 'admin'] })

// ── フィールド定義 ─────────────────────────────────────────────
interface FieldDef {
  type: string
  label: string
  icon: string
  description: string
}

interface FieldCategory {
  label: string
  fields: FieldDef[]
}

const FIELD_CATEGORIES: FieldCategory[] = [
  {
    label: '基本',
    fields: [
      { type: 'record_number', label: 'レコード番号', icon: 'heroicons:hashtag',         description: 'レコードに採番された固有の番号を表示' },
      { type: 'label',         label: 'ラベル',       icon: 'heroicons:tag',              description: 'フォームに説明や注意を表示' },
      { type: 'space',         label: 'スペース',     icon: 'heroicons:minus',            description: 'フォームにスペースを追加' },
    ],
  },
  {
    label: '日時',
    fields: [
      { type: 'date',     label: '日付', icon: 'heroicons:calendar',      description: '日付を入力する項目' },
      { type: 'time',     label: '時刻', icon: 'heroicons:clock',          description: '時刻を入力する項目' },
      { type: 'datetime', label: '日時', icon: 'heroicons:calendar-days',  description: '日付と時刻を入力する項目' },
    ],
  },
  {
    label: '選択肢（1つ選択）',
    fields: [
      { type: 'radio',    label: 'ラジオボタン',   icon: 'heroicons:circle-stack',  description: '1つだけ選択可能な選択肢' },
      { type: 'dropdown', label: 'ドロップダウン', icon: 'heroicons:chevron-down',  description: '1つだけ選択可能なドロップダウン' },
    ],
  },
  {
    label: '選択肢（複数選択）',
    fields: [
      { type: 'checkbox',     label: 'チェックボックス', icon: 'heroicons:check-circle', description: '複数選択が可能な選択肢' },
      { type: 'multi_select', label: '複数選択',         icon: 'heroicons:list-bullet',  description: '複数選択が可能なリスト' },
    ],
  },
  {
    label: 'はい / いいえ',
    fields: [
      { type: 'yes_no', label: 'チェックボックス（はい/いいえ）', icon: 'heroicons:check', description: '「はい」「いいえ」を選択する項目' },
    ],
  },
  {
    label: 'リレーション',
    fields: [
      { type: 'lookup',          label: 'ルックアップ',       icon: 'heroicons:magnifying-glass', description: '他のアプリからデータを取得' },
      { type: 'related_records', label: '関連レコード一覧', icon: 'heroicons:table-cells',       description: 'アプリのレコードを一覧表示' },
    ],
  },
  {
    label: 'レイアウト',
    fields: [
      { type: 'group', label: 'グループ', icon: 'heroicons:rectangle-group', description: 'フィールドをグループ化' },
      { type: 'table', label: 'テーブル', icon: 'heroicons:table-cells',     description: 'フィールドをテーブル（表）化' },
    ],
  },
]

const FIELD_ICON: Record<string, string> = Object.fromEntries(
  FIELD_CATEGORIES.flatMap(c => c.fields.map(f => [f.type, f.icon])),
)

const getFieldDef = (type: string): FieldDef | undefined =>
  FIELD_CATEGORIES.flatMap(c => c.fields).find(f => f.type === type)

// ── キャンバスフィールドの型 ───────────────────────────────────
interface CanvasField {
  id: string
  type: string
  label: string
  required: boolean
  options: string[]
}

// ── 状態 ──────────────────────────────────────────────────────
const fields        = ref<CanvasField[]>([])
const selectedId    = ref<string | null>(null)
const previewMode   = ref(false)
const dragOverIndex = ref<number | null>(null)

type DragSource =
  | { source: 'palette'; fieldType: string }
  | { source: 'canvas'; fromIndex: number }

let dragData: DragSource | null = null

const selectedField = computed(() => fields.value.find(f => f.id === selectedId.value) ?? null)

const hasOptions   = (t: string) => ['radio', 'dropdown', 'checkbox', 'multi_select'].includes(t)
const isAutoField  = (t: string) => ['record_number', 'space'].includes(t)
const isRelation   = (t: string) => ['lookup', 'related_records'].includes(t)

// ── フィールド操作 ────────────────────────────────────────────
const makeField = (type: string): CanvasField => ({
  id:       `f-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  type,
  label:    getFieldDef(type)?.label ?? type,
  required: false,
  options:  hasOptions(type) ? ['選択肢1', '選択肢2', '選択肢3'] : [],
})

const addField = (type: string, atIndex?: number) => {
  const f = makeField(type)
  if (atIndex !== undefined) fields.value.splice(atIndex, 0, f)
  else fields.value.push(f)
  selectedId.value = f.id
}

const removeField = (id: string) => {
  fields.value = fields.value.filter(f => f.id !== id)
  if (selectedId.value === id) selectedId.value = null
}

const addOption    = (f: CanvasField) => f.options.push(`選択肢${f.options.length + 1}`)
const removeOption = (f: CanvasField, i: number) => f.options.splice(i, 1)

// ── ドラッグ&ドロップ ─────────────────────────────────────────
const onPaletteDragStart = (e: DragEvent, type: string) => {
  dragData = { source: 'palette', fieldType: type }
  e.dataTransfer!.effectAllowed = 'copy'
}

const onFieldDragStart = (e: DragEvent, index: number) => {
  dragData = { source: 'canvas', fromIndex: index }
  e.dataTransfer!.effectAllowed = 'move'
}

const onDragOverSlot = (e: DragEvent, index: number) => {
  e.preventDefault()
  dragOverIndex.value = index
}

const onDropSlot = (e: DragEvent, toIndex: number) => {
  e.preventDefault()
  if (!dragData) return
  if (dragData.source === 'palette') {
    addField(dragData.fieldType, toIndex)
  } else {
    const from = dragData.fromIndex
    if (from === toIndex) return
    const [item] = fields.value.splice(from, 1)
    const dest = from < toIndex ? toIndex - 1 : toIndex
    fields.value.splice(dest, 0, item)
  }
  dragData = null
  dragOverIndex.value = null
}

const onDropCanvas = (e: DragEvent) => {
  e.preventDefault()
  if (!dragData || dragData.source !== 'palette') return
  addField(dragData.fieldType)
  dragData = null
}

const onDragEnd = () => { dragData = null; dragOverIndex.value = null }
</script>

<template>
  <div class="flex flex-col overflow-hidden" style="height: calc(100vh - 56px);">

    <!-- ── ヘッダー ── -->
    <div class="flex items-center justify-between px-5 py-3 bg-white border-b border-gray-200 shrink-0">
      <div>
        <h1 class="text-lg font-bold text-gray-900 flex items-center gap-2">
          <Icon name="heroicons:squares-2x2" class="h-5 w-5 text-primary-600" />
          アプリ管理
        </h1>
        <p class="text-xs text-gray-500 mt-0.5">フォームのフィールド設計・権限設定</p>
      </div>
      <div class="flex items-center gap-2">
        <NuxtLink to="/admin" class="btn-secondary text-sm">← 管理者設定</NuxtLink>
        <button
          class="btn-secondary text-sm flex items-center gap-1.5"
          :class="previewMode ? 'bg-primary-50 text-primary-700 border-primary-300' : ''"
          @click="previewMode = !previewMode"
        >
          <Icon :name="previewMode ? 'heroicons:cog-6-tooth' : 'heroicons:eye'" class="h-4 w-4" />
          {{ previewMode ? '設定に戻る' : 'プレビュー' }}
        </button>
        <button class="btn-primary text-sm">保存する</button>
      </div>
    </div>

    <!-- ── プレビューモード ── -->
    <div v-if="previewMode" class="flex-1 overflow-y-auto bg-gray-50 p-6">
      <div class="max-w-xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
        <h2 class="text-base font-bold text-gray-900 border-b border-gray-100 pb-3 flex items-center gap-2">
          <Icon name="heroicons:document-text" class="h-5 w-5 text-primary-500" />
          フォームプレビュー
        </h2>

        <div v-if="fields.length === 0" class="text-center py-16 text-gray-400">
          <Icon name="heroicons:squares-plus" class="h-12 w-12 mx-auto mb-2 text-gray-200" />
          <p>フィールドがありません</p>
          <p class="text-sm mt-1">設定モードでフィールドを追加してください</p>
        </div>

        <template v-for="f in fields" :key="f.id">
          <!-- レコード番号 -->
          <div v-if="f.type === 'record_number'">
            <label class="block text-sm font-medium text-gray-700 mb-1">{{ f.label }}</label>
            <div class="input-field bg-gray-50 text-gray-400 text-sm">#00001</div>
          </div>
          <!-- ラベル -->
          <div v-else-if="f.type === 'label'" class="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 text-sm text-gray-700">
            {{ f.label }}
          </div>
          <!-- スペース -->
          <div v-else-if="f.type === 'space'" class="h-4" />
          <!-- 日付 -->
          <div v-else-if="f.type === 'date'">
            <label class="block text-sm font-medium text-gray-700 mb-1">{{ f.label }}<span v-if="f.required" class="text-red-500 ml-1">*</span></label>
            <input type="date" class="input-field text-sm" disabled />
          </div>
          <!-- 時刻 -->
          <div v-else-if="f.type === 'time'">
            <label class="block text-sm font-medium text-gray-700 mb-1">{{ f.label }}<span v-if="f.required" class="text-red-500 ml-1">*</span></label>
            <input type="time" class="input-field text-sm" disabled />
          </div>
          <!-- 日時 -->
          <div v-else-if="f.type === 'datetime'">
            <label class="block text-sm font-medium text-gray-700 mb-1">{{ f.label }}<span v-if="f.required" class="text-red-500 ml-1">*</span></label>
            <div class="flex gap-2">
              <input type="date" class="input-field text-sm flex-1" disabled />
              <input type="time" class="input-field text-sm w-32" disabled />
            </div>
          </div>
          <!-- ラジオ -->
          <div v-else-if="f.type === 'radio'">
            <label class="block text-sm font-medium text-gray-700 mb-1.5">{{ f.label }}<span v-if="f.required" class="text-red-500 ml-1">*</span></label>
            <div class="flex flex-wrap gap-4">
              <label v-for="opt in f.options" :key="opt" class="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
                <input type="radio" :name="f.id" disabled class="accent-primary-600" />{{ opt }}
              </label>
            </div>
          </div>
          <!-- ドロップダウン -->
          <div v-else-if="f.type === 'dropdown'">
            <label class="block text-sm font-medium text-gray-700 mb-1">{{ f.label }}<span v-if="f.required" class="text-red-500 ml-1">*</span></label>
            <select class="input-field text-sm" disabled>
              <option value="">選択してください</option>
              <option v-for="opt in f.options" :key="opt">{{ opt }}</option>
            </select>
          </div>
          <!-- チェックボックス -->
          <div v-else-if="f.type === 'checkbox'">
            <label class="block text-sm font-medium text-gray-700 mb-1.5">{{ f.label }}<span v-if="f.required" class="text-red-500 ml-1">*</span></label>
            <div class="flex flex-wrap gap-4">
              <label v-for="opt in f.options" :key="opt" class="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" disabled class="accent-primary-600 rounded" />{{ opt }}
              </label>
            </div>
          </div>
          <!-- 複数選択 -->
          <div v-else-if="f.type === 'multi_select'">
            <label class="block text-sm font-medium text-gray-700 mb-1">{{ f.label }}<span v-if="f.required" class="text-red-500 ml-1">*</span></label>
            <select class="input-field text-sm" multiple size="3" disabled>
              <option v-for="opt in f.options" :key="opt">{{ opt }}</option>
            </select>
          </div>
          <!-- はい/いいえ -->
          <div v-else-if="f.type === 'yes_no'" class="flex items-center gap-2">
            <input type="checkbox" disabled class="accent-primary-600 rounded h-4 w-4" />
            <label class="text-sm font-medium text-gray-700">{{ f.label }}</label>
          </div>
          <!-- ルックアップ -->
          <div v-else-if="f.type === 'lookup'">
            <label class="block text-sm font-medium text-gray-700 mb-1">{{ f.label }}<span v-if="f.required" class="text-red-500 ml-1">*</span></label>
            <div class="flex gap-2">
              <input class="input-field text-sm flex-1" disabled placeholder="ルックアップで取得" />
              <button class="btn-secondary text-sm px-3" disabled>参照</button>
            </div>
          </div>
          <!-- 関連レコード一覧 -->
          <div v-else-if="f.type === 'related_records'">
            <label class="block text-sm font-medium text-gray-700 mb-1">{{ f.label }}</label>
            <div class="border border-gray-200 rounded-lg p-4 bg-gray-50 text-sm text-gray-400 text-center">
              関連レコード一覧（設定が必要）
            </div>
          </div>
          <!-- グループ -->
          <div v-else-if="f.type === 'group'" class="border border-gray-200 rounded-xl overflow-hidden">
            <div class="bg-gray-50 px-3 py-2 flex items-center gap-2 border-b border-gray-200">
              <Icon name="heroicons:rectangle-group" class="h-4 w-4 text-gray-400" />
              <span class="text-sm font-medium text-gray-700">{{ f.label }}</span>
            </div>
            <div class="p-4 text-sm text-gray-400 text-center">グループ内にフィールドを追加</div>
          </div>
          <!-- テーブル -->
          <div v-else-if="f.type === 'table'">
            <label class="block text-sm font-medium text-gray-700 mb-1">{{ f.label }}</label>
            <div class="border border-gray-200 rounded-lg overflow-hidden">
              <table class="w-full text-sm">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="px-3 py-2 text-left text-gray-500 font-medium border-b border-gray-200">列1</th>
                    <th class="px-3 py-2 text-left text-gray-500 font-medium border-b border-gray-200">列2</th>
                    <th class="px-3 py-2 text-left text-gray-500 font-medium border-b border-gray-200">列3</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td class="px-3 py-2 text-gray-400">-</td>
                    <td class="px-3 py-2 text-gray-400">-</td>
                    <td class="px-3 py-2 text-gray-400">-</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </template>

        <div v-if="fields.length > 0" class="pt-4 border-t border-gray-100 flex justify-end gap-2">
          <button class="btn-secondary text-sm" disabled>キャンセル</button>
          <button class="btn-primary text-sm" disabled>保存する</button>
        </div>
      </div>
    </div>

    <!-- ── 設定モード（3カラム） ── -->
    <div v-else class="flex flex-1 overflow-hidden">

      <!-- 左: フィールドパレット -->
      <div class="w-52 shrink-0 bg-white border-r border-gray-200 overflow-y-auto">
        <div class="px-3 pt-3 pb-4">
          <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">フィールド追加</p>
          <div v-for="cat in FIELD_CATEGORIES" :key="cat.label" class="mb-4">
            <p class="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5 px-1">{{ cat.label }}</p>
            <div
              v-for="f in cat.fields"
              :key="f.type"
              class="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-gray-700 hover:bg-primary-50 hover:text-primary-700 cursor-grab active:cursor-grabbing transition select-none mb-0.5"
              draggable="true"
              @dragstart="onPaletteDragStart($event, f.type)"
              @dragend="onDragEnd"
              @click="addField(f.type)"
            >
              <Icon :name="f.icon" class="h-3.5 w-3.5 shrink-0 text-gray-400" />
              <span class="truncate leading-tight">{{ f.label }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 中央: キャンバス -->
      <div
        class="flex-1 overflow-y-auto bg-gray-50 p-5"
        @dragover.prevent
        @drop="onDropCanvas"
      >
        <div class="max-w-2xl mx-auto">
          <!-- 空の状態 -->
          <div
            v-if="fields.length === 0"
            class="flex flex-col items-center justify-center text-center py-24 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400"
          >
            <Icon name="heroicons:squares-plus" class="h-14 w-14 mb-3 text-gray-200" />
            <p class="font-medium">フィールドをここにドラッグ</p>
            <p class="text-sm mt-1">または左のパレットをクリックして追加</p>
          </div>

          <div v-else class="space-y-1">
            <!-- ドロップゾーン(先頭) -->
            <div
              class="h-2 rounded-full transition-all"
              :class="dragOverIndex === 0 ? 'h-6 bg-primary-100 border-2 border-dashed border-primary-300' : ''"
              @dragover.prevent="onDragOverSlot($event, 0)"
              @drop="onDropSlot($event, 0)"
              @dragleave="dragOverIndex = null"
            />

            <template v-for="(field, index) in fields" :key="field.id">
              <!-- フィールドカード -->
              <div
                class="bg-white border-2 rounded-xl px-3 py-2.5 flex items-center gap-2.5 cursor-pointer transition"
                :class="selectedId === field.id
                  ? 'border-primary-400 shadow-sm shadow-primary-100'
                  : 'border-gray-200 hover:border-gray-300'"
                draggable="true"
                @dragstart="onFieldDragStart($event, index)"
                @dragend="onDragEnd"
                @click="selectedId = field.id"
              >
                <Icon name="heroicons:bars-3" class="h-4 w-4 text-gray-300 shrink-0 cursor-grab" />
                <Icon :name="FIELD_ICON[field.type]" class="h-4 w-4 shrink-0 text-primary-500" />
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-gray-800 truncate">{{ field.label }}</p>
                  <p class="text-xs text-gray-400 truncate">{{ getFieldDef(field.type)?.description }}</p>
                </div>
                <span v-if="field.required" class="text-xs text-red-500 font-medium shrink-0 ml-1">必須</span>
                <button
                  class="p-1 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition shrink-0"
                  @click.stop="removeField(field.id)"
                >
                  <Icon name="heroicons:trash" class="h-4 w-4" />
                </button>
              </div>

              <!-- ドロップゾーン(各フィールド下) -->
              <div
                class="h-2 rounded-full transition-all"
                :class="dragOverIndex === index + 1 ? 'h-6 bg-primary-100 border-2 border-dashed border-primary-300' : ''"
                @dragover.prevent="onDragOverSlot($event, index + 1)"
                @drop="onDropSlot($event, index + 1)"
                @dragleave="dragOverIndex = null"
              />
            </template>

            <!-- 末尾ドロップエリア -->
            <div
              class="h-12 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center text-xs text-gray-300 mt-1"
              @dragover.prevent="onDragOverSlot($event, fields.length)"
              @drop="onDropSlot($event, fields.length)"
            >
              ここにドロップ
            </div>
          </div>
        </div>
      </div>

      <!-- 右: フィールド設定パネル -->
      <div class="w-68 shrink-0 bg-white border-l border-gray-200 overflow-y-auto" style="width: 272px;">
        <!-- 未選択 -->
        <div v-if="!selectedField" class="flex flex-col items-center justify-center h-full text-center text-gray-400 p-6">
          <Icon name="heroicons:cursor-arrow-rays" class="h-10 w-10 mb-2 text-gray-200" />
          <p class="text-sm">フィールドを選択すると<br>設定が表示されます</p>
        </div>

        <!-- 設定フォーム -->
        <div v-else class="p-4 space-y-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <Icon :name="FIELD_ICON[selectedField.type]" class="h-4 w-4 text-primary-500" />
              <span class="text-sm font-semibold text-gray-900">フィールド設定</span>
            </div>
            <button class="text-gray-300 hover:text-gray-500 transition" @click="selectedId = null">
              <Icon name="heroicons:x-mark" class="h-4 w-4" />
            </button>
          </div>

          <!-- 種別バッジ -->
          <div class="flex items-center gap-1.5">
            <span class="inline-flex items-center gap-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full px-2.5 py-1">
              <Icon :name="FIELD_ICON[selectedField.type]" class="h-3 w-3" />
              {{ getFieldDef(selectedField.type)?.label }}
            </span>
          </div>

          <!-- フィールド名 -->
          <div v-if="!isAutoField(selectedField.type)" class="space-y-1">
            <label class="block text-xs font-medium text-gray-600">フィールド名</label>
            <input v-model="selectedField.label" type="text" class="input-field text-sm" placeholder="フィールド名" />
          </div>

          <!-- 必須 -->
          <div v-if="!isAutoField(selectedField.type) && selectedField.type !== 'label'" class="flex items-center justify-between py-1">
            <span class="text-xs font-medium text-gray-600">必須入力</span>
            <button
              class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors"
              :class="selectedField.required ? 'bg-primary-500' : 'bg-gray-200'"
              @click="selectedField.required = !selectedField.required"
            >
              <span
                class="inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform"
                :class="selectedField.required ? 'translate-x-4' : 'translate-x-1'"
              />
            </button>
          </div>

          <!-- 選択肢 -->
          <div v-if="hasOptions(selectedField.type)" class="space-y-2">
            <label class="block text-xs font-medium text-gray-600">選択肢</label>
            <div class="space-y-1.5">
              <div v-for="(opt, i) in selectedField.options" :key="i" class="flex items-center gap-1.5">
                <input
                  v-model="selectedField.options[i]"
                  type="text"
                  class="input-field text-xs py-1.5 flex-1"
                />
                <button
                  class="text-gray-300 hover:text-red-400 transition p-0.5"
                  @click="removeOption(selectedField, i)"
                >
                  <Icon name="heroicons:x-mark" class="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <button
              class="text-xs text-primary-600 hover:underline flex items-center gap-1 mt-1"
              @click="addOption(selectedField)"
            >
              <Icon name="heroicons:plus" class="h-3.5 w-3.5" />選択肢を追加
            </button>
          </div>

          <!-- ルックアップ設定 -->
          <div v-if="selectedField.type === 'lookup'" class="space-y-2">
            <label class="block text-xs font-medium text-gray-600">参照アプリ</label>
            <select class="input-field text-sm">
              <option value="">選択してください</option>
              <option>顧客アプリ</option>
              <option>サービスアプリ</option>
            </select>
            <label class="block text-xs font-medium text-gray-600 mt-2">参照フィールド</label>
            <select class="input-field text-sm">
              <option value="">選択してください</option>
              <option>顧客名</option>
              <option>顧客ID</option>
            </select>
          </div>

          <!-- 関連レコード設定 -->
          <div v-if="selectedField.type === 'related_records'" class="space-y-2">
            <label class="block text-xs font-medium text-gray-600">関連アプリ</label>
            <select class="input-field text-sm">
              <option value="">選択してください</option>
              <option>顧客アプリ</option>
              <option>サービスアプリ</option>
            </select>
            <label class="block text-xs font-medium text-gray-600 mt-2">紐付けるフィールド</label>
            <select class="input-field text-sm">
              <option value="">選択してください</option>
              <option>顧客ID</option>
              <option>担当FP</option>
            </select>
          </div>

          <!-- 自動フィールドの説明 -->
          <div v-if="isAutoField(selectedField.type)" class="bg-gray-50 rounded-lg p-3 text-xs text-gray-500">
            このフィールドはシステムが自動で管理します。設定の変更はできません。
          </div>

          <!-- 削除 -->
          <div class="pt-2 border-t border-gray-100">
            <button
              class="w-full text-sm text-red-500 hover:bg-red-50 rounded-lg py-2 transition flex items-center justify-center gap-1.5"
              @click="removeField(selectedField.id)"
            >
              <Icon name="heroicons:trash" class="h-4 w-4" />
              フィールドを削除
            </button>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>
