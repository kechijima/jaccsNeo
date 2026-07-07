<script setup lang="ts">
import { SERVICE_LABELS } from '~/types/service'
import { LIFE_INSURANCE_FIELD_LABELS } from '~/types/lifeInsurance'
import { useLifeInsuranceCases } from '~/composables/useLifeInsuranceCases'

definePageMeta({ middleware: ['auth'] })

const route = useRoute()
const serviceType = computed(() => route.params.serviceType as string)
const caseId = computed(() => route.params.caseId as string)
const serviceLabel = computed(() => SERVICE_LABELS[serviceType.value] ?? serviceType.value)
const isLifeInsurance = computed(() => serviceType.value === 'lifeInsurance')

// 現状、詳細ページは生命保険アプリのみ対応（他アプリは一覧から顧客詳細へ遷移）
const { getById } = useLifeInsuranceCases()
const liCase = getById(caseId)

if (!isLifeInsurance.value) {
  await navigateTo(`/services/${serviceType.value}`)
}

const statusClass = (status: string) => {
  if (/未成約|不成立|見送/.test(status)) return 'bg-red-100 text-red-600'
  if (/成約|○|済/.test(status))          return 'bg-green-100 text-green-700'
  if (/検討/.test(status))                return 'bg-amber-100 text-amber-700'
  if (/相談|確認/.test(status))           return 'bg-sky-100 text-sky-700'
  return 'bg-gray-100 text-gray-600'
}

const fieldEntries = computed(() => {
  if (!liCase.value) return []
  const keys: (keyof typeof LIFE_INSURANCE_FIELD_LABELS)[] = [
    'contractContent', 'planningContent', 'designRequest', 'newOrSwitch',
    'monthlyBudget', 'bonus', 'savings', 'planningPurpose',
  ]
  return keys
    .filter(k => (liCase.value as any)[k])
    .map(k => ({ label: LIFE_INSURANCE_FIELD_LABELS[k], value: (liCase.value as any)[k] }))
})
</script>

