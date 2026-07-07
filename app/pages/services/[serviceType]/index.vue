<script setup lang="ts">
import { SERVICE_LABELS } from '~/types/service'
import { useAppServices } from '~/composables/useAppServices'
import { useLifeInsuranceCases } from '~/composables/useLifeInsuranceCases'

definePageMeta({ middleware: ['auth'] })

const route = useRoute()
const serviceType = computed(() => route.params.serviceType as string)
const serviceLabel = computed(() => SERVICE_LABELS[serviceType.value] ?? serviceType.value)
const isLifeInsurance = computed(() => serviceType.value === 'lifeInsurance')

// ── 生命保険：専用案件データ（kintone「生命保険」アプリ連動） ──────────
const { cases: liCases } = useLifeInsuranceCases()

// ── その他サービス：パーソナルデータの対応状況から導出 ──────────────
const { getCasesForType } = useAppServices()
const genericCases = computed(() => getCasesForType(serviceType.value))

const totalCount = computed(() => isLifeInsurance.value ? liCases.value.length : genericCases.value.length)

// ── 検索 ──────────────────────────────────────────────────────────────
const searchQuery = ref('')

const filteredGenericCases = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return genericCases.value
  return genericCases.value.filter(c =>
    c.customerName.toLowerCase().includes(q) ||
    c.customerNameKana.toLowerCase().includes(q) ||
    c.status.toLowerCase().includes(q),
  )
})

const filteredLiCases = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return liCases.value
  return liCases.value.filter(c =>
    c.name.toLowerCase().includes(q) ||
    (c.nameKana ?? '').toLowerCase().includes(q) ||
    (c.progressStatus ?? '').toLowerCase().includes(q) ||
    (c.assignedFpName ?? '').toLowerCase().includes(q),
  )
})

