<script setup lang="ts">
import { APP_CATEGORY_DEFS, APP_CATEGORY_LIST } from '~/types/service'
import type { ServiceCase } from '~/types/service'
import { useCustomerStore } from '~/composables/useCustomerStore'
import { useAppServices } from '~/composables/useAppServices'
import { useAppCatalog } from '~/composables/useAppCatalog'
import { useLifeInsuranceCases } from '~/composables/useLifeInsuranceCases'
import { useServices } from '~/composables/useServices'
import { useFavorites } from '~/composables/useFavorites'
import type { AppCatalogEntry } from '~/composables/useAppCatalog'

definePageMeta({ middleware: ['auth'] })

const { customers, ensureLoaded: ensureCustomersLoaded } = useCustomerStore()
const { countForType } = useAppServices()
const { cases: liCases, fetchAll: fetchLiCases } = useLifeInsuranceCases()
const { catalog, ensureLoaded: ensureCatalogLoaded } = useAppCatalog()
const { fetchAllCases } = useServices()

await Promise.all([fetchLiCases(), ensureCustomersLoaded(), ensureCatalogLoaded()])

// 新規作成された（固定18アプリに紐づかない）アプリの件数は、実際の案件データから集計する
const customCases = ref<ServiceCase[]>([])
if (catalog.value.some(e => e.isCustom)) {
  customCases.value = await fetchAllCases()
}

const { isFavoriteApp, toggleFavoriteApp, ensureLoaded: ensureFavoritesLoaded } = useFavorites()
ensureFavoritesLoaded()

// ── カウント計算（生命保険はFirestore連動の専用案件数、固定アプリはパーソナルデータの
// サービス項目、新規作成アプリは実際の案件データから集計） ──
const getCount = (entry: AppCatalogEntry) => {
  if (entry.key === 'lifeInsurance') return liCases.value.length
  if (entry.isCustom) return customCases.value.filter(c => c.serviceType === entry.key).length
  return countForType(entry.key)
}

// ── サマリー ──────────────────────────────────────────────────────────
const totalCases = computed(() =>
  customers.value.reduce((sum, c) => sum + Object.keys(c.services ?? {}).length, 0)
  + customCases.value.length,
)

const customersWithCases = computed(() =>
  customers.value.filter(c => Object.keys(c.services ?? {}).length > 0).length,
)

// ── カテゴリ別グルーピング（アプリ管理で設定したカテゴリに基づく） ──────
const categories = computed(() => {
  const byCategory = new Map<string, AppCatalogEntry[]>()
  for (const entry of catalog.value) {
    if (!byCategory.has(entry.category)) byCategory.set(entry.category, [])
    byCategory.get(entry.category)!.push(entry)
  }
  return APP_CATEGORY_LIST
    .filter(label => byCategory.has(label))
    .map(label => ({ label, meta: APP_CATEGORY_DEFS[label], services: byCategory.get(label)! }))
})

// ── 検索・フィルタ ──────────────────────────────────────────────────
const searchQuery = ref('')
const selectedCategory = ref('all')

const filteredCategories = computed(() => {
  return categories.value
    .map(cat => ({
      ...cat,
      services: cat.services.filter(svc => {
        // カテゴリ一致確認
        if (selectedCategory.value !== 'all' && cat.label !== selectedCategory.value) {
          return false
        }
        // キーワード一致確認
        if (!searchQuery.value.trim()) return true
        return svc.label.toLowerCase().includes(searchQuery.value.toLowerCase())
      })
    }))
    .filter(cat => cat.services.length > 0)
})
</script>

