<script setup lang="ts">
// kintoneエクスポートCSVから、このアプリ（AppDef）が連携しているserviceTypeの
// 案件データを一括登録するインポートウィザード。
// customers/import.vue（パーソナルデータの一括インポート）と同じ4ステップ構成だが、
// あちらと異なりダミーデータではなく実際にアップロードされたCSVを解析する
import { readCsvFile, parseCsv } from '~/utils/csv'
import { useAppDefs } from '~/composables/useAppDefs'
import { useCustomerStore } from '~/composables/useCustomerStore'
import { useServices } from '~/composables/useServices'
import type { AppDef } from '~/types/appDef'
import type { ServiceCaseForm, ServiceStatus, ServiceType } from '~/types/service'

definePageMeta({ middleware: ['auth', 'admin'] })

const route = useRoute()
const appId = computed(() => route.params.appId as string)

const { fetchOne } = useAppDefs()
const { customers, ensureLoaded: ensureCustomersLoaded } = useCustomerStore()
const { createCase } = useServices()

const loading = ref(true)
const loadError = ref('')
const app = ref<AppDef | null>(null)

onMounted(async () => {
  try {
    const [fetched] = await Promise.all([fetchOne(appId.value), ensureCustomersLoaded()])
    if (!fetched) {
      loadError.value = 'アプリが見つかりませんでした'
    } else if (!fetched.sourceServiceType) {
      loadError.value = 'このアプリはまだ既存データと連携されていません。アプリ設定の「既存データとの連携」で対象アプリを選択してください'
    } else {
      app.value = fetched
    }
  } catch (e: any) {
    loadError.value = e.message ?? 'アプリの取得に失敗しました'
  } finally {
    loading.value = false
  }
})

const serviceType = computed(() => app.value?.sourceServiceType as ServiceType | undefined)

// ── ステップ管理 ─────────────────────────────────────────────
const step = ref(1)
const steps = ['CSVアップロード', 'フィールドマッピング', 'プレビュー・検証', 'インポート実行']

// ── Step1: CSVアップロード ─────────────────────────────────────
const selectedFile = ref<File | null>(null)
const isDragging = ref(false)
const parsing = ref(false)
const parseError = ref('')
const csvHeaders = ref<string[]>([])
const csvRows = ref<Record<string, string>[]>([])

const loadFile = async (file: File) => {
  selectedFile.value = file
  parsing.value = true
  parseError.value = ''
  try {
    const text = await readCsvFile(file)
    const { headers, rows } = parseCsv(text)
    if (headers.length === 0) throw new Error('CSVの列（ヘッダー行）を読み取れませんでした')
    csvHeaders.value = headers
    csvRows.value = rows
  } catch (e: any) {
    parseError.value = e.message ?? 'CSVの読み込みに失敗しました'
    selectedFile.value = null
  } finally {
    parsing.value = false
  }
}

const onFileSelect = (e: Event) => {
  const input = e.target as HTMLInputElement
  if (input.files?.[0]) loadFile(input.files[0])
}
const onDrop = (e: DragEvent) => {
  isDragging.value = false
  const file = e.dataTransfer?.files[0]
  if (file && file.name.toLowerCase().endsWith('.csv')) loadFile(file)
}

// ── Step2: フィールドマッピング ─────────────────────────────────
// マッピング先: 顧客名（一致用）／汎用項目（対応開始日・成約日・金額・会社名・備考・
// リマインダー日・リマインダー内容）／このアプリ専用項目（AppDefのfields）
const CUSTOMER_NAME_TARGET = '__customerName'
const GENERIC_FIELD_OPTIONS = [
  { value: 'date',         label: '対応開始日' },
  { value: 'contractDate', label: '成約日' },
  { value: 'amount',       label: '金額・保険料' },
  { value: 'company',      label: '会社名・保険会社' },
  { value: 'notes',        label: '備考・メモ' },
  { value: 'reminderDate', label: 'リマインダー日' },
  { value: 'reminderNote', label: 'リマインダー内容' },
]

