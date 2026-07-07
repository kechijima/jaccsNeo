<script setup lang="ts">
import { SERVICE_LABELS } from '~/types/service'
import { useCustomerStore } from '~/composables/useCustomerStore'
import { useAppServices } from '~/composables/useAppServices'

definePageMeta({ middleware: ['auth'] })

const route = useRoute()
const customerId = computed(() => route.params.id as string)
const serviceType = computed(() => route.params.serviceType as string)
const { canEditCustomer } = usePermission()

const serviceLabel = computed(() => SERVICE_LABELS[serviceType.value] ?? serviceType.value)

const { getById } = useCustomerStore()
const { getServiceValue } = useAppServices()
const customer = getById(customerId)
const customerName = computed(() => customer.value?.name ?? '')
const canEdit = computed(() => customer.value ? canEditCustomer(customer.value.assignedFpId ?? '') : false)

// パーソナルデータのservices値から対応状況を1件の案件として表示
const cases = computed(() => {
  const value = getServiceValue(customer.value, serviceType.value)
  if (!value) return []
  return [{
    id: `${customerId.value}-${serviceType.value}`,
    status: value,
    statusLabel: value,
    assignedFp: customer.value?.assignedFpName ?? '',
    contractDate: '',
    amount: '',
    company: '',
    notes: '',
    updatedAt: '',
  }]
})

const statusClass = (status: string) => {
  if (/成約|○|済/.test(status)) return 'bg-green-100 text-green-700'
  if (/検討/.test(status))       return 'bg-amber-100 text-amber-700'
  if (/相談|確認/.test(status))  return 'bg-sky-100 text-sky-700'
  if (/不成立|見送/.test(status)) return 'bg-red-100 text-red-600'
  return 'bg-gray-100 text-gray-600'
}
</script>

<template>
  <div class="p-4 md:p-6 max-w-4xl mx-auto space-y-5">

    <!-- パンくず -->
    <div class="flex items-center gap-2 text-sm text-gray-400 flex-wrap">
      <NuxtLink to="/personal-data">パーソナルデータ</NuxtLink>
      <Icon name="heroicons:chevron-right" class="h-3 w-3" />
      <NuxtLink :to="`/customers/${customerId}`">{{ customerName }}</NuxtLink>
      <Icon name="heroicons:chevron-right" class="h-3 w-3" />
      <NuxtLink :to="`/customers/${customerId}/services`">アプリ連携</NuxtLink>
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
        v-if="canEdit"
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
        v-if="canEdit"
        :to="`/customers/${customerId}/services/${serviceType}/new`"
        class="mt-3 inline-block btn-primary text-sm"
      >
        最初の案件を作成
      </NuxtLink>
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="c in cases"
        :key="c.id"
        class="card p-5 block"
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
            <p class="text-xs text-gray-400">担当: {{ c.assignedFp || '—' }}</p>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>
