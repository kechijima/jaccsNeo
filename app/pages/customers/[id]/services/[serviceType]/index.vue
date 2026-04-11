<script setup lang="ts">
import { SERVICE_LABELS, STATUS_LABELS } from '~/types/service'
import type { ServiceCase, ServiceType } from '~/types/service'

definePageMeta({ middleware: ['auth'] })

const route = useRoute()
const customerId = computed(() => route.params.id as string)
const serviceType = computed(() => route.params.serviceType as string)
const { canEditCustomer } = usePermission()

const { fetchCustomer } = useCustomers()
const { fetchCases } = useServices()

const serviceLabel = computed(() => SERVICE_LABELS[serviceType.value] ?? serviceType.value)
const customerName = ref('')
const loading = ref(false)
const error = ref('')

const cases = ref<Array<{
  id: string
  status: string
  statusLabel: string
  assignedFp: string
  date: string
  contractDate: string
  amount: string
  company: string
  notes: string
  updatedAt: string
}>>([])

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
    const [customer, rawCases] = await Promise.all([
      fetchCustomer(customerId.value),
      fetchCases(customerId.value, serviceType.value as ServiceType),
    ])

    customerName.value = customer?.name ?? ''

    cases.value = rawCases.map((c: ServiceCase) => ({
      id: c.id,
      status: c.status,
      statusLabel: STATUS_LABELS[c.status] ?? c.status,
      assignedFp: c.updatedBy ?? '',
      date: c.date ?? '',
      contractDate: c.contractDate ?? '',
      amount: c.amount ?? '',
      company: c.company ?? '',
      notes: c.notes ?? '',
      updatedAt: c.updatedAt ? c.updatedAt.toDate().toLocaleDateString('ja-JP') : '',
    }))
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

    <!-- パンくず -->
    <div class="flex items-center gap-2 text-sm text-gray-400 flex-wrap">
      <NuxtLink to="/customers">顧客管理</NuxtLink>
      <Icon name="heroicons:chevron-right" class="h-3 w-3" />
      <NuxtLink :to="`/customers/${customerId}`">{{ customerName }}</NuxtLink>
      <Icon name="heroicons:chevron-right" class="h-3 w-3" />
      <NuxtLink :to="`/customers/${customerId}/services`">サービス</NuxtLink>
      <Icon name="heroicons:chevron-right" class="h-3 w-3" />
      <span class="text-gray-600">{{ serviceLabel }}</span>
    </div>

    <!-- ヘッダー -->
    <div class="flex items-start justify-between gap-3">
      <div>
        <h1 class="text-xl font-bold text-gray-900">{{ serviceLabel }}</h1>
        <p class="text-sm text-gray-500 mt-0.5">{{ customerName }} さん — {{ cases.length }}件の案件</p>
      </div>
      <NuxtLink
        v-if="canEditCustomer"
        :to="`/customers/${customerId}/services/${serviceType}/new`"
        class="btn-primary text-sm flex items-center gap-1.5 shrink-0"
      >
        <Icon name="heroicons:plus" class="h-4 w-4" />
        案件を追加
      </NuxtLink>
    </div>

    <!-- 案件一覧 -->
    <div v-if="cases.length === 0" class="card p-10 text-center">
      <Icon name="heroicons:document-text" class="h-10 w-10 text-gray-300 mx-auto mb-2" />
      <p class="text-sm text-gray-400">案件がまだありません</p>
      <NuxtLink
        v-if="canEditCustomer"
        :to="`/customers/${customerId}/services/${serviceType}/new`"
        class="mt-3 inline-block btn-primary text-sm"
      >
        最初の案件を作成
      </NuxtLink>
    </div>

    <div v-else class="space-y-3">
      <NuxtLink
        v-for="c in cases"
        :key="c.id"
        :to="`/customers/${customerId}/services/${serviceType}/${c.id}`"
        class="card p-5 block hover:shadow-md transition"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="space-y-2 min-w-0">
            <div class="flex items-center gap-2">
              <span class="badge text-xs" :class="statusClass(c.status)">{{ c.statusLabel }}</span>
              <span v-if="c.company" class="text-sm font-medium text-gray-900">{{ c.company }}</span>
            </div>
            <div class="text-sm text-gray-600 space-y-0.5">
              <p v-if="c.contractDate">成約日: {{ c.contractDate }}</p>
              <p v-if="c.amount">金額: {{ c.amount }}</p>
              <p v-if="c.notes" class="text-gray-400 text-xs line-clamp-1">{{ c.notes }}</p>
            </div>
          </div>
          <div class="text-right shrink-0">
            <p class="text-xs text-gray-400">担当: {{ c.assignedFp }}</p>
            <p class="text-xs text-gray-400 mt-1">更新: {{ c.updatedAt }}</p>
          </div>
        </div>
      </NuxtLink>
    </div>

  </div>
</template>
