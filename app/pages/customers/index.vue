<script setup lang="ts">
import { MOCK_CUSTOMERS_SUMMARY } from '~/data/mock'

definePageMeta({ middleware: ['auth'] })

// ── フィルター状態 ────────────────────────────────────────────────────
const searchQuery      = ref('')
const filterType       = ref('')        // '' | 'individual' | 'corporate'
const filterRelationship = ref('')
const filterStatus     = ref('')
const filterStage      = ref('')
const showFilter       = ref(false)

// ── 選択肢（モックデータから一意に抽出） ──────────────────────────────
const RELATIONSHIPS = [...new Set(MOCK_CUSTOMERS_SUMMARY.map(c => c.relationship).filter(Boolean))]
const STATUSES      = [...new Set(MOCK_CUSTOMERS_SUMMARY.map(c => c.status1).filter(Boolean))]
const STAGES        = [...new Set(MOCK_CUSTOMERS_SUMMARY.map(c => c.stage).filter(Boolean))].sort()

// ── アクティブなフィルター数 ──────────────────────────────────────────
const activeFilterCount = computed(() =>
  [filterType.value, filterRelationship.value, filterStatus.value, filterStage.value]
    .filter(v => v !== '').length
)

// ── フィルターリセット ────────────────────────────────────────────────
const resetFilters = () => {
  searchQuery.value      = ''
  filterType.value       = ''
  filterRelationship.value = ''
  filterStatus.value     = ''
  filterStage.value      = ''
}

// ── フィルタリング ────────────────────────────────────────────────────
const customers = computed(() => {
  let list = MOCK_CUSTOMERS_SUMMARY

  const q = searchQuery.value.trim().toLowerCase()
  if (q) {
    list = list.filter(c =>
      c.name?.toLowerCase().includes(q) ||
      c.nameKana?.toLowerCase().includes(q) ||
      c.tel?.includes(q) ||
      c.email?.toLowerCase().includes(q)
    )
  }

  if (filterType.value)         list = list.filter(c => c.type === filterType.value)
  if (filterRelationship.value) list = list.filter(c => c.relationship === filterRelationship.value)
  if (filterStatus.value)       list = list.filter(c => c.status1 === filterStatus.value)
  if (filterStage.value)        list = list.filter(c => c.stage === filterStage.value)

  return list
})

const isFiltered = computed(() => customers.value.length !== MOCK_CUSTOMERS_SUMMARY.length)

