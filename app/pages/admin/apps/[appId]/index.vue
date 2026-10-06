<script setup lang="ts">
import { onBeforeRouteLeave } from 'vue-router'
import { useAppDefs } from '~/composables/useAppDefs'
import { useUsers } from '~/composables/useUsers'
import { SERVICE_LABELS, STATUS_LABELS, APP_CATEGORY_LIST } from '~/types/service'
import { readCsvFile, parseCsv, guessFieldType } from '~/utils/csv'
import type { AppUser } from '~/types/user'

definePageMeta({ middleware: ['auth', 'admin'] })

const route = useRoute()
const appId = computed(() => route.params.appId as string)

const OTHER_SERVICE_TYPE_OPTIONS = Object.entries(SERVICE_LABELS)
  .filter(([value]) => value !== 'lifeInsurance')
  .map(([value, label]) => ({ value, label }))

const { fetchOne, update, remove, appDefs: allAppDefs, fetchAll: fetchAllAppDefs } = useAppDefs()
const { fetchUsers } = useUsers()

const loading = ref(true)
const loadError = ref('')
const appName = ref('')
const appDescription = ref('')
const ownerUids = ref<string[]>([])
const staffUids = ref<string[]>([])
const sourceServiceType = ref('')
const category = ref('その他')
const staleAlertDaysInput = ref('')
const staleAlertStatuses = ref<string[]>([])
const linkedAppIds = ref<string[]>([])
const isPublished = ref(true)
const users = ref<AppUser[]>([])

// 他のアプリ（ルックアップ・関連レコード一覧・連動アプリの参照先候補）
const otherAppDefs = computed(() => allAppDefs.value.filter(a => a.id !== appId.value && a.isPublished))

// ── 連動アプリ ──────────────────────────────────────────────────
const linkedAppPickId = ref('')
const linkedAppCandidates = computed(() => otherAppDefs.value.filter(a => !linkedAppIds.value.includes(a.id)))
const addLinkedApp = () => {
  if (!linkedAppPickId.value) return
  linkedAppIds.value.push(linkedAppPickId.value)
  linkedAppPickId.value = ''
}
const removeLinkedApp = (id: string) => {
  linkedAppIds.value = linkedAppIds.value.filter(i => i !== id)
}
const linkedAppName = (id: string) => allAppDefs.value.find(a => a.id === id)?.name ?? id

onMounted(async () => {
  try {
    const [app, fetchedUsers] = await Promise.all([
      fetchOne(appId.value),
      fetchUsers().catch(() => []),
      fetchAllAppDefs(),
    ])
    users.value = fetchedUsers
    if (!app) {
      loadError.value = 'アプリが見つかりませんでした'
    } else {
      appName.value = app.name
      appDescription.value = app.description ?? ''
      ownerUids.value = [...(app.ownerUids ?? [])]
      staffUids.value = [...app.staffUids]
      sourceServiceType.value = app.sourceServiceType ?? ''
      category.value = app.category && APP_CATEGORY_LIST.includes(app.category) ? app.category : 'その他'
      staleAlertDaysInput.value = app.staleAlertDays ? String(app.staleAlertDays) : ''
      staleAlertStatuses.value = [...(app.staleAlertStatuses ?? ['consulting', 'considering'])]
      linkedAppIds.value = [...(app.linkedAppIds ?? [])]
      isPublished.value = app.isPublished
      fields.value = app.fields.map((f) => {
        const copy: CanvasField = { ...f, options: [...f.options] }
        if (f.defaultValues) copy.defaultValues = [...f.defaultValues]
        return copy
      })
    }
  } catch (e: any) {
    loadError.value = e.message ?? 'アプリの取得に失敗しました'
  } finally {
    loading.value = false
    // 初期値の代入自体を変更扱いしないよう、読み込み完了後に監視を開始する
    watch(
      [fields, appName, appDescription, ownerUids, staffUids, sourceServiceType, category,
       staleAlertDaysInput, staleAlertStatuses, linkedAppIds, isPublished],
      () => { isDirty.value = true },
      { deep: true },
    )
  }
})

// ── 未保存の変更がある場合に離脱確認を出す ────────────────────────
const isDirty = ref(false)
const UNSAVED_MESSAGE = '保存されていない変更があります。このページを離れますか？'

const handleBeforeUnload = (e: BeforeUnloadEvent) => {
  if (!isDirty.value) return
  e.preventDefault()
  e.returnValue = ''
}
onMounted(() => window.addEventListener('beforeunload', handleBeforeUnload))
onBeforeUnmount(() => { window.removeEventListener('beforeunload', handleBeforeUnload); stopAutoScroll() })

