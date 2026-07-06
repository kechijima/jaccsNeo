<script setup lang="ts">
import { SERVICE_LABELS } from '~/types/service'
import { useAppServices } from '~/composables/useAppServices'

definePageMeta({ middleware: ['auth'] })

const route = useRoute()
const serviceType = computed(() => route.params.serviceType as string)
const serviceLabel = computed(() => SERVICE_LABELS[serviceType.value] ?? serviceType.value)

// ── パーソナルデータから対応顧客を取得 ────────────────────────────────
const { getCasesForType } = useAppServices()
const allCases = computed(() => getCasesForType(serviceType.value))

// ── 検索 ──────────────────────────────────────────────────────────────
const searchQuery = ref('')

const filteredCases = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return allCases.value
  return allCases.value.filter(c =>
    c.customerName.toLowerCase().includes(q) ||
    c.customerNameKana.toLowerCase().includes(q) ||
    c.status.toLowerCase().includes(q),
  )
})

// ── ステータスの色（値のパターンで判定） ──────────────────────────────
const statusClass = (status: string) => {
  if (/成約|○|済/.test(status)) return 'bg-green-100 text-green-700'
  if (/検討/.test(status))       return 'bg-amber-100 text-amber-700'
  if (/相談|確認/.test(status))  return 'bg-sky-100 text-sky-700'
  if (/不成立|見送/.test(status)) return 'bg-red-100 text-red-600'
  return 'bg-gray-100 text-gray-600'
}
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
          パーソナルデータ連動 — {{ allCases.length }} 件の対応顧客
        </p>
      </div>
      <NuxtLink to="/personal-data" class="btn-secondary text-sm flex items-center gap-1.5">
        <Icon name="heroicons:identification" class="h-4 w-4" />
        パーソナルデータへ
      </NuxtLink>
    </div>

    <!-- ===== 検索 ===== -->
    <div class="relative max-w-md">
      <Icon name="heroicons:magnifying-glass" class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
      <input
        v-model="searchQuery"
        type="text"
        placeholder="顧客名・フリガナ・対応状況で検索..."
        class="input-field pl-9 text-sm"
      />
    </div>

    <!-- ===== データなし ===== -->
    <div v-if="filteredCases.length === 0" class="card p-12 text-center">
      <Icon name="heroicons:document-magnifying-glass" class="h-12 w-12 text-gray-200 mx-auto mb-3" />
      <p class="text-gray-400 font-medium">該当する顧客がありません</p>
      <p class="text-sm text-gray-300 mt-1">パーソナルデータでこのサービスに値が入力されている顧客が表示されます</p>
    </div>

    <!-- ===== テーブル（PC） ===== -->
    <div v-if="filteredCases.length > 0" class="hidden md:block card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-100 bg-gray-50">
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">顧客名</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[200px]">対応状況</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">担当</th>
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
              <!-- 対応状況 -->
              <td class="px-4 py-3">
                <span class="badge text-xs whitespace-pre-line" :class="statusClass(c.status)">
                  {{ c.status.length > 60 ? c.status.slice(0, 60) + '...' : c.status }}
                </span>
              </td>
              <!-- 担当 -->
              <td class="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{{ c.assignedFpName || '—' }}</td>
              <!-- 詳細リンク -->
              <td class="px-4 py-3 whitespace-nowrap">
                <NuxtLink
                  :to="`/customers/${c.customerId}`"
                  class="inline-flex items-center gap-0.5 text-xs text-primary-600 hover:underline"
                >
                  顧客詳細
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
        </div>

        <p class="text-xs rounded-lg p-2" :class="statusClass(c.status)">
          {{ c.status.length > 120 ? c.status.slice(0, 120) + '...' : c.status }}
        </p>

        <div class="flex items-center justify-between pt-1 border-t border-gray-50">
          <span class="text-xs text-gray-400">{{ c.assignedFpName || '—' }}</span>
          <NuxtLink
            :to="`/customers/${c.customerId}`"
            class="inline-flex items-center gap-1 text-xs text-primary-600 font-medium hover:underline"
          >
            顧客詳細を見る
            <Icon name="heroicons:arrow-right" class="h-3.5 w-3.5" />
          </NuxtLink>
        </div>
      </div>
    </div>

    <!-- ===== 件数フッター ===== -->
    <p class="text-xs text-gray-400 text-right">
      {{ filteredCases.length }} / {{ allCases.length }} 件表示中
    </p>

  </div>
</template>
