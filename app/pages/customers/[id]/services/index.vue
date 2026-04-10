<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

const route = useRoute()
const customerId = computed(() => route.params.id as string)
const { canEditCustomer } = usePermission()

// ダミー顧客名（Phase3でFirestoreから取得）
const customerName = ref('田中 一郎')

// サービスカテゴリとステータス（Phase3でFirestoreデータに差し替え）
const serviceCategories = ref([
  {
    label: '保険',
    icon: 'heroicons:shield-check',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    services: [
      { key: 'lifeInsurance', label: '生命保険', status: 'contracted', statusLabel: '成約', date: '2023/04', note: 'メットライフ' },
      { key: 'fireInsurance', label: '火災保険', status: 'contracted', statusLabel: '成約', date: '2022/09', note: '' },
      { key: 'autoInsurance', label: '自動車保険（ソニー損保）', status: 'considering', statusLabel: '検討中', date: '', note: '' },
    ],
  },
  {
    label: '不動産',
    icon: 'heroicons:home',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    services: [
      { key: 'realEstatePurchase', label: '不動産購入', status: 'none', statusLabel: '対応なし', date: '', note: '' },
      { key: 'realEstateSale', label: '不動産売却', status: 'none', statusLabel: '対応なし', date: '', note: '' },
      { key: 'realEstateRental', label: '不動産賃貸', status: 'contracted', statusLabel: '成約', date: '2021/12', note: '' },
      { key: 'homeLoan', label: '住宅ローン', status: 'contracted', statusLabel: '成約', date: '2021/12', note: '' },
    ],
  },
  {
    label: 'キャリア',
    icon: 'heroicons:briefcase',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    services: [
      { key: 'jobChange', label: '転職（サークロス/アセット）', status: 'none', statusLabel: '対応なし', date: '', note: '' },
      { key: 'seniorPlanning', label: 'シニアプランニング', status: 'none', statusLabel: '対応なし', date: '', note: '' },
    ],
  },
  {
    label: '通信',
    icon: 'heroicons:wifi',
    color: 'text-sky-600',
    bgColor: 'bg-sky-50',
    services: [
      { key: 'communication', label: '通信回線', status: 'consulting', statusLabel: '相談中', date: '', note: '' },
      { key: 'hikari', label: 'ピカラ光', status: 'none', statusLabel: '対応なし', date: '', note: '' },
    ],
  },
  {
    label: 'ライフ',
    icon: 'heroicons:sparkles',
    color: 'text-rose-600',
    bgColor: 'bg-rose-50',
    services: [
      { key: 'moving', label: '引越し', status: 'none', statusLabel: '対応なし', date: '', note: '' },
      { key: 'renovation', label: 'リフォーム', status: 'none', statusLabel: '対応なし', date: '', note: '' },
      { key: 'travel', label: '旅行', status: 'none', statusLabel: '対応なし', date: '', note: '' },
      { key: 'bridal', label: '結婚式場紹介', status: 'none', statusLabel: '対応なし', date: '', note: '' },
    ],
  },
  {
    label: '法務',
    icon: 'heroicons:scale',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    services: [
      { key: 'legal', label: '登記簿謄本', status: 'none', statusLabel: '対応なし', date: '', note: '' },
      { key: 'inheritance', label: '相続・遺言', status: 'none', statusLabel: '対応なし', date: '', note: '' },
      { key: 'companySetup', label: '法人設立', status: 'none', statusLabel: '対応なし', date: '', note: '' },
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
          class="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition"
        >
          <div class="flex items-center gap-3 min-w-0">
            <span class="badge text-xs" :class="statusClass(svc.status)">{{ svc.statusLabel }}</span>
            <span class="text-sm font-medium text-gray-900 truncate">{{ svc.label }}</span>
            <span v-if="svc.date" class="text-xs text-gray-400 shrink-0">{{ svc.date }}</span>
            <span v-if="svc.note" class="text-xs text-gray-400 shrink-0">{{ svc.note }}</span>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <NuxtLink
              v-if="svc.status !== 'none'"
              :to="`/customers/${customerId}/services/${svc.key}`"
              class="text-xs text-primary-600 hover:underline"
            >
              詳細
            </NuxtLink>
            <NuxtLink
              v-if="canEditCustomer"
              :to="`/customers/${customerId}/services/${svc.key}/new`"
              class="text-xs text-gray-400 hover:text-primary-600"
            >
              + 追加
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>
