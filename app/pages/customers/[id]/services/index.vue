<script setup lang="ts">
import { SERVICE_LABELS, STATUS_LABELS } from '~/types/service'
import type { ServiceStatus } from '~/types/service'

definePageMeta({ middleware: ['auth'] })

const route = useRoute()
const customerId = computed(() => route.params.id as string)
const { canEditCustomer } = usePermission()

const { fetchCustomer } = useCustomers()
const { fetchAllServiceSummaries } = useServices()

const customerName = ref('')
const loading = ref(false)
const error = ref('')

// サービスカテゴリ定義（UIはそのまま、statusはFirestoreデータで上書き）
const serviceCategories = ref([
  {
    label: '保険',
    icon: 'heroicons:shield-check',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    services: [
      { key: 'lifeInsurance', label: SERVICE_LABELS.lifeInsurance, status: 'none', statusLabel: '対応なし', date: '', note: '' },
      { key: 'fireInsurance', label: SERVICE_LABELS.fireInsurance, status: 'none', statusLabel: '対応なし', date: '', note: '' },
      { key: 'autoInsurance', label: SERVICE_LABELS.autoInsurance, status: 'none', statusLabel: '対応なし', date: '', note: '' },
    ],
  },
  {
    label: '不動産',
    icon: 'heroicons:home',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    services: [
      { key: 'realEstatePurchase', label: SERVICE_LABELS.realEstatePurchase, status: 'none', statusLabel: '対応なし', date: '', note: '' },
      { key: 'realEstateSale', label: SERVICE_LABELS.realEstateSale, status: 'none', statusLabel: '対応なし', date: '', note: '' },
      { key: 'realEstateRental', label: SERVICE_LABELS.realEstateRental, status: 'none', statusLabel: '対応なし', date: '', note: '' },
      { key: 'homeLoan', label: SERVICE_LABELS.homeLoan, status: 'none', statusLabel: '対応なし', date: '', note: '' },
    ],
  },
  {
    label: 'キャリア',
    icon: 'heroicons:briefcase',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    services: [
      { key: 'jobChange', label: SERVICE_LABELS.jobChange, status: 'none', statusLabel: '対応なし', date: '', note: '' },
      { key: 'seniorPlanning', label: SERVICE_LABELS.seniorPlanning, status: 'none', statusLabel: '対応なし', date: '', note: '' },
    ],
  },
  {
    label: '通信',
    icon: 'heroicons:wifi',
    color: 'text-sky-600',
    bgColor: 'bg-sky-50',
    services: [
      { key: 'communication', label: SERVICE_LABELS.communication, status: 'none', statusLabel: '対応なし', date: '', note: '' },
      { key: 'hikari', label: SERVICE_LABELS.hikari, status: 'none', statusLabel: '対応なし', date: '', note: '' },
    ],
  },
  {
    label: 'ライフ',
    icon: 'heroicons:sparkles',
    color: 'text-rose-600',
    bgColor: 'bg-rose-50',
    services: [
      { key: 'moving', label: SERVICE_LABELS.moving, status: 'none', statusLabel: '対応なし', date: '', note: '' },
      { key: 'renovation', label: SERVICE_LABELS.renovation, status: 'none', statusLabel: '対応なし', date: '', note: '' },
      { key: 'travel', label: SERVICE_LABELS.travel, status: 'none', statusLabel: '対応なし', date: '', note: '' },
      { key: 'bridal', label: SERVICE_LABELS.bridal, status: 'none', statusLabel: '対応なし', date: '', note: '' },
    ],
  },
  {
    label: '法務',
    icon: 'heroicons:scale',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    services: [
      { key: 'legal', label: SERVICE_LABELS.legal, status: 'none', statusLabel: '対応なし', date: '', note: '' },
      { key: 'inheritance', label: SERVICE_LABELS.inheritance, status: 'none', statusLabel: '対応なし', date: '', note: '' },
      { key: 'companySetup', label: SERVICE_LABELS.companySetup, status: 'none', statusLabel: '対応なし', date: '', note: '' },
    ],
  },
])

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

onMounted(async () => {
  loading.value = true
  error.value = ''
  try {
    const [customer, summaries] = await Promise.all([
      fetchCustomer(customerId.value),
      fetchAllServiceSummaries(customerId.value),
    ])

    customerName.value = customer?.name ?? ''

    // サマリーデータをカテゴリのservicesに反映
    const summaryMap = new Map(summaries.map(s => [s.serviceType, s]))

    for (const cat of serviceCategories.value) {
      for (const svc of cat.services) {
        const summary = summaryMap.get(svc.key as any)
        if (summary && summary.latestStatus) {
          svc.status = summary.latestStatus
          svc.statusLabel = STATUS_LABELS[summary.latestStatus as ServiceStatus] ?? '対応なし'
          svc.date = summary.latestUpdatedAt
            ? summary.latestUpdatedAt.toDate().toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit' })
            : ''
        }
      }
    }
  }
  catch (e: any) {
    error.value = e.message ?? 'データの取得に失敗しました'
  }
  finally {
    loading.value = false
  }
})
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
