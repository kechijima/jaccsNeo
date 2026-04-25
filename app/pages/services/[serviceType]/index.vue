<script setup lang="ts">
import { getMockAllCasesForType } from '~/data/mock'
import { SERVICE_LABELS, STATUS_LABELS } from '~/types/service'

definePageMeta({ middleware: ['auth'] })

const route = useRoute()
const serviceType = computed(() => route.params.serviceType as string)
const serviceLabel = computed(() => SERVICE_LABELS[serviceType.value] ?? serviceType.value)

// ── 全案件取得 ────────────────────────────────────────────────────────
const allCases = computed(() => getMockAllCasesForType(serviceType.value))

// ── フィルタータブ ─────────────────────────────────────────────────────
const activeTab = ref<string>('all')
const tabs = [
  { key: 'all',        label: 'すべて' },
  { key: 'consulting', label: '相談中' },
  { key: 'considering',label: '検討中' },
  { key: 'contracted', label: '成約' },
  { key: 'completed',  label: '完了' },
  { key: 'failed',     label: '不成立' },
]

const filteredCases = computed(() =>
  activeTab.value === 'all'
    ? allCases.value
    : allCases.value.filter(c => c.status === activeTab.value),
)

// ── 統計 ──────────────────────────────────────────────────────────────
const stats = computed(() => ({
  total:      allCases.value.length,
  contracted: allCases.value.filter(c => c.status === 'contracted').length,
  consulting: allCases.value.filter(c => c.status === 'consulting').length,
}))

// ── 生命保険フラグ ────────────────────────────────────────────────────
const isLifeInsurance = computed(() => serviceType.value === 'lifeInsurance')

// ── ステータスバッジ ──────────────────────────────────────────────────
const statusClass = (status: string) => {
  switch (status) {
    case 'contracted':  return 'bg-green-100 text-green-700'
    case 'completed':   return 'bg-blue-100 text-blue-700'
    case 'considering': return 'bg-amber-100 text-amber-700'
    case 'consulting':  return 'bg-sky-100 text-sky-700'
    case 'failed':      return 'bg-red-100 text-red-600'
    default:            return 'bg-gray-100 text-gray-500'
  }
}