<template>
  <div class="p-4 md:p-6 max-w-7xl mx-auto space-y-6">

    <!-- ===== ページヘッダー ===== -->
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div>
        <h1 class="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Icon name="heroicons:squares-2x2" class="h-6 w-6 text-primary-600" />
          アプリ
        </h1>
        <p class="mt-1 text-sm text-gray-500">各アプリの案件データ一覧・管理</p>
      </div>

      <!-- 検索・フィルタ -->
      <div class="flex flex-col sm:flex-row gap-2 max-w-md w-full">
        <div class="relative flex-1">
          <Icon name="heroicons:magnifying-glass" class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="アプリ名で検索..."
            class="input-field pl-9 !py-1.5 text-xs"
          />
        </div>
        <select v-model="selectedCategory" class="input-field !py-1.5 text-xs sm:w-32 bg-gray-50">
          <option value="all">全カテゴリ</option>
          <option v-for="cat in categories" :key="cat.label" :value="cat.label">{{ cat.label }}</option>
        </select>
      </div>
    </div>

    <!-- ===== サマリーカード ===== -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div class="card p-4 col-span-1">
        <p class="text-xs text-gray-500 font-medium">総案件数</p>
        <p class="mt-1 text-2xl font-bold text-gray-900">
          {{ totalCases }}<span class="text-sm font-normal text-gray-500 ml-1">件</span>
        </p>
        <div class="mt-2 flex items-center gap-1 text-xs text-gray-400">
          <Icon name="heroicons:clipboard-document-list" class="h-3.5 w-3.5" />
          全サービス合計
        </div>
      </div>
      <div class="card p-4 col-span-1">
        <p class="text-xs text-gray-500 font-medium">案件保有顧客</p>
        <p class="mt-1 text-2xl font-bold text-gray-900">
          {{ customersWithCases }}<span class="text-sm font-normal text-gray-500 ml-1">名</span>
        </p>
        <div class="mt-2 flex items-center gap-1 text-xs text-gray-400">
          <Icon name="heroicons:users" class="h-3.5 w-3.5" />
          1件以上保有
        </div>
      </div>
      <div class="card p-4 col-span-1">
        <p class="text-xs text-gray-500 font-medium">サービス種別</p>
        <p class="mt-1 text-2xl font-bold text-gray-900">
          {{ catalog.length }}<span class="text-sm font-normal text-gray-500 ml-1">種</span>
        </p>
        <div class="mt-2 flex items-center gap-1 text-xs text-gray-400">
          <Icon name="heroicons:tag" class="h-3.5 w-3.5" />
          {{ categories.length }}カテゴリ
        </div>
      </div>
      <div class="card p-4 col-span-1">
        <p class="text-xs text-gray-500 font-medium">登録顧客数</p>
        <p class="mt-1 text-2xl font-bold text-gray-900">
          {{ customers.length }}<span class="text-sm font-normal text-gray-500 ml-1">名</span>
        </p>
        <div class="mt-2 flex items-center gap-1 text-xs text-gray-400">
          <Icon name="heroicons:user-group" class="h-3.5 w-3.5" />
          総顧客数
        </div>
      </div>
    </div>

    <!-- ===== カテゴリ別サービスカード ===== -->
    <div class="space-y-6">
      <div v-if="filteredCategories.length === 0" class="card p-12 text-center">
        <Icon name="heroicons:magnifying-glass" class="h-10 w-10 text-gray-200 mx-auto mb-2" />
        <p class="text-gray-400">条件に一致するサービスが見つかりませんでした</p>
      </div>

      <div v-for="cat in filteredCategories" :key="cat.label">
        <!-- カテゴリヘッダー -->
        <div class="flex items-center gap-2 mb-3">
          <span
            class="inline-flex items-center justify-center h-7 w-7 rounded-lg"
            :class="cat.meta.bgColor"
          >
            <Icon :name="cat.meta.icon" class="h-4 w-4" :class="cat.meta.color" />
          </span>
          <h2 class="font-semibold text-gray-800">{{ cat.label }}</h2>
          <span class="text-xs text-gray-400">{{ cat.services.length }}種</span>
        </div>

        <!-- サービスカードグリッド -->
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          <NuxtLink
            v-for="svc in cat.services"
            :key="svc.key"
            :to="`/services/${svc.key}`"
            class="card p-4 hover:shadow-md transition group flex flex-col gap-3"
          >
            <!-- アイコン + ラベル -->
            <div class="flex items-start justify-between gap-2">
              <div
                class="inline-flex items-center justify-center h-9 w-9 rounded-xl shrink-0"
                :class="cat.meta.bgColor"
              >
                <Icon :name="cat.meta.icon" class="h-5 w-5" :class="cat.meta.color" />
              </div>
              <div class="flex items-center gap-1.5 shrink-0">
                <span v-if="svc.isCustom" class="badge text-xs bg-primary-100 text-primary-700">新規</span>
                <span
                  class="badge text-xs"
                  :class="cat.meta.badgeColor"
                >
                  {{ cat.label }}
                </span>
                <button
                  type="button"
                  class="flex items-center justify-center h-7 w-7 rounded-full transition shrink-0"
                  :class="isFavoriteApp(svc.key)
                    ? 'bg-amber-100 text-amber-500 hover:bg-amber-200'
                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-amber-400'"
                  :aria-label="isFavoriteApp(svc.key) ? 'お気に入りから外す' : 'お気に入りに追加'"
                  :title="isFavoriteApp(svc.key) ? 'お気に入り登録中' : 'お気に入りに追加'"
                  @click.prevent.stop="toggleFavoriteApp(svc.key)"
                >
                  <Icon :name="isFavoriteApp(svc.key) ? 'heroicons:star-solid' : 'heroicons:star'" class="h-4 w-4" />
                </button>
              </div>
            </div>

            <!-- サービス名 + 件数 -->
            <div class="min-w-0">
              <p class="font-semibold text-gray-900 group-hover:text-primary-700 transition-colors leading-tight">
                {{ svc.label }}
              </p>
              <p class="mt-1.5 text-sm text-gray-500">
                <span class="text-lg font-bold text-gray-900">{{ getCount(svc) }}</span>
                <span class="ml-1 text-gray-400">件の案件</span>
              </p>
            </div>

            <!-- 矢印 -->
            <div class="flex items-center justify-end mt-auto">
              <span class="text-xs text-gray-400 group-hover:text-primary-600 transition-colors flex items-center gap-0.5">
                一覧を見る
                <Icon name="heroicons:arrow-right" class="h-3.5 w-3.5" />
              </span>
            </div>
          </NuxtLink>
        </div>
      </div>
    </div>

  </div>
</template>
