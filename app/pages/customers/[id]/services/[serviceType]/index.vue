<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

const route = useRoute()
const customerId = computed(() => route.params.id as string)
const serviceType = computed(() => route.params.serviceType as string)
const { canEditCustomer } = usePermission()

const serviceLabels: Record<string, string> = {
  lifeInsurance: '生命保険', fireInsurance: '火災保険', autoInsurance: '自動車保険（ソニー損保）',
  realEstatePurchase: '不動産購入', realEstateSale: '不動産売却', realEstateRental: '不動産賃貸',
  homeLoan: '住宅ローン', jobChange: '転職', seniorPlanning: 'シニアプランニング',
  communication: '通信回線', hikari: 'ピカラ光', moving: '引越し', renovation: 'リフォーム',
  travel: '旅行', bridal: '結婚式場紹介', legal: '法務関係', inheritance: '相続・遺言',
  companySetup: '法人設立', waterServer: 'ウォーターサーバー',
}
const serviceLabel = computed(() => serviceLabels[serviceType.value] ?? serviceType.value)
const customerName = ref('田中 一郎')

// ダミー案件データ（Phase3でFirestoreから取得）
const cases = ref([
  {
    id: 'case001',
    status: 'contracted',
    statusLabel: '成約',
    assignedFp: '西島 伸樹',
    date: '2023/04/15',
    contractDate: '2023/04/15',
    amount: '月額 15,000円',
    company: 'メットライフ生命',
    notes: '死亡保険金1億円、入院特約付き。2025年に見直し予定。',
    updatedAt: '2024/03/10',
  },
  {
    id: 'case002',
    status: 'consulting',
    statusLabel: '相談中',
    assignedFp: '西島 伸樹',
    date: '2024/01/20',
    contractDate: '',
    amount: '',
    company: '',
    notes: '保障内容の見直し相談。追加保険の検討中。',
    updatedAt: '2024/01/20',
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
