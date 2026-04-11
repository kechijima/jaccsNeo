<script setup lang="ts">
import { MOCK_SERVICE_CASES, MOCK_CUSTOMERS } from '~/data/mock'
import { SERVICE_LABELS } from '~/types/service'

definePageMeta({ middleware: ['auth'] })

// ── カウント計算 ──────────────────────────────────────────────────────
const getCount = (type: string) =>
  Object.values(MOCK_SERVICE_CASES).reduce((sum, s) => sum + ((s as any)[type]?.length ?? 0), 0)

// ── サマリー ──────────────────────────────────────────────────────────
const totalCases = computed(() =>
  Object.values(MOCK_SERVICE_CASES).reduce(
    (sum, s) => sum + Object.values(s).reduce((a, arr) => a + arr.length, 0),
    0,
  ),
)

const customersWithCases = computed(() =>
  Object.keys(MOCK_SERVICE_CASES).filter(id =>
    Object.values(MOCK_SERVICE_CASES[id] ?? {}).some(arr => arr.length > 0),
  ).length,
)

// ── カテゴリ定義 ──────────────────────────────────────────────────────
const categories = computed(() => [
  {
    label: '保険',
    icon: 'heroicons:shield-check',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-100',
    badgeColor: 'bg-blue-100 text-blue-700',
    services: [
      { key: 'lifeInsurance',  label: SERVICE_LABELS.lifeInsurance },
      { key: 'fireInsurance',  label: SERVICE_LABELS.fireInsurance },
      { key: 'autoInsurance',  label: SERVICE_LABELS.autoInsurance },
    ],
  },
  {
    label: '不動産',
    icon: 'heroicons:home',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-100',
    badgeColor: 'bg-amber-100 text-amber-700',
    services: [
      { key: 'realEstatePurchase', label: SERVICE_LABELS.realEstatePurchase },
      { key: 'realEstateSale',     label: SERVICE_LABELS.realEstateSale },
      { key: 'realEstateRental',   label: SERVICE_LABELS.realEstateRental },
      { key: 'homeLoan',           label: SERVICE_LABELS.homeLoan },
    ],
  },
  {
    label: 'キャリア',
    icon: 'heroicons:briefcase',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-100',
    badgeColor: 'bg-purple-100 text-purple-700',
    services: [
      { key: 'jobChange',      label: SERVICE_LABELS.jobChange },
      { key: 'seniorPlanning', label: SERVICE_LABELS.seniorPlanning },
    ],
  },
  {
    label: '通信',
    icon: 'heroicons:wifi',
    color: 'text-sky-600',
    bgColor: 'bg-sky-50',
    borderColor: 'border-sky-100',
    badgeColor: 'bg-sky-100 text-sky-700',
    services: [
      { key: 'communication', label: SERVICE_LABELS.communication },
      { key: 'hikari',        label: SERVICE_LABELS.hikari },
    ],
  },
  {
    label: 'ライフ',
    icon: 'heroicons:sparkles',
    color: 'text-rose-600',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-100',
    badgeColor: 'bg-rose-100 text-rose-700',
    services: [
      { key: 'moving',      label: SERVICE_LABELS.moving },
      { key: 'renovation',  label: SERVICE_LABELS.renovation },
      { key: 'travel',      label: SERVICE_LABELS.travel },
      { key: 'bridal',      label: SERVICE_LABELS.bridal },
    ],
  },
  {
    label: '法務',
    icon: 'heroicons:scale',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-200',
    badgeColor: 'bg-gray-200 text-gray-700',
    services: [
      { key: 'legal',        label: SERVICE_LABELS.legal },
      { key: 'inheritance',  label: SERVICE_LABELS.inheritance },
      { key: 'companySetup', label: SERVICE_LABELS.companySetup },
    ],
  },
])
</script>

<template>
  <div class="p-4 md:p-6 max-w-7xl mx-auto space-y-6">

    <!-- ===== ページヘッダー ===== -->
    <div>
      <h1 class="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
        <Icon name="heroicons:squares-2x2" class="h-6 w-6 text-primary-600" />
        サービスアプリ
      </h1>
      <p class="mt-1 text-sm text-gray-500">各サービスの案件データ一覧・管理</p>
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
          18<span class="text-sm font-normal text-gray-500 ml-1">種</span>
        </p>
        <div class="mt-2 flex items-center gap-1 text-xs text-gray-400">
          <Icon name="heroicons:tag" class="h-3.5 w-3.5" />
          6カテゴリ
        </div>
      </div>
      <div class="card p-4 col-span-1">
        <p class="text-xs text-gray-500 font-medium">登録顧客数</p>
        <p class="mt-1 text-2xl font-bold text-gray-900">
          {{ MOCK_CUSTOMERS.length }}<span class="text-sm font-normal text-gray-500 ml-1">名</span>
        </p>
        <div class="mt-2 flex items-center gap-1 text-xs text-gray-400">
          <Icon name="heroicons:user-group" class="h-3.5 w-3.5" />
          総顧客数
        </div>
      </div>
    </div>

    <!-- ===== カテゴリ別サービスカード ===== -->
    <div class="space-y-6">
      <div v-for="cat in categories" :key="cat.label">
        <!-- カテゴリヘッダー -->
        <div class="flex items-center gap-2 mb-3">
          <span
            class="inline-flex items-center justify-center h-7 w-7 rounded-lg"
            :class="cat.bgColor"
          >
            <Icon :name="cat.icon" class="h-4 w-4" :class="cat.color" />
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
                :class="cat.bgColor"
              >
                <Icon :name="cat.icon" class="h-5 w-5" :class="cat.color" />
              </div>
              <span
                class="badge text-xs shrink-0"
                :class="cat.badgeColor"
              >
                {{ cat.label }}
              </span>
            </div>

            <!-- サービス名 + 件数 -->
            <div class="min-w-0">
              <p class="font-semibold text-gray-900 group-hover:text-primary-700 transition-colors leading-tight">
                {{ svc.label }}
              </p>
              <p class="mt-1.5 text-sm text-gray-500">
                <span class="text-lg font-bold text-gray-900">{{ getCount(svc.key) }}</span>
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
