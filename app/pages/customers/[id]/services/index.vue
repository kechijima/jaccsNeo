<script setup lang="ts">
import { SERVICE_LABELS, STATUS_LABELS } from '~/types/service'
import type { ServiceStatus } from '~/types/service'
import { MOCK_CUSTOMERS, getMockServiceSummaries } from '~/data/mock'

definePageMeta({ middleware: ['auth'] })

const route = useRoute()
const customerId = computed(() => route.params.id as string)
const { canEditCustomer } = usePermission()

const customer = computed(() => MOCK_CUSTOMERS.find(c => c.id === customerId.value))
const customerName = computed(() => customer.value?.name ?? '')

// ── カテゴリ定義 ──────────────────────────────────────────────────────
const CATEGORY_DEFS = [
  {
    key: '保険',
    label: '保険',
    icon: 'heroicons:shield-check',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    activeColor: 'bg-blue-600 text-white',
    services: ['lifeInsurance', 'fireInsurance', 'autoInsurance'],
  },
  {
    key: '不動産',
    label: '不動産',
    icon: 'heroicons:home',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    activeColor: 'bg-amber-500 text-white',
    services: ['realEstatePurchase', 'realEstateSale', 'realEstateRental', 'homeLoan'],
  },
  {
    key: 'キャリア',
    label: 'キャリア',
    icon: 'heroicons:briefcase',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    activeColor: 'bg-purple-600 text-white',
    services: ['jobChange', 'seniorPlanning'],
  },
  {
    key: '通信',
    label: '通信',
    icon: 'heroicons:wifi',
    color: 'text-sky-600',
    bgColor: 'bg-sky-50',
    activeColor: 'bg-sky-600 text-white',
    services: ['communication', 'hikari'],
  },
  {
    key: 'ライフ',
    label: 'ライフ',
    icon: 'heroicons:sparkles',
    color: 'text-rose-600',
    bgColor: 'bg-rose-50',
    activeColor: 'bg-rose-500 text-white',
    services: ['moving', 'renovation', 'travel', 'bridal'],
  },
  {
    key: '法務',
    label: '法務',
    icon: 'heroicons:scale',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    activeColor: 'bg-gray-700 text-white',
    services: ['legal', 'inheritance', 'companySetup'],
  },
]

// ── フィルター状態 ────────────────────────────────────────────────────
const selectedCategory = ref('')       // '' = すべて
const filterStatus     = ref('')       // '' = すべて
const onlyWithContent  = ref(false)    // 対応ありのみ

const resetFilters = () => {
  selectedCategory.value = ''
  filterStatus.value     = ''
  onlyWithContent.value  = false
}

const isFiltering = computed(() =>
  selectedCategory.value !== '' || filterStatus.value !== '' || onlyWithContent.value
)

// ── サービス行ビルド ──────────────────────────────────────────────────
const buildService = (summaryMap: Map<string, any>, svcKey: string) => {
  const summary = summaryMap.get(svcKey)
  const status  = summary?.latestStatus ?? 'none'
  const statusLabel = status !== 'none'
    ? (STATUS_LABELS[status as ServiceStatus] ?? '対応なし')
    : '対応なし'
  const date = summary?.latestUpdatedAt
    ? summary.latestUpdatedAt.toDate().toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit' })
    : ''
  return { key: svcKey, label: SERVICE_LABELS[svcKey] ?? svcKey, status, statusLabel, date }
}

// ── フィルタリング済みカテゴリ一覧 ────────────────────────────────────
const filteredCategories = computed(() => {
  const summaries   = getMockServiceSummaries(customerId.value)
  const summaryMap  = new Map(summaries.map(s => [s.serviceType, s]))

  return CATEGORY_DEFS
    .filter(cat => !selectedCategory.value || cat.key === selectedCategory.value)
    .map(cat => {
      const services = cat.services
        .map(k => buildService(summaryMap, k))
        .filter(svc => {
          if (onlyWithContent.value && svc.status === 'none') return false
          if (filterStatus.value && svc.status !== filterStatus.value) return false
          return true
        })
      return { ...cat, services }
    })
    .filter(cat => cat.services.length > 0)
})

// ── 集計 ─────────────────────────────────────────────────────────────
const totalCount = computed(() =>
  CATEGORY_DEFS.reduce((n, cat) => n + cat.services.length, 0)
)
const filteredCount = computed(() =>
  filteredCategories.value.reduce((n, cat) => n + cat.services.length, 0)
)
const withContentCount = computed(() => {
  const summaries  = getMockServiceSummaries(customerId.value)
  const summaryMap = new Map(summaries.map(s => [s.serviceType, s]))
  return CATEGORY_DEFS.flatMap(cat => cat.services).filter(k => {
    const s = summaryMap.get(k)
    return s?.latestStatus && s.latestStatus !== 'none'
  }).length
})

// ── バッジスタイル ────────────────────────────────────────────────────
const statusClass = (status: string) => {
  switch (status) {
    case 'contracted': return 'bg-green-100 text-green-700'
    case 'completed':  return 'bg-blue-100 text-blue-700'
    case 'considering':return 'bg-amber-100 text-amber-700'
    case 'consulting': return 'bg-sky-100 text-sky-700'
    case 'failed':     return 'bg-red-100 text-red-600'
    default:           return 'bg-gray-100 text-gray-500'
  }
}
</script>

