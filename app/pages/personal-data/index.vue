<script setup lang="ts">
import { useCustomerStore } from '~/composables/useCustomerStore'
import { useSavedSearchStore } from '~/composables/useSavedSearchStore'
import { exportApoToCsv, downloadCsv } from '~/utils/csvCustomer'
import type { Customer } from '~/types/customer'
import type { FilterOperator, FilterCondition, SavedSearch } from '~/types/savedSearch'

definePageMeta({ middleware: ['auth'] })

const store = useCustomerStore()
const router = useRouter()
const { user } = useCurrentUser()

// ── 絞り込み条件（項目を選択 → 条件を入力） ─────────────────────────────
type Operator = FilterOperator

interface FieldOption {
  key: string
  label: string
  type: 'text' | 'select'
  options?: { value: string; label: string }[]
  getValue: (c: Customer) => string
}

const FIELD_OPTIONS: FieldOption[] = [
  { key: 'name',           label: '氏名',         type: 'text',   getValue: c => c.name ?? '' },
  { key: 'nameKana',       label: 'フリガナ',     type: 'text',   getValue: c => c.nameKana ?? '' },
  {
    key: 'type', label: '個人/法人区分', type: 'select',
    options: [{ value: 'individual', label: '個人' }, { value: 'corporate', label: '法人' }],
    getValue: c => c.type ?? '',
  },
  {
    key: 'gender', label: '性別', type: 'select',
    options: [{ value: '男', label: '男' }, { value: '女', label: '女' }],
    getValue: c => c.gender ?? '',
  },
  { key: 'tel',            label: 'TEL',          type: 'text',   getValue: c => c.tel ?? '' },
  { key: 'email',          label: 'メールアドレス', type: 'text', getValue: c => c.email ?? '' },
  { key: 'address',        label: '住所',         type: 'text',   getValue: c => c.address ?? '' },
  { key: 'employer',       label: '勤務先',       type: 'text',   getValue: c => c.employer ?? '' },
  { key: 'relationship',   label: '関係性',       type: 'text',   getValue: c => c.relationship ?? '' },
  { key: 'stage',          label: '段数',         type: 'text',   getValue: c => c.stage ?? '' },
  { key: 'referralSource', label: '紹介元',       type: 'text',   getValue: c => c.referralSource ?? '' },
  { key: 'status1',        label: '状況（ワン）', type: 'text',   getValue: c => c.status1 ?? '' },
  { key: 'status2',        label: '状況（ツー）', type: 'text',   getValue: c => c.status2 ?? '' },
  { key: 'assignedFpName', label: '担当 未来設計士', type: 'text', getValue: c => c.assignedFpName ?? '' },
  { key: 'companyName',    label: '法人名',       type: 'text',   getValue: c => c.companyName ?? '' },
  { key: 'industry',       label: '業種',         type: 'text',   getValue: c => c.industry ?? '' },
]

const OPERATOR_OPTIONS: { value: Operator; label: string }[] = [
  { value: 'contains',    label: '次のいずれかを含む' },
  { value: 'notContains', label: '含まない' },
  { value: 'equals',      label: '等しい' },
  { value: 'notEmpty',    label: '空でない' },
  { value: 'empty',       label: '空' },
]

type ConditionRow = FilterCondition

const makeCondition = (): ConditionRow => ({ field: FIELD_OPTIONS[0].key, operator: 'contains', value: '' })

const showFilter  = ref(false)
const matchMode   = ref<'and' | 'or'>('and')
const conditions  = ref<ConditionRow[]>([])

const addCondition = () => {
  if (conditions.value.length >= 5) return
  conditions.value.push(makeCondition())
}
const removeCondition = (idx: number) => conditions.value.splice(idx, 1)
const clearConditions = () => { conditions.value = []; matchMode.value = 'and' }

const fieldOf = (key: string) => FIELD_OPTIONS.find(f => f.key === key)!

