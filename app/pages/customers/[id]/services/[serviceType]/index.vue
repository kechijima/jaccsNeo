<script setup lang="ts">
import { SERVICE_LABELS } from '~/types/service'
import { LIFE_INSURANCE_FIELD_LABELS } from '~/types/lifeInsurance'
import { useCustomerStore } from '~/composables/useCustomerStore'
import { useAppServices } from '~/composables/useAppServices'
import { useLifeInsuranceCases } from '~/composables/useLifeInsuranceCases'

definePageMeta({ middleware: ['auth'] })

const route = useRoute()
const customerId = computed(() => route.params.id as string)
const serviceType = computed(() => route.params.serviceType as string)
const { canEditCustomer } = usePermission()

const serviceLabel = computed(() => SERVICE_LABELS[serviceType.value] ?? serviceType.value)
const isLifeInsurance = computed(() => serviceType.value === 'lifeInsurance')

const { getById } = useCustomerStore()
const { getServiceValue } = useAppServices()
const customer = getById(customerId)
const customerName = computed(() => customer.value?.name ?? '')
const canEdit = computed(() => customer.value ? canEditCustomer(customer.value.assignedFpId ?? '') : false)

// ── 生命保険：kintone連動の専用案件データ ──────────────────────────
const { getByCustomerId } = useLifeInsuranceCases()
const liCases = getByCustomerId(customerId)

// パーソナルデータのservices値から対応状況を1件の案件として表示（生命保険以外、または生命保険で案件未連携の場合のフォールバック）
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
  if (/未成約|不成立|見送/.test(status)) return 'bg-red-100 text-red-600'
  if (/成約|○|済/.test(status))          return 'bg-green-100 text-green-700'
  if (/検討/.test(status))                return 'bg-amber-100 text-amber-700'
  if (/相談|確認/.test(status))           return 'bg-sky-100 text-sky-700'
  return 'bg-gray-100 text-gray-600'
}

// 生命保険案件の主要フィールドを表示用に整形
const liFieldEntries = (c: any) => {
  const keys: (keyof typeof LIFE_INSURANCE_FIELD_LABELS)[] = [
    'contractContent', 'planningContent', 'designRequest', 'newOrSwitch',
    'monthlyBudget', 'bonus', 'savings', 'planningPurpose',
  ]
  return keys
    .filter(k => c[k])
    .map(k => ({ label: LIFE_INSURANCE_FIELD_LABELS[k], value: c[k] }))
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
        <p class="text-sm text-gray-500 mt-0.5">
          {{ customerName }} さん — {{ isLifeInsurance ? liCases.length : cases.length }}件の案件
        </p>
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

    <!-- ===== 生命保険：kintone連動の詳細案件表示 ===== -->
    <template v-if="isLifeInsurance">
      <div v-if="liCases.length === 0" class="card p-10 text-center">
        <Icon name="heroicons:shield-check" class="h-10 w-10 text-gray-300 mx-auto mb-2" />
        <p class="text-sm text-gray-400">生命保険アプリと連携した案件がありません</p>
      </div>

      <div v-else class="space-y-4">
        <div v-for="c in liCases" :key="c.id" class="card p-5 space-y-4">
          <!-- ヘッダー行 -->
          <div class="flex items-start justify-between gap-3 flex-wrap">
            <div class="flex items-center gap-2 flex-wrap">
              <span v-if="c.progressStatus" class="badge text-xs" :class="statusClass(c.progressStatus)">{{ c.progressStatus }}</span>
              <span v-if="c.newOrSwitch" class="badge text-xs bg-indigo-50 text-indigo-600">{{ c.newOrSwitch }}</span>
              <span class="text-xs text-gray-400">レコード#{{ c.recordNumber }}</span>
            </div>
            <div class="text-right text-xs text-gray-400">
              <p v-if="c.assignedFpName">担当: {{ c.assignedFpName }}</p>
              <p v-if="c.faceToFaceStaffName">面前担当: {{ c.faceToFaceStaffName }}</p>
            </div>
          </div>

          <!-- 主要項目 -->
          <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div v-for="f in liFieldEntries(c)" :key="f.label" class="sm:col-span-2">
              <dt class="text-gray-500">{{ f.label }}</dt>
              <dd class="font-medium text-gray-900 whitespace-pre-line mt-0.5">{{ f.value }}</dd>
            </div>
          </dl>

          <!-- アポ・活動状況 -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm border-t border-gray-100 pt-4">
            <div v-if="c.desiredApptDates?.length">
              <dt class="text-gray-500 text-xs">アポ希望日</dt>
              <dd class="font-medium text-gray-900 mt-0.5 space-y-0.5">
                <p v-for="(d, i) in c.desiredApptDates" :key="i" class="text-xs">{{ d }}</p>
              </dd>
            </div>
            <div v-if="c.availableWeekdays?.length">
              <dt class="text-gray-500 text-xs">アポ可能曜日</dt>
              <dd class="font-medium text-gray-900 mt-0.5 text-xs">{{ c.availableWeekdays.join('・') }}</dd>
            </div>
            <div v-if="c.residenceTypes?.length">
              <dt class="text-gray-500 text-xs">住居</dt>
              <dd class="font-medium text-gray-900 mt-0.5 text-xs">{{ c.residenceTypes.join('・') }}</dd>
            </div>
            <div v-if="c.metParents">
              <dt class="text-gray-500 text-xs">親などに会ったか</dt>
              <dd class="font-medium text-gray-900 mt-0.5 text-xs">{{ c.metParents }}</dd>
            </div>
            <div v-if="c.meetingDate">
              <dt class="text-gray-500 text-xs">面前日</dt>
              <dd class="font-medium text-gray-900 mt-0.5 text-xs">{{ c.meetingDate }}{{ c.scheduledTime ? ` ${c.scheduledTime}` : '' }}</dd>
            </div>
            <div v-if="c.tel">
              <dt class="text-gray-500 text-xs">TEL</dt>
              <dd class="font-medium text-gray-900 mt-0.5 text-xs">{{ c.tel }}</dd>
            </div>
          </div>

          <!-- ワン/ツー/フォロー -->
          <div v-if="c.oneStatus || c.twoStatus || c.followStatus" class="border-t border-gray-100 pt-4 space-y-2 text-sm">
            <div v-if="c.oneStatus">
              <dt class="text-gray-500 text-xs">ワン（状況）</dt>
              <dd class="text-gray-800 text-xs whitespace-pre-line mt-0.5">{{ c.oneStatus }}</dd>
            </div>
            <div v-if="c.twoStatus">
              <dt class="text-gray-500 text-xs">ツー（状況）</dt>
              <dd class="text-gray-800 text-xs whitespace-pre-line mt-0.5">{{ c.twoStatus }}</dd>
            </div>
            <div v-if="c.followStatus">
              <dt class="text-gray-500 text-xs">フォロー（状況）</dt>
              <dd class="text-gray-800 text-xs whitespace-pre-line mt-0.5">{{ c.followStatus }}</dd>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- ===== その他アプリ：パーソナルデータ対応状況の簡易表示 ===== -->
    <template v-else>
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
    </template>

  </div>
</template>