// ── 日付フォーマット ──────────────────────────────────────────────────
const formatDate = (val: any) => {
  if (!val) return '—'
  const d = val?.toDate?.() ?? (val instanceof Date ? val : null)
  if (!d) return '—'
  return d.toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

// ── バッジスタイル ────────────────────────────────────────────────────
const statusClass = (s: string) => {
  if (s === '成約済') return 'bg-green-50 text-green-700'
  if (s === 'フォロー中') return 'bg-blue-50 text-blue-700'
  if (s === '相談中') return 'bg-amber-50 text-amber-700'
  return 'bg-gray-100 text-gray-600'
}
</script>

<template>
  <div class="p-4 md:p-6 max-w-7xl mx-auto space-y-4">

    <!-- ページヘッダー -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h1 class="text-xl font-bold text-gray-900">顧客管理</h1>
        <p class="mt-0.5 text-sm text-gray-500">
          {{ isFiltered ? `絞り込み結果: ${customers.length}件` : `${customers.length}件表示中` }}
        </p>
      </div>
      <div class="flex items-center gap-2">
        <NuxtLink to="/customers/new" class="btn-primary text-sm flex items-center gap-1.5">
          <Icon name="heroicons:user-plus" class="h-4 w-4" />
          新規登録
        </NuxtLink>
      </div>
    </div>

    <!-- 検索バー + フィルターボタン -->
    <div class="flex items-center gap-2">
      <div class="relative flex-1">
        <Icon name="heroicons:magnifying-glass" class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          v-model="searchQuery"
          type="search"
          placeholder="氏名・ヨミガナ・TEL・メールで検索..."
          class="input-field pl-9"
        />
      </div>
      <!-- フィルタートグルボタン -->
      <button
        class="relative flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition"
        :class="activeFilterCount > 0
          ? 'border-primary-400 bg-primary-50 text-primary-700'
          : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'"
        @click="showFilter = !showFilter"
      >
        <Icon name="heroicons:adjustments-horizontal" class="h-4 w-4" />
        絞り込み
        <span
          v-if="activeFilterCount > 0"
          class="flex h-4 w-4 items-center justify-center rounded-full bg-primary-500 text-[10px] text-white font-bold"
        >{{ activeFilterCount }}</span>
      </button>
      <!-- リセット -->
      <button
        v-if="activeFilterCount > 0 || searchQuery"
        class="text-xs text-gray-400 hover:text-red-500 transition flex items-center gap-0.5"
        @click="resetFilters"
      >
        <Icon name="heroicons:x-mark" class="h-3.5 w-3.5" />
        リセット
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
      <div v-if="showFilter" class="card p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        <!-- 種別 -->
        <div class="space-y-1">
          <label class="text-xs font-medium text-gray-500">種別</label>
          <select v-model="filterType" class="input-field text-sm py-1.5">
            <option value="">すべて</option>
            <option value="individual">個人</option>
            <option value="corporate">法人</option>
          </select>
        </div>
        <!-- 関係性 -->
        <div class="space-y-1">
          <label class="text-xs font-medium text-gray-500">関係性</label>
          <select v-model="filterRelationship" class="input-field text-sm py-1.5">
            <option value="">すべて</option>
            <option v-for="r in RELATIONSHIPS" :key="r" :value="r">{{ r }}</option>
          </select>
        </div>
        <!-- 状況 -->
        <div class="space-y-1">
          <label class="text-xs font-medium text-gray-500">状況</label>
          <select v-model="filterStatus" class="input-field text-sm py-1.5">
            <option value="">すべて</option>
            <option v-for="s in STATUSES" :key="s" :value="s">{{ s }}</option>
          </select>
        </div>
        <!-- ステージ -->
        <div class="space-y-1">
          <label class="text-xs font-medium text-gray-500">ステージ</label>
          <select v-model="filterStage" class="input-field text-sm py-1.5">
            <option value="">すべて</option>
            <option v-for="st in STAGES" :key="st" :value="st">{{ st }}</option>
          </select>
        </div>
      </div>
    </Transition>

    <!-- アクティブフィルタータグ -->
    <div v-if="activeFilterCount > 0" class="flex flex-wrap gap-2">
      <span v-if="filterType" class="inline-flex items-center gap-1 rounded-full bg-primary-100 px-3 py-1 text-xs text-primary-700 font-medium">
        種別: {{ filterType === 'individual' ? '個人' : '法人' }}
        <button @click="filterType = ''"><Icon name="heroicons:x-mark" class="h-3 w-3" /></button>
      </span>
      <span v-if="filterRelationship" class="inline-flex items-center gap-1 rounded-full bg-primary-100 px-3 py-1 text-xs text-primary-700 font-medium">
        関係性: {{ filterRelationship }}
        <button @click="filterRelationship = ''"><Icon name="heroicons:x-mark" class="h-3 w-3" /></button>
      </span>
      <span v-if="filterStatus" class="inline-flex items-center gap-1 rounded-full bg-primary-100 px-3 py-1 text-xs text-primary-700 font-medium">
        状況: {{ filterStatus }}
        <button @click="filterStatus = ''"><Icon name="heroicons:x-mark" class="h-3 w-3" /></button>
      </span>
      <span v-if="filterStage" class="inline-flex items-center gap-1 rounded-full bg-primary-100 px-3 py-1 text-xs text-primary-700 font-medium">
        ステージ: {{ filterStage }}
        <button @click="filterStage = ''"><Icon name="heroicons:x-mark" class="h-3 w-3" /></button>
      </span>
    </div>

    <!-- テーブル（PC） -->
    <div class="hidden md:block card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-100 bg-gray-50">
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">氏名</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">TEL</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">メール</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">担当FP</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">関係性</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">ステージ</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">状況</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">更新日</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            <tr v-if="customers.length === 0">
              <td colspan="8" class="text-center py-12 text-gray-400">
                <Icon name="heroicons:funnel" class="h-10 w-10 mx-auto mb-2 text-gray-300" />
                <p>条件に一致する顧客がいません</p>
                <button class="mt-2 text-xs text-primary-600 hover:underline" @click="resetFilters">条件をリセット</button>
              </td>
            </tr>
            <tr
              v-for="c in customers"
              :key="c.id"
              class="hover:bg-gray-50 cursor-pointer transition"
              @click="navigateTo(`/customers/${c.id}`)"
            >
              <td class="px-4 py-3">
                <div class="font-medium text-gray-900">{{ c.name }}</div>
                <div v-if="c.nameKana" class="text-xs text-gray-400">{{ c.nameKana }}</div>
                <span v-if="c.type === 'corporate'" class="mt-0.5 inline-block rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] text-indigo-600 font-medium">法人</span>
              </td>
              <td class="px-4 py-3 text-gray-600">{{ c.tel || '—' }}</td>
              <td class="px-4 py-3 text-gray-600 max-w-[180px] truncate">{{ c.email || '—' }}</td>
              <td class="px-4 py-3 text-gray-600">{{ c.assignedFpName || '—' }}</td>
              <td class="px-4 py-3">
                <span v-if="c.relationship" class="badge bg-gray-100 text-gray-600">{{ c.relationship }}</span>
                <span v-else class="text-gray-400">—</span>
              </td>
              <td class="px-4 py-3 text-gray-600 text-xs">{{ c.stage || '—' }}</td>
              <td class="px-4 py-3">
                <span v-if="c.status1" class="badge text-xs" :class="statusClass(c.status1)">{{ c.status1 }}</span>
                <span v-else class="text-gray-400">—</span>
              </td>
              <td class="px-4 py-3 text-gray-500 text-xs">{{ formatDate(c.updatedAt) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- カードリスト（SP） -->
    <div class="md:hidden space-y-2">
      <div v-if="customers.length === 0" class="card p-10 text-center">
        <Icon name="heroicons:funnel" class="h-10 w-10 mx-auto mb-2 text-gray-300" />
        <p class="text-sm text-gray-400">条件に一致する顧客がいません</p>
        <button class="mt-2 text-xs text-primary-600 hover:underline" @click="resetFilters">条件をリセット</button>
      </div>
      <div
        v-for="c in customers"
        :key="c.id"
        class="card p-4 cursor-pointer"
        @click="navigateTo(`/customers/${c.id}`)"
      >
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0">
            <div class="flex items-center gap-1.5">
              <p class="font-semibold text-gray-900 truncate">{{ c.name }}</p>
              <span v-if="c.type === 'corporate'" class="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] text-indigo-600 font-medium shrink-0">法人</span>
            </div>
            <p v-if="c.nameKana" class="text-xs text-gray-400 truncate">{{ c.nameKana }}</p>
            <p v-if="c.tel" class="text-sm text-gray-600 mt-1">{{ c.tel }}</p>
          </div>
          <div class="flex flex-col items-end gap-1 shrink-0">
            <span v-if="c.status1" class="badge text-xs" :class="statusClass(c.status1)">{{ c.status1 }}</span>
            <span v-if="c.relationship" class="badge bg-gray-100 text-gray-600 text-xs">{{ c.relationship }}</span>
            <span v-if="c.stage" class="text-xs text-gray-400">{{ c.stage }}</span>
          </div>
        </div>
        <div class="flex items-center justify-between mt-2 text-xs text-gray-400">
          <span>{{ c.assignedFpName || '担当なし' }}</span>
          <span>{{ formatDate(c.updatedAt) }}</span>
        </div>
      </div>
    </div>

  </div>
</template>
