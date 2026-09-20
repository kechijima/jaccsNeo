<script setup lang="ts">
import { APP_CATEGORY_DEFS, APP_CATEGORY_LIST } from '~/types/service'
import { useCustomerStore } from '~/composables/useCustomerStore'
import { useAppServices } from '~/composables/useAppServices'
import { useAppCatalog } from '~/composables/useAppCatalog'
import { useServices } from '~/composables/useServices'

definePageMeta({ middleware: ['auth'] })

const route = useRoute()
const customerId = computed(() => route.params.id as string)
const { canEditCustomer } = usePermission()

const { getById, ensureLoaded } = useCustomerStore()
const { resolveKey } = useAppServices()
const { catalog, ensureLoaded: ensureCatalogLoaded } = useAppCatalog()
await Promise.all([ensureLoaded(), ensureCatalogLoaded()])
const customer = getById(customerId)
const customerName = computed(() => customer.value?.name ?? '')
const canEdit = computed(() => customer.value ? canEditCustomer(customer.value.assignedFpId ?? '') : false)

// 新規作成された（固定18アプリに紐づかない）アプリは、この顧客の実際の案件データの
// 有無で「対応あり」を判定する
const { fetchCases } = useServices()
const customCaseCounts = ref<Record<string, number>>({})
await Promise.all(
  catalog.value.filter(e => e.isCustom).map(async (e) => {
    try {
      customCaseCounts.value[e.key] = (await fetchCases(customerId.value, e.key)).length
    } catch {
      customCaseCounts.value[e.key] = 0
    }
  }),
)

// ── フィルター状態 ────────────────────────────────────────────────────
const selectedCategory = ref('')       // '' = すべて
const onlyWithContent  = ref(false)    // 対応ありのみ

const resetFilters = () => {
  selectedCategory.value = ''
  onlyWithContent.value  = false
}

const isFiltering = computed(() =>
  selectedCategory.value !== '' || onlyWithContent.value
)

// ── サービス行ビルド（固定アプリはパーソナルデータのservices値、新規作成アプリは
// 実際の案件データ件数から導出） ──────────────────────────────────────
const buildService = (entry: { key: string; label: string; isCustom: boolean }) => {
  if (entry.isCustom) {
    const count = customCaseCounts.value[entry.key] ?? 0
    return {
      key: entry.key,
      label: entry.label,
      status: count > 0 ? 'active' : 'none',
      statusLabel: count > 0 ? `${count}件` : '対応なし',
      date: '',
    }
  }
  const value = (customer.value?.services as any)?.[resolveKey(entry.key)] ?? ''
  const status = value ? 'active' : 'none'
  const statusLabel = value
    ? (value.length > 30 ? value.slice(0, 30) + '...' : value)
    : '対応なし'
  return { key: entry.key, label: entry.label, status, statusLabel, date: '' }
}

// ── カテゴリ別グルーピング ────────────────────────────────────────────
const CATEGORY_DEFS = computed(() => {
  const byCategory = new Map<string, typeof catalog.value>()
  for (const entry of catalog.value) {
    if (!byCategory.has(entry.category)) byCategory.set(entry.category, [])
    byCategory.get(entry.category)!.push(entry)
  }
  return APP_CATEGORY_LIST
    .filter(label => byCategory.has(label))
    .map(label => ({
      key: label,
      label,
      icon: APP_CATEGORY_DEFS[label].icon,
      color: APP_CATEGORY_DEFS[label].color,
      bgColor: APP_CATEGORY_DEFS[label].bgColor,
      activeColor: APP_CATEGORY_DEFS[label].activeColor,
      entries: byCategory.get(label)!,
    }))
})

// ── フィルタリング済みカテゴリ一覧 ────────────────────────────────────
const filteredCategories = computed(() => {
  return CATEGORY_DEFS.value
    .filter(cat => !selectedCategory.value || cat.key === selectedCategory.value)
    .map(cat => {
      const services = cat.entries
        .map(e => buildService(e))
        .filter(svc => {
          if (onlyWithContent.value && svc.status === 'none') return false
          return true
        })
      return { ...cat, services }
    })
    .filter(cat => cat.services.length > 0)
})

// ── 集計 ─────────────────────────────────────────────────────────────
const totalCount = computed(() => catalog.value.length)
const filteredCount = computed(() =>
  filteredCategories.value.reduce((n, cat) => n + cat.services.length, 0)
)
const withContentCount = computed(() =>
  catalog.value.filter((e) => {
    if (e.isCustom) return (customCaseCounts.value[e.key] ?? 0) > 0
    return !!(customer.value?.services as any)?.[resolveKey(e.key)]
  }).length
)

// ── バッジスタイル ────────────────────────────────────────────────────
const statusClass = (status: string) => {
  return status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
}
</script>

<template>
  <div class="p-4 md:p-6 max-w-4xl mx-auto space-y-5">

    <!-- パンくず -->
    <div class="flex items-center gap-2 text-sm text-gray-400">
      <NuxtLink to="/personal-data">パーソナルデータ</NuxtLink>
      <Icon name="heroicons:chevron-right" class="h-3 w-3" />
      <NuxtLink :to="`/customers/${customerId}`">{{ customerName }}</NuxtLink>
      <Icon name="heroicons:chevron-right" class="h-3 w-3" />
      <span class="text-gray-600">アプリ連携</span>
    </div>

    <!-- ヘッダー -->
    <div class="flex items-start justify-between gap-3 flex-wrap">
      <div>
        <h1 class="text-xl font-bold text-gray-900">アプリ連携</h1>
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

      <!-- 対応ありトグル -->
      <div class="flex flex-wrap items-center gap-3">
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
            v-if="canEdit"
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