onBeforeRouteLeave(() => {
  if (!isDirty.value) return true
  return confirm(UNSAVED_MESSAGE)
})

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
      { type: 'text',           label: '文字列（1行）', icon: 'heroicons:pencil',            description: '1行の文字列を入力する項目' },
      { type: 'textarea',       label: '文字列（複数行）', icon: 'heroicons:bars-3-bottom-left', description: '複数行の文字列を入力する項目' },
      { type: 'file',           label: 'ファイル添付', icon: 'heroicons:paper-clip',       description: 'ファイルを添付する項目' },
      { type: 'record_number',  label: 'レコード番号', icon: 'heroicons:hashtag',         description: 'レコードに採番された固有の番号を表示' },
      { type: 'label',          label: 'ラベル',       icon: 'heroicons:tag',              description: 'フォームに説明や注意を表示' },
      { type: 'space',          label: 'スペース',     icon: 'heroicons:minus',            description: 'フォームにスペースを追加' },
    ],
  },
  {
    label: '担当者',
    fields: [
      { type: 'assignee', label: '担当者', icon: 'heroicons:user-circle', description: 'このアプリの責任者・担当者（アプリ管理で設定）から選択する項目' },
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
  lookupSource?: 'customer' | 'app'
  lookupCustomerField?: string
  lookupAppId?: string
  lookupFieldKey?: string
  relatedAppId?: string
  defaultValue?: string
  defaultValues?: string[]
  useTodayAsDefault?: boolean
}

// ── 状態 ──────────────────────────────────────────────────────
const fields        = ref<CanvasField[]>([])
const selectedId    = ref<string | null>(null)
const previewMode   = ref(false)
const dragOverIndex = ref<number | null>(null)
const showSettings  = ref(false)

type DragSource =
  | { source: 'palette'; fieldType: string }
  | { source: 'canvas'; fromIndex: number }

let dragData: DragSource | null = null

const selectedField = computed(() => fields.value.find(f => f.id === selectedId.value) ?? null)

const hasOptions   = (t: string) => ['radio', 'dropdown', 'checkbox', 'multi_select'].includes(t)
const isAutoField  = (t: string) => ['record_number', 'space'].includes(t)
const isRelation   = (t: string) => ['lookup', 'related_records'].includes(t)

// 既存項目の種別を後から変更できる項目（単純な入力値を持つもの同士に限定。
// ファイル添付・担当者・ルックアップ・関連レコード・レイアウト系は構成が大きく
// 異なるため対象外とし、従来通り削除して追加し直してもらう）
const CHANGEABLE_TYPES = ['text', 'textarea', 'date', 'time', 'datetime', 'radio', 'dropdown', 'checkbox', 'multi_select', 'yes_no']

// ── ルックアップ・関連レコード一覧の参照先候補 ──────────────────────
const CUSTOMER_LOOKUP_FIELDS = [
  { key: 'name',           label: '氏名' },
  { key: 'nameKana',       label: 'フリガナ' },
  { key: 'tel',            label: 'TEL' },
  { key: 'email',          label: 'メールアドレス' },
  { key: 'address',        label: '住所' },
  { key: 'dob',            label: '生年月日' },
  { key: 'employer',       label: '勤務先' },
  { key: 'assignedFpName', label: '担当FP（担当未来設計士）' },
]

const GENERIC_CASE_FIELD_OPTIONS = [
  { key: 'builtin:status',       label: 'ステータス' },
  { key: 'builtin:amount',       label: '金額・保険料' },
  { key: 'builtin:notes',        label: '備考' },
  { key: 'builtin:contractDate', label: '成約日' },
]

// ルックアップの参照先フィールドとして選べない項目タイプ（値を持たない・循環参照になるもの）
const NOT_LOOKUPABLE_TYPES = ['label', 'space', 'file', 'record_number', 'lookup', 'related_records', 'group', 'table', 'assignee']

const lookupFieldOptionsFor = (targetAppId: string | undefined) => {
  const app = otherAppDefs.value.find(a => a.id === targetAppId)
  if (!app) return GENERIC_CASE_FIELD_OPTIONS
  const customOptions = app.fields
    .filter(f => !NOT_LOOKUPABLE_TYPES.includes(f.type))
    .map(f => ({ key: `custom:${f.id}`, label: f.label }))
  return [...GENERIC_CASE_FIELD_OPTIONS, ...customOptions]
}

// ラベル項目はHTML（リッチエディター由来）なので、キャンバス一覧ではタグを除いて表示する
const canvasLabel = (f: CanvasField): string =>
  f.type === 'label' ? (f.label.replace(/<[^>]*>/g, '').trim() || '（未入力）') : f.label

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

// 既存項目の種別を変更する（項目ID・項目名・必須設定はそのまま維持する）。
// 選択肢を持つ項目同士（ラジオ⇔ドロップダウン等）は選択肢を引き継ぎ、それ以外は
// リセットする。初期値は種別ごとに形式が異なるため、変更時は必ずリセットする
const changeFieldType = (f: CanvasField, newType: string) => {
  if (f.type === newType) return
  f.type = newType
  f.options = hasOptions(newType)
    ? (f.options.length > 0 ? f.options : ['選択肢1', '選択肢2', '選択肢3'])
    : []
  delete f.defaultValue
  delete f.defaultValues
  delete f.useTodayAsDefault
}

// ── モバイル用: 項目追加ボトムシート ──────────────────────────
// 画面が狭いモバイルでは、左のパレット列・右の設定列を常時表示すると
// 見づらいため、右下の＋ボタン→候補から選んで「追加」ボタンで確定、という
// 2ステップのフローにしている（デスクトップのドラッグ&ドロップ・クリック追加とは別）
const showMobileAddField = ref(false)
const pendingFieldType = ref('')
const openMobileAddField = () => {
  pendingFieldType.value = ''
  showMobileAddField.value = true
}
const closeMobileAddField = () => {
  showMobileAddField.value = false
  pendingFieldType.value = ''
}
const confirmMobileAddField = () => {
  if (!pendingFieldType.value) return
  addField(pendingFieldType.value)
  closeMobileAddField()
}

const removeField = (id: string) => {
  fields.value = fields.value.filter(f => f.id !== id)
  if (selectedId.value === id) selectedId.value = null
}

// 既存項目の設定（type・required・options等）を複製し、元の項目の直後に挿入する
const duplicateField = (id: string) => {
  const index = fields.value.findIndex(f => f.id === id)
  if (index < 0) return
  const source = fields.value[index]
  const copy: CanvasField = {
    ...source,
    id:      `f-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    label:   source.type === 'label' ? source.label : `${source.label}のコピー`,
    options: [...source.options],
  }
  if (source.defaultValues) copy.defaultValues = [...source.defaultValues]
  fields.value.splice(index + 1, 0, copy)
  selectedId.value = copy.id
}

// ドラッグ&ドロップに加え、クリックだけでも並び替えできるようにする
const moveField = (index: number, direction: -1 | 1) => {
  const target = index + direction
  if (target < 0 || target >= fields.value.length) return
  const [item] = fields.value.splice(index, 1)
  fields.value.splice(target, 0, item)
}

// ── CSVから項目を読み込む ─────────────────────────────────────
const CSV_FIELD_TYPE_OPTIONS = [
  { value: 'text',         label: '文字列（1行）' },
  { value: 'textarea',     label: '文字列（複数行）' },
  { value: 'date',         label: '日付' },
  { value: 'time',         label: '時刻' },
  { value: 'datetime',     label: '日時' },
  { value: 'radio',        label: 'ラジオボタン' },
  { value: 'dropdown',     label: 'ドロップダウン' },
  { value: 'checkbox',     label: 'チェックボックス' },
  { value: 'multi_select', label: '複数選択' },
  { value: 'yes_no',       label: 'はい/いいえ' },
  { value: 'assignee',     label: '担当者' },
]

// 顧客名・氏名の列はCSV一括インポート時に顧客照合用の列として使うため、項目候補からは除外する
const CUSTOMER_NAME_HEADER_RE = /顧客|氏名|名前/

interface CsvGuessedField {
  header: string
  include: boolean
  label: string
  type: string
  optionsText: string
}

const csvFileInput   = ref<HTMLInputElement | null>(null)
const csvImporting   = ref(false)
const csvImportError = ref('')
const showCsvReview  = ref(false)
const csvGuessedFields = ref<CsvGuessedField[]>([])

const openCsvPicker = () => {
  csvImportError.value = ''
  csvFileInput.value?.click()
}

const handleCsvFileSelected = async (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  csvImporting.value = true
  csvImportError.value = ''
  try {
    const text = await readCsvFile(file)
    const { headers, rows } = parseCsv(text)
    if (headers.length === 0) throw new Error('CSVからヘッダーを読み取れませんでした')
    csvGuessedFields.value = headers
      .filter(h => !CUSTOMER_NAME_HEADER_RE.test(h))
      .map((header) => {
        const values = rows.map(r => r[header] ?? '')
        const guess = guessFieldType(values)
        return { header, include: true, label: header, type: guess.type, optionsText: guess.options.join(', ') }
      })
    showCsvReview.value = true
  } catch (err: any) {
    csvImportError.value = err.message ?? 'CSVの読み込みに失敗しました'
  } finally {
    csvImporting.value = false
    if (csvFileInput.value) csvFileInput.value.value = ''
  }
}

const applyCsvGuessedFields = () => {
  for (const g of csvGuessedFields.value) {
    if (!g.include) continue
    const options = g.optionsText.split(',').map(s => s.trim()).filter(Boolean)
    fields.value.push({
      id:       `f-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      type:     g.type,
      label:    g.label.trim() || g.header,
      required: false,
      options:  hasOptions(g.type) ? (options.length > 0 ? options : ['選択肢1', '選択肢2']) : [],
    })
  }
  showCsvReview.value = false
  csvGuessedFields.value = []
}

