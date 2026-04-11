<script setup lang="ts">
import { SERVICE_LABELS, STATUS_LABELS } from '~/types/service'
import { MOCK_CUSTOMERS, MOCK_SERVICE_CASES } from '~/data/mock'

definePageMeta({ middleware: ['auth'] })

const route = useRoute()
const customerId = computed(() => route.params.id as string)
const serviceType = computed(() => route.params.serviceType as string)
const caseId = computed(() => route.params.caseId as string)
const { canEditCustomer } = usePermission()

const serviceLabel = computed(() => SERVICE_LABELS[serviceType.value] ?? serviceType.value)

const customer = computed(() => MOCK_CUSTOMERS.find(c => c.id === customerId.value))
const customerName = computed(() => customer.value?.name ?? '')

const rawCase = computed(() =>
  (MOCK_SERVICE_CASES[customerId.value] ?? {})[serviceType.value]?.find((c: any) => c.id === caseId.value)
)

const caseData = computed(() => {
  const raw = rawCase.value
  if (!raw) return null
  return {
    status: raw.status ?? '',
    statusLabel: STATUS_LABELS[raw.status] ?? raw.status ?? '',
    company: raw.company ?? '',
    date: raw.date ?? '',
    contractDate: raw.contractDate ?? '',
    amount: raw.amount ?? '',
    assignedFp: raw.updatedBy ?? '',
    notes: raw.notes ?? '',
    insuranceType: raw.insuranceType ?? '',
    insuranceAmount: raw.insuranceAmount ?? '',
    paymentMethod: raw.paymentMethod ?? '',
    expiryDate: raw.expiryDate ?? '',
    createdAt: raw.createdAt ? raw.createdAt.toDate().toLocaleDateString('ja-JP') : '',
    updatedAt: raw.updatedAt ? raw.updatedAt.toDate().toLocaleDateString('ja-JP') : '',
  }
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

const handleDelete = () => {
  if (!confirm('この案件を削除してよろしいですか？')) return
  alert('モックのため削除できません')
}
</script>

<template>
  <div class="p-4 md:p-6 max-w-3xl mx-auto space-y-5">

    <!-- パンくず -->
    <div class="flex items-center gap-2 text-sm text-gray-400 flex-wrap">
      <NuxtLink :to="`/customers/${customerId}`">{{ customerName }}</NuxtLink>
      <Icon name="heroicons:chevron-right" class="h-3 w-3" />
      <NuxtLink :to="`/customers/${customerId}/services/${serviceType}`">{{ serviceLabel }}</NuxtLink>
      <Icon name="heroicons:chevron-right" class="h-3 w-3" />
      <span class="text-gray-600">案件詳細</span>
    </div>

    <!-- 案件が見つからない場合 -->
    <div v-if="!caseData" class="card p-10 text-center">
      <Icon name="heroicons:exclamation-circle" class="h-10 w-10 text-gray-300 mx-auto mb-2" />
      <p class="text-sm text-gray-400">案件が見つかりません</p>
    </div>

    <template v-else>
      <!-- ヘッダー -->
      <div class="flex items-start justify-between gap-3">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <span class="badge" :class="statusClass(caseData.status)">{{ caseData.statusLabel }}</span>
            <h1 class="text-xl font-bold text-gray-900">{{ caseData.company || serviceLabel }}</h1>
          </div>
          <p class="text-sm text-gray-500">{{ customerName }} さん / {{ serviceLabel }}</p>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <NuxtLink
            v-if="canEditCustomer"
            :to="`/customers/${customerId}/services/${serviceType}/${caseId}/edit`"
            class="btn-secondary text-sm flex items-center gap-1.5"
          >
            <Icon name="heroicons:pencil" class="h-4 w-4" />
            編集
          </NuxtLink>
          <button
            v-if="canEditCustomer"
            class="btn-danger text-sm flex items-center gap-1.5"
            @click="handleDelete"
          >
            <Icon name="heroicons:trash" class="h-4 w-4" />
          </button>
        </div>
      </div>

      <!-- 基本情報 -->
      <div class="card p-5">
        <h2 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Icon name="heroicons:document-text" class="h-5 w-5 text-primary-600" />
          案件情報
        </h2>
        <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div v-if="caseData.contractDate">
            <dt class="text-gray-500">成約日</dt>
            <dd class="font-medium text-gray-900">{{ caseData.contractDate }}</dd>
          </div>
          <div v-if="caseData.date">
            <dt class="text-gray-500">対応開始日</dt>
            <dd class="font-medium text-gray-900">{{ caseData.date }}</dd>
          </div>
          <div v-if="caseData.amount">
            <dt class="text-gray-500">金額・保険料</dt>
            <dd class="font-medium text-gray-900">{{ caseData.amount }}</dd>
          </div>
          <div v-if="caseData.insuranceType">
            <dt class="text-gray-500">保険種別</dt>
            <dd class="font-medium text-gray-900">{{ caseData.insuranceType }}</dd>
          </div>
          <div v-if="caseData.insuranceAmount">
            <dt class="text-gray-500">保険金額</dt>
            <dd class="font-medium text-gray-900">{{ caseData.insuranceAmount }}</dd>
          </div>
          <div v-if="caseData.paymentMethod">
            <dt class="text-gray-500">支払方法</dt>
            <dd class="font-medium text-gray-900">{{ caseData.paymentMethod }}</dd>
          </div>
          <div v-if="caseData.expiryDate">
            <dt class="text-gray-500">満期日</dt>
            <dd class="font-medium text-gray-900">{{ caseData.expiryDate }}</dd>
          </div>
          <div>
            <dt class="text-gray-500">担当FP</dt>
            <dd class="font-medium text-gray-900">{{ caseData.assignedFp }}</dd>
          </div>
          <div class="sm:col-span-2">
            <dt class="text-gray-500">作成日 / 更新日</dt>
            <dd class="font-medium text-gray-900">{{ caseData.createdAt }} / {{ caseData.updatedAt }}</dd>
          </div>
          <div v-if="caseData.notes" class="sm:col-span-2">
            <dt class="text-gray-500">備考・メモ</dt>
            <dd class="font-medium text-gray-900 whitespace-pre-line">{{ caseData.notes }}</dd>
          </div>
        </dl>
      </div>
    </template>

  </div>
</template>
