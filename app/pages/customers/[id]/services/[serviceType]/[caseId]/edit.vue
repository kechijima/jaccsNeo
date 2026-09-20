<script setup lang="ts">
import { SERVICE_LABELS } from '~/types/service'
import type { ServiceCaseForm, ServiceStatus, ServiceType } from '~/types/service'
import { useAppDefs } from '~/composables/useAppDefs'
import { useUsers } from '~/composables/useUsers'
import type { AppDef } from '~/types/appDef'
import type { AppUser } from '~/types/user'

definePageMeta({ middleware: ['auth'] })

const route = useRoute()
const customerId = computed(() => route.params.id as string)
const serviceType = computed(() => route.params.serviceType as string)
const caseId = computed(() => route.params.caseId as string)

const { fetchCustomer } = useCustomers()
const { fetchCase, updateCase, deleteCase } = useServices()

// アプリ管理（フォームビルダー）でこのserviceTypeに連携された項目定義。
// 新規登録フォームと同じ項目・保存内容を編集でも扱えるようにする
const { getPublishedByServiceType } = useAppDefs()
const appDef = ref<AppDef | null>(null)
const customFieldValues = ref<Record<string, string | string[]>>({})

const serviceLabel = computed(() => SERVICE_LABELS[serviceType.value] ?? appDef.value?.name ?? serviceType.value)
const customerName = ref('')
const loading = ref(true)
const notFound = ref(false)
const error = ref('')

const form = ref<ServiceCaseForm>({
  status: 'consulting' as ServiceStatus,
  date: '',
  contractDate: '',
  amount: '',
  company: '',
  notes: '',
  reminderDate: '',
  reminderNote: '',
  assigneeUid: '',
  plannerUid: '',
  reminderAudienceUids: [],
})

const submitting = ref(false)

// ===== 担当者・担当未来設計士（全アプリ共通の標準項目） =====
const { fetchUsers } = useUsers()
const allUsers = ref<AppUser[]>([])

// 担当者: アプリの責任者・担当者（アプリ管理で設定）から選択。フィールドビルダーで
// 「担当者」項目が追加されている場合は、そちらを優先しこの固定項目は表示しない
const assigneeOptions = computed(() => {
  const uids = new Set([appDef.value?.ownerUid, ...(appDef.value?.staffUids ?? [])].filter(Boolean))
  return allUsers.value.filter(u => uids.has(u.uid))
})
const builderAssigneeField = computed(() => appDef.value?.fields.find(f => f.type === 'assignee'))
const plannerOptions = computed(() => allUsers.value)
const reminderAudienceCandidates = computed(() => allUsers.value)
const toggleReminderAudience = (uid: string) => {
  const curr = form.value.reminderAudienceUids ?? []
  form.value.reminderAudienceUids = curr.includes(uid) ? curr.filter(u => u !== uid) : [...curr, uid]
}

onMounted(async () => {
  loading.value = true
  error.value = ''
  try {
    const [customer, raw, fetchedUsers] = await Promise.all([
      fetchCustomer(customerId.value),
      fetchCase(customerId.value, serviceType.value as ServiceType, caseId.value),
      fetchUsers().catch(() => []),
    ])
    allUsers.value = fetchedUsers
    appDef.value = await getPublishedByServiceType(serviceType.value).catch(() => null)

    customerName.value = customer?.name ?? ''

    if (!raw) {
      notFound.value = true
      return
    }

    form.value = {
      status: raw.status,
      date: raw.date ?? '',
      contractDate: raw.contractDate ?? '',
      amount: raw.amount ?? '',
      company: raw.company ?? '',
      notes: raw.notes ?? '',
      reminderDate: raw.reminderDate ?? '',
      reminderNote: raw.reminderNote ?? '',
      assigneeUid: raw.assigneeUid ?? '',
      plannerUid: raw.plannerUid ?? '',
      reminderAudienceUids: raw.reminderAudienceUids ? [...raw.reminderAudienceUids] : [],
    }
    customFieldValues.value = raw.customFields ? { ...raw.customFields } : {}
  }
  catch (e: any) {
    error.value = e.message ?? 'データの取得に失敗しました'
  }
  finally {
    loading.value = false
  }
})