const addOption    = (f: CanvasField) => f.options.push(`選択肢${f.options.length + 1}`)
const removeOption = (f: CanvasField, i: number) => {
  const removed = f.options[i]
  f.options.splice(i, 1)
  // 削除した選択肢が初期値に設定されていた場合は初期値からも取り除く
  if (f.defaultValue === removed) delete f.defaultValue
  if (f.defaultValues) f.defaultValues = f.defaultValues.filter(v => v !== removed)
}

// ── 初期値設定（新規登録フォームでのみ適用） ──────────────────────
const TODAY_DEFAULT_TYPES = ['date']
const SINGLE_DEFAULT_TYPES = ['text', 'textarea', 'radio']
const MULTI_DEFAULT_TYPES = ['checkbox', 'multi_select']

const setRadioDefault = (f: CanvasField, opt: string) => {
  f.defaultValue = f.defaultValue === opt ? undefined : opt
}
const toggleMultiDefault = (f: CanvasField, opt: string) => {
  const curr = f.defaultValues ?? []
  f.defaultValues = curr.includes(opt) ? curr.filter(v => v !== opt) : [...curr, opt]
}

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
  stopAutoScroll()
}

const onDropCanvas = (e: DragEvent) => {
  e.preventDefault()
  if (!dragData || dragData.source !== 'palette') return
  addField(dragData.fieldType)
  dragData = null
  stopAutoScroll()
}

const onDragEnd = () => { dragData = null; dragOverIndex.value = null; stopAutoScroll() }

// ── ドラッグ中にキャンバス端まで来たら自動スクロールする ──────────────
// 項目数が多く一画面に収まらない場合、ドラッグ中はマウスが動かせる範囲が
// 画面内に限られ、表示されていない位置へは並び替えできなかったため
const canvasScrollEl = ref<HTMLElement | null>(null)
const autoScrollDir = ref<0 | 1 | -1>(0)
let autoScrollRaf: number | null = null
const AUTO_SCROLL_EDGE = 72   // この範囲(px)にカーソルが入ったらスクロール開始
const AUTO_SCROLL_SPEED = 14  // 1フレームあたりのスクロール量(px)

const runAutoScroll = () => {
  if (autoScrollDir.value !== 0 && canvasScrollEl.value) {
    canvasScrollEl.value.scrollTop += autoScrollDir.value * AUTO_SCROLL_SPEED
    autoScrollRaf = requestAnimationFrame(runAutoScroll)
  } else {
    autoScrollRaf = null
  }
}

const handleCanvasDragOver = (e: DragEvent) => {
  const el = canvasScrollEl.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  const y = e.clientY
  if (y - rect.top < AUTO_SCROLL_EDGE) autoScrollDir.value = -1
  else if (rect.bottom - y < AUTO_SCROLL_EDGE) autoScrollDir.value = 1
  else autoScrollDir.value = 0

  if (autoScrollDir.value !== 0 && autoScrollRaf === null) {
    autoScrollRaf = requestAnimationFrame(runAutoScroll)
  }
}

const stopAutoScroll = () => {
  autoScrollDir.value = 0
  if (autoScrollRaf !== null) {
    cancelAnimationFrame(autoScrollRaf)
    autoScrollRaf = null
  }
}

// ── 保存 ──────────────────────────────────────────────────────
const saving = ref(false)
const saveError = ref('')
const saved = ref(false)

const handleSave = async () => {
  saving.value = true
  saveError.value = ''
  try {
    await update(appId.value, {
      name: appName.value,
      fields: fields.value.map(f => ({ ...f })),
    })
    saved.value = true
    isDirty.value = false
    setTimeout(() => { saved.value = false }, 3000)
  } catch (e: any) {
    saveError.value = e.message ?? '保存に失敗しました'
  } finally {
    saving.value = false
  }
}

// ── アプリ設定（責任者・担当者） ──────────────────────────────
const ownerPickUid = ref('')
const staffPickUid = ref('')
const settingsSaving = ref(false)
const settingsError = ref('')

const ownerCandidates = computed(() => users.value.filter(u => !ownerUids.value.includes(u.uid)))
const staffCandidates = computed(() => users.value.filter(u => !staffUids.value.includes(u.uid)))

const addOwner = () => {
  if (!ownerPickUid.value) return
  ownerUids.value.push(ownerPickUid.value)
  ownerPickUid.value = ''
}
const removeOwner = (uid: string) => {
  ownerUids.value = ownerUids.value.filter(u => u !== uid)
}
const addStaff = () => {
  if (!staffPickUid.value) return
  staffUids.value.push(staffPickUid.value)
  staffPickUid.value = ''
}
const removeStaff = (uid: string) => {
  staffUids.value = staffUids.value.filter(u => u !== uid)
}
const userName = (uid: string) => users.value.find(u => u.uid === uid)?.displayName ?? uid

// ── 放置アラート ──────────────────────────────────────────────
const toggleStaleAlertStatus = (status: string) => {
  staleAlertStatuses.value = staleAlertStatuses.value.includes(status)
    ? staleAlertStatuses.value.filter(s => s !== status)
    : [...staleAlertStatuses.value, status]
}

const submitSettings = async () => {
  settingsSaving.value = true
  settingsError.value = ''
  try {
    const staleAlertDays = staleAlertDaysInput.value ? Number(staleAlertDaysInput.value) : undefined
    await update(appId.value, {
      name: appName.value,
      description: appDescription.value || undefined,
      ownerUids: ownerUids.value,
      staffUids: staffUids.value,
      sourceServiceType: sourceServiceType.value || undefined,
      category: category.value || undefined,
      staleAlertDays,
      staleAlertStatuses: staleAlertDays ? staleAlertStatuses.value : undefined,
      linkedAppIds: linkedAppIds.value,
      isPublished: isPublished.value,
    })
    isDirty.value = false
    showSettings.value = false
  } catch (e: any) {
    settingsError.value = e.message ?? '保存に失敗しました'
  } finally {
    settingsSaving.value = false
  }
}

// ── アプリの削除 ──────────────────────────────────────────────
const deletingApp = ref(false)
const handleDeleteApp = async () => {
  if (!confirm(`「${appName.value}」を削除します。フィールド設定・アプリの各種設定はすべて失われます（登録済みの案件データ自体は削除されません）。よろしいですか？`)) return
  deletingApp.value = true
  settingsError.value = ''
  try {
    await remove(appId.value)
    isDirty.value = false
    await navigateTo('/admin/apps')
  } catch (e: any) {
    settingsError.value = e.message ?? '削除に失敗しました'
    deletingApp.value = false
  }
}
</script>

