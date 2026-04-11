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

const serviceCategories = computed(() => {
  const summaries = getMockServiceSummaries(customerId.value)
  const summaryMap = new Map(summaries.map(s => [s.serviceType, s]))

  const buildService = (key: string, label: string) => {
    const summary = summaryMap.get(key)
    const status = summary?.latestStatus ?? 'none'
    const statusLabel = status !== 'none'
      ? (STATUS_LABELS[status as ServiceStatus] ?? '対応なし')
      : '対応なし'
    const date = summary?.latestUpdatedAt
      ? summary.latestUpdatedAt.toDate().toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit' })
      : ''
    return { key, label, status, statusLabel, date, note: '' }
  }

  return [
    {
      label: '保険',
      icon: 'heroicons:shield-check',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      services: [
        buildService('lifeInsurance', SERVICE_LABELS.lifeInsurance),
        buildService('fireInsurance', SERVICE_LABELS.fireInsurance),
        buildService('autoInsurance', SERVICE_LABELS.autoInsurance),
      ],
    },
    {
      label: '不動産',
      icon: 'heroicons:home',
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      services: [
        buildService('realEstatePurchase', SERVICE_LABELS.realEstatePurchase),
        buildService('realEstateSale', SERVICE_LABELS.realEstateSale),
        buildService('realEstateRental', SERVICE_LABELS.realEstateRental),
        buildService('homeLoan', SERVICE_LABELS.homeLoan),
      ],
    },
    {
      label: 'キャリア',
      icon: 'heroicons:briefcase',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      services: [
        buildService('jobChange', SERVICE_LABELS.jobChange),
        buildService('seniorPlanning', SERVICE_LABELS.seniorPlanning),
      ],
    },
    {
      label: '通信',
      icon: 'heroicons:wifi',
      color: 'text-sky-600',
      bgColor: 'bg-sky-50',
      services: [
        buildService('communication', SERVICE_LABELS.communication),
        buildService('hikari', SERVICE_LABELS.hikari),
      ],
    },
    {
      label: 'ライフ',
      icon: 'heroicons:sparkles',
      color: 'text-rose-600',
      bgColor: 'bg-rose-50',
      services: [
        buildService('moving', SERVICE_LABELS.moving),
        buildService('renovation', SERVICE_LABELS.renovation),
        buildService('travel', SERVICE_LABELS.travel),
        buildService('bridal', SERVICE_LABELS.bridal),
      ],
    },
    {
      label: '法務',
      icon: 'heroicons:scale',
      color: 'text-gray-600',
      bgColor: 'bg-gray-100',
      services: [
        buildService('legal', SERVICE_LABELS.legal),
        buildService('inheritance', SERVICE_LABELS.inheritance),
        buildService('companySetup', SERVICE_LABELS.companySetup),
      ],
    },
  ]
})

const statusClass = (status: string) => {
  switch (status) {
    case 'contracted': return 'bg-green-100 text-green-700'
    case 'completed': return 'bg-blue-100 text-blue-700'
    case 'considering': return 'bg-amber-100 text-amber-700'
    case 'consulting': return 'bg-sky-100 text-sky-700'
    case 'failed': return 'bg-red-100 text-red-600'
    default: return 'bg-gray-100 text-gray-500'
  }
}
</script>

<template>
  <div class="p-4 md:p-6 max-w-4xl mx-auto space-y-5">

    <!-- ヘッダー -->
    <div class="flex items-center gap-2 text-sm text-gray-400">
      <NuxtLink to="/customers">顧客管理</NuxtLink>
      <Icon name="heroicons:chevron-right" class="h-3 w-3" />
      <NuxtLink :to="`/customers/${customerId}`">{{ customerName }}</NuxtLink>
      <Icon name="heroicons:chevron-right" class="h-3 w-3" />
      <span class="text-gray-600">サービス対応状況</span>
    </div>

    <div class="flex items-start justify-between gap-3">
      <div>
        <h1 class="text-xl font-bold text-gray-900">サービス対応状況</h1>
        <p class="text-sm text-gray-500 mt-0.5">{{ customerName }} さん</p>
      </div>
    </div>

    <!-- カテゴリ別サービス一覧 -->
    <div v-for="cat in serviceCategories" :key="cat.label" class="card overflow-hidden">
      <div class="flex items-center gap-2.5 px-5 py-3 border-b border-gray-100" :class="cat.bgColor">
        <Icon :name="cat.icon" class="h-5 w-5" :class="cat.color" />
        <h2 class="font-semibold text-gray-800">{{ cat.label }}</h2>
      </div>

      <div class="divide-y divide-gray-50">
        <div
          v-for="svc in cat.services"
          :key="svc.key"
          class="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition group"
        >
          <!-- 行全体をクリックでサービス詳細へ -->
          <NuxtLink
            :to="`/customers/${customerId}/services/${svc.key}`"
            class="flex items-center gap-3 min-w-0 flex-1"
          >
            <span class="badge text-xs shrink-0" :class="statusClass(svc.status)">{{ svc.statusLabel }}</span>
            <span class="text-sm font-medium text-gray-900 truncate group-hover:text-primary-600 transition-colors">{{ svc.label }}</span>
            <span v-if="svc.date" class="text-xs text-gray-400 shrink-0 hidden sm:inline">{{ svc.date }}</span>
            <Icon name="heroicons:chevron-right" class="h-3.5 w-3.5 text-gray-300 shrink-0 ml-auto" />
          </NuxtLink>
          <!-- 追加ボタンは別リンク -->
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