const matchCondition = (c: Customer, cond: ConditionRow): boolean => {
  const field = fieldOf(cond.field)
  const actual = field.getValue(c).toLowerCase()
  const expected = cond.value.trim().toLowerCase()
  switch (cond.operator) {
    case 'notEmpty': return actual !== ''
    case 'empty':    return actual === ''
    case 'equals':   return actual === expected
    case 'notContains': return expected === '' || !actual.includes(expected)
    case 'contains':
    default:         return expected === '' || actual.includes(expected)
  }
}

// ── 検索・区分フィルタ ──────────────────────────────────────────────────
const searchQuery = ref('')
const filterType  = ref<'all' | 'individual' | 'corporate'>('all')

const activeConditionCount = computed(() =>
  conditions.value.filter(c => c.operator === 'notEmpty' || c.operator === 'empty' || c.value.trim() !== '').length
)

const filtered = computed(() => {
  let list = store.customers.value
  if (filterType.value !== 'all') {
    list = list.filter(c => c.type === filterType.value)
  }
  const q = searchQuery.value.trim().toLowerCase()
  if (q) {
    list = list.filter(c =>
      c.name?.toLowerCase().includes(q) ||
      c.nameKana?.toLowerCase().includes(q) ||
      c.tel?.includes(q) ||
      c.email?.toLowerCase().includes(q),
    )
  }

  const activeConditions = conditions.value.filter(
    c => c.operator === 'notEmpty' || c.operator === 'empty' || c.value.trim() !== '',
  )
  if (activeConditions.length > 0) {
    list = list.filter(c => {
      const results = activeConditions.map(cond => matchCondition(c, cond))
      return matchMode.value === 'and' ? results.every(Boolean) : results.some(Boolean)
    })
  }

  return list
})

// ── 保存した検索（ログインユーザーごとにlocalStorageへ永続化） ────────
const savedSearchStore = useSavedSearchStore()
const mySavedSearches = savedSearchStore.getForUser(computed(() => user.value?.uid))

const showSaveModal   = ref(false)
const saveSearchName  = ref('')

const openSaveModal = () => {
  saveSearchName.value = ''
  showSaveModal.value = true
}

const confirmSaveSearch = () => {
  const name = saveSearchName.value.trim()
  if (!name) return
  savedSearchStore.save({
    uid: user.value?.uid ?? 'mock-user-123',
    name,
    searchQuery: searchQuery.value,
    filterType: filterType.value,
    matchMode: matchMode.value,
    conditions: conditions.value.map(c => ({ ...c })),
  })
  showSaveModal.value = false
}

const applySavedSearch = (s: SavedSearch) => {
  searchQuery.value = s.searchQuery
  filterType.value  = s.filterType
  matchMode.value   = s.matchMode
  conditions.value  = s.conditions.map(c => ({ ...c }))
  showFilter.value  = conditions.value.length > 0
}

const removeSavedSearch = (s: SavedSearch) => {
  if (!confirm(`検索条件「${s.name}」を削除しますか？`)) return
  savedSearchStore.remove(s.id)
}

// ── ページネーション（大量データのため描画件数を制限） ────────────────
const pageSize = ref(50)
const currentPage = ref(1)

const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize.value)))

const pagedList = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filtered.value.slice(start, start + pageSize.value)
})

const pageRangeLabel = computed(() => {
  if (filtered.value.length === 0) return '0件'
  const start = (currentPage.value - 1) * pageSize.value + 1
  const end = Math.min(currentPage.value * pageSize.value, filtered.value.length)
  return `${start}〜${end}件 / 全${filtered.value.length}件`
})

// 絞り込み条件が変わったら1ページ目に戻す
watch([searchQuery, filterType, conditions, matchMode, pageSize], () => {
  currentPage.value = 1
}, { deep: true })

// データ件数が減ってページ範囲外になった場合は末尾ページへ調整
watch(totalPages, (tp) => {
  if (currentPage.value > tp) currentPage.value = tp
})

const goToPage = (p: number) => {
  currentPage.value = Math.min(Math.max(1, p), totalPages.value)
}