// ── ステータスの色（値のパターンで判定） ──────────────────────────────
const statusClass = (status: string) => {
  if (/成約|○|済/.test(status) && !/未成約/.test(status)) return 'bg-green-100 text-green-700'
  if (/未成約|不成立|見送/.test(status)) return 'bg-red-100 text-red-600'
  if (/検討/.test(status))       return 'bg-amber-100 text-amber-700'
  if (/相談|確認/.test(status))  return 'bg-sky-100 text-sky-700'
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
          {{ isLifeInsurance ? 'kintone連動' : 'パーソナルデータ連動' }} — {{ totalCount }} 件の案件
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
        :placeholder="isLifeInsurance ? '氏名・フリガナ・担当者・進行状況で検索...' : '顧客名・フリガナ・対応状況で検索...'"
        class="input-field pl-9 text-sm"
      />
    </div>

    <!-- ========================================================= -->
    <!-- 生命保険：専用の詳細案件テーブル                             -->
    <!-- ========================================================= -->
    <template v-if="isLifeInsurance">

      <div v-if="filteredLiCases.length === 0" class="card p-12 text-center">
        <Icon name="heroicons:document-magnifying-glass" class="h-12 w-12 text-gray-200 mx-auto mb-3" />
        <p class="text-gray-400 font-medium">該当する案件がありません</p>
      </div>

      <!-- テーブル（PC） -->
      <div v-if="filteredLiCases.length > 0" class="hidden md:block card overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-gray-100 bg-gray-50">
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">氏名</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">新規/乗換</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[220px]">契約・プランニング内容</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">進行状況</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">ワン/ツー/フォロー</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">担当</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">詳細</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-50">
              <tr v-for="c in filteredLiCases" :key="c.id" class="hover:bg-gray-50 transition-colors">
                <td class="px-4 py-3">
                  <NuxtLink
                    v-if="c.customerId"
                    :to="`/customers/${c.customerId}`"
                    class="font-medium text-primary-700 hover:underline whitespace-nowrap"
                  >{{ c.name }}</NuxtLink>
                  <span v-else class="font-medium text-gray-900 whitespace-nowrap">{{ c.name }}</span>
                  <p class="text-xs text-gray-400 mt-0.5">{{ c.nameKana }}</p>
                </td>
                <td class="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">{{ c.newOrSwitch || '—' }}</td>
                <td class="px-4 py-3 text-gray-600 text-xs max-w-[260px]">
                  <span class="line-clamp-2 whitespace-pre-line">{{ c.contractContent || c.planningContent || '—' }}</span>
                </td>
                <td class="px-4 py-3 whitespace-nowrap">
                  <span v-if="c.progressStatus" class="badge text-xs" :class="statusClass(c.progressStatus)">{{ c.progressStatus }}</span>
                  <span v-else class="text-xs text-gray-300">—</span>
                </td>
                <td class="px-4 py-3 text-gray-500 text-xs max-w-[180px]">
                  <span class="line-clamp-2 whitespace-pre-line">{{ [c.oneStatus, c.twoStatus, c.followStatus].filter(Boolean).join(' / ') || '—' }}</span>
                </td>
                <td class="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{{ c.assignedFpName || '—' }}</td>
                <td class="px-4 py-3 whitespace-nowrap">
                  <NuxtLink
                    v-if="c.customerId"
                    :to="`/customers/${c.customerId}`"
                    class="inline-flex items-center gap-0.5 text-xs text-primary-600 hover:underline"
                  >
                    顧客詳細
                    <Icon name="heroicons:arrow-top-right-on-square" class="h-3 w-3" />
                  </NuxtLink>
                  <span v-else class="text-xs text-gray-300">未連携</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- カード一覧（SP） -->
      <div v-if="filteredLiCases.length > 0" class="md:hidden space-y-3">
        <div v-for="c in filteredLiCases" :key="c.id" class="card p-4 space-y-3">
          <div class="flex items-start justify-between gap-3">
            <div>
              <NuxtLink v-if="c.customerId" :to="`/customers/${c.customerId}`" class="font-semibold text-primary-700 hover:underline">{{ c.name }}</NuxtLink>
              <span v-else class="font-semibold text-gray-900">{{ c.name }}</span>
              <p class="text-xs text-gray-400 mt-0.5">{{ c.nameKana }}</p>
            </div>
            <span v-if="c.progressStatus" class="badge text-xs shrink-0" :class="statusClass(c.progressStatus)">{{ c.progressStatus }}</span>
          </div>
          <div class="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-gray-600">
            <div v-if="c.newOrSwitch">
              <span class="text-gray-400">新規/乗換</span>
              <p class="font-medium mt-0.5">{{ c.newOrSwitch }}</p>
            </div>
            <div v-if="c.assignedFpName">
              <span class="text-gray-400">担当</span>
              <p class="font-medium mt-0.5">{{ c.assignedFpName }}</p>
            </div>
          </div>
          <p v-if="c.contractContent || c.planningContent" class="text-xs text-gray-500 line-clamp-2 whitespace-pre-line border-t border-gray-50 pt-2">
            {{ c.contractContent || c.planningContent }}
          </p>
          <div class="flex justify-end pt-1 border-t border-gray-50">
            <NuxtLink
              v-if="c.customerId"
              :to="`/customers/${c.customerId}`"
              class="inline-flex items-center gap-1 text-xs text-primary-600 font-medium hover:underline"
            >
              案件詳細を見る
              <Icon name="heroicons:arrow-right" class="h-3.5 w-3.5" />
            </NuxtLink>
            <span v-else class="text-xs text-gray-300">パーソナルデータ未連携</span>
          </div>
        </div>
      </div>

      <p class="text-xs text-gray-400 text-right">{{ filteredLiCases.length }} / {{ liCases.length }} 件表示中</p>

    </template>

    <!-- ========================================================= -->
    <!-- その他アプリ：パーソナルデータ対応状況の簡易一覧              -->
    <!-- ========================================================= -->
    <template v-else>

      <div v-if="filteredGenericCases.length === 0" class="card p-12 text-center">
        <Icon name="heroicons:document-magnifying-glass" class="h-12 w-12 text-gray-200 mx-auto mb-3" />
        <p class="text-gray-400 font-medium">該当する顧客がありません</p>
        <p class="text-sm text-gray-300 mt-1">パーソナルデータでこのサービスに値が入力されている顧客が表示されます</p>
      </div>

      <!-- テーブル（PC） -->
      <div v-if="filteredGenericCases.length > 0" class="hidden md:block card overflow-hidden">
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
                v-for="c in filteredGenericCases"
                :key="c.id"
                class="hover:bg-gray-50 transition-colors"
              >
                <td class="px-4 py-3">
                  <NuxtLink
                    :to="`/customers/${c.customerId}`"
                    class="font-medium text-primary-700 hover:underline whitespace-nowrap"
                  >
                    {{ c.customerName }}
                  </NuxtLink>
                  <p class="text-xs text-gray-400 mt-0.5">{{ c.customerNameKana }}</p>
                </td>
                <td class="px-4 py-3">
                  <span class="badge text-xs whitespace-pre-line" :class="statusClass(c.status)">
                    {{ c.status.length > 60 ? c.status.slice(0, 60) + '...' : c.status }}
                  </span>
                </td>
                <td class="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{{ c.assignedFpName || '—' }}</td>
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

      <!-- カード一覧（SP） -->
      <div v-if="filteredGenericCases.length > 0" class="md:hidden space-y-3">
        <div
          v-for="c in filteredGenericCases"
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

      <p class="text-xs text-gray-400 text-right">
        {{ filteredGenericCases.length }} / {{ genericCases.length }} 件表示中
      </p>

    </template>

  </div>
</template>