<template>
  <div class="p-4 md:p-6 max-w-3xl mx-auto space-y-5">

    <!-- パンくず -->
    <div class="flex items-center gap-2 text-sm text-gray-400 flex-wrap">
      <NuxtLink to="/services" class="hover:text-primary-600 transition-colors">アプリ</NuxtLink>
      <Icon name="heroicons:chevron-right" class="h-3 w-3" />
      <NuxtLink :to="`/services/${serviceType}`" class="hover:text-primary-600 transition-colors">{{ serviceLabel }}</NuxtLink>
      <Icon name="heroicons:chevron-right" class="h-3 w-3" />
      <span class="text-gray-600">案件詳細</span>
    </div>

    <!-- 案件が見つからない -->
    <div v-if="!liCase" class="card p-10 text-center">
      <Icon name="heroicons:exclamation-circle" class="h-10 w-10 text-gray-300 mx-auto mb-2" />
      <p class="text-gray-400">案件が見つかりませんでした</p>
      <NuxtLink :to="`/services/${serviceType}`" class="mt-3 inline-block text-sm text-primary-600 hover:underline">← 一覧に戻る</NuxtLink>
    </div>

    <template v-else>

      <!-- ヘッダー -->
      <div class="card p-5 space-y-4">
        <div class="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div class="flex items-center gap-2 flex-wrap mb-1">
              <span v-if="liCase.progressStatus" class="badge text-xs" :class="statusClass(liCase.progressStatus)">{{ liCase.progressStatus }}</span>
              <span v-if="liCase.newOrSwitch" class="badge text-xs bg-indigo-50 text-indigo-600">{{ liCase.newOrSwitch }}</span>
              <span class="text-xs text-gray-400">レコード#{{ liCase.recordNumber }}</span>
            </div>
            <NuxtLink
              v-if="liCase.customerId"
              :to="`/customers/${liCase.customerId}`"
              class="text-xl font-bold text-primary-700 hover:underline"
            >{{ liCase.name }}</NuxtLink>
            <h1 v-else class="text-xl font-bold text-gray-900">{{ liCase.name }}</h1>
            <p class="text-sm text-gray-400 mt-0.5">{{ liCase.nameKana }}</p>
          </div>
          <NuxtLink
            v-if="liCase.customerId"
            :to="`/customers/${liCase.customerId}`"
            class="btn-secondary text-sm flex items-center gap-1.5 shrink-0"
          >
            <Icon name="heroicons:identification" class="h-4 w-4" />
            顧客詳細
          </NuxtLink>
          <span v-else class="badge text-xs bg-gray-100 text-gray-400 shrink-0">パーソナルデータ未連携</span>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs border-t border-gray-100 pt-4">
          <div v-if="liCase.gender"><dt class="text-gray-500">性別</dt><dd class="font-medium text-gray-900 mt-0.5">{{ liCase.gender }}</dd></div>
          <div v-if="liCase.dob"><dt class="text-gray-500">生年月日</dt><dd class="font-medium text-gray-900 mt-0.5">{{ liCase.dob.replace(/-/g, '/') }}</dd></div>
          <div v-if="liCase.tel"><dt class="text-gray-500">TEL</dt><dd class="font-medium text-gray-900 mt-0.5">{{ liCase.tel }}</dd></div>
          <div v-if="liCase.assignedFpName"><dt class="text-gray-500">担当 未来設計士</dt><dd class="font-medium text-gray-900 mt-0.5">{{ liCase.assignedFpName }}</dd></div>
          <div v-if="liCase.faceToFaceStaffName"><dt class="text-gray-500">面前担当者</dt><dd class="font-medium text-gray-900 mt-0.5">{{ liCase.faceToFaceStaffName }}</dd></div>
        </div>
      </div>

      <!-- 契約・プランニング内容 -->
      <div v-if="fieldEntries.length > 0" class="card p-5 space-y-4">
        <h2 class="font-semibold text-gray-900 flex items-center gap-2">
          <Icon name="heroicons:document-text" class="h-5 w-5 text-primary-600" />
          契約・プランニング
        </h2>
        <dl class="space-y-3 text-sm">
          <div v-for="f in fieldEntries" :key="f.label">
            <dt class="text-gray-500">{{ f.label }}</dt>
            <dd class="font-medium text-gray-900 whitespace-pre-line mt-0.5">{{ f.value }}</dd>
          </div>
        </dl>
      </div>

      <!-- アポ・ヒアリング項目 -->
      <div
        v-if="liCase.desiredApptDates?.length || liCase.availableWeekdays?.length || liCase.residenceTypes?.length || liCase.metParents || liCase.meetingDate || liCase.reminder"
        class="card p-5 space-y-4"
      >
        <h2 class="font-semibold text-gray-900 flex items-center gap-2">
          <Icon name="heroicons:calendar-days" class="h-5 w-5 text-primary-600" />
          アポ・ヒアリング項目
        </h2>
        <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div v-if="liCase.desiredApptDates?.length" class="sm:col-span-2">
            <dt class="text-gray-500 text-xs">アポ希望日</dt>
            <dd class="font-medium text-gray-900 mt-0.5 space-y-0.5">
              <p v-for="(d, i) in liCase.desiredApptDates" :key="i" class="text-sm">{{ d }}</p>
            </dd>
          </div>
          <div v-if="liCase.availableWeekdays?.length">
            <dt class="text-gray-500 text-xs">アポ可能曜日</dt>
            <dd class="font-medium text-gray-900 mt-0.5">{{ liCase.availableWeekdays.join('・') }}</dd>
          </div>
          <div v-if="liCase.residenceTypes?.length">
            <dt class="text-gray-500 text-xs">住居</dt>
            <dd class="font-medium text-gray-900 mt-0.5">{{ liCase.residenceTypes.join('・') }}</dd>
          </div>
          <div v-if="liCase.metParents">
            <dt class="text-gray-500 text-xs">親などに会ったか</dt>
            <dd class="font-medium text-gray-900 mt-0.5">{{ liCase.metParents }}</dd>
          </div>
          <div v-if="liCase.meetingDate">
            <dt class="text-gray-500 text-xs">面前日</dt>
            <dd class="font-medium text-gray-900 mt-0.5">{{ liCase.meetingDate }}{{ liCase.scheduledTime ? ` ${liCase.scheduledTime}` : '' }}</dd>
          </div>
          <div v-if="liCase.reminder">
            <dt class="text-gray-500 text-xs">リマインダー</dt>
            <dd class="font-medium text-gray-900 mt-0.5">{{ liCase.reminder }}</dd>
          </div>
        </dl>
      </div>

      <!-- 保険証券コピー -->
      <div v-if="liCase.policyCopies?.length" class="card p-5 space-y-3">
        <h2 class="font-semibold text-gray-900 flex items-center gap-2">
          <Icon name="heroicons:paper-clip" class="h-5 w-5 text-primary-600" />
          保険証券コピー
        </h2>
        <div class="flex flex-wrap gap-2">
          <a
            v-for="(f, i) in liCase.policyCopies"
            :key="i"
            :href="f.url"
            target="_blank"
            rel="noopener"
            class="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:text-primary-700 transition"
          >
            <Icon name="heroicons:document" class="h-3.5 w-3.5" />
            {{ f.name }}
            <Icon name="heroicons:arrow-top-right-on-square" class="h-3 w-3" />
          </a>
        </div>
      </div>

      <!-- ワン/ツー/フォロー -->
      <div v-if="liCase.oneStatus || liCase.twoStatus || liCase.followStatus" class="card p-5 space-y-3">
        <h2 class="font-semibold text-gray-900 flex items-center gap-2">
          <Icon name="heroicons:chat-bubble-left-right" class="h-5 w-5 text-primary-600" />
          ワン / ツー / フォロー状況
        </h2>
        <dl class="space-y-3 text-sm">
          <div v-if="liCase.oneStatus">
            <dt class="text-gray-500 text-xs">ワン（状況）</dt>
            <dd class="text-gray-800 whitespace-pre-line mt-0.5">{{ liCase.oneStatus }}</dd>
          </div>
          <div v-if="liCase.twoStatus">
            <dt class="text-gray-500 text-xs">ツー（状況）</dt>
            <dd class="text-gray-800 whitespace-pre-line mt-0.5">{{ liCase.twoStatus }}</dd>
          </div>
          <div v-if="liCase.followStatus">
            <dt class="text-gray-500 text-xs">フォロー（状況）</dt>
            <dd class="text-gray-800 whitespace-pre-line mt-0.5">{{ liCase.followStatus }}</dd>
          </div>
        </dl>
      </div>

      <!-- 管理情報 -->
      <div class="text-xs text-gray-400 text-right space-y-0.5">
        <p v-if="liCase.manager">責任者: {{ liCase.manager }}</p>
        <p>更新: {{ liCase.updatedAt.toLocaleDateString('ja-JP') }}</p>
      </div>

    </template>

  </div>
</template>