// ── フォロー表出力（絞り込み結果全件を出力） ────────────────────────────
const handleExportApo = () => {
  const csv = exportApoToCsv(filtered.value)
  const label = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '')
  downloadCsv(csv, `apo_report_${label}.csv`)
}

// ── CSV インポートモーダル ─────────────────────────────────────────────────
const showImportModal = ref(false)
const importStatus    = ref<'idle' | 'importing' | 'done' | 'error'>('idle')
const importMessage   = ref('')
const fileInputRef    = ref<HTMLInputElement>()

const handleFileSelect = async (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  importStatus.value  = 'importing'
  importMessage.value = 'CSVを読み込み中...'
  await new Promise(r => setTimeout(r, 800))
  importStatus.value  = 'done'
  importMessage.value = `${file.name} のインポートが完了しました（実装予定）`
}

// ── ステータス色 ──────────────────────────────────────────────────────────
const statusColor = (s: string) => {
  const map: Record<string, string> = {
    'ワン中':       'bg-sky-100 text-sky-700',
    'ワン済み':     'bg-blue-100 text-blue-700',
    'ツー中':       'bg-indigo-100 text-indigo-700',
    'ツー済み':     'bg-purple-100 text-purple-700',
    'アポ調整中':   'bg-amber-100 text-amber-700',
    '成約':         'bg-green-100 text-green-700',
    '完了':         'bg-gray-100 text-gray-500',
    '不成立':       'bg-red-100 text-red-600',
  }
  return map[s] ?? 'bg-gray-100 text-gray-500'
}
</script>