<template>
  <div class="p-4 md:p-6 max-w-4xl mx-auto space-y-5">

    <!-- パンくず -->
    <div class="flex items-center gap-2 text-sm text-gray-400">
      <NuxtLink to="/customers">顧客管理</NuxtLink>
      <Icon name="heroicons:chevron-right" class="h-3 w-3" />
      <NuxtLink :to="`/customers/${customerId}`">{{ customerName }}</NuxtLink>
      <Icon name="heroicons:chevron-right" class="h-3 w-3" />
      <span class="text-gray-600">サービス対応状況</span>
    </div>

    <!-- ヘッダー -->
    <div class="flex items-start justify-between gap-3 flex-wrap">
      <div>
        <h1 class="text-xl font-bold text-gray-900">サービス対応状況</h1>
        <p class="text-sm text-gray-500 mt-0.5">
          {{ customerName }} さん ／
          <span class="text-primary-600 font-medium">対応あり {{ withContentCount }}件</span>
          <span class="text-gray-400"> / 全{{ totalCount }}種</span>
        </p>
      </div>
    </div>

    <!-- ── フィルターエリア ── -->
    <div class="space-y-3">

      <!-- カテゴリタブ -->
      <div class="flex flex-wrap gap-2">
        <button
          class="rounded-full px-3 py-1.5 text-xs font-medium transition border"
          :class="selectedCategory === ''
            ? 'bg-gray-800 text-white border-gray-800'
            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'"
          @click="selectedCategory = ''"
        >
          すべて
        </button>
        <button
          v-for="cat in CATEGORY_DEFS"
          :key="cat.key"
          class="rounded-full px-3 py-1.5 text-xs font-medium transition border flex items-center gap-1"
          :class="selectedCategory === cat.key
            ? cat.activeColor + ' border-transparent'
            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'"
          @click="selectedCategory = selectedCategory === cat.key ? '' : cat.key"
        >
          <Icon :name="cat.icon" class="h-3 w-3" />
          {{ cat.label }}
        </button>
      </div>

      <!-- ステータス + 対応ありトグル -->
      <div class="flex flex-wrap items-center gap-3">
        <!-- ステータス選択 -->
        <select v-model="filterStatus" class="input-field text-sm py-1.5 w-auto">
          <option value="">ステータス: すべて</option>
          <option v-for="(label, key) in STATUS_LABELS" :key="key" :value="key">{{ label }}</option>
        </select>

        <!-- 対応ありのみトグル -->
        <label class="flex items-center gap-2 cursor-pointer">
          <div
            class="relative inline-flex h-5 w-9 items-center rounded-full transition"
            :class="onlyWithContent ? 'bg-primary-500' : 'bg-gray-200'"
            @click="onlyWithContent = !onlyWithContent"
          >
            <span
              class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition"
              :class="onlyWithContent ? 'translate-x-4' : 'translate-x-0.5'"
            />
          </div>
          <span class="text-sm text-gray-700">対応ありのみ</span>
        </label>

        <!-- 件数表示 -->
        <span
          v-if="isFiltering"
          class="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600"
        >
          <Icon name="heroicons:funnel" class="h-3.5 w-3.5" />
          {{ filteredCount }}件表示中
        </span>

        <!-- リセット -->
        <button
          v-if="isFiltering"
          class="text-xs text-gray-400 hover:text-red-500 transition flex items-center gap-0.5"
          @click="resetFilters"
        >
          <Icon name="heroicons:x-mark" class="h-3.5 w-3.5" />リセット
        </button>
      </div>
    </div>

    <!-- フィルター結果なし -->
    <div v-if="filteredCategories.length === 0" class="card p-12 text-center">
      <Icon name="heroicons:magnifying-glass" class="h-10 w-10 text-gray-200 mx-auto mb-2" />
      <p class="text-sm text-gray-400">条件に一致するサービスがありません</p>
      <button class="mt-2 text-xs text-primary-600 hover:underline" @click="resetFilters">条件をリセット</button>
    </div>

    <!-- カテゴリ別サービス一覧 -->
    <div v-for="cat in filteredCategories" :key="cat.key" class="card overflow-hidden">
      <div class="flex items-center justify-between px-5 py-3 border-b border-gray-100" :class="cat.bgColor">
        <div class="flex items-center gap-2.5">
          <Icon :name="cat.icon" class="h-5 w-5" :class="cat.color" />
          <h2 class="font-semibold text-gray-800">{{ cat.label }}</h2>
        </div>
        <span class="text-xs text-gray-400">{{ cat.services.length }}件</span>
      </div>

      <div class="divide-y divide-gray-50">
        <div
          v-for="svc in cat.services"
          :key="svc.key"
          class="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition group"
        >
          <NuxtLink
            :to="`/customers/${customerId}/services/${svc.key}`"
            class="flex items-center gap-3 min-w-0 flex-1"
          >
            <span class="badge text-xs shrink-0" :class="statusClass(svc.status)">{{ svc.statusLabel }}</span>
            <span class="text-sm font-medium text-gray-900 truncate group-hover:text-primary-600 transition-colors">{{ svc.label }}</span>
            <span v-if="svc.date" class="text-xs text-gray-400 shrink-0 hidden sm:inline">{{ svc.date }}</span>
            <Icon name="heroicons:chevron-right" class="h-3.5 w-3.5 text-gray-300 shrink-0 ml-auto" />
          </NuxtLink>
          <NuxtLink
            v-if="canEditCustomer"
            :to="`/customers/${customerId}/services/${svc.key}/new`"
            class="ml-2 shrink-0 text-xs text-gray-400 hover:text-primary-600 transition-colors"
            @click.stop
          >
            + 追加
          </NuxtLink>
        </div>
      </div>
    </div>

  </div>
</template>
