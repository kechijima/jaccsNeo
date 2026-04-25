<script setup lang="ts">
import { exportCustomersToCsv, exportApoToCsv, downloadCsv } from '~/utils/csvCustomer'
import type { Customer } from '~/types/customer'

definePageMeta({ middleware: ['auth'] })

// ── フィルター状態 ─────────────────────────────────────────────────────────────
const searchQuery   = ref('')
const filterType    = ref('')    // 'individual' | 'corporate' | ''
const filterRel     = ref('')    // 関係性
const filterStatus  = ref('')    // 状況
const filterStage   = ref('')    // 段数
const showFilter    = ref(false)

const { customers } = useCustomerStore()

const activeFilterCount = computed(() =>
  [filterType.value, filterRel.value, filterStatus.value, filterStage.value].filter(Boolean).length
)
const isFiltering = computed(() =>
  searchQuery.value.trim() !== '' || activeFilterCount.value > 0
)

const resetFilters = () => {
  searchQuery.value  = ''
  filterType.value   = ''
  filterRel.value    = ''
  filterStatus.value = ''
  filterStage.value  = ''
}

// ── フィルター選択肢 ──────────────────────────────────────────────────────────
const relationships = computed(() =>
  [...new Set(customers.value.map(c => c.relationship).filter(Boolean))] as string[]
)
const statuses = computed(() =>
  [...new Set(customers.value.map(c => c.status1).filter(Boolean))] as string[]
)
const stages = computed(() =>
  [...new Set(customers.value.map(c => c.stage).filter(Boolean))].sort() as string[]
)

// ── フィルタリング ────────────────────────────────────────────────────────────
const filtered = computed(() => {
  let list = customers.value

  const q = searchQuery.value.trim().toLowerCase()
  if (q) {
    list = list.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.nameKana ?? '').toLowerCase().includes(q) ||
      (c.tel ?? '').includes(q) ||
      (c.email ?? '').toLowerCase().includes(q) ||
      (c.assignedFpName ?? '').toLowerCase().includes(q),
    )
  }
  if (filterType.value)    list = list.filter(c => c.type === filterType.value)
  if (filterRel.value)     list = list.filter(c => c.relationship === filterRel.value)
  if (filterStatus.value)  list = list.filter(c => c.status1 === filterStatus.value)
  if (filterStage.value)   list = list.filter(c => c.stage === filterStage.value)

  return list
})