const handleSubmit = async () => {
  submitting.value = true
  error.value = ''
  try {
    // 空文字・空配列のフィールドは保存しない（Firestoreはundefinedを許可しないため、
    // 未入力分をあらかじめ取り除いておく）
    const cleanedCustomFields = Object.fromEntries(
      Object.entries(customFieldValues.value).filter(([, v]) => (Array.isArray(v) ? v.length > 0 : !!v)),
    )
    const resolvedAssigneeUid = builderAssigneeField.value
      ? (customFieldValues.value[builderAssigneeField.value.id] as string | undefined)
      : form.value.assigneeUid
    await updateCase(customerId.value, serviceType.value as ServiceType, caseId.value, {
      ...form.value,
      assigneeUid: resolvedAssigneeUid || undefined,
      plannerUid: form.value.plannerUid || undefined,
      reminderAudienceUids: form.value.reminderAudienceUids && form.value.reminderAudienceUids.length > 0
        ? form.value.reminderAudienceUids
        : undefined,
      customFields: Object.keys(cleanedCustomFields).length > 0 ? cleanedCustomFields : undefined,
    })
    await navigateTo(`/customers/${customerId.value}/services/${serviceType.value}/${caseId.value}`)
  }
  catch (e: any) {
    error.value = e.message ?? '保存に失敗しました'
    submitting.value = false
  }
}

