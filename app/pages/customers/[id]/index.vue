<script setup lang="ts">
import type { Customer } from '~/types/customer'
import { useAuthStore } from '~/stores/auth'

definePageMeta({ middleware: ['auth'] })

const route = useRoute()
const authStore = useAuthStore()
const { fetchCustomer, deleteCustomer } = useCustomers()
const { canEditCustomer } = usePermission()

const customer = ref<Customer | null>(null)
const loading  = ref(true)
const error    = ref('')
const deleting = ref(false)

const id = computed(() => route.params.id as string)

onMounted(async () => {
  try {
    customer.value = await fetchCustomer(id.value)
    if (!customer.value) error.value = '顧客が見つかりません'
  } catch (e: any) {
    error.value = e.message
  } finally {
    loading.value = false
  }
})

// ===== 削除 =====
const handleDelete = async () => {
  if (!confirm(`「${customer.value?.name}」を削除してよろしいですか？この操作は取り消せません。`)) return
  deleting.value = true
  try {
    await deleteCustomer(id.value)
    await navigateTo('/customers')
  } catch (e: any) {
    alert(e.message)
  } finally {
    deleting.value = false
  }
}

// ===== フォーマット =====
const formatDate = (val: any) => {
  if (!val) return '—'
  if (typeof val === 'string') return val.replace(/-/g, '/')
  const d = val?.toDate?.() ?? null
  if (!d) return '—'
  return d.toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

const typeLabel = computed(() => customer.value?.type === 'corporate' ? '法人' : '個人')

// サービスラベル
const serviceLabels: Record<string, string> = {
  lifeInsurance: '生命保険', fireInsurance: '火災保険', autoInsurance: '自動車保険',
  realEstateRental: '不動産（賃貸）', realEstateSale: '不動産（売買）',
  communication: '通信', travel: '旅行', auto: '自動車', utilities: '光熱費',
  solar: '太陽光', moving: '引越し', furniture: '家具・家電', jobChange: '転職',
  renovation: '住宅リフォーム', carInspection: '車検', legal: '法務関係',
  inheritance: '相続関係', bridal: 'ブライダル', funeral: 'お葬式', grave: 'お墓',
  will: '公正証書遺言', inheritanceMeasures: '相続対策', loanSupport: '融資申請サポート',
  ma: 'M&A', waterServer: 'ウォーターサーバー',
}

const activeServices = computed(() => {
  if (!customer.value?.services) return []
  return Object.entries(customer.value.services)
    .filter(([, v]) => v)
    .map(([k, v]) => ({ label: serviceLabels[k] ?? k, value: v }))
})
</script>

<template>
  <div class="p-4 md:p-6 max-w-4xl mx-auto space-y-6">

    <!-- ローディング -->
    <div v-if="loading" class="flex items-center justify-center py-20">
      <Icon name="heroicons:arrow-path" class="h-8 w-8 animate-spin text-gray-400" />
    </div>

    <!-- エラー -->
    <div v-else-if="error" class="card p-8 text-center">
      <Icon name="heroicons:exclamation-circle" class="h-12 w-12 text-red-400 mx-auto mb-3" />
      <p class="text-gray-600">{{ error }}</p>
      <NuxtLink to="/customers" class="mt-4 inline-block btn-secondary text-sm">一覧に戻る</NuxtLink>
    </div>

    <template v-else-if="customer">

      <!-- ===== ページヘッダー ===== -->
      <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <NuxtLink to="/customers" class="text-sm text-gray-400 hover:text-gray-600">
              ← 顧客一覧
            </NuxtLink>
          </div>
          <h1 class="text-2xl font-bold text-gray-900">{{ customer.name }}</h1>
          <div class="flex items-center gap-2 mt-1">
            <span v-if="customer.nameKana" class="text-sm text-gray-400">{{ customer.nameKana }}</span>
            <span class="badge text-xs" :class="customer.type === 'corporate' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'">
              {{ typeLabel }}
            </span>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <NuxtLink
            v-if="canEditCustomer"
            :to="`/customers/${id}/edit`"
            class="btn-secondary text-sm flex items-center gap-1.5"
          >
            <Icon name="heroicons:pencil" class="h-4 w-4" />
            編集
          </NuxtLink>
          <button
            v-if="authStore.isSystemAdmin"
            class="btn-danger text-sm flex items-center gap-1.5"
            :disabled="deleting"
            @click="handleDelete"
          >
            <Icon name="heroicons:trash" class="h-4 w-4" />
            削除
          </button>
        </div>
      </div>

      <!-- ===== 基本情報 ===== -->
      <div class="card p-5">
        <h2 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Icon name="heroicons:user" class="h-5 w-5 text-primary-600" />
          基本情報
        </h2>
        <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div v-if="customer.gender">
            <dt class="text-gray-500">性別</dt>
            <dd class="font-medium text-gray-900">{{ customer.gender }}</dd>
          </div>
          <div v-if="customer.dob">
            <dt class="text-gray-500">生年月日</dt>
            <dd class="font-medium text-gray-900">{{ formatDate(customer.dob) }}</dd>
          </div>
          <div v-if="customer.tel">
            <dt class="text-gray-500">TEL</dt>
            <dd class="font-medium text-gray-900">
              <a :href="`tel:${customer.tel}`" class="text-primary-600 hover:underline">{{ customer.tel }}</a>
            </dd>
          </div>
          <div v-if="customer.email">
            <dt class="text-gray-500">メールアドレス</dt>
            <dd class="font-medium text-gray-900 break-all">
              <a :href="`mailto:${customer.email}`" class="text-primary-600 hover:underline">{{ customer.email }}</a>
            </dd>
          </div>
          <div v-if="customer.postalCode || customer.address" class="sm:col-span-2">
            <dt class="text-gray-500">住所</dt>
            <dd class="font-medium text-gray-900">
              <span v-if="customer.postalCode">〒{{ customer.postalCode }}&ensp;</span>{{ customer.address }}
            </dd>
          </div>
          <div v-if="customer.employer">
            <dt class="text-gray-500">勤務先</dt>
            <dd class="font-medium text-gray-900">{{ customer.employer }}</dd>
          </div>
          <div v-if="customer.annualIncome">
            <dt class="text-gray-500">年収</dt>
            <dd class="font-medium text-gray-900">{{ customer.annualIncome }}</dd>
          </div>
          <div v-if="customer.hometown">
            <dt class="text-gray-500">出身</dt>
            <dd class="font-medium text-gray-900">{{ customer.hometown }}</dd>
          </div>
          <div v-if="customer.nationality">
            <dt class="text-gray-500">国籍</dt>
            <dd class="font-medium text-gray-900">{{ customer.nationality }}</dd>
          </div>
          <div v-if="customer.snsUrl" class="sm:col-span-2">
            <dt class="text-gray-500">SNS/HP URL</dt>
            <dd class="font-medium text-gray-900 break-all">{{ customer.snsUrl }}</dd>
          </div>
        </dl>
      </div>

      <!-- ===== 法人情報 ===== -->
      <div v-if="customer.type === 'corporate'" class="card p-5">
        <h2 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Icon name="heroicons:building-office" class="h-5 w-5 text-amber-600" />
          法人情報
        </h2>
        <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div v-if="customer.companyName">
            <dt class="text-gray-500">法人名</dt>
            <dd class="font-medium text-gray-900">{{ customer.companyName }}</dd>
          </div>
          <div v-if="customer.companyNameKana">
            <dt class="text-gray-500">法人名（カナ）</dt>
            <dd class="font-medium text-gray-900">{{ customer.companyNameKana }}</dd>
          </div>
          <div v-if="customer.companyTel">
            <dt class="text-gray-500">代表TEL</dt>
            <dd class="font-medium text-gray-900">{{ customer.companyTel }}</dd>
          </div>
          <div v-if="customer.industry">
            <dt class="text-gray-500">業種</dt>
            <dd class="font-medium text-gray-900">{{ customer.industry }}</dd>
          </div>
          <div v-if="customer.capital">
            <dt class="text-gray-500">資本金</dt>
            <dd class="font-medium text-gray-900">{{ customer.capital }}</dd>
          </div>
          <div v-if="customer.annualSales">
            <dt class="text-gray-500">年商</dt>
            <dd class="font-medium text-gray-900">{{ customer.annualSales }}</dd>
          </div>
          <div v-if="customer.headOffice" class="sm:col-span-2">
            <dt class="text-gray-500">本店所在地</dt>
            <dd class="font-medium text-gray-900">{{ customer.headOffice }}</dd>
          </div>
          <div v-if="customer.ceoName">
            <dt class="text-gray-500">代表取締役</dt>
            <dd class="font-medium text-gray-900">{{ customer.ceoName }}</dd>
          </div>
          <div v-if="customer.employees">
            <dt class="text-gray-500">従業員</dt>
            <dd class="font-medium text-gray-900">{{ customer.employees }}</dd>
          </div>
        </dl>
      </div>

      <!-- ===== 家族情報 ===== -->
      <div v-if="customer.familyMembers && customer.familyMembers.length > 0" class="card p-5">
        <h2 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Icon name="heroicons:user-group" class="h-5 w-5 text-primary-600" />
          家族情報
        </h2>
        <div class="space-y-3">
          <div
            v-for="(m, idx) in customer.familyMembers"
            :key="idx"
            class="flex items-start gap-3 text-sm p-3 rounded-lg bg-gray-50"
          >
            <div class="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full bg-primary-100 text-primary-700 text-xs font-bold">
              {{ idx + 1 }}
            </div>
            <div class="min-w-0">
              <p class="font-medium text-gray-900">{{ m.name }}
                <span v-if="m.relationship" class="text-gray-500 font-normal">（{{ m.relationship }}）</span>
              </p>
              <p class="text-gray-500">
                <span v-if="m.dob">{{ formatDate(m.dob) }}</span>
                <span v-if="m.dob && m.occupation"> ／ </span>
                <span v-if="m.occupation">{{ m.occupation }}</span>
              </p>
            </div>
          </div>
          <p v-if="customer.otherFamily" class="text-sm text-gray-500 pt-1">
            その他: {{ customer.otherFamily }}
          </p>
        </div>
      </div>

      <!-- ===== 担当・状況 ===== -->
      <div class="card p-5">
        <h2 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Icon name="heroicons:chart-bar" class="h-5 w-5 text-primary-600" />
          担当・活動状況
        </h2>
        <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div v-if="customer.assignedFpName">
            <dt class="text-gray-500">担当FP</dt>
            <dd class="font-medium text-gray-900">{{ customer.assignedFpName }}</dd>
          </div>
          <div v-if="customer.relationship">
            <dt class="text-gray-500">関係性</dt>
            <dd class="font-medium text-gray-900">{{ customer.relationship }}</dd>
          </div>
          <div v-if="customer.stage">
            <dt class="text-gray-500">段数</dt>
            <dd class="font-medium text-gray-900">{{ customer.stage }}</dd>
          </div>
          <div v-if="customer.referralSource">
            <dt class="text-gray-500">紹介元</dt>
            <dd class="font-medium text-gray-900">{{ customer.referralSource }}</dd>
          </div>
          <div v-if="customer.referralCount != null">
            <dt class="text-gray-500">紹介数</dt>
            <dd class="font-medium text-gray-900">{{ customer.referralCount }}名</dd>
          </div>
          <div v-if="customer.status1">
            <dt class="text-gray-500">状況（ワン）</dt>
            <dd><span class="badge bg-primary-50 text-primary-700">{{ customer.status1 }}</span></dd>
          </div>
          <div v-if="customer.status2">
            <dt class="text-gray-500">状況（ツー）</dt>
            <dd><span class="badge bg-primary-50 text-primary-700">{{ customer.status2 }}</span></dd>
          </div>
          <div v-if="customer.postFollowStatus" class="sm:col-span-2">
            <dt class="text-gray-500">フォロー以降の状況</dt>
            <dd class="font-medium text-gray-900">{{ customer.postFollowStatus }}</dd>
          </div>
        </dl>
      </div>

      <!-- ===== サービス ===== -->
      <div v-if="activeServices.length > 0" class="card p-5">
        <h2 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Icon name="heroicons:squares-2x2" class="h-5 w-5 text-primary-600" />
          サービス状況
        </h2>
        <div class="flex flex-wrap gap-2">
          <span
            v-for="s in activeServices"
            :key="s.label"
            class="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700"
          >
            <Icon name="heroicons:check" class="h-3 w-3" />
            {{ s.label }}
            <span v-if="s.value && s.value !== '1'" class="text-green-500">({{ s.value }})</span>
          </span>
        </div>
      </div>

      <!-- ===== 更新情報 ===== -->
      <div class="text-xs text-gray-400 text-right space-y-0.5">
        <p>作成: {{ formatDate(customer.createdAt) }}</p>
        <p>更新: {{ formatDate(customer.updatedAt) }}
          <span v-if="customer.updatedBy"> ／ {{ customer.updatedBy }}</span>
        </p>
        <p v-if="customer.kintoneId" class="text-gray-300">kintone ID: {{ customer.kintoneId }}</p>
      </div>

    </template>
  </div>
</template>
