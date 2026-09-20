<script setup lang="ts">
// アプリ管理（フォームビルダー）で設定したフィールド定義(AppFieldDef[])を元に、
// 実際に入力・保存できるフォームを描画する共通コンポーネント。
// 対応している項目タイプ: text / textarea / date / time / datetime /
// radio / dropdown / checkbox / multi_select / yes_no / label（表示のみ）/
// space（レイアウトのみ）/ group（セクション見出し、値は持たない）/
// file（Firebase Storageへアップロードし、ダウンロードURLを値として保存）/
// lookup（同じ顧客のパーソナルデータ・他アプリの最新案件から自動入力、読み取り専用）/
// related_records（同じ顧客の他アプリの案件一覧を表示、読み取り専用）/
// assignee（アプリの責任者・担当者から選択）。
// 未対応（table / record_number）はその旨を表示し、値の入力・保存は行わない
import type { AppFieldDef } from '~/types/appDef'
import type { ServiceCase } from '~/types/service'
import type { AppUser } from '~/types/user'
import { STATUS_LABELS } from '~/types/service'
import { useCustomerStore } from '~/composables/useCustomerStore'
import { useAppDefs } from '~/composables/useAppDefs'
import { useServices } from '~/composables/useServices'
import { useUsers } from '~/composables/useUsers'
import { useStorage } from '~/composables/useStorage'

const props = defineProps<{
  fields: AppFieldDef[]
  modelValue: Record<string, string | string[]>
  customerId?: string
  ownerUid?: string
  staffUids?: string[]
}>()

const emit = defineEmits<{ (e: 'update:modelValue', value: Record<string, string | string[]>): void }>()

const SUPPORTED_TYPES = [
  'text', 'textarea', 'date', 'time', 'datetime',
  'radio', 'dropdown', 'checkbox', 'multi_select', 'yes_no',
  'lookup', 'related_records', 'assignee', 'group', 'file',
]
const isSupported = (type: string) => SUPPORTED_TYPES.includes(type)