<template>
  <div class="p-4 md:p-6 max-w-7xl mx-auto space-y-5">

    <!-- ===== ページヘッダー ===== -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <h1 class="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Icon name="heroicons:identification" class="h-6 w-6 text-primary-600" />
          パーソナルデータ
        </h1>
        <p class="mt-1 text-sm text-gray-500">顧客の詳細情報管理・CSV連携</p>
      </div>
      <div class="flex items-center gap-2 flex-wrap">
        <!-- アポ分析 -->
        <NuxtLink to="/personal-data/apo" class="btn-secondary text-sm flex items-center gap-1.5">
          <Icon name="heroicons:chart-bar" class="h-4 w-4" />
          アポ分析
        </NuxtLink>
        <!-- フォロー表出力 -->
        <button class="btn-secondary text-sm flex items-center gap-1.5" @click="handleExportApo">
          <Icon name="heroicons:calendar-days" class="h-4 w-4" />
          フォロー表出力
        </button>
        <button
          class="btn-secondary text-sm flex items-center gap-1.5"
          @click="showImportModal = true"
        >
          <Icon name="heroicons:arrow-up-tray" class="h-4 w-4" />
          CSVインポート
        </button>
        <NuxtLink to="/customers/new" class="btn-primary text-sm flex items-center gap-1.5">
          <Icon name="heroicons:plus" class="h-4 w-4" />
          新規登録
        </NuxtLink>
      </div>
    </div>

    <!-- ===== サマリーカード ===== -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div class="card p-4">
        <p class="text-xs text-gray-500">総件数</p>
        <p class="mt-1 text-2xl font-bold text-gray-900">{{ store.customers.value.length }}<span class="text-xs font-normal text-gray-400 ml-1">件</span></p>
      </div>
      <div class="card p-4">
        <p class="text-xs text-gray-500">個人</p>
        <p class="mt-1 text-2xl font-bold text-gray-900">{{ store.customers.value.filter(c => c.type !== 'corporate').length }}<span class="text-xs font-normal text-gray-400 ml-1">件</span></p>
      </div>
      <div class="card p-4">
        <p class="text-xs text-gray-500">法人</p>
        <p class="mt-1 text-2xl font-bold text-gray-900">{{ store.customers.value.filter(c => c.type === 'corporate').length }}<span class="text-xs font-normal text-gray-400 ml-1">件</span></p>
      </div>
      <div class="card p-4">
        <p class="text-xs text-gray-500">絞り込み結果</p>
        <p class="mt-1 text-2xl font-bold text-primary-600">{{ filtered.length }}<span class="text-xs font-normal text-gray-400 ml-1">件</span></p>
      </div>
    </div>

    <!-- ===== 検索・区分フィルタ ===== -->
    <div class="flex flex-col sm:flex-row gap-2">
      <div class="relative flex-1">
        <Icon name="heroicons:magnifying-glass" class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="氏名・フリガナ・電話・メールで検索..."
          class="input-field pl-9 text-sm"
        />
      </div>
      <div class="flex items-center gap-2">
        <button
          v-for="btn in [{ key: 'all', label: 'すべて' }, { key: 'individual', label: '個人' }, { key: 'corporate', label: '法人' }]"
          :key="btn.key"
          class="px-3 py-1.5 rounded-full text-sm font-medium transition"
          :class="filterType === btn.key
            ? 'bg-primary-600 text-white'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
          @click="filterType = btn.key as any"
        >{{ btn.label }}</button>
        <!-- 詳細条件トグル -->
        <button
          class="relative flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition shrink-0"
          :class="activeConditionCount > 0
            ? 'border-primary-400 bg-primary-50 text-primary-700'
            : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'"
          @click="showFilter = !showFilter"
        >
          <Icon name="heroicons:adjustments-horizontal" class="h-4 w-4" />
          詳細条件
          <span
            v-if="activeConditionCount > 0"
            class="flex h-4 w-4 items-center justify-center rounded-full bg-primary-500 text-[10px] text-white font-bold"
          >{{ activeConditionCount }}</span>
        </button>
        <!-- 現在の条件を保存 -->
        <button
          class="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition shrink-0"
          @click="openSaveModal"
        >
          <Icon name="heroicons:bookmark" class="h-4 w-4" />
          保存
        </button>
      </div>
    </div>

    <!-- ===== 保存した検索（ログインユーザーごと） ===== -->
    <div v-if="mySavedSearches.length > 0" class="flex flex-wrap items-center gap-2">
      <span class="text-xs text-gray-400 shrink-0 flex items-center gap-1">
        <Icon name="heroicons:bookmark-square" class="h-3.5 w-3.5" />
        保存した検索
      </span>
      <span
        v-for="s in mySavedSearches"
        :key="s.id"
        class="inline-flex items-center gap-1 rounded-full bg-gray-100 pl-3 pr-1.5 py-1 text-xs text-gray-700 hover:bg-gray-200 transition"
      >
        <button class="hover:text-primary-700 transition" @click="applySavedSearch(s)">{{ s.name }}</button>
        <button class="p-0.5 rounded-full hover:bg-gray-300 text-gray-400 hover:text-red-500 transition" @click="removeSavedSearch(s)">
          <Icon name="heroicons:x-mark" class="h-3 w-3" />
        </button>
      </span>
    </div>

    <!-- ===== 詳細条件パネル（項目を選択して条件を入れる） ===== -->
    <Transition
      enter-active-class="transition duration-150"
      enter-from-class="opacity-0 -translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-100"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-2"
    >
      <div v-if="showFilter" class="card p-4 space-y-3">
        <p class="text-xs font-semibold text-gray-500">条件</p>

        <div v-if="conditions.length === 0" class="text-sm text-gray-400 py-2">
          条件がありません。「＋条件を追加」から項目を選択して条件を設定してください。
        </div>

        <div
          v-for="(cond, idx) in conditions"
          :key="idx"
          class="flex flex-wrap items-center gap-2"
        >
          <!-- 項目選択 -->
          <select v-model="cond.field" class="input-field text-sm py-1.5 w-auto min-w-[140px]">
            <option v-for="f in FIELD_OPTIONS" :key="f.key" :value="f.key">{{ f.label }}</option>
          </select>
          <!-- 演算子選択 -->
          <select v-model="cond.operator" class="input-field text-sm py-1.5 w-auto min-w-[140px]">
            <option v-for="op in OPERATOR_OPTIONS" :key="op.value" :value="op.value">{{ op.label }}</option>
          </select>
          <!-- 値入力（空/空でない の場合は不要） -->
          <template v-if="cond.operator !== 'notEmpty' && cond.operator !== 'empty'">
            <select
              v-if="fieldOf(cond.field).type === 'select'"
              v-model="cond.value"
              class="input-field text-sm py-1.5 w-auto min-w-[120px]"
            >
              <option value="">選択してください</option>
              <option v-for="opt in fieldOf(cond.field).options" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>
            <input
              v-else
              v-model="cond.value"
              type="text"
              placeholder="値を入力..."
              class="input-field text-sm py-1.5 flex-1 min-w-[140px]"
            />
          </template>
          <button
            class="text-gray-400 hover:text-red-500 transition shrink-0"
            @click="removeCondition(idx)"
          >
            <Icon name="heroicons:minus-circle" class="h-5 w-5" />
          </button>
        </div>

        <button
          v-if="conditions.length < 5"
          class="text-sm text-primary-600 hover:underline flex items-center gap-1"
          @click="addCondition"
        >
          <Icon name="heroicons:plus" class="h-4 w-4" />
          条件を追加
        </button>

        <div v-if="conditions.length > 0" class="flex items-center justify-between pt-2 border-t border-gray-100">
          <div class="flex items-center gap-4">
            <label class="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
              <input type="radio" value="and" v-model="matchMode" class="text-primary-600" />
              すべての条件を満たす
            </label>
            <label class="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
              <input type="radio" value="or" v-model="matchMode" class="text-primary-600" />
              いずれかの条件を満たす
            </label>
          </div>
          <button class="text-xs text-gray-400 hover:text-red-500 transition" @click="clearConditions">
            すべてクリア
          </button>
        </div>
      </div>
    </Transition>

    <!-- ===== テーブル（PC） ===== -->
    <div class="hidden md:block card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-100 bg-gray-50">
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">氏名</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">性別</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">生年月日</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">電話</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">住所</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">ステータス</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">区分</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">詳細</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            <tr
              v-for="c in pagedList"
              :key="c.id"
              class="hover:bg-gray-50 transition-colors cursor-pointer"
              @click="router.push(`/customers/${c.id}`)"
            >
              <td class="px-4 py-3">
                <div class="font-medium text-gray-900 whitespace-nowrap">{{ c.name }}</div>
                <div class="text-xs text-gray-400 mt-0.5">{{ c.nameKana }}</div>
              </td>
              <td class="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">{{ c.gender ?? '—' }}</td>
              <td class="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">{{ c.dob?.replace(/-/g, '/') ?? '—' }}</td>
              <td class="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">{{ c.tel ?? '—' }}</td>
              <td class="px-4 py-3 text-gray-500 text-xs max-w-[160px]">
                <span class="line-clamp-1">{{ c.address ?? '—' }}</span>
              </td>
              <td class="px-4 py-3 whitespace-nowrap">
                <span v-if="c.status1" class="badge text-xs" :class="statusColor(c.status1)">
                  {{ c.status1.length > 20 ? c.status1.slice(0, 20) + '...' : c.status1 }}
                </span>
                <span v-else class="text-xs text-gray-300">—</span>
              </td>
              <td class="px-4 py-3 whitespace-nowrap">
                <span
                  class="badge text-xs"
                  :class="c.type === 'corporate' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'"
                >
                  {{ c.type === 'corporate' ? '法人' : '個人' }}
                </span>
              </td>
              <td class="px-4 py-3 whitespace-nowrap">
                <NuxtLink
                  :to="`/customers/${c.id}`"
                  class="inline-flex items-center gap-0.5 text-xs text-primary-600 hover:underline"
                  @click.stop
                >
                  詳細
                  <Icon name="heroicons:arrow-top-right-on-square" class="h-3 w-3" />
                </NuxtLink>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="filtered.length === 0" class="p-12 text-center">
        <Icon name="heroicons:magnifying-glass" class="h-10 w-10 text-gray-200 mx-auto mb-2" />
        <p class="text-gray-400 text-sm">該当するデータが見つかりませんでした</p>
      </div>
    </div>

    <!-- ===== カード一覧（SP） ===== -->
    <div class="md:hidden space-y-3">
      <div
        v-for="c in pagedList"
        :key="c.id"
        class="card p-4"
      >
        <div class="flex items-start justify-between gap-3 mb-2">
          <div>
            <p class="font-semibold text-gray-900">{{ c.name }}</p>
            <p class="text-xs text-gray-400 mt-0.5">{{ c.nameKana }}</p>
          </div>
          <div class="flex items-center gap-1.5">
            <span v-if="c.status1" class="badge text-xs" :class="statusColor(c.status1)">{{ c.status1.length > 15 ? c.status1.slice(0, 15) + '...' : c.status1 }}</span>
            <span
              class="badge text-xs"
              :class="c.type === 'corporate' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'"
            >{{ c.type === 'corporate' ? '法人' : '個人' }}</span>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-1 text-xs text-gray-500 mb-3">
          <div v-if="c.tel"><Icon name="heroicons:phone" class="h-3 w-3 inline mr-1" />{{ c.tel }}</div>
          <div v-if="c.dob"><Icon name="heroicons:calendar" class="h-3 w-3 inline mr-1" />{{ c.dob?.replace(/-/g, '/') }}</div>
          <div v-if="c.address" class="col-span-2 truncate"><Icon name="heroicons:map-pin" class="h-3 w-3 inline mr-1" />{{ c.address }}</div>
        </div>
        <NuxtLink
          :to="`/customers/${c.id}`"
          class="block w-full text-center text-xs text-primary-600 font-medium py-2 rounded-lg border border-primary-200 hover:bg-primary-50 transition"
        >
          詳細を見る →
        </NuxtLink>
      </div>
      <div v-if="filtered.length === 0" class="card p-12 text-center">
        <Icon name="heroicons:magnifying-glass" class="h-10 w-10 text-gray-200 mx-auto mb-2" />
        <p class="text-gray-400 text-sm">該当するデータが見つかりませんでした</p>
      </div>
    </div>

    <!-- ===== ページネーション ===== -->
    <div v-if="filtered.length > 0" class="flex flex-col sm:flex-row items-center justify-between gap-3">
      <p class="text-xs text-gray-400">{{ pageRangeLabel }}</p>
      <div class="flex items-center gap-1">
        <button
          class="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
          :disabled="currentPage <= 1"
          @click="goToPage(1)"
        >
          <Icon name="heroicons:chevron-double-left" class="h-4 w-4" />
        </button>
        <button
          class="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
          :disabled="currentPage <= 1"
          @click="goToPage(currentPage - 1)"
        >
          <Icon name="heroicons:chevron-left" class="h-4 w-4" />
        </button>
        <span class="px-3 text-sm text-gray-600 font-medium whitespace-nowrap">
          {{ currentPage }} / {{ totalPages }} ページ
        </span>
        <button
          class="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
          :disabled="currentPage >= totalPages"
          @click="goToPage(currentPage + 1)"
        >
          <Icon name="heroicons:chevron-right" class="h-4 w-4" />
        </button>
        <button
          class="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
          :disabled="currentPage >= totalPages"
          @click="goToPage(totalPages)"
        >
          <Icon name="heroicons:chevron-double-right" class="h-4 w-4" />
        </button>
        <select v-model.number="pageSize" class="input-field text-xs py-1.5 ml-2 w-auto">
          <option :value="25">25件/ページ</option>
          <option :value="50">50件/ページ</option>
          <option :value="100">100件/ページ</option>
        </select>
      </div>
    </div>

    <!-- ===== CSVインポートモーダル ===== -->
    <Teleport to="body">
      <div
        v-if="showImportModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
        @click.self="showImportModal = false"
      >
        <div class="bg-white w-full max-w-md rounded-2xl p-6 space-y-5 shadow-xl mx-4">
          <div class="flex items-center justify-between">
            <h3 class="font-bold text-gray-900 flex items-center gap-2">
              <Icon name="heroicons:arrow-up-tray" class="h-5 w-5 text-primary-600" />
              CSVインポート
            </h3>
            <button class="p-1.5 rounded-lg hover:bg-gray-100 transition" @click="showImportModal = false">
              <Icon name="heroicons:x-mark" class="h-5 w-5 text-gray-500" />
            </button>
          </div>

          <!-- 対応フォーマット説明 -->
          <div class="rounded-xl bg-blue-50 border border-blue-100 p-4 text-sm text-blue-700">
            <p class="font-semibold mb-1">対応CSVフォーマット</p>
            <ul class="text-xs space-y-0.5 text-blue-600 list-disc list-inside">
              <li>レコード番号、氏名（フルネーム）、フリガナ</li>
              <li>性別、生年月日（本人）、TEL、メールアドレス</li>
              <li>郵便番号、住所、家族情報（最大6名）</li>
              <li>勤務先、年収、関係性、段数</li>
              <li>各種サービスフラグ（生命保険、火災保険など）</li>
              <li>法人情報（法人名、本店所在地など）</li>
            </ul>
          </div>

          <!-- ファイル選択 -->
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-2">CSVファイルを選択</label>
            <div
              class="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-primary-400 transition cursor-pointer"
              @click="fileInputRef?.click()"
            >
              <Icon name="heroicons:document-text" class="h-10 w-10 text-gray-300 mx-auto mb-2" />
              <p class="text-sm text-gray-500">クリックしてCSVファイルを選択</p>
              <p class="text-xs text-gray-400 mt-1">Shift-JIS / UTF-8 対応</p>
              <input
                ref="fileInputRef"
                type="file"
                accept=".csv"
                class="hidden"
                @change="handleFileSelect"
              />
            </div>
          </div>

          <!-- インポートステータス -->
          <div v-if="importStatus !== 'idle'" class="rounded-xl p-3 text-sm"
            :class="{
              'bg-blue-50 text-blue-700': importStatus === 'importing',
              'bg-green-50 text-green-700': importStatus === 'done',
              'bg-red-50 text-red-700': importStatus === 'error',
            }"
          >
            <Icon
              :name="importStatus === 'importing' ? 'heroicons:arrow-path' : importStatus === 'done' ? 'heroicons:check-circle' : 'heroicons:exclamation-circle'"
              class="h-4 w-4 inline mr-1"
              :class="importStatus === 'importing' ? 'animate-spin' : ''"
            />
            {{ importMessage }}
          </div>

          <div class="flex gap-3">
            <button class="flex-1 btn-secondary" @click="showImportModal = false">閉じる</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ===== 検索条件保存モーダル ===== -->
    <Teleport to="body">
      <div
        v-if="showSaveModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
        @click.self="showSaveModal = false"
      >
        <div class="bg-white w-full max-w-sm rounded-2xl p-6 space-y-4 shadow-xl mx-4">
          <div class="flex items-center justify-between">
            <h3 class="font-bold text-gray-900 flex items-center gap-2">
              <Icon name="heroicons:bookmark" class="h-5 w-5 text-primary-600" />
              検索条件を保存
            </h3>
            <button class="p-1.5 rounded-lg hover:bg-gray-100 transition" @click="showSaveModal = false">
              <Icon name="heroicons:x-mark" class="h-5 w-5 text-gray-500" />
            </button>
          </div>

          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1.5">検索条件の名前</label>
            <input
              v-model="saveSearchName"
              type="text"
              placeholder="例：担当顧客・アポ調整中"
              class="input-field text-sm"
              @keydown.enter="confirmSaveSearch"
            />
          </div>

          <p class="text-xs text-gray-400">現在のキーワード・区分・詳細条件がこの名前で保存され、次回以降ワンクリックで呼び出せます。</p>

          <div class="flex gap-3 pt-1">
            <button class="flex-1 btn-secondary" @click="showSaveModal = false">キャンセル</button>
            <button class="flex-1 btn-primary" :disabled="!saveSearchName.trim()" @click="confirmSaveSearch">保存する</button>
          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>
