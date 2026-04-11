<script setup lang="ts">
import { SERVICE_LABELS, STATUS_LABELS } from '~/types/service'
import type { ServiceType } from '~/types/service'

definePageMeta({ middleware: ['auth'] })

const route = useRoute()
const customerId = computed(() => route.params.id as string)
const serviceType = computed(() => route.params.serviceType as string)
const caseId = computed(() => route.params.caseId as string)
const { canEditCustomer } = usePermission()

const { fetchCustomer } = useCustomers()
const { fetchCase, deleteCase } = useServices()

const serviceLabel = computed(() => SERVICE_LABELS[serviceType.value] ?? serviceType.value)
const customerName = ref('')
const loading = ref(false)
const error = ref('')

const caseData = ref<{
  status: string
  statusLabel: string
  company: string
  date: string
  contractDate: string
  amount: string
  assignedFp: string
  notes: string
  attachments: { name: string; size: string; uploadedAt: string }[]
  history: { date: string; action: string; user: string }[]
  createdAt: string
  updatedAt: string
}>({
  status: '',
  statusLabel: '',
  company: '',
  date: '',
  contractDate: '',
  amount: '',
  assignedFp: '',
  notes: '',
  attachments: [],
  history: [],
  createdAt: '',
  updatedAt: '',
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

onMounted(async () => {
  loading.value = true
  error.value = ''
  try {
    const [customer, raw] = await Promise.all([
      fetchCustomer(customerId.value),
      fetchCase(customerId.value, serviceType.value as ServiceType, caseId.value),
    ])

    customerName.value = customer?.name ?? ''

    if (raw) {
      caseData.value = {
        status: raw.status,
        statusLabel: STATUS_LABELS[raw.status] ?? raw.status,
        company: raw.company ?? '',
        date: raw.date ?? '',
        contractDate: raw.contractDate ?? '',
        amount: raw.amount ?? '',
        assignedFp: raw.updatedBy ?? '',
        notes: raw.notes ?? '',
        attachments: (raw.attachments ?? []).map(a => ({
          name: a.name,
          size: `${Math.round(a.size / 1024)} KB`,
          uploadedAt: a.uploadedAt ? a.uploadedAt.toDate().toLocaleDateString('ja-JP') : '',
        })),
        history: [],
        createdAt: raw.createdAt ? raw.createdAt.toDate().toLocaleDateString('ja-JP') : '',
        updatedAt: raw.updatedAt ? raw.updatedAt.toDate().toLocaleDateString('ja-JP') : '',
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

const handleDelete = async () => {
  if (!confirm('この案件を削除してよろしいですか？')) return
  try {
    await deleteCase(customerId.value, serviceType.value as ServiceType, caseId.value)
    await navigateTo(`/customers/${customerId.value}/services/${serviceType.value}`)
  }
  catch (e: any) {
    error.value = e.message ?? '削除に失敗しました'
  }
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
        <div>
          <dt class="text-gray-500">担当FP</dt>
          <dd class="font-medium text-gray-900">{{ caseData.assignedFp }}</dd>
        </div>
        <div v-if="caseData.notes" class="sm:col-span-2">
          <dt class="text-gray-500">備考・メモ</dt>
          <dd class="font-medium text-gray-900 whitespace-pre-line">{{ caseData.notes }}</dd>
        </div>
      </dl>
    </div>

    <!-- 添付ファイル -->
    <div v-if="caseData.attachments.length > 0" class="card p-5">
      <h2 class="font-semibold text-gray-900 mb-3 flex items-center gap-2">
        <Icon name="heroicons:paper-clip" class="h-5 w-5 text-primary-600" />
        添付ファイル
      </h2>
      <div class="space-y-2">
        <div
          v-for="file in caseData.attachments"
          :key="file.name"
          class="flex items-center justify-between rounded-lg bg-gray-50 p-3"
        >
          <div class="flex items-center gap-3">
            <Icon name="heroicons:document" class="h-5 w-5 text-gray-400" />
            <div>
              <p class="text-sm font-medium text-gray-800">{{ file.name }}</p>
              <p class="text-xs text-gray-400">{{ file.size }} · {{ file.uploadedAt }}</p>
            </div>
          </div>
          <button class="text-primary-600 hover:underline text-xs">ダウンロード</button>
        </div>
      </div>
    </div>

    <!-- 対応履歴 -->
    <div class="card p-5">
      <h2 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Icon name="heroicons:clock" class="h-5 w-5 text-primary-600" />
        対応履歴
      </h2>
      <ol class="relative border-l border-gray-200 space-y-4 ml-3">
        <li
          v-for="h in caseData.history"
          :key="h.date + h.action"
          class="ml-4"
        >
          <div class="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border-2 border-white bg-primary-400" />
          <p class="text-sm text-gray-700">{{ h.action }}</p>
          <p class="text-xs text-gray-400 mt-0.5">{{ h.date }} · {{ h.user }}</p>
        </li>
      </ol>
    </div>

  </div>
</template>
