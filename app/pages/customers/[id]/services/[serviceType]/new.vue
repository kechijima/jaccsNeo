<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

const route = useRoute()
const customerId = computed(() => route.params.id as string)
const serviceType = computed(() => route.params.serviceType as string)

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

const form = ref({
  status: 'consulting',
  date: '',
  contractDate: '',
  amount: '',
  company: '',
  notes: '',
})

const submitting = ref(false)

const handleSubmit = async () => {
  submitting.value = true
  // Phase3でFirestoreへの保存処理に差し替え
  await new Promise(r => setTimeout(r, 800))
  submitting.value = false
  await navigateTo(`/customers/${customerId.value}/services/${serviceType.value}`)
}
</script>

<template>
  <div class="p-4 md:p-6 max-w-2xl mx-auto space-y-5">

    <!-- パンくず -->
    <div class="flex items-center gap-2 text-sm text-gray-400 flex-wrap">
      <NuxtLink :to="`/customers/${customerId}`">{{ customerName }}</NuxtLink>
      <Icon name="heroicons:chevron-right" class="h-3 w-3" />
      <NuxtLink :to="`/customers/${customerId}/services`">サービス</NuxtLink>
      <Icon name="heroicons:chevron-right" class="h-3 w-3" />
      <NuxtLink :to="`/customers/${customerId}/services/${serviceType}`">{{ serviceLabel }}</NuxtLink>
      <Icon name="heroicons:chevron-right" class="h-3 w-3" />
      <span class="text-gray-600">新規案件</span>
    </div>

    <h1 class="text-xl font-bold text-gray-900">{{ serviceLabel }} — 案件登録</h1>

    <!-- フォーム -->
    <form class="card p-6 space-y-5" @submit.prevent="handleSubmit">

      <!-- ステータス -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1.5">対応ステータス <span class="text-red-500">*</span></label>
        <div class="flex flex-wrap gap-2">
          <label
            v-for="opt in [
              { value: 'consulting', label: '相談中' },
              { value: 'considering', label: '検討中' },
              { value: 'contracted', label: '成約' },
              { value: 'completed', label: '完了' },
              { value: 'failed', label: '不成立' },
            ]"
            :key="opt.value"
            class="flex items-center gap-1.5 cursor-pointer rounded-lg border px-3 py-2 text-sm transition"
            :class="form.status === opt.value ? 'border-primary-400 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'"
          >
            <input v-model="form.status" type="radio" :value="opt.value" class="sr-only" />
            {{ opt.label }}
          </label>
        </div>
      </div>

      <!-- 対応日 -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1.5">対応開始日</label>
        <input v-model="form.date" type="date" class="input-field" />
      </div>

      <!-- 成約日 -->
      <div v-if="form.status === 'contracted' || form.status === 'completed'">
        <label class="block text-sm font-medium text-gray-700 mb-1.5">成約日</label>
        <input v-model="form.contractDate" type="date" class="input-field" />
      </div>

      <!-- 保険会社・会社名 -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1.5">会社名・保険会社</label>
        <input v-model="form.company" type="text" placeholder="例: メットライフ生命" class="input-field" />
      </div>

      <!-- 金額 -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1.5">金額・保険料</label>
        <input v-model="form.amount" type="text" placeholder="例: 月額 15,000円" class="input-field" />
      </div>

      <!-- 備考 -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1.5">備考・メモ</label>
        <textarea v-model="form.notes" rows="4" placeholder="案件の詳細・経緯・メモを入力..." class="input-field" />
      </div>

      <!-- ファイル添付（Phase3で実装） -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1.5">添付ファイル</label>
        <div class="flex items-center justify-center rounded-lg border-2 border-dashed border-gray-200 p-6 text-sm text-gray-400">
          <Icon name="heroicons:paper-clip" class="h-5 w-5 mr-2" />
          ファイルをドラッグ&ドロップ（Phase3で実装予定）
        </div>
      </div>

      <!-- ボタン -->
      <div class="flex justify-between pt-2">
        <NuxtLink :to="`/customers/${customerId}/services/${serviceType}`" class="btn-secondary">
          キャンセル
        </NuxtLink>
        <button type="submit" class="btn-primary" :disabled="submitting">
          <Icon v-if="submitting" name="heroicons:arrow-path" class="h-4 w-4 animate-spin mr-1" />
          {{ submitting ? '保存中...' : '案件を登録する' }}
        </button>
      </div>

    </form>
  </div>
</template>