<template>
  <div v-if="loading" class="flex items-center justify-center" style="height: calc(100vh - 56px);">
    <Icon name="heroicons:arrow-path" class="h-8 w-8 text-gray-300 animate-spin" />
  </div>

  <div v-else-if="loadError" class="flex flex-col items-center justify-center text-center" style="height: calc(100vh - 56px);">
    <Icon name="heroicons:exclamation-circle" class="h-10 w-10 text-red-300 mb-2" />
    <p class="text-sm text-red-500">{{ loadError }}</p>
    <NuxtLink to="/admin/apps" class="mt-3 text-sm text-primary-600 hover:underline">← アプリ管理へ戻る</NuxtLink>
  </div>

  <div v-else class="flex flex-col overflow-hidden" style="height: calc(100vh - 56px);">

    <!-- ── ヘッダー ── -->
    <div class="flex items-center justify-between px-5 py-3 bg-white border-b border-gray-200 shrink-0">
      <div class="min-w-0">
        <div class="flex items-center gap-2 text-xs text-gray-400 mb-0.5">
          <NuxtLink to="/admin/apps" class="hover:text-primary-600">アプリ管理</NuxtLink>
          <Icon name="heroicons:chevron-right" class="h-3 w-3" />
        </div>
        <h1 class="text-lg font-bold text-gray-900 flex items-center gap-2 truncate">
          <Icon name="heroicons:squares-2x2" class="h-5 w-5 text-primary-600 shrink-0" />
          {{ appName || 'アプリ設定' }}
          <span
            class="badge text-[10px] shrink-0"
            :class="isPublished ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'"
          >{{ isPublished ? '公開中' : '下書き' }}</span>
        </h1>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <span v-if="saved" class="text-xs text-green-600 flex items-center gap-1">
          <Icon name="heroicons:check-circle" class="h-4 w-4" />保存しました
        </span>
        <button
          v-if="!previewMode"
          class="btn-secondary text-sm flex items-center gap-1.5"
          :disabled="csvImporting"
          @click="openCsvPicker"
        >
          <Icon v-if="csvImporting" name="heroicons:arrow-path" class="h-4 w-4 animate-spin" />
          <Icon v-else name="heroicons:document-arrow-up" class="h-4 w-4" />
          CSVから項目を読み込む
        </button>
        <input
          ref="csvFileInput"
          type="file"
          accept=".csv"
          class="hidden"
          @change="handleCsvFileSelected"
        />
        <button class="btn-secondary text-sm flex items-center gap-1.5" @click="showSettings = true">
          <Icon name="heroicons:user-group" class="h-4 w-4" />
          責任者・担当者
        </button>
        <button
          class="btn-secondary text-sm flex items-center gap-1.5"
          :class="previewMode ? 'bg-primary-50 text-primary-700 border-primary-300' : ''"
          @click="previewMode = !previewMode"
        >
          <Icon :name="previewMode ? 'heroicons:cog-6-tooth' : 'heroicons:eye'" class="h-4 w-4" />
          {{ previewMode ? '設定に戻る' : 'プレビュー' }}
        </button>
        <button class="btn-primary text-sm" :disabled="saving" @click="handleSave">
          <Icon v-if="saving" name="heroicons:arrow-path" class="h-4 w-4 animate-spin mr-1" />
          保存する
        </button>
      </div>
    </div>
    <p v-if="saveError" class="text-xs text-red-600 bg-red-50 px-5 py-1.5">{{ saveError }}</p>
    <p v-if="csvImportError" class="text-xs text-red-600 bg-red-50 px-5 py-1.5">{{ csvImportError }}</p>

    <!-- ── プレビューモード ── -->
    <div v-if="previewMode" class="flex-1 overflow-y-auto bg-gray-50 p-6">
      <div class="max-w-xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
        <h2 class="text-base font-bold text-gray-900 border-b border-gray-100 pb-3 flex items-center gap-2">
          <Icon name="heroicons:document-text" class="h-5 w-5 text-primary-500" />
          フォームプレビュー
        </h2>

        <!-- 標準項目（フィールドビルダーの設定に関わらず、生命保険以外の全アプリで共通して表示される項目） -->
        <div v-if="sourceServiceType && sourceServiceType !== 'lifeInsurance'" class="space-y-4 pb-4 mb-1 border-b border-dashed border-gray-200">
          <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide">標準項目（自動的に表示されます）</p>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">担当未来設計士</label>
            <select class="input-field text-sm" disabled><option>選択してください</option></select>
            <p class="text-xs text-gray-400 mt-1">初期値はログイン中のユーザー</p>
          </div>
        </div>

        <div v-if="fields.length === 0" class="text-center py-16 text-gray-400">
          <Icon name="heroicons:squares-plus" class="h-12 w-12 mx-auto mb-2 text-gray-200" />
          <p>フィールドがありません</p>
          <p class="text-sm mt-1">設定モードでフィールドを追加してください</p>
        </div>

        <template v-for="f in fields" :key="f.id">
          <!-- 文字列（1行） -->
          <div v-if="f.type === 'text'">
            <label class="block text-sm font-medium text-gray-700 mb-1">{{ f.label }}<span v-if="f.required" class="text-red-500 ml-1">*</span></label>
            <input type="text" class="input-field text-sm" disabled />
          </div>
          <!-- 文字列（複数行） -->
          <div v-else-if="f.type === 'textarea'">
            <label class="block text-sm font-medium text-gray-700 mb-1">{{ f.label }}<span v-if="f.required" class="text-red-500 ml-1">*</span></label>
            <textarea rows="3" class="input-field text-sm resize-none" disabled />
          </div>
          <!-- ファイル添付 -->
          <div v-else-if="f.type === 'file'">
            <label class="block text-sm font-medium text-gray-700 mb-1">{{ f.label }}<span v-if="f.required" class="text-red-500 ml-1">*</span></label>
            <div class="flex items-center justify-center rounded-lg border-2 border-dashed border-gray-200 p-4 text-xs text-gray-400 text-center">
              <Icon name="heroicons:paper-clip" class="h-4 w-4 mr-1.5" />
              ファイルを選択
            </div>
          </div>
          <!-- レコード番号 -->
          <div v-else-if="f.type === 'record_number'">
            <label class="block text-sm font-medium text-gray-700 mb-1">{{ f.label }}</label>
            <div class="input-field bg-gray-50 text-gray-400 text-sm">#00001</div>
          </div>
          <!-- ラベル -->
          <div
            v-else-if="f.type === 'label'"
            class="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 text-sm text-gray-700 prose prose-sm max-w-none"
            v-html="f.label"
          />
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
          <!-- 担当者 -->
          <div v-else-if="f.type === 'assignee'">
            <label class="block text-sm font-medium text-gray-700 mb-1">{{ f.label }}<span v-if="f.required" class="text-red-500 ml-1">*</span></label>
            <select class="input-field text-sm" disabled>
              <option value="">選択してください</option>
            </select>
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

        <!-- 標準項目（担当者以外操作禁止グループ）は最下部に配置 -->
        <div v-if="sourceServiceType && sourceServiceType !== 'lifeInsurance'" class="space-y-4 pt-4 mt-1 border-t border-dashed border-gray-200">
          <p class="text-sm font-bold text-red-600">担当者以外操作禁止</p>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">対応ステータス<span class="text-red-500 ml-1">*</span></label>
            <div class="flex flex-wrap gap-2">
              <span v-for="s in ['相談中', '検討中', '成約', '完了', '不成立']" :key="s" class="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-400">{{ s }}</span>
            </div>
          </div>
          <div v-if="!fields.some(f => f.type === 'assignee')">
            <label class="block text-sm font-medium text-gray-700 mb-1">担当者</label>
            <select class="input-field text-sm" disabled><option>選択してください</option></select>
            <p class="text-xs text-gray-400 mt-1">アプリ責任者・アプリ担当者から選択（フィールドビルダーで「担当者」を追加すると、そちらに置き換わります）</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">成約日</label>
            <input type="date" class="input-field text-sm" disabled />
            <p class="text-xs text-gray-400 mt-1">対応ステータスが「成約」「完了」の場合のみ表示されます</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">金額・保険料</label>
            <input type="text" class="input-field text-sm" placeholder="例: 月額 15,000円" disabled />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">備考・メモ</label>
            <textarea rows="3" class="input-field text-sm resize-none" placeholder="案件の詳細・経緯・メモを入力..." disabled />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">リマインダー日</label>
              <input type="date" class="input-field text-sm" disabled />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">リマインダー内容</label>
              <input type="text" class="input-field text-sm" disabled />
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">リマインド対象者</label>
            <select class="input-field text-sm" multiple disabled><option>ユーザー名</option></select>
            <p class="text-xs text-gray-400 mt-1">リマインダー日を設定した場合のみ表示されます（未選択時は担当者・担当未来設計士に表示）</p>
          </div>
        </div>

        <div v-if="fields.length > 0" class="pt-4 border-t border-gray-100 flex justify-end gap-2">
          <button class="btn-secondary text-sm" disabled>キャンセル</button>
          <button class="btn-primary text-sm" disabled>保存する</button>
        </div>
      </div>
    </div>

    <!-- ── 設定モード（3カラム） ── -->
    <div v-else class="flex flex-1 overflow-hidden">

      <!-- 左: フィールドパレット（デスクトップのみ。モバイルは右下の＋ボタンから追加） -->
      <div class="hidden md:block md:w-52 md:shrink-0 md:bg-white md:border-r md:border-gray-200 md:overflow-y-auto">
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

      <!-- モバイル用: 項目追加フローティングボタン -->
      <button
        type="button"
        class="md:hidden fixed bottom-20 right-4 z-30 flex items-center justify-center h-14 w-14 rounded-full bg-primary-600 text-white shadow-lg active:scale-95 transition"
        @click="openMobileAddField"
      >
        <Icon name="heroicons:plus" class="h-6 w-6" />
      </button>

      <!-- 中央: キャンバス -->
      <div
        ref="canvasScrollEl"
        class="flex-1 overflow-y-auto bg-gray-50 p-5"
        @dragover.prevent="handleCanvasDragOver"
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
                  <p class="text-sm font-medium text-gray-800 truncate">{{ canvasLabel(field) }}</p>
                  <p class="text-xs text-gray-400 truncate">{{ getFieldDef(field.type)?.description }}</p>
                </div>
                <span v-if="field.required" class="text-xs text-red-500 font-medium shrink-0 ml-1">必須</span>
                <div class="flex flex-col shrink-0">
                  <button
                    type="button"
                    class="p-0.5 rounded text-gray-300 hover:text-primary-600 hover:bg-primary-50 transition disabled:opacity-20 disabled:pointer-events-none"
                    :disabled="index === 0"
                    title="上へ移動"
                    @click.stop="moveField(index, -1)"
                  >
                    <Icon name="heroicons:chevron-up" class="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    class="p-0.5 rounded text-gray-300 hover:text-primary-600 hover:bg-primary-50 transition disabled:opacity-20 disabled:pointer-events-none"
                    :disabled="index === fields.length - 1"
                    title="下へ移動"
                    @click.stop="moveField(index, 1)"
                  >
                    <Icon name="heroicons:chevron-down" class="h-3.5 w-3.5" />
                  </button>
                </div>
                <button
                  class="p-1 rounded-lg text-gray-300 hover:text-primary-600 hover:bg-primary-50 transition shrink-0"
                  title="項目を複製"
                  @click.stop="duplicateField(field.id)"
                >
                  <Icon name="heroicons:document-duplicate" class="h-4 w-4" />
                </button>
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

      <!-- モバイル用オーバーレイ背景（フィールド選択中のみ、タップで閉じる） -->
      <div v-if="selectedField" class="md:hidden fixed inset-0 z-40 bg-black/40" @click="selectedId = null" />

      <!-- 右: フィールド設定パネル（モバイルは下からのボトムシート、デスクトップは右カラム固定表示） -->
      <div
        v-if="selectedField"
        class="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-white shadow-2xl md:static md:z-auto md:max-h-none md:w-[272px] md:shrink-0 md:overflow-y-auto md:rounded-none md:border-l md:border-gray-200 md:shadow-none"
      >
        <!-- モバイル用ドラッグハンドル -->
        <div class="md:hidden flex justify-center pt-2 pb-1">
          <div class="h-1 w-10 rounded-full bg-gray-300" />
        </div>

        <!-- 設定フォーム -->
        <div class="p-4 space-y-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <Icon :name="FIELD_ICON[selectedField.type]" class="h-4 w-4 text-primary-500" />
              <span class="text-sm font-semibold text-gray-900">フィールド設定</span>
            </div>
            <button class="text-gray-300 hover:text-gray-500 transition" @click="selectedId = null">
              <Icon name="heroicons:x-mark" class="h-4 w-4" />
            </button>
          </div>

          <!-- 種別（単純な入力項目同士は後から変更できる） -->
          <div v-if="CHANGEABLE_TYPES.includes(selectedField.type)" class="space-y-1">
            <label class="block text-xs font-medium text-gray-600">種別</label>
            <select
              class="input-field text-sm"
              :value="selectedField.type"
              @change="changeFieldType(selectedField, ($event.target as HTMLSelectElement).value)"
            >
              <option v-for="t in CHANGEABLE_TYPES" :key="t" :value="t">{{ getFieldDef(t)?.label }}</option>
            </select>
            <p class="text-[11px] text-gray-400 leading-relaxed">
              種別を変更すると初期値はリセットされます（選択肢のある項目同士は選択肢を引き継ぎます）。項目名・必須設定はそのまま維持されます。
            </p>
          </div>
          <div v-else class="flex items-center gap-1.5">
            <span class="inline-flex items-center gap-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full px-2.5 py-1">
              <Icon :name="FIELD_ICON[selectedField.type]" class="h-3 w-3" />
              {{ getFieldDef(selectedField.type)?.label }}
            </span>
          </div>

          <!-- フィールド名 -->
          <div v-if="!isAutoField(selectedField.type) && selectedField.type !== 'label'" class="space-y-1">
            <label class="block text-xs font-medium text-gray-600">フィールド名</label>
            <input v-model="selectedField.label" type="text" class="input-field text-sm" placeholder="フィールド名" />
          </div>

          <!-- ラベル内容（リッチエディター） -->
          <div v-if="selectedField.type === 'label'" class="space-y-1">
            <label class="block text-xs font-medium text-gray-600">表示内容</label>
            <RichTextEditor v-model="selectedField.label" placeholder="フォームに表示する説明・注意書きを入力..." />
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

          <!-- 初期値（文字列・日付） -->
          <div v-if="SINGLE_DEFAULT_TYPES.includes(selectedField.type) && selectedField.type !== 'radio'" class="space-y-1">
            <label class="block text-xs font-medium text-gray-600">初期値（新規登録時のみ）</label>
            <textarea
              v-if="selectedField.type === 'textarea'"
              v-model="selectedField.defaultValue"
              rows="2"
              class="input-field text-sm resize-none"
              placeholder="初期値を入力（空欄なら未入力）"
            />
            <input
              v-else
              v-model="selectedField.defaultValue"
              type="text"
              class="input-field text-sm"
              placeholder="初期値を入力（空欄なら未入力）"
            />
          </div>

          <!-- 初期値（当日日付） -->
          <div v-if="TODAY_DEFAULT_TYPES.includes(selectedField.type)" class="flex items-center justify-between py-1">
            <span class="text-xs font-medium text-gray-600">当日の日付を初期値にする</span>
            <button
              class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors"
              :class="selectedField.useTodayAsDefault ? 'bg-primary-500' : 'bg-gray-200'"
              @click="selectedField.useTodayAsDefault = !selectedField.useTodayAsDefault"
            >
              <span
                class="inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform"
                :class="selectedField.useTodayAsDefault ? 'translate-x-4' : 'translate-x-1'"
              />
            </button>
          </div>

          <!-- 初期値（ラジオ：選択肢から1つ） -->
          <div v-if="selectedField.type === 'radio'" class="space-y-2">
            <label class="block text-xs font-medium text-gray-600">初期値（新規登録時のみ・任意）</label>
            <div class="flex flex-wrap gap-1.5">
              <button
                v-for="opt in selectedField.options" :key="opt"
                type="button"
                class="rounded-lg border px-2.5 py-1 text-xs transition"
                :class="selectedField.defaultValue === opt ? 'border-primary-400 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'"
                @click="setRadioDefault(selectedField, opt)"
              >{{ opt }}</button>
            </div>
          </div>

          <!-- 初期値（チェックボックス・複数選択：選択肢から複数） -->
          <div v-if="MULTI_DEFAULT_TYPES.includes(selectedField.type)" class="space-y-2">
            <label class="block text-xs font-medium text-gray-600">初期値（新規登録時のみ・任意）</label>
            <div class="flex flex-wrap gap-1.5">
              <button
                v-for="opt in selectedField.options" :key="opt"
                type="button"
                class="rounded-lg border px-2.5 py-1 text-xs transition"
                :class="(selectedField.defaultValues ?? []).includes(opt) ? 'border-primary-400 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'"
                @click="toggleMultiDefault(selectedField, opt)"
              >{{ opt }}</button>
            </div>
          </div>

          <!-- ルックアップ設定 -->
          <div v-if="selectedField.type === 'lookup'" class="space-y-2">
            <label class="block text-xs font-medium text-gray-600">参照元</label>
            <select v-model="selectedField.lookupSource" class="input-field text-sm">
              <option value="">選択してください</option>
              <option value="customer">顧客情報（パーソナルデータ）</option>
              <option value="app">他のアプリ（同じ顧客の案件）</option>
            </select>

            <template v-if="selectedField.lookupSource === 'customer'">
              <label class="block text-xs font-medium text-gray-600 mt-2">参照フィールド</label>
              <select v-model="selectedField.lookupCustomerField" class="input-field text-sm">
                <option value="">選択してください</option>
                <option v-for="f in CUSTOMER_LOOKUP_FIELDS" :key="f.key" :value="f.key">{{ f.label }}</option>
              </select>
            </template>

            <template v-if="selectedField.lookupSource === 'app'">
              <label class="block text-xs font-medium text-gray-600 mt-2">参照アプリ</label>
              <select v-model="selectedField.lookupAppId" class="input-field text-sm">
                <option value="">選択してください</option>
                <option v-for="a in otherAppDefs" :key="a.id" :value="a.id">{{ a.name }}</option>
              </select>
              <label class="block text-xs font-medium text-gray-600 mt-2">参照フィールド</label>
              <select v-model="selectedField.lookupFieldKey" class="input-field text-sm">
                <option value="">選択してください</option>
                <option v-for="f in lookupFieldOptionsFor(selectedField.lookupAppId)" :key="f.key" :value="f.key">{{ f.label }}</option>
              </select>
            </template>
            <p class="text-xs text-gray-400 leading-relaxed">
              同じ顧客の最新の案件（またはパーソナルデータ）から値を読み込んで自動入力します（読み取り専用）。
            </p>
          </div>

          <!-- 関連レコード設定 -->
          <div v-if="selectedField.type === 'related_records'" class="space-y-2">
            <label class="block text-xs font-medium text-gray-600">関連アプリ</label>
            <select v-model="selectedField.relatedAppId" class="input-field text-sm">
              <option value="">選択してください</option>
              <option v-for="a in otherAppDefs" :key="a.id" :value="a.id">{{ a.name }}</option>
            </select>
            <p class="text-xs text-gray-400 leading-relaxed">
              同じ顧客の、選択したアプリの案件一覧をここに表示します（読み取り専用）。
            </p>
          </div>

          <!-- 自動フィールドの説明 -->
          <div v-if="isAutoField(selectedField.type)" class="bg-gray-50 rounded-lg p-3 text-xs text-gray-500">
            このフィールドはシステムが自動で管理します。設定の変更はできません。
          </div>

          <!-- 複製・削除 -->
          <div class="pt-2 border-t border-gray-100 space-y-1.5">
            <button
              class="w-full text-sm text-primary-600 hover:bg-primary-50 rounded-lg py-2 transition flex items-center justify-center gap-1.5"
              @click="duplicateField(selectedField.id)"
            >
              <Icon name="heroicons:document-duplicate" class="h-4 w-4" />
              フィールドを複製
            </button>
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

      <!-- 未選択時の右カラム（デスクトップのみ。モバイルは選択中のみボトムシートを表示） -->
      <div v-else class="hidden md:flex md:w-[272px] md:shrink-0 md:flex-col md:items-center md:justify-center md:h-full md:text-center md:text-gray-400 md:p-6 md:bg-white md:border-l md:border-gray-200">
        <Icon name="heroicons:cursor-arrow-rays" class="h-10 w-10 mb-2 text-gray-200" />
        <p class="text-sm">フィールドを選択すると<br>設定が表示されます</p>
      </div>

    </div>

    <!-- アプリ設定モーダル（責任者・担当者） -->
    <Teleport to="body">
      <div
        v-if="showSettings"
        class="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40"
        @click.self="showSettings = false"
      >
        <div class="bg-white w-full md:max-w-md rounded-t-2xl md:rounded-2xl p-6 space-y-4 shadow-xl max-h-[85vh] overflow-y-auto">
          <div class="flex items-center justify-between">
            <h3 class="font-bold text-gray-900">アプリ設定</h3>
            <button class="p-1.5 hover:bg-gray-100 rounded-lg" @click="showSettings = false">
              <Icon name="heroicons:x-mark" class="h-5 w-5 text-gray-500" />
            </button>
          </div>

          <div v-if="settingsError" class="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            <Icon name="heroicons:exclamation-circle" class="mt-0.5 h-4 w-4 shrink-0" />
            {{ settingsError }}
          </div>

          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">アプリ名</label>
            <input v-model="appName" type="text" class="input-field" />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">説明</label>
            <textarea v-model="appDescription" rows="2" class="input-field resize-none" />
          </div>

          <div class="flex items-center justify-between rounded-lg border border-gray-200 p-3">
            <div>
              <p class="text-sm font-medium text-gray-800">公開設定</p>
              <p class="text-xs text-gray-500 mt-0.5">{{ isPublished ? 'アプリ一覧に公開中です' : '下書き（アプリ一覧に「下書き」表示）' }}</p>
            </div>
            <button
              type="button"
              class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0"
              :class="isPublished ? 'bg-primary-500' : 'bg-gray-200'"
              @click="isPublished = !isPublished"
            >
              <span
                class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
                :class="isPublished ? 'translate-x-6' : 'translate-x-1'"
              />
            </button>
          </div>

          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">カテゴリ</label>
            <select v-model="category" class="input-field text-sm">
              <option v-for="c in APP_CATEGORY_LIST" :key="c" :value="c">{{ c }}</option>
            </select>
            <p class="mt-1.5 text-xs text-gray-400 leading-relaxed">
              「アプリ」一覧で、このカテゴリの中にこのアプリが表示されます。
            </p>
          </div>

          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">データ保存先</label>
            <select v-model="sourceServiceType" class="input-field text-sm">
              <option value="">連携しない（下書き。案件登録フォームには反映されません）</option>
              <option :value="appId">このアプリ専用のデータとして保存（新規アプリの既定）</option>
              <option value="lifeInsurance">生命保険（通知のみ）</option>
              <optgroup label="既存の18アプリのデータに連携（案件登録フォームに項目が反映されます）">
                <option v-for="opt in OTHER_SERVICE_TYPE_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
              </optgroup>
            </select>
            <p class="mt-1.5 text-xs text-gray-400 leading-relaxed">
              「生命保険」を選択した場合のみ、実際の案件データ（アプリ &gt; 生命保険）で登録・編集されるたびに
              下の「アプリ責任者」へ通知が届きます（生命保険は専用画面のため、ここで作成した項目とは連動しません）。<br />
              それ以外を選択すると、ここで作成した項目が該当アプリの「案件登録」フォーム・案件詳細に実際に反映され、
              入力データも保存されるようになります。新規作成したアプリは、通常は「このアプリ専用のデータとして保存」の
              ままで問題ありません。
            </p>
          </div>

          <div v-if="sourceServiceType && sourceServiceType !== 'lifeInsurance'">
            <NuxtLink :to="`/admin/apps/${appId}/import`" class="btn-secondary text-sm w-full flex items-center justify-center gap-1.5">
              <Icon name="heroicons:arrow-up-tray" class="h-4 w-4" />
              kintone CSVから案件を一括インポート
            </NuxtLink>
          </div>

          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">
              連動アプリ
              <span class="font-normal text-gray-400">（同じ顧客に対して、案件詳細からボタン一つで案件を作成できるアプリ）</span>
            </label>
            <div v-if="linkedAppIds.length > 0" class="flex flex-wrap gap-1.5 mb-2">
              <span
                v-for="id in linkedAppIds"
                :key="id"
                class="inline-flex items-center gap-1 rounded-full bg-primary-50 text-primary-700 text-xs font-medium px-2.5 py-1"
              >
                {{ linkedAppName(id) }}
                <button type="button" class="hover:text-primary-900" @click="removeLinkedApp(id)">
                  <Icon name="heroicons:x-mark" class="h-3 w-3" />
                </button>
              </span>
            </div>
            <div class="flex gap-2">
              <select v-model="linkedAppPickId" class="input-field text-sm flex-1">
                <option value="">追加するアプリを選択</option>
                <option v-for="a in linkedAppCandidates" :key="a.id" :value="a.id">{{ a.name }}</option>
              </select>
              <button type="button" class="btn-secondary text-sm shrink-0" :disabled="!linkedAppPickId" @click="addLinkedApp">追加</button>
            </div>
          </div>

          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">
              アプリ責任者
              <span class="font-normal text-gray-400">（複数人指定可。データの登録・編集・削除を通知）</span>
            </label>
            <div v-if="ownerUids.length > 0" class="flex flex-wrap gap-1.5 mb-2">
              <span
                v-for="uid in ownerUids"
                :key="uid"
                class="inline-flex items-center gap-1 rounded-full bg-primary-50 text-primary-700 text-xs font-medium px-2.5 py-1"
              >
                {{ userName(uid) }}
                <button type="button" class="hover:text-primary-900" @click="removeOwner(uid)">
                  <Icon name="heroicons:x-mark" class="h-3 w-3" />
                </button>
              </span>
            </div>
            <div class="flex gap-2">
              <div class="flex-1">
                <SearchableUserSelect v-model="ownerPickUid" :users="ownerCandidates" placeholder="追加する責任者を選択" />
              </div>
              <button type="button" class="btn-secondary text-sm shrink-0" :disabled="!ownerPickUid" @click="addOwner">追加</button>
            </div>
          </div>

          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">アプリ担当者</label>
            <div v-if="staffUids.length > 0" class="flex flex-wrap gap-1.5 mb-2">
              <span
                v-for="uid in staffUids"
                :key="uid"
                class="inline-flex items-center gap-1 rounded-full bg-primary-50 text-primary-700 text-xs font-medium px-2.5 py-1"
              >
                {{ userName(uid) }}
                <button type="button" class="hover:text-primary-900" @click="removeStaff(uid)">
                  <Icon name="heroicons:x-mark" class="h-3 w-3" />
                </button>
              </span>
            </div>
            <div class="flex gap-2">
              <div class="flex-1">
                <SearchableUserSelect v-model="staffPickUid" :users="staffCandidates" placeholder="追加するメンバーを選択" />
              </div>
              <button type="button" class="btn-secondary text-sm shrink-0" :disabled="!staffPickUid" @click="addStaff">追加</button>
            </div>
          </div>

          <div class="rounded-lg border border-gray-200 p-3 space-y-2">
            <label class="block text-xs font-medium text-gray-600">
              放置アラート
              <span class="font-normal text-gray-400">（指定日数以上ステータス変更・更新がない案件を担当者・担当未来設計士・アプリ責任者へ通知）</span>
            </label>
            <div class="flex items-center gap-2">
              <input
                v-model="staleAlertDaysInput"
                type="number"
                min="1"
                class="input-field text-sm w-24"
                placeholder="未設定"
              />
              <span class="text-xs text-gray-500 shrink-0">日以上更新がない場合に通知</span>
            </div>
            <template v-if="staleAlertDaysInput">
              <p class="text-xs font-medium text-gray-600 pt-1">対象ステータス</p>
              <div class="flex flex-wrap gap-2">
                <label
                  v-for="(label, key) in STATUS_LABELS"
                  :key="key"
                  class="flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    :checked="staleAlertStatuses.includes(key)"
                    class="rounded text-primary-600"
                    @change="toggleStaleAlertStatus(key)"
                  />
                  {{ label }}
                </label>
              </div>
            </template>
          </div>

          <div class="rounded-lg border border-red-100 p-3">
            <button
              type="button"
              class="w-full text-sm text-red-500 hover:bg-red-50 rounded-lg py-2 transition flex items-center justify-center gap-1.5"
              :disabled="deletingApp"
              @click="handleDeleteApp"
            >
              <Icon v-if="deletingApp" name="heroicons:arrow-path" class="h-4 w-4 animate-spin" />
              <Icon v-else name="heroicons:trash" class="h-4 w-4" />
              このアプリを削除する
            </button>
          </div>

          <div class="flex gap-3 pt-2">
            <button class="flex-1 btn-secondary" @click="showSettings = false">キャンセル</button>
            <button class="flex-1 btn-primary" :disabled="settingsSaving" @click="submitSettings">
              <Icon v-if="settingsSaving" name="heroicons:arrow-path" class="h-4 w-4 animate-spin mr-1" />
              保存する
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- CSVから項目を読み込むモーダル -->
    <Teleport to="body">
      <div
        v-if="showCsvReview"
        class="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40"
        @click.self="showCsvReview = false"
      >
        <div class="bg-white w-full md:max-w-2xl rounded-t-2xl md:rounded-2xl p-6 space-y-4 shadow-xl max-h-[85vh] overflow-y-auto">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="font-bold text-gray-900">CSVから項目を読み込む</h3>
              <p class="text-xs text-gray-500 mt-0.5">列の値から項目タイプを推測しました。内容を確認・修正してから追加してください</p>
            </div>
            <button class="p-1.5 hover:bg-gray-100 rounded-lg" @click="showCsvReview = false">
              <Icon name="heroicons:x-mark" class="h-5 w-5 text-gray-500" />
            </button>
          </div>

          <div v-if="csvGuessedFields.length === 0" class="text-sm text-gray-400 text-center py-8">
            追加できる項目が見つかりませんでした
          </div>

          <div v-else class="space-y-2">
            <div v-for="g in csvGuessedFields" :key="g.header" class="flex items-start gap-2.5 border border-gray-200 rounded-lg p-2.5">
              <input v-model="g.include" type="checkbox" class="mt-2.5 accent-primary-600 shrink-0" />
              <div class="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label class="block text-[10px] text-gray-400 mb-0.5">列名: {{ g.header }}</label>
                  <input v-model="g.label" type="text" class="input-field text-xs py-1.5" placeholder="フィールド名" />
                </div>
                <div>
                  <label class="block text-[10px] text-gray-400 mb-0.5">項目タイプ</label>
                  <select v-model="g.type" class="input-field text-xs py-1.5">
                    <option v-for="t in CSV_FIELD_TYPE_OPTIONS" :key="t.value" :value="t.value">{{ t.label }}</option>
                  </select>
                </div>
                <div v-if="hasOptions(g.type)" class="sm:col-span-2">
                  <label class="block text-[10px] text-gray-400 mb-0.5">選択肢（カンマ区切り）</label>
                  <input v-model="g.optionsText" type="text" class="input-field text-xs py-1.5" />
                </div>
              </div>
            </div>
          </div>

          <div class="flex gap-3 pt-2">
            <button class="flex-1 btn-secondary" @click="showCsvReview = false">キャンセル</button>
            <button
              class="flex-1 btn-primary"
              :disabled="!csvGuessedFields.some(f => f.include)"
              @click="applyCsvGuessedFields"
            >
              選択した項目を追加（{{ csvGuessedFields.filter(f => f.include).length }}件）
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- モバイル用: 項目追加ボトムシート -->
    <Teleport to="body">
      <div
        v-if="showMobileAddField"
        class="md:hidden fixed inset-0 z-50 flex items-end justify-center bg-black/40"
        @click.self="closeMobileAddField"
      >
        <div class="w-full max-h-[80vh] flex flex-col rounded-t-2xl bg-white shadow-xl">
          <div class="flex items-center justify-between px-4 pt-4 pb-2 shrink-0">
            <h3 class="font-bold text-gray-900">項目を追加</h3>
            <button class="p-1.5 hover:bg-gray-100 rounded-lg" @click="closeMobileAddField">
              <Icon name="heroicons:x-mark" class="h-5 w-5 text-gray-500" />
            </button>
          </div>

          <div class="flex-1 overflow-y-auto px-4 pb-3">
            <div v-for="cat in FIELD_CATEGORIES" :key="cat.label" class="mb-4">
              <p class="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">{{ cat.label }}</p>
              <div class="grid grid-cols-2 gap-2">
                <button
                  v-for="f in cat.fields"
                  :key="f.type"
                  type="button"
                  class="flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm text-left transition"
                  :class="pendingFieldType === f.type ? 'border-primary-400 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-700'"
                  @click="pendingFieldType = f.type"
                >
                  <Icon :name="f.icon" class="h-4 w-4 shrink-0" :class="pendingFieldType === f.type ? 'text-primary-600' : 'text-gray-400'" />
                  <span class="truncate">{{ f.label }}</span>
                </button>
              </div>
            </div>
          </div>

          <div class="px-4 py-3 border-t border-gray-100 shrink-0">
            <button
              type="button"
              class="btn-primary w-full text-sm"
              :disabled="!pendingFieldType"
              @click="confirmMobileAddField"
            >
              追加
            </button>
          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>