const values = computed<Record<string, string | string[]>>({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const getStr = (id: string): string => {
  const v = values.value[id]
  return typeof v === 'string' ? v : ''
}
const setStr = (id: string, v: string) => {
  values.value = { ...values.value, [id]: v }
}
const getArr = (id: string): string[] => {
  const v = values.value[id]
  return Array.isArray(v) ? v : []
}
const toggleArr = (id: string, opt: string) => {
  const curr = getArr(id)
  const next = curr.includes(opt) ? curr.filter(o => o !== opt) : [...curr, opt]
  values.value = { ...values.value, [id]: next }
}

// ── ルックアップ・関連レコード一覧 ──────────────────────────────────
const { getById: getCustomerById, ensureLoaded: ensureCustomersLoaded } = useCustomerStore()
const { appDefs, fetchAll: fetchAppDefs } = useAppDefs()
const { fetchCases } = useServices()

// ── 担当者（アプリの責任者・担当者から選択） ────────────────────────
const { fetchUsers } = useUsers()
const allUsers = ref<AppUser[]>([])
if (props.fields.some(f => f.type === 'assignee')) {
  fetchUsers().then((users) => { allUsers.value = users }).catch(() => {})
}
const assigneeOptions = computed(() => {
  const uids = new Set([props.ownerUid, ...(props.staffUids ?? [])].filter(Boolean))
  return allUsers.value.filter(u => uids.has(u.uid))
})

// ── ファイル添付（Firebase Storageへアップロードし、ダウンロードURLを値として保存） ──
const { uploadFile } = useStorage()
const fileUploading = ref<Record<string, boolean>>({})
const fileError = ref<Record<string, string>>({})

const handleFileUpload = async (f: AppFieldDef, e: Event) => {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  fileUploading.value = { ...fileUploading.value, [f.id]: true }
  fileError.value = { ...fileError.value, [f.id]: '' }
  try {
    const path = `appCustomFieldFiles/${props.customerId ?? 'unknown'}/${f.id}/${Date.now()}_${file.name}`
    const url = await uploadFile(path, file)
    setStr(f.id, url)
  } catch (err: any) {
    fileError.value = { ...fileError.value, [f.id]: err.message ?? 'アップロードに失敗しました' }
  } finally {
    fileUploading.value = { ...fileUploading.value, [f.id]: false }
    input.value = ''
  }
}

// FirebaseのダウンロードURLから元のファイル名を復元する
const filenameFromStorageUrl = (url: string): string => {
  try {
    const encodedPath = url.split('/o/')[1]?.split('?')[0] ?? ''
    const decodedPath = decodeURIComponent(encodedPath)
    return decodedPath.split('/').pop() || 'ファイル'
  } catch {
    return 'ファイル'
  }
}

const customer = computed(() => props.customerId ? getCustomerById(props.customerId).value : null)

const CUSTOMER_FIELD_MAP: Record<string, (c: any) => string | undefined> = {
  name: c => c.name,
  nameKana: c => c.nameKana,
  tel: c => c.tel,
  email: c => c.email,
  address: c => c.address,
  dob: c => c.dob,
  employer: c => c.employer,
  assignedFpName: c => c.assignedFpName,
}

const GENERIC_BUILTIN_FIELD_MAP: Record<string, (c: ServiceCase) => string | undefined> = {
  'builtin:status':       c => STATUS_LABELS[c.status] ?? c.status,
  'builtin:company':      c => c.company,
  'builtin:amount':       c => c.amount,
  'builtin:notes':        c => c.notes,
  'builtin:date':         c => c.date,
  'builtin:contractDate': c => c.contractDate,
}

const lookupLoading = ref<Record<string, boolean>>({})
interface RelatedRecordsState { loading: boolean; cases: ServiceCase[]; appName: string; serviceType: string }
const relatedRecordsData = ref<Record<string, RelatedRecordsState>>({})

const resolveLookup = async (f: AppFieldDef) => {
  if (!props.customerId) return
  lookupLoading.value = { ...lookupLoading.value, [f.id]: true }
  try {
    if (f.lookupSource === 'customer') {
      const resolver = f.lookupCustomerField ? CUSTOMER_FIELD_MAP[f.lookupCustomerField] : undefined
      const resolved = (resolver && customer.value) ? (resolver(customer.value) ?? '') : ''
      setStr(f.id, resolved)
    } else if (f.lookupSource === 'app' && f.lookupAppId) {
      const targetApp = appDefs.value.find(a => a.id === f.lookupAppId)
      if (!targetApp?.sourceServiceType) { setStr(f.id, ''); return }
      const cases = await fetchCases(props.customerId, targetApp.sourceServiceType)
      const latest = cases[0]
      if (!latest || !f.lookupFieldKey) { setStr(f.id, ''); return }
      if (f.lookupFieldKey.startsWith('builtin:')) {
        setStr(f.id, GENERIC_BUILTIN_FIELD_MAP[f.lookupFieldKey]?.(latest) ?? '')
      } else if (f.lookupFieldKey.startsWith('custom:')) {
        const targetFieldId = f.lookupFieldKey.replace('custom:', '')
        const raw = latest.customFields?.[targetFieldId]
        setStr(f.id, Array.isArray(raw) ? raw.join('、') : (raw ?? ''))
      }
    }
  } catch {
    // 参照先の取得に失敗した場合は空のままにする（入力自体は妨げない）
  } finally {
    lookupLoading.value = { ...lookupLoading.value, [f.id]: false }
  }
}

const resolveRelated = async (f: AppFieldDef) => {
  if (!props.customerId || !f.relatedAppId) return
  const targetApp = appDefs.value.find(a => a.id === f.relatedAppId)
  if (!targetApp?.sourceServiceType) return
  relatedRecordsData.value = {
    ...relatedRecordsData.value,
    [f.id]: { loading: true, cases: [], appName: targetApp.name, serviceType: targetApp.sourceServiceType },
  }
  try {
    const cases = await fetchCases(props.customerId, targetApp.sourceServiceType)
    relatedRecordsData.value = {
      ...relatedRecordsData.value,
      [f.id]: { loading: false, cases, appName: targetApp.name, serviceType: targetApp.sourceServiceType },
    }
  } catch {
    relatedRecordsData.value = {
      ...relatedRecordsData.value,
      [f.id]: { loading: false, cases: [], appName: targetApp.name, serviceType: targetApp.sourceServiceType },
    }
  }
}

watch(
  () => [props.customerId, props.fields] as const,
  async () => {
    if (!props.customerId) return
    await Promise.all([ensureCustomersLoaded(), fetchAppDefs()])
    for (const f of props.fields) {
      if (f.type === 'lookup') resolveLookup(f)
      else if (f.type === 'related_records') resolveRelated(f)
    }
  },
  { immediate: true },
)

const statusClass = (status: string) => {
  if (/成約/.test(status)) return 'bg-green-100 text-green-700'
  if (/不成立/.test(status)) return 'bg-red-100 text-red-600'
  if (/検討/.test(status)) return 'bg-amber-100 text-amber-700'
  return 'bg-gray-100 text-gray-600'
}
</script>

<template>
  <div class="space-y-4">
    <template v-for="f in fields" :key="f.id">
      <!-- ラベル（説明表示のみ、値は持たない） -->
      <div
        v-if="f.type === 'label'"
        class="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 text-sm text-gray-700 prose prose-sm max-w-none"
        v-html="f.label"
      />
      <!-- スペース -->
      <div v-else-if="f.type === 'space'" class="h-2" />

      <!-- グループ（セクション見出し、値は持たない） -->
      <div v-else-if="f.type === 'group'" class="pt-2 border-t border-gray-100 first:border-t-0 first:pt-0">
        <h4 class="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
          <Icon name="heroicons:rectangle-group" class="h-4 w-4 text-gray-400" />
          {{ f.label }}
        </h4>
      </div>

      <!-- ファイル添付 -->
      <div v-else-if="f.type === 'file'">
        <label class="block text-sm font-medium text-gray-700 mb-1.5">{{ f.label }}<span v-if="f.required" class="text-red-500 ml-1">*</span></label>
        <div v-if="getStr(f.id)" class="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm">
          <Icon name="heroicons:paper-clip" class="h-4 w-4 text-gray-400 shrink-0" />
          <a :href="getStr(f.id)" target="_blank" rel="noopener" class="flex-1 min-w-0 truncate text-primary-600 hover:underline">
            {{ filenameFromStorageUrl(getStr(f.id)) }}
          </a>
          <button type="button" class="text-gray-300 hover:text-red-400 shrink-0" @click="setStr(f.id, '')">
            <Icon name="heroicons:x-mark" class="h-4 w-4" />
          </button>
        </div>
        <div v-else>
          <input
            type="file"
            class="input-field text-sm"
            :disabled="fileUploading[f.id]"
            @change="handleFileUpload(f, $event)"
          />
          <p v-if="fileUploading[f.id]" class="text-xs text-gray-400 mt-1 flex items-center gap-1">
            <Icon name="heroicons:arrow-path" class="h-3 w-3 animate-spin" />アップロード中...
          </p>
          <p v-if="fileError[f.id]" class="text-xs text-red-500 mt-1">{{ fileError[f.id] }}</p>
        </div>
      </div>

      <!-- 文字列（1行） -->
      <div v-else-if="f.type === 'text'">
        <label class="block text-sm font-medium text-gray-700 mb-1.5">{{ f.label }}<span v-if="f.required" class="text-red-500 ml-1">*</span></label>
        <input :value="getStr(f.id)" type="text" class="input-field" @input="setStr(f.id, ($event.target as HTMLInputElement).value)" />
      </div>
      <!-- 文字列（複数行） -->
      <div v-else-if="f.type === 'textarea'">
        <label class="block text-sm font-medium text-gray-700 mb-1.5">{{ f.label }}<span v-if="f.required" class="text-red-500 ml-1">*</span></label>
        <textarea :value="getStr(f.id)" rows="3" class="input-field resize-none" @input="setStr(f.id, ($event.target as HTMLTextAreaElement).value)" />
      </div>
      <!-- 日付 -->
      <div v-else-if="f.type === 'date'">
        <label class="block text-sm font-medium text-gray-700 mb-1.5">{{ f.label }}<span v-if="f.required" class="text-red-500 ml-1">*</span></label>
        <input :value="getStr(f.id)" type="date" class="input-field" @input="setStr(f.id, ($event.target as HTMLInputElement).value)" />
      </div>
      <!-- 時刻 -->
      <div v-else-if="f.type === 'time'">
        <label class="block text-sm font-medium text-gray-700 mb-1.5">{{ f.label }}<span v-if="f.required" class="text-red-500 ml-1">*</span></label>
        <input :value="getStr(f.id)" type="time" class="input-field" @input="setStr(f.id, ($event.target as HTMLInputElement).value)" />
      </div>
      <!-- 日時 -->
      <div v-else-if="f.type === 'datetime'">
        <label class="block text-sm font-medium text-gray-700 mb-1.5">{{ f.label }}<span v-if="f.required" class="text-red-500 ml-1">*</span></label>
        <input :value="getStr(f.id)" type="datetime-local" class="input-field" @input="setStr(f.id, ($event.target as HTMLInputElement).value)" />
      </div>
      <!-- ラジオ -->
      <div v-else-if="f.type === 'radio'">
        <label class="block text-sm font-medium text-gray-700 mb-1.5">{{ f.label }}<span v-if="f.required" class="text-red-500 ml-1">*</span></label>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="opt in f.options" :key="opt"
            type="button"
            class="flex items-center gap-1.5 cursor-pointer rounded-lg border px-3 py-2 text-sm transition"
            :class="getStr(f.id) === opt ? 'border-primary-400 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'"
            @click="setStr(f.id, opt)"
          >{{ opt }}</button>
        </div>
      </div>
      <!-- ドロップダウン -->
      <div v-else-if="f.type === 'dropdown'">
        <label class="block text-sm font-medium text-gray-700 mb-1.5">{{ f.label }}<span v-if="f.required" class="text-red-500 ml-1">*</span></label>
        <select :value="getStr(f.id)" class="input-field" @change="setStr(f.id, ($event.target as HTMLSelectElement).value)">
          <option value="">選択してください</option>
          <option v-for="opt in f.options" :key="opt" :value="opt">{{ opt }}</option>
        </select>
      </div>
      <!-- チェックボックス（複数選択） -->
      <div v-else-if="f.type === 'checkbox'">
        <label class="block text-sm font-medium text-gray-700 mb-1.5">{{ f.label }}<span v-if="f.required" class="text-red-500 ml-1">*</span></label>
        <div class="flex flex-wrap gap-2">
          <label
            v-for="opt in f.options" :key="opt"
            class="flex items-center gap-1 cursor-pointer rounded-lg border px-3 py-1.5 text-sm transition"
            :class="getArr(f.id).includes(opt) ? 'border-primary-400 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'"
            @click="toggleArr(f.id, opt)"
          >{{ opt }}</label>
        </div>
      </div>
      <!-- 複数選択 -->
      <div v-else-if="f.type === 'multi_select'">
        <label class="block text-sm font-medium text-gray-700 mb-1.5">{{ f.label }}<span v-if="f.required" class="text-red-500 ml-1">*</span></label>
        <div class="flex flex-wrap gap-2">
          <label
            v-for="opt in f.options" :key="opt"
            class="flex items-center gap-1 cursor-pointer rounded-lg border px-3 py-1.5 text-sm transition"
            :class="getArr(f.id).includes(opt) ? 'border-primary-400 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'"
            @click="toggleArr(f.id, opt)"
          >{{ opt }}</label>
        </div>
      </div>
      <!-- はい/いいえ -->
      <div v-else-if="f.type === 'yes_no'" class="flex items-center gap-2">
        <input
          type="checkbox"
          class="accent-primary-600 rounded h-4 w-4"
          :checked="getStr(f.id) === 'はい'"
          @change="setStr(f.id, ($event.target as HTMLInputElement).checked ? 'はい' : 'いいえ')"
        />
        <label class="text-sm font-medium text-gray-700">{{ f.label }}</label>
      </div>

      <!-- ルックアップ（読み取り専用・自動入力） -->
      <div v-else-if="f.type === 'lookup'">
        <label class="block text-sm font-medium text-gray-700 mb-1.5">
          {{ f.label }}
          <span class="text-[10px] font-normal text-gray-400 ml-1">（自動入力・読み取り専用）</span>
        </label>
        <div v-if="!customerId" class="input-field bg-gray-50 text-gray-400 text-sm">顧客情報が確定してから表示されます</div>
        <div v-else-if="lookupLoading[f.id]" class="input-field bg-gray-50 text-gray-400 text-sm flex items-center gap-1.5">
          <Icon name="heroicons:arrow-path" class="h-3.5 w-3.5 animate-spin" />読み込み中...
        </div>
        <div v-else class="input-field bg-gray-50 text-gray-700 text-sm">{{ getStr(f.id) || '（参照先にデータがありません）' }}</div>
      </div>

      <!-- 関連レコード一覧（読み取り専用のライブ表示） -->
      <div v-else-if="f.type === 'related_records'">
        <label class="block text-sm font-medium text-gray-700 mb-1.5">{{ f.label }}</label>
        <div v-if="!customerId" class="border border-gray-200 rounded-lg p-4 bg-gray-50 text-sm text-gray-400 text-center">
          顧客情報が確定してから表示されます
        </div>
        <div v-else-if="!f.relatedAppId" class="border border-gray-200 rounded-lg p-4 bg-gray-50 text-sm text-gray-400 text-center">
          関連レコード一覧（アプリ管理で参照アプリの設定が必要です）
        </div>
        <div v-else-if="relatedRecordsData[f.id]?.loading" class="border border-gray-200 rounded-lg p-4 bg-gray-50 text-sm text-gray-400 text-center flex items-center justify-center gap-1.5">
          <Icon name="heroicons:arrow-path" class="h-3.5 w-3.5 animate-spin" />読み込み中...
        </div>
        <div v-else-if="!relatedRecordsData[f.id]?.cases.length" class="border border-gray-200 rounded-lg p-4 bg-gray-50 text-sm text-gray-400 text-center">
          {{ relatedRecordsData[f.id]?.appName ?? f.label }}の案件はありません
        </div>
        <div v-else class="border border-gray-200 rounded-lg divide-y divide-gray-100 overflow-hidden">
          <NuxtLink
            v-for="c in relatedRecordsData[f.id].cases"
            :key="c.id"
            :to="`/customers/${c.customerId}/services/${relatedRecordsData[f.id].serviceType}/${c.id}`"
            class="flex items-center justify-between gap-2 px-3 py-2 text-sm hover:bg-gray-50 transition"
          >
            <span class="badge text-xs" :class="statusClass(STATUS_LABELS[c.status] ?? c.status)">{{ STATUS_LABELS[c.status] ?? c.status }}</span>
            <span class="flex-1 min-w-0 truncate text-gray-600 text-xs">{{ c.company || c.notes || '—' }}</span>
            <Icon name="heroicons:chevron-right" class="h-3.5 w-3.5 text-gray-300 shrink-0" />
          </NuxtLink>
        </div>
      </div>

      <!-- 担当者（アプリの責任者・担当者から選択） -->
      <div v-else-if="f.type === 'assignee'">
        <label class="block text-sm font-medium text-gray-700 mb-1.5">{{ f.label }}<span v-if="f.required" class="text-red-500 ml-1">*</span></label>
        <select :value="getStr(f.id)" class="input-field" @change="setStr(f.id, ($event.target as HTMLSelectElement).value)">
          <option value="">選択してください</option>
          <option v-for="u in assigneeOptions" :key="u.uid" :value="u.uid">{{ u.displayName }}</option>
        </select>
        <p v-if="assigneeOptions.length === 0" class="mt-1 text-xs text-gray-400">
          アプリ管理でこのアプリの責任者・担当者を設定すると選択できます
        </p>
      </div>

      <!-- 未対応の項目タイプ -->
      <div v-else-if="!isSupported(f.type)" class="rounded-lg border border-dashed border-gray-200 p-3 text-xs text-gray-400">
        「{{ f.label }}」は現在このフォームでは未対応の項目タイプです（アプリ管理でのみ設定可能）
      </div>
    </template>
  </div>
</template>