const handleDelete = async () => {
  if (!confirm('この案件を削除してよろしいですか？')) return
  error.value = ''
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
  <div class="p-4 md:p-6 max-w-2xl mx-auto space-y-5">

    <!-- パンくず -->
    <div class="flex items-center gap-2 text-sm text-gray-400 flex-wrap">
      <NuxtLink :to="`/customers/${customerId}`">{{ customerName }}</NuxtLink>
      <Icon name="heroicons:chevron-right" class="h-3 w-3" />
      <NuxtLink :to="`/customers/${customerId}/services/${serviceType}/${caseId}`">{{ serviceLabel }} 案件詳細</NuxtLink>
      <Icon name="heroicons:chevron-right" class="h-3 w-3" />
      <span class="text-gray-600">編集</span>
    </div>

    <h1 class="text-xl font-bold text-gray-900">{{ serviceLabel }} — 案件編集</h1>

    <!-- 読み込み中 -->
    <div v-if="loading" class="card p-12 text-center">
      <Icon name="heroicons:arrow-path" class="h-8 w-8 text-gray-300 mx-auto mb-2 animate-spin" />
      <p class="text-sm text-gray-400">読み込み中...</p>
    </div>

    <!-- 案件が見つからない -->
    <div v-else-if="notFound" class="card p-10 text-center">
      <Icon name="heroicons:exclamation-circle" class="h-10 w-10 text-gray-300 mx-auto mb-2" />
      <p class="text-gray-400">案件が見つかりませんでした</p>
      <NuxtLink :to="`/customers/${customerId}/services/${serviceType}`" class="mt-3 inline-block text-sm text-primary-600 hover:underline">← 一覧に戻る</NuxtLink>
    </div>

    <form v-else class="card p-6 space-y-5" @submit.prevent="handleSubmit">

      <p v-if="error" class="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{{ error }}</p>

      <!-- ステータス -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1.5">対応ステータス <span class="text-red-500">*</span></label>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="opt in [
              { value: 'consulting', label: '相談中' },
              { value: 'considering', label: '検討中' },
              { value: 'contracted', label: '成約' },
              { value: 'completed', label: '完了' },
              { value: 'failed', label: '不成立' },
            ]"
            :key="opt.value"
            type="button"
            class="flex items-center gap-1.5 cursor-pointer rounded-lg border px-3 py-2 text-sm transition"
            :class="form.status === opt.value ? 'border-primary-400 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'"
            @click="form.status = opt.value as ServiceStatus"
          >{{ opt.label }}</button>
        </div>
      </div>

      <!-- 担当者（フィールドビルダーで「担当者」項目が追加されていない場合のみ表示）・担当未来設計士 -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div v-if="!builderAssigneeField">
          <label class="block text-sm font-medium text-gray-700 mb-1.5">担当者</label>
          <select v-model="form.assigneeUid" class="input-field">
            <option value="">選択してください</option>
            <option v-for="u in assigneeOptions" :key="u.uid" :value="u.uid">{{ u.displayName }}</option>
          </select>
          <p v-if="assigneeOptions.length === 0" class="mt-1 text-xs text-gray-400">
            アプリ管理でこのアプリの責任者・担当者を設定すると選択できます
          </p>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">担当未来設計士</label>
          <select v-model="form.plannerUid" class="input-field">
            <option value="">選択してください</option>
            <option v-for="u in plannerOptions" :key="u.uid" :value="u.uid">{{ u.displayName }}</option>
          </select>
        </div>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1.5">対応開始日</label>
        <input v-model="form.date" type="date" class="input-field" />
      </div>

      <div v-if="form.status === 'contracted' || form.status === 'completed'">
        <label class="block text-sm font-medium text-gray-700 mb-1.5">成約日</label>
        <input v-model="form.contractDate" type="date" class="input-field" />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1.5">会社名・保険会社</label>
        <input v-model="form.company" type="text" class="input-field" />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1.5">金額・保険料</label>
        <input v-model="form.amount" type="text" class="input-field" />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1.5">備考・メモ</label>
        <textarea v-model="form.notes" rows="4" class="input-field" />
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">リマインダー日</label>
          <input v-model="form.reminderDate" type="date" class="input-field" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">リマインダー内容</label>
          <input v-model="form.reminderNote" type="text" placeholder="リマインダー内容を入力..." class="input-field" />
        </div>
      </div>

      <!-- リマインド対象者 -->
      <div v-if="form.reminderDate">
        <label class="block text-sm font-medium text-gray-700 mb-1.5">
          リマインド対象者
          <span class="text-xs font-normal text-gray-400">（未選択の場合は担当者・担当未来設計士に表示されます）</span>
        </label>
        <div class="flex flex-wrap gap-2">
          <label
            v-for="u in reminderAudienceCandidates" :key="u.uid"
            class="flex items-center gap-1.5 cursor-pointer rounded-lg border px-3 py-1.5 text-sm transition"
            :class="(form.reminderAudienceUids ?? []).includes(u.uid) ? 'border-primary-400 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'"
            @click="toggleReminderAudience(u.uid)"
          >{{ u.displayName }}</label>
        </div>
      </div>

      <!-- アプリ管理で設定した追加項目 -->
      <div v-if="appDef && appDef.fields.length > 0" class="pt-4 border-t border-gray-100 space-y-4">
        <h3 class="font-semibold text-gray-900 flex items-center gap-2">
          <Icon name="heroicons:squares-2x2" class="h-5 w-5 text-primary-600" />
          {{ appDef.name }}の項目
        </h3>
        <AppDynamicFields
          v-model="customFieldValues"
          :fields="appDef.fields"
          :customer-id="customerId"
          :owner-uid="appDef.ownerUid"
          :staff-uids="appDef.staffUids"
        />
      </div>

      <div class="flex justify-between pt-2">
        <NuxtLink :to="`/customers/${customerId}/services/${serviceType}/${caseId}`" class="btn-secondary">
          キャンセル
        </NuxtLink>
        <div class="flex items-center gap-2">
          <button type="button" class="btn-danger text-sm" @click="handleDelete">
            <Icon name="heroicons:trash" class="h-4 w-4" />
          </button>
          <button type="submit" class="btn-primary" :disabled="submitting">
            <Icon v-if="submitting" name="heroicons:arrow-path" class="h-4 w-4 animate-spin mr-1" />
            {{ submitting ? '保存中...' : '変更を保存する' }}
          </button>
        </div>
      </div>

    </form>
  </div>
</template>