const fieldOptions = computed(() => [
  { value: '', label: '（マッピングしない）' },
  { value: CUSTOMER_NAME_TARGET, label: '★顧客名（既存の顧客と照合します）' },
  ...GENERIC_FIELD_OPTIONS,
  ...(app.value?.fields ?? [])
    .filter(f => !['label', 'space', 'record_number'].includes(f.type))
    .map(f => ({ value: f.id, label: `［${app.value!.name}］${f.label}` })),
])

const mapping = ref<Record<string, string>>({})

// 列名から「顧客名」「氏名」等を含むものを初期値として自動推定しておく（変更可能）
watch(csvHeaders, (headers) => {
  const m: Record<string, string> = {}
  headers.forEach((h) => {
    if (/顧客|氏名|名前/.test(h) && !Object.values(m).includes(CUSTOMER_NAME_TARGET)) {
      m[h] = CUSTOMER_NAME_TARGET
    } else {
      m[h] = ''
    }
  })
  mapping.value = m
})

const hasCustomerMapping = computed(() => Object.values(mapping.value).includes(CUSTOMER_NAME_TARGET))
const defaultStatus = ref<ServiceStatus>('consulting')

// ── Step3: プレビュー・検証 ─────────────────────────────────────
interface PreviewRow {
  customerName: string
  matchedCustomerId: string | null
  formFields: Partial<ServiceCaseForm>
  customFields: Record<string, string | string[]>
  valid: boolean
  error: string
}

const splitMultiValue = (raw: string): string[] =>
  raw.split(/[、,]/).map(s => s.trim()).filter(Boolean)

const previewRows = computed<PreviewRow[]>(() => {
  const nameCol = Object.entries(mapping.value).find(([, target]) => target === CUSTOMER_NAME_TARGET)?.[0]
  const fieldsById = new Map((app.value?.fields ?? []).map(f => [f.id, f]))

  return csvRows.value.map((row) => {
    const customerName = nameCol ? (row[nameCol] ?? '').trim() : ''
    const matched = customerName
      ? customers.value.find(c => c.name.trim() === customerName)
      : undefined

    const formFields: Partial<ServiceCaseForm> = {}
    const customFields: Record<string, string | string[]> = {}
    const missingRequired: string[] = []

    for (const [col, target] of Object.entries(mapping.value)) {
      if (!target || target === CUSTOMER_NAME_TARGET) continue
      const raw = (row[col] ?? '').trim()
      if (!raw) continue
      if (GENERIC_FIELD_OPTIONS.some(o => o.value === target)) {
        ;(formFields as Record<string, string>)[target] = raw
      } else {
        const def = fieldsById.get(target)
        customFields[target] = def && ['checkbox', 'multi_select'].includes(def.type)
          ? splitMultiValue(raw)
          : raw
      }
    }

    for (const f of app.value?.fields ?? []) {
      if (f.required && !['label', 'space', 'record_number'].includes(f.type)) {
        const v = customFields[f.id]
        if (!v || (Array.isArray(v) && v.length === 0)) missingRequired.push(f.label)
      }
    }

    let error = ''
    if (!nameCol) error = '顧客名の列がマッピングされていません'
    else if (!customerName) error = '顧客名が空です'
    else if (!matched) error = '一致する顧客が見つかりません'
    else if (missingRequired.length > 0) error = `必須項目が未入力: ${missingRequired.join('、')}`

    return {
      customerName,
      matchedCustomerId: matched?.id ?? null,
      formFields,
      customFields,
      valid: !error,
      error,
    }
  })
})

const validCount = computed(() => previewRows.value.filter(r => r.valid).length)
const errorCount = computed(() => previewRows.value.filter(r => !r.valid).length)

// ── Step4: インポート実行 ───────────────────────────────────────
const importing = ref(false)
const importDone = ref(false)
const importProgress = ref(0)
const importResult = ref({ success: 0, error: 0 })

// 大量行を一度に投げず、5件ずつ並行実行してFirestoreへの同時書き込みを抑える
const CONCURRENCY = 5