// ── CSV エクスポート ──────────────────────────────────────────────────────────
const today = () =>
  new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' })
    .replace(/\//g, '')

const handleExportCsv = () => {
  const csv = exportCustomersToCsv(filtered.value)
  downloadCsv(csv, `customers_${today()}.csv`)
}

const handleExportApo = () => {
  const csv = exportApoToCsv(filtered.value)
  downloadCsv(csv, `apo_report_${today()}.csv`)
}

// ── 日付フォーマット ──────────────────────────────────────────────────────────
const formatDate = (val: any) => {
  if (!val) return '—'
  const d = val?.toDate?.() ?? (val instanceof Date ? val : null)
  if (!d) return '—'
  return d.toLocaleDateString('ja-JP', { month: '2-digit', day: '2-digit' })
}

// ── アポバッジ ────────────────────────────────────────────────────────────────
const apoLabel = (c: Customer): { text: string; cls: string } | null => {
  const now = new Date()
  const parse = (dateStr?: string) => dateStr ? new Date(dateStr) : null

  const apo2 = parse(c.appointment2?.date)
  if (apo2) {
    return apo2 > now
      ? { text: 'ツーアポ確定', cls: 'bg-indigo-100 text-indigo-700' }
      : { text: 'ツーアポ済み', cls: 'bg-gray-100 text-gray-500' }
  }
  const apo1 = parse(c.appointment1?.date)
  if (apo1) {
    return apo1 > now
      ? { text: 'ワンアポ確定', cls: 'bg-primary-100 text-primary-700' }
      : { text: 'ワンアポ済み', cls: 'bg-gray-100 text-gray-500' }
  }
  if (c.status1 === 'アポ調整中') {
    return { text: '調整中', cls: 'bg-amber-100 text-amber-700' }
  }
  return null
}
</script>

<template>
  <div class="p-4 md:p-6 max-w-7xl mx-auto space-y-4">

    <!-- ヘッダー -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h1 class="text-xl font-bold text-gray-900">顧客管理</h1>
        <p class="mt-0.5 text-sm text-gray-500">
          {{ isFiltering ? `${filtered.length}件表示 / 全${customers.length}件` : `全${customers.length}件` }}
        </p>
      </div>
      <div class="flex items-center gap-2 flex-wrap">
        <!-- アポ分析 -->
        <NuxtLink to="/customers/apo" class="btn-secondary text-sm flex items-center gap-1.5">
          <Icon name="heroicons:chart-bar" class="h-4 w-4" />
          アポ分析
        </NuxtLink>
        <!-- アポCSV -->
        <button class="btn-secondary text-sm flex items-center gap-1.5" @click="handleExportApo">
          <Icon name="heroicons:calendar-days" class="h-4 w-4" />
          フォロー表出力
        </button>
        <!-- 通常CSV -->
        <button class="btn-secondary text-sm flex items-center gap-1.5" @click="handleExportCsv">
          <Icon name="heroicons:arrow-down-tray" class="h-4 w-4" />
          CSVエクスポート
        </button>
        <!-- 新規登録 -->
        <NuxtLink to="/customers/new" class="btn-primary text-sm flex items-center gap-1.5">
          <Icon name="heroicons:user-plus" class="h-4 w-4" />
          新規登録
        </NuxtLink>
      </div>
    </div>

    <!-- 検索バー + フィルタートグル -->
    <div class="space-y-2">
      <div class="flex items-center gap-2">
        <div class="relative flex-1">
          <Icon name="heroicons:magnifying-glass" class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            v-model="searchQuery"
            type="search"
            placeholder="氏名・フリガナ・TEL・メール・担当FPで検索..."
            class="input-field pl-9"
          />
        </div>
        <button
          class="relative flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition shrink-0"
          :class="activeFilterCount > 0
            ? 'border-primary-400 bg-primary-50 text-primary-700'
            : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'"
          @click="showFilter = !showFilter"
        >
          <Icon name="heroicons:funnel" class="h-4 w-4" />
          絞り込み
          <span
            v-if="activeFilterCount > 0"
            class="flex h-4 w-4 items-center justify-center rounded-full bg-primary-500 text-[10px] text-white font-bold"
          >{{ activeFilterCount }}</span>
        </button>
        <button
          v-if="isFiltering"
          class="text-xs text-gray-400 hover:text-red-500 transition flex items-center gap-0.5 shrink-0"
          @click="resetFilters"
        >
          <Icon name="heroicons:x-mark" class="h-3.5 w-3.5" />リセット
        </button>
      </div>

      <!-- フィルターパネル -->
      <Transition
        enter-active-class="transition duration-150"
        enter-from-class="opacity-0 -translate-y-2"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition duration-100"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 -translate-y-2"
      >
        <div v-if="showFilter" class="card p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div class="space-y-1">
            <label class="text-xs font-medium text-gray-500">種別</label>
            <select v-model="filterType" class="input-field text-sm py-1.5">
              <option value="">すべて</option>
              <option value="individual">個人</option>
              <option value="corporate">法人</option>
            </select>
          </div>
          <div class="space-y-1">
            <label class="text-xs font-medium text-gray-500">関係性</label>
            <select v-model="filterRel" class="input-field text-sm py-1.5">
              <option value="">すべて</option>
              <option v-for="r in relationships" :key="r" :value="r">{{ r }}</option>
            </select>
          </div>
          <div class="space-y-1">
            <label class="text-xs font-medium text-gray-500">状況</label>
            <select v-model="filterStatus" class="input-field text-sm py-1.5">
              <option value="">すべて</option>
              <option v-for="s in statuses" :key="s" :value="s">{{ s }}</option>
            </select>
          </div>
          <div class="space-y-1">
            <label class="text-xs font-medium text-gray-500">段数</label>
            <select v-model="filterStage" class="input-field text-sm py-1.5">
              <option value="">すべて</option>
              <option v-for="s in stages" :key="s" :value="s">{{ s }}</option>
            </select>
          </div>
        </div>
      </Transition>

      <!-- アクティブフィルタータグ -->
      <div v-if="isFiltering" class="flex flex-wrap items-center gap-2">
        <span class="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
          <Icon name="heroicons:users" class="h-3.5 w-3.5" />
          {{ filtered.length }}件
        </span>
        <span v-if="filterType" class="inline-flex items-center gap-1 rounded-full bg-primary-100 px-3 py-1 text-xs text-primary-700 font-medium">
          {{ filterType === 'individual' ? '個人' : '法人' }}
          <button @click="filterType = ''"><Icon name="heroicons:x-mark" class="h-3 w-3" /></button>
        </span>
        <span v-if="filterRel" class="inline-flex items-center gap-1 rounded-full bg-primary-100 px-3 py-1 text-xs text-primary-700 font-medium">
          {{ filterRel }}
          <button @click="filterRel = ''"><Icon name="heroicons:x-mark" class="h-3 w-3" /></button>
        </span>
        <span v-if="filterStatus" class="inline-flex items-center gap-1 rounded-full bg-primary-100 px-3 py-1 text-xs text-primary-700 font-medium">
          {{ filterStatus }}
          <button @click="filterStatus = ''"><Icon name="heroicons:x-mark" class="h-3 w-3" /></button>
        </span>
        <span v-if="filterStage" class="inline-flex items-center gap-1 rounded-full bg-primary-100 px-3 py-1 text-xs text-primary-700 font-medium">
          {{ filterStage }}
          <button @click="filterStage = ''"><Icon name="heroicons:x-mark" class="h-3 w-3" /></button>
        </span>
      </div>
    </div>

    <!-- テーブル（PC） -->
    <div class="hidden md:block card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-100 bg-gray-50">
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">氏名</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">TEL</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">担当FP</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">関係性</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">状況</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">アポ</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">更新</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            <tr v-if="filtered.length === 0">
              <td colspan="7" class="text-center py-12 text-gray-400">
                <Icon name="heroicons:users" class="h-10 w-10 mx-auto mb-2 text-gray-300" />
                {{ isFiltering ? '条件に一致する顧客がいません' : '顧客データがありません' }}
              </td>
            </tr>
            <tr
              v-for="c in filtered"
              :key="c.id"
              class="hover:bg-gray-50 cursor-pointer transition"
              @click="navigateTo(`/customers/${c.id}`)"
            >
              <td class="px-4 py-3">
                <div class="font-medium text-gray-900 flex items-center gap-1.5">
                  <span v-if="c.type === 'corporate'" class="text-[10px] rounded bg-purple-100 text-purple-700 px-1 py-0.5 font-bold">法人</span>
                  {{ c.name }}
                </div>
                <div v-if="c.nameKana" class="text-xs text-gray-400">{{ c.nameKana }}</div>
              </td>
              <td class="px-4 py-3 text-gray-600 tabular-nums">{{ c.tel || '—' }}</td>
              <td class="px-4 py-3 text-gray-600">{{ c.assignedFpName || '—' }}</td>
              <td class="px-4 py-3">
                <span v-if="c.relationship" class="badge bg-gray-100 text-gray-600">{{ c.relationship }}</span>
                <span v-else class="text-gray-400">—</span>
              </td>
              <td class="px-4 py-3">
                <span v-if="c.status1" class="badge bg-primary-50 text-primary-700">{{ c.status1 }}</span>
                <span v-else class="text-gray-400">—</span>
              </td>
              <td class="px-4 py-3">
                <span v-if="apoLabel(c)" class="badge text-xs" :class="apoLabel(c)!.cls">
                  {{ apoLabel(c)!.text }}
                </span>
                <span v-else class="text-gray-300 text-xs">—</span>
              </td>
              <td class="px-4 py-3 text-gray-400 text-xs tabular-nums">{{ formatDate(c.updatedAt) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- カードリスト（SP） -->
    <div class="md:hidden space-y-2">
      <div v-if="filtered.length === 0" class="text-center py-12 text-gray-400">
        <Icon name="heroicons:users" class="h-10 w-10 mx-auto mb-2 text-gray-300" />
        {{ isFiltering ? '条件に一致する顧客がいません' : '顧客データがありません' }}
      </div>
      <div
        v-for="c in filtered"
        :key="c.id"
        class="card p-4 cursor-pointer"
        @click="navigateTo(`/customers/${c.id}`)"
      >
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0">
            <p class="font-semibold text-gray-900 truncate">{{ c.name }}</p>
            <p v-if="c.nameKana" class="text-xs text-gray-400 truncate">{{ c.nameKana }}</p>
            <p v-if="c.tel" class="text-sm text-gray-600 mt-1">{{ c.tel }}</p>
          </div>
          <div class="flex flex-col items-end gap-1 shrink-0">
            <span v-if="c.status1" class="badge bg-primary-50 text-primary-700 text-xs">{{ c.status1 }}</span>
            <span v-if="apoLabel(c)" class="badge text-xs" :class="apoLabel(c)!.cls">{{ apoLabel(c)!.text }}</span>
          </div>
        </div>
        <div class="flex items-center justify-between mt-2 text-xs text-gray-400">
          <span>{{ c.assignedFpName || '担当なし' }} / {{ c.relationship || '—' }}</span>
          <span>{{ formatDate(c.updatedAt) }}</span>
        </div>
      </div>
    </div>

  </div>
</template>