// ── 日付フォーマット ──────────────────────────────────────────────────
const fmt = (val: any) => {
  if (!val) return '—'
  if (typeof val === 'string') return val.replace(/-/g, '/')
  const d = val?.toDate?.() ?? (val instanceof Date ? val : null)
  if (!d) return '—'
  return d.toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

// ── タブのカウント ────────────────────────────────────────────────────
const tabCount = (key: string) =>
  key === 'all'
    ? allCases.value.length
    : allCases.value.filter(c => c.status === key).length
</script>

<template>
  <div class="p-4 md:p-6 max-w-7xl mx-auto space-y-5">

    <!-- ===== パンくず ===== -->
    <div class="flex items-center gap-2 text-sm text-gray-400 flex-wrap">
      <NuxtLink to="/services" class="hover:text-primary-600 transition-colors">アプリ</NuxtLink>
      <Icon name="heroicons:chevron-right" class="h-3 w-3" />
      <span class="text-gray-600 font-medium">{{ serviceLabel }}</span>
    </div>

    <!-- ===== ページヘッダー ===== -->
    <div class="flex items-start justify-between gap-3 flex-wrap">
      <div>
        <h1 class="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Icon name="heroicons:table-cells" class="h-6 w-6 text-primary-600" />
          {{ serviceLabel }}
        </h1>
        <p class="mt-1 text-sm text-gray-500">
          全顧客対象 — {{ stats.total }} 件の案件
        </p>
      </div>
      <!-- 新規案件作成（顧客選択が先なのでdisabled表示） -->
      <div class="relative group">
        <button
          disabled
          class="btn-primary text-sm flex items-center gap-1.5 opacity-50 cursor-not-allowed"
        >
          <Icon name="heroicons:plus" class="h-4 w-4" />
          新規案件作成
        </button>
        <!-- ツールチップ -->
        <div
          class="absolute right-0 top-full mt-1.5 z-10 hidden group-hover:block
                 bg-gray-800 text-white text-xs rounded-lg px-3 py-1.5 whitespace-nowrap shadow-lg"
        >
          先に顧客を選択してください
          <NuxtLink to="/customers" class="ml-1 underline text-blue-300">顧客一覧</NuxtLink>
        </div>
      </div>
    </div>

    <!-- ===== 統計カード ===== -->
    <div class="grid grid-cols-3 gap-3">
      <div class="card p-4">
        <p class="text-xs text-gray-500 font-medium">件数</p>
        <p class="mt-1 text-2xl font-bold text-gray-900">
          {{ stats.total }}<span class="text-sm font-normal text-gray-400 ml-1">件</span>
        </p>
        <div class="mt-1.5 flex items-center gap-1 text-xs text-gray-400">
          <Icon name="heroicons:clipboard-document-list" class="h-3.5 w-3.5" />
          全ステータス
        </div>
      </div>
      <div class="card p-4">
        <p class="text-xs text-gray-500 font-medium">成約数</p>
        <p class="mt-1 text-2xl font-bold text-green-600">
          {{ stats.contracted }}<span class="text-sm font-normal text-gray-400 ml-1">件</span>
        </p>
        <div class="mt-1.5 flex items-center gap-1 text-xs text-gray-400">
          <Icon name="heroicons:check-badge" class="h-3.5 w-3.5 text-green-400" />
          contracted
        </div>
      </div>
      <div class="card p-4">
        <p class="text-xs text-gray-500 font-medium">相談中</p>
        <p class="mt-1 text-2xl font-bold text-sky-600">
          {{ stats.consulting }}<span class="text-sm font-normal text-gray-400 ml-1">件</span>
        </p>
        <div class="mt-1.5 flex items-center gap-1 text-xs text-gray-400">
          <Icon name="heroicons:chat-bubble-left-right" class="h-3.5 w-3.5 text-sky-400" />
          consulting
        </div>
      </div>
    </div>

    <!-- ===== フィルタータブ ===== -->
    <div class="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-hide">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors"
        :class="activeTab === tab.key
          ? 'bg-primary-600 text-white shadow-sm'
          : 'text-gray-500 hover:bg-gray-100'"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
        <span
          class="text-xs rounded-full px-1.5 py-0.5 font-normal"
          :class="activeTab === tab.key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'"
        >
          {{ tabCount(tab.key) }}
        </span>
      </button>
    </div>

    <!-- ===== データなし ===== -->
    <div v-if="filteredCases.length === 0" class="card p-12 text-center">
      <Icon name="heroicons:document-magnifying-glass" class="h-12 w-12 text-gray-200 mx-auto mb-3" />
      <p class="text-gray-400 font-medium">該当する案件がありません</p>
      <p class="text-sm text-gray-300 mt-1">フィルターを変更してください</p>
    </div>

    <!-- ===== テーブル（PC） ===== -->
    <div v-if="filteredCases.length > 0" class="hidden md:block card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-100 bg-gray-50">
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">顧客名</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">ステータス</th>
              <th v-if="isLifeInsurance" class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">保険種別</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {{ isLifeInsurance ? '保険会社' : '会社名' }}
              </th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {{ isLifeInsurance ? '月額保険料' : '金額' }}
              </th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">対応日</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">成約日</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[160px]">備考</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">詳細</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            <tr
              v-for="c in filteredCases"
              :key="c.id"
              class="hover:bg-gray-50 transition-colors"
            >
              <!-- 顧客名 -->
              <td class="px-4 py-3">
                <NuxtLink
                  :to="`/customers/${c.customerId}`"
                  class="font-medium text-primary-700 hover:underline whitespace-nowrap"
                >
                  {{ c.customerName }}
                </NuxtLink>
                <p class="text-xs text-gray-400 mt-0.5">{{ c.customerNameKana }}</p>
              </td>
              <!-- ステータス -->
              <td class="px-4 py-3 whitespace-nowrap">
                <span class="badge text-xs" :class="statusClass(c.status)">
                  {{ STATUS_LABELS[c.status as keyof typeof STATUS_LABELS] ?? c.status }}
                </span>
              </td>
              <!-- 保険種別（生命保険のみ） -->
              <td v-if="isLifeInsurance" class="px-4 py-3 text-gray-600 whitespace-nowrap">
                {{ c.insuranceType ?? '—' }}
              </td>
              <!-- 会社名 / 保険会社 -->
              <td class="px-4 py-3 text-gray-600 whitespace-nowrap">{{ c.company ?? '—' }}</td>
              <!-- 金額 / 月額保険料 -->
              <td class="px-4 py-3 text-gray-600 whitespace-nowrap">{{ c.amount ?? '—' }}</td>
              <!-- 対応日 -->
              <td class="px-4 py-3 text-gray-500 whitespace-nowrap">{{ fmt(c.date) }}</td>
              <!-- 成約日 -->
              <td class="px-4 py-3 text-gray-500 whitespace-nowrap">{{ fmt(c.contractDate) }}</td>
              <!-- 備考 -->
              <td class="px-4 py-3 text-gray-400 max-w-[200px]">
                <span class="line-clamp-1 text-xs">{{ c.notes ?? '—' }}</span>
              </td>
              <!-- 詳細リンク -->
              <td class="px-4 py-3 whitespace-nowrap">
                <NuxtLink
                  :to="`/customers/${c.customerId}/services/${serviceType}/${c.id}`"
                  class="inline-flex items-center gap-0.5 text-xs text-primary-600 hover:underline"
                >
                  詳細
                  <Icon name="heroicons:arrow-top-right-on-square" class="h-3 w-3" />
                </NuxtLink>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ===== カード一覧（SP） ===== -->
    <div v-if="filteredCases.length > 0" class="md:hidden space-y-3">
      <div
        v-for="c in filteredCases"
        :key="c.id"
        class="card p-4 space-y-3"
      >
        <!-- 顧客名 + ステータス -->
        <div class="flex items-start justify-between gap-3">
          <div>
            <NuxtLink
              :to="`/customers/${c.customerId}`"
              class="font-semibold text-primary-700 hover:underline"
            >
              {{ c.customerName }}
            </NuxtLink>
            <p class="text-xs text-gray-400 mt-0.5">{{ c.customerNameKana }}</p>
          </div>
          <span class="badge text-xs shrink-0" :class="statusClass(c.status)">
            {{ STATUS_LABELS[c.status as keyof typeof STATUS_LABELS] ?? c.status }}
          </span>
        </div>

        <!-- 詳細情報 -->
        <div class="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-gray-600">
          <template v-if="isLifeInsurance && c.insuranceType">
            <div>
              <span class="text-gray-400">保険種別</span>
              <p class="font-medium mt-0.5">{{ c.insuranceType }}</p>
            </div>
          </template>
          <div v-if="c.company">
            <span class="text-gray-400">{{ isLifeInsurance ? '保険会社' : '会社名' }}</span>
            <p class="font-medium mt-0.5">{{ c.company }}</p>
          </div>
          <div v-if="c.amount">
            <span class="text-gray-400">{{ isLifeInsurance ? '月額保険料' : '金額' }}</span>
            <p class="font-medium mt-0.5">{{ c.amount }}</p>
          </div>
          <div v-if="c.date">
            <span class="text-gray-400">対応日</span>
            <p class="font-medium mt-0.5">{{ fmt(c.date) }}</p>
          </div>
          <div v-if="c.contractDate">
            <span class="text-gray-400">成約日</span>
            <p class="font-medium mt-0.5">{{ fmt(c.contractDate) }}</p>
          </div>
        </div>

        <!-- 備考 -->
        <p v-if="c.notes" class="text-xs text-gray-400 line-clamp-2 border-t border-gray-50 pt-2">
          {{ c.notes }}
        </p>

        <!-- 詳細リンク -->
        <div class="flex justify-end pt-1 border-t border-gray-50">
          <NuxtLink
            :to="`/customers/${c.customerId}/services/${serviceType}/${c.id}`"
            class="inline-flex items-center gap-1 text-xs text-primary-600 font-medium hover:underline"
          >
            案件詳細を見る
            <Icon name="heroicons:arrow-right" class="h-3.5 w-3.5" />
          </NuxtLink>
        </div>
      </div>
    </div>

    <!-- ===== 件数フッター ===== -->
    <p class="text-xs text-gray-400 text-right">
      {{ filteredCases.length }} / {{ stats.total }} 件表示中
    </p>

  </div>
</template>