const handleImport = async () => {
  if (!serviceType.value) return
  importing.value = true
  importProgress.value = 0
  const targetRows = previewRows.value.filter(r => r.valid)
  let success = 0
  let errorN = 0

  for (let i = 0; i < targetRows.length; i += CONCURRENCY) {
    const chunk = targetRows.slice(i, i + CONCURRENCY)
    const results = await Promise.allSettled(chunk.map(row =>
      createCase(row.matchedCustomerId!, serviceType.value!, {
        status: defaultStatus.value,
        ...row.formFields,
        customFields: Object.keys(row.customFields).length > 0 ? row.customFields : undefined,
      }),
    ))
    results.forEach((r) => { if (r.status === 'fulfilled') success++; else errorN++ })
    importProgress.value = Math.min(100, Math.round(((i + chunk.length) / targetRows.length) * 100))
  }

  importResult.value = { success, error: errorN }
  importing.value = false
  importDone.value = true
}
</script>

<template>
  <div class="p-4 md:p-6 max-w-4xl mx-auto space-y-6">

    <div class="flex items-center gap-3">
      <NuxtLink :to="`/admin/apps/${appId}`" class="text-sm text-gray-400 hover:text-gray-600">← アプリ設定</NuxtLink>
    </div>
    <h1 class="text-xl font-bold text-gray-900 flex items-center gap-2">
      <Icon name="heroicons:arrow-up-tray" class="h-6 w-6 text-primary-600" />
      {{ app?.name ? `${app.name} — ` : '' }}kintone CSVインポート
    </h1>

    <div v-if="loading" class="card p-10 text-center">
      <Icon name="heroicons:arrow-path" class="h-8 w-8 text-gray-300 mx-auto mb-2 animate-spin" />
    </div>

    <div v-else-if="loadError" class="card p-8 text-center">
      <Icon name="heroicons:exclamation-circle" class="h-10 w-10 text-amber-300 mx-auto mb-3" />
      <p class="text-sm text-gray-500">{{ loadError }}</p>
    </div>

    <template v-else>

      <!-- ステッパー -->
      <div class="flex items-center">
        <template v-for="(s, i) in steps" :key="i">
          <div class="flex items-center gap-2">
            <div
              class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition"
              :class="step > i + 1 ? 'bg-primary-600 text-white' : step === i + 1 ? 'bg-primary-600 text-white ring-4 ring-primary-100' : 'bg-gray-200 text-gray-500'"
            >
              <Icon v-if="step > i + 1" name="heroicons:check" class="h-4 w-4" />
              <span v-else>{{ i + 1 }}</span>
            </div>
            <span class="hidden sm:block text-sm font-medium" :class="step === i + 1 ? 'text-primary-700' : 'text-gray-400'">{{ s }}</span>
          </div>
          <div v-if="i < steps.length - 1" class="mx-2 flex-1 h-0.5" :class="step > i + 1 ? 'bg-primary-400' : 'bg-gray-200'" />
        </template>
      </div>

      <!-- Step 1: ファイルアップロード -->
      <div v-if="step === 1" class="card p-6 space-y-4">
        <h2 class="font-semibold text-gray-900">CSVファイルを選択</h2>
        <div
          class="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 transition"
          :class="isDragging ? 'border-primary-400 bg-primary-50' : 'border-gray-300 bg-gray-50 hover:border-primary-300'"
          @dragover.prevent="isDragging = true"
          @dragleave="isDragging = false"
          @drop.prevent="onDrop"
        >
          <Icon name="heroicons:document-arrow-up" class="h-10 w-10 text-gray-400" />
          <div class="text-center">
            <p class="text-sm font-medium text-gray-700">ドラッグ&ドロップ、または</p>
            <label class="mt-1 cursor-pointer text-sm text-primary-600 hover:underline">
              ファイルを選択
              <input type="file" accept=".csv" class="sr-only" @change="onFileSelect" />
            </label>
          </div>
          <p class="text-xs text-gray-400">CSV形式（kintoneエクスポート形式対応。UTF-8 / Shift-JISいずれも可）</p>
        </div>

        <p v-if="parsing" class="text-sm text-gray-500 flex items-center gap-1.5">
          <Icon name="heroicons:arrow-path" class="h-4 w-4 animate-spin" />読み込み中...
        </p>
        <p v-if="parseError" class="text-sm text-red-600">{{ parseError }}</p>

        <div v-if="selectedFile && csvHeaders.length > 0" class="flex items-center gap-3 rounded-lg bg-green-50 p-3">
          <Icon name="heroicons:document-text" class="h-5 w-5 text-green-600" />
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium text-gray-900 truncate">{{ selectedFile.name }}</p>
            <p class="text-xs text-gray-500">{{ csvRows.length }}行 / {{ csvHeaders.length }}列を検出</p>
          </div>
          <button class="text-gray-400 hover:text-gray-600" @click="selectedFile = null; csvHeaders = []; csvRows = []">
            <Icon name="heroicons:x-mark" class="h-4 w-4" />
          </button>
        </div>

        <div class="flex justify-end">
          <button class="btn-primary" :disabled="csvHeaders.length === 0" @click="step = 2">
            次へ：フィールドマッピング
            <Icon name="heroicons:arrow-right" class="h-4 w-4 ml-1" />
          </button>
        </div>
      </div>

      <!-- Step 2: フィールドマッピング -->
      <div v-if="step === 2" class="card p-6 space-y-4">
        <h2 class="font-semibold text-gray-900">フィールドマッピング設定</h2>
        <p class="text-sm text-gray-500">
          CSVの列とシステムのフィールドを対応付けてください。
          「★顧客名」は既存のパーソナルデータの氏名と完全一致で照合するために必須です。
        </p>

        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-gray-100 bg-gray-50">
                <th class="px-4 py-2 text-left text-xs font-semibold text-gray-500">CSV列名</th>
                <th class="px-4 py-2 text-left text-xs font-semibold text-gray-500">サンプル値</th>
                <th class="px-4 py-2 text-left text-xs font-semibold text-gray-500">マッピング先</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-50">
              <tr v-for="col in csvHeaders" :key="col">
                <td class="px-4 py-2 font-medium text-gray-700">{{ col }}</td>
                <td class="px-4 py-2 text-gray-400 text-xs truncate max-w-[160px]">{{ csvRows[0]?.[col] || '—' }}</td>
                <td class="px-4 py-2">
                  <select v-model="mapping[col]" class="input-field py-1 text-sm">
                    <option v-for="opt in fieldOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                  </select>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p v-if="!hasCustomerMapping" class="text-sm text-red-600 flex items-center gap-1.5">
          <Icon name="heroicons:exclamation-circle" class="h-4 w-4" />
          「★顧客名」に対応する列を1つ選択してください
        </p>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">インポートする案件に設定するステータス</label>
          <select v-model="defaultStatus" class="input-field text-sm max-w-xs">
            <option value="consulting">相談中</option>
            <option value="considering">検討中</option>
            <option value="contracted">成約</option>
            <option value="completed">完了</option>
            <option value="failed">不成立</option>
          </select>
          <p class="mt-1 text-xs text-gray-400">CSVにステータス列があっても自動判定はせず、ここで選んだステータスを全行に一律で設定します</p>
        </div>

        <div class="flex justify-between">
          <button class="btn-secondary" @click="step = 1">← 戻る</button>
          <button class="btn-primary" :disabled="!hasCustomerMapping" @click="step = 3">
            次へ：プレビュー確認
            <Icon name="heroicons:arrow-right" class="h-4 w-4 ml-1" />
          </button>
        </div>
      </div>

      <!-- Step 3: プレビュー -->
      <div v-if="step === 3" class="card p-6 space-y-4">
        <h2 class="font-semibold text-gray-900">インポートプレビュー</h2>

        <div class="flex gap-3">
          <div class="flex items-center gap-1.5 rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-700">
            <Icon name="heroicons:check-circle" class="h-4 w-4" />
            {{ validCount }}件 インポート可能
          </div>
          <div v-if="errorCount > 0" class="flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600">
            <Icon name="heroicons:exclamation-circle" class="h-4 w-4" />
            {{ errorCount }}件 エラー（スキップされます）
          </div>
        </div>

        <div class="overflow-x-auto max-h-96 overflow-y-auto">
          <table class="w-full text-sm">
            <thead class="sticky top-0 bg-white">
              <tr class="border-b border-gray-100 bg-gray-50">
                <th class="px-3 py-2 text-left text-xs font-semibold text-gray-500">状態</th>
                <th class="px-3 py-2 text-left text-xs font-semibold text-gray-500">顧客名</th>
                <th class="px-3 py-2 text-left text-xs font-semibold text-gray-500">備考・エラー</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-50">
              <tr v-for="(row, i) in previewRows" :key="i" :class="!row.valid ? 'bg-red-50' : ''">
                <td class="px-3 py-2">
                  <span v-if="row.valid" class="inline-flex items-center gap-1 text-xs text-green-600">
                    <Icon name="heroicons:check" class="h-3.5 w-3.5" /> OK
                  </span>
                  <span v-else class="inline-flex items-center gap-1 text-xs text-red-600">
                    <Icon name="heroicons:exclamation-triangle" class="h-3.5 w-3.5" /> エラー
                  </span>
                </td>
                <td class="px-3 py-2 font-medium text-gray-900">{{ row.customerName || '—' }}</td>
                <td class="px-3 py-2 text-xs text-red-500">{{ row.error }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="flex justify-between">
          <button class="btn-secondary" @click="step = 2">← 戻る</button>
          <button class="btn-primary" :disabled="validCount === 0" @click="step = 4">
            インポート実行へ
            <Icon name="heroicons:arrow-right" class="h-4 w-4 ml-1" />
          </button>
        </div>
      </div>

      <!-- Step 4: インポート実行 -->
      <div v-if="step === 4" class="card p-6 space-y-6">
        <h2 class="font-semibold text-gray-900">インポート実行</h2>

        <div v-if="!importDone" class="space-y-4">
          <div class="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
            <Icon name="heroicons:exclamation-triangle" class="h-4 w-4 inline mr-1" />
            インポートを実行すると、<strong>{{ validCount }}件</strong>の案件が「{{ app?.name }}」に追加されます。この操作は取り消せません。
          </div>

          <div v-if="importing" class="space-y-1.5">
            <div class="h-2 rounded-full bg-gray-100 overflow-hidden">
              <div class="h-full bg-primary-500 transition-all" :style="{ width: `${importProgress}%` }" />
            </div>
            <p class="text-xs text-gray-500 text-center">{{ importProgress }}%</p>
          </div>

          <div class="flex justify-between">
            <button class="btn-secondary" :disabled="importing" @click="step = 3">← 戻る</button>
            <button class="btn-primary" :disabled="importing" @click="handleImport">
              <Icon v-if="importing" name="heroicons:arrow-path" class="h-4 w-4 animate-spin mr-1" />
              {{ importing ? 'インポート中...' : 'インポートを実行する' }}
            </button>
          </div>
        </div>

        <!-- 完了 -->
        <div v-else class="text-center py-6 space-y-4">
          <div class="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 mx-auto">
            <Icon name="heroicons:check" class="h-8 w-8 text-green-600" />
          </div>
          <h3 class="text-lg font-semibold text-gray-900">インポート完了</h3>
          <div class="flex justify-center gap-6 text-sm">
            <div class="text-center">
              <p class="text-2xl font-bold text-green-600">{{ importResult.success }}</p>
              <p class="text-gray-500">成功</p>
            </div>
            <div class="text-center">
              <p class="text-2xl font-bold text-red-500">{{ importResult.error }}</p>
              <p class="text-gray-500">エラー</p>
            </div>
          </div>
          <NuxtLink :to="`/services/${serviceType}`" class="btn-primary inline-flex">
            案件一覧を確認する
          </NuxtLink>
        </div>
      </div>

    </template>
  </div>
</template>
