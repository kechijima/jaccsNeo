<script setup lang="ts">
// 顧客情報（Customer）のCSV一括インポート。kintoneエクスポート形式の固定列名
// マッピング（types/customer.tsのCSV_FIELD_MAP等）を使い、utils/csvCustomer.ts
// のparseCsvToCustomers()で実際にCSVを解析する。admin/users/import.vue・
// admin/apps/[appId]/import.vueと同じ4ステップ構成。
import { readCsvFile } from '~/utils/csv'
import { parseCsvToCustomers } from '~/utils/csvCustomer'
import { CSV_FIELD_MAP, CSV_SERVICE_MAP, FAMILY_MEMBER_FIELDS } from '~/types/customer'
import type { CustomerForm } from '~/types/customer'

definePageMeta({ middleware: ['auth'] })

const { canImportCsv } = usePermission()
const { bulkImport, updateCustomer, fetchCustomers } = useCustomers()

// ステップ管理
const step = ref(1)
const steps = ['CSVアップロード', '列の確認', 'プレビュー・検証', 'インポート実行']

// ── Step 1: ファイルアップロード・解析 ────────────────────────────────────
const selectedFile = ref<File | null>(null)
const isDragging = ref(false)
const parseError = ref('')
const parsing = ref(false)

const onFileSelect = (e: Event) => {
  const input = e.target as HTMLInputElement
  if (input.files?.[0]) selectedFile.value = input.files[0]
}
const onDrop = (e: DragEvent) => {
  isDragging.value = false
  const file = e.dataTransfer?.files[0]
  if (file && file.name.endsWith('.csv')) selectedFile.value = file
}

// CSV_FIELD_MAP・CSV_SERVICE_MAP・家族情報・リマインダー/アポ情報の列名は
// すべてparseCsvToCustomers()が認識する固定の列名。それ以外の列はインポート時に
// 無視される（Step2で利用者に明示するための一覧）
const EXTRA_KNOWN_COLUMNS = ['リマインダー1', '設定時刻１', 'リマインダー2', '設定時刻2', 'リマインダー3', '設定時刻3', 'ワン_アポ場所', 'その他(記入欄)', 'ツー_アポ場所']
const KNOWN_COLUMNS = new Set([
  ...Object.keys(CSV_FIELD_MAP),
  ...Object.keys(CSV_SERVICE_MAP),
  ...FAMILY_MEMBER_FIELDS.flatMap(f => [f.nameCol, f.relCol, f.dobCol, f.occCol]),
  ...EXTRA_KNOWN_COLUMNS,
])

const csvHeaders = ref<string[]>([])
const parsedRows = ref<CustomerForm[]>([])
const parseRowErrors = ref<string[]>([])

const recognizedColumns = computed(() => csvHeaders.value.filter(h => KNOWN_COLUMNS.has(h)))
const unrecognizedColumns = computed(() => csvHeaders.value.filter(h => !KNOWN_COLUMNS.has(h)))

const handleParseAndNext = async () => {
  if (!selectedFile.value) return
  parsing.value = true
  parseError.value = ''
  try {
    const text = await readCsvFile(selectedFile.value)
    const { data, errors, headers } = parseCsvToCustomers(text)
    if (data.length === 0) {
      parseError.value = errors[0] ?? 'データを読み取れませんでした。CSVの形式をご確認ください'
      return
    }
    csvHeaders.value = headers
    parsedRows.value = data
    parseRowErrors.value = errors
    step.value = 2
  } catch (e: any) {
    parseError.value = e.message ?? 'CSVの読み込みに失敗しました'
  } finally {
    parsing.value = false
  }
}

// ── Step 3: プレビュー・検証 ──────────────────────────────────────────────
interface PreviewRow {
  form: CustomerForm
  name: string
  nameKana: string
  dob: string
  tel: string
  kintoneId?: string
  status: 'new' | 'duplicate' | 'invalid'
  existingId?: string
  note?: string
  fpUnmatched?: boolean
}

const previewRows = ref<PreviewRow[]>([])
const buildingPreview = ref(false)
const buildPreviewError = ref('')

// レコード番号（kintoneId）が既存の顧客と一致する行は「重複」として扱う
// （インポート実行時にスキップ/上書きを選べるようにする）。
// 「担当 未来設計士?」列はCSV上ではメールアドレスが入っているため、システムの
// ユーザー情報とメールアドレスで突き合わせ、一致すればassignedFpId（UID）を
// 設定する。これにより、そのユーザー自身がログインして検索した際に
// 「自分の担当」として正しく絞り込めるようになる（useCustomers().fetchCustomers()
// がassignedFpIdでフィルタしているため）。一致しない場合はエラーにはせず、
// 警告としてプレビューに表示するのみに留める（担当未設定のまま顧客を作成できる）
const buildPreviewAndNext = async () => {
  buildingPreview.value = true
  buildPreviewError.value = ''
  try {
    const [{ customers }, users] = await Promise.all([fetchCustomers(), useUsers().fetchUsers()])
    const existingByKintoneId = new Map(
      customers.filter(c => c.kintoneId).map(c => [c.kintoneId as string, c.id]),
    )
    const userByEmail = new Map(
      users.filter(u => u.email).map(u => [u.email.trim().toLowerCase(), u]),
    )

    previewRows.value = parsedRows.value.map((rawForm) => {
      const form = { ...rawForm }
      const notes: string[] = []

      // CSVの「担当 未来設計士?」列の値（メールアドレス）をユーザーと突き合わせる
      let fpUnmatched = false
      const fpEmail = (form.assignedFpName ?? '').trim()
      if (fpEmail) {
        const matchedUser = userByEmail.get(fpEmail.toLowerCase())
        if (matchedUser) {
          form.assignedFpId = matchedUser.uid
          form.assignedFpName = matchedUser.displayName
        } else {
          fpUnmatched = true
          notes.push(`担当未来設計士「${fpEmail}」に一致するユーザーが見つかりません`)
        }
      }

      const name = (form.name ?? '').trim()
      if (!name) {
        return {
          form, name: '', nameKana: form.nameKana ?? '', dob: form.dob ?? '', tel: form.tel ?? '',
          kintoneId: form.kintoneId, status: 'invalid' as const, note: '氏名が未入力です', fpUnmatched,
        }
      }
      const existingId = form.kintoneId ? existingByKintoneId.get(form.kintoneId) : undefined
      if (existingId) notes.unshift('既存の顧客（レコード番号が一致）')
      return {
        form, name, nameKana: form.nameKana ?? '', dob: form.dob ?? '', tel: form.tel ?? '',
        kintoneId: form.kintoneId, status: existingId ? 'duplicate' as const : 'new' as const, existingId,
        note: notes.length > 0 ? notes.join(' / ') : undefined, fpUnmatched,
      }
    })
    step.value = 3
  } catch (e: any) {
    buildPreviewError.value = e.message ?? '既存データの取得に失敗しました'
  } finally {
    buildingPreview.value = false
  }
}

const newCount       = computed(() => previewRows.value.filter(r => r.status === 'new').length)
const duplicateCount = computed(() => previewRows.value.filter(r => r.status === 'duplicate').length)
const invalidCount   = computed(() => previewRows.value.filter(r => r.status === 'invalid').length)
const fpUnmatchedCount = computed(() => previewRows.value.filter(r => r.fpUnmatched).length)

// ── Step 4: インポート実行 ────────────────────────────────────────────────
const overwriteMode = ref<'skip' | 'overwrite'>('skip')
const importing = ref(false)
const importDone = ref(false)
const importResult = ref({ success: 0, skip: 0, error: 0 })
const importError = ref('')

const handleImport = async () => {
  importing.value = true
  importError.value = ''
  try {
    const newRows = previewRows.value.filter(r => r.status === 'new')
    const duplicateRows = previewRows.value.filter(r => r.status === 'duplicate')

    const createResult = await bulkImport(newRows.map(r => r.form))

    let updateSuccess = 0
    const updateErrors: string[] = []
    if (overwriteMode.value === 'overwrite') {
      for (const row of duplicateRows) {
        try {
          await updateCustomer(row.existingId!, row.form)
          updateSuccess++
        } catch (e: any) {
          updateErrors.push(e.message ?? String(e))
        }
      }
    }

    importResult.value = {
      success: createResult.success + updateSuccess,
      skip: overwriteMode.value === 'skip' ? duplicateRows.length : 0,
      error: createResult.errors.length + updateErrors.length,
    }
    importDone.value = true
  } catch (e: any) {
    importError.value = e.message ?? 'インポートに失敗しました'
  } finally {
    importing.value = false
  }
}
</script>

<template>
  <div class="p-4 md:p-6 max-w-4xl mx-auto space-y-6">

    <!-- ヘッダー -->
    <div class="flex items-center gap-3">
      <NuxtLink to="/personal-data" class="text-sm text-gray-400 hover:text-gray-600">← 顧客情報</NuxtLink>
    </div>
    <h1 class="text-xl font-bold text-gray-900 flex items-center gap-2">
      <Icon name="heroicons:arrow-up-tray" class="h-6 w-6 text-primary-600" />
      CSVインポート
    </h1>

    <!-- 権限なし -->
    <div v-if="!canImportCsv" class="card p-8 text-center">
      <Icon name="heroicons:lock-closed" class="h-12 w-12 text-gray-300 mx-auto mb-3" />
      <p class="text-gray-500">CSVインポートはEM2以上のみ利用できます</p>
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
          <p class="text-xs text-gray-400">CSV形式（kintoneエクスポート形式対応）</p>
        </div>

        <div v-if="selectedFile" class="flex items-center gap-3 rounded-lg bg-green-50 p-3">
          <Icon name="heroicons:document-text" class="h-5 w-5 text-green-600" />
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium text-gray-900 truncate">{{ selectedFile.name }}</p>
            <p class="text-xs text-gray-500">{{ (selectedFile.size / 1024).toFixed(1) }} KB</p>
          </div>
          <button class="text-gray-400 hover:text-gray-600" @click="selectedFile = null">
            <Icon name="heroicons:x-mark" class="h-4 w-4" />
          </button>
        </div>

        <p v-if="parseError" class="text-sm text-red-500">{{ parseError }}</p>

        <div class="flex justify-end">
          <button class="btn-primary" :disabled="!selectedFile || parsing" @click="handleParseAndNext">
            <Icon v-if="parsing" name="heroicons:arrow-path" class="h-4 w-4 animate-spin mr-1" />
            次へ：列の確認
            <Icon v-if="!parsing" name="heroicons:arrow-right" class="h-4 w-4 ml-1" />
          </button>
        </div>
      </div>

      <!-- Step 2: 列の確認 -->
      <div v-if="step === 2" class="card p-6 space-y-4">
        <h2 class="font-semibold text-gray-900">CSVの列を確認</h2>
        <p class="text-sm text-gray-500">
          列名から自動的にシステムの項目へ対応付けます（{{ parsedRows.length }}件のデータを検出しました）。
          対応付けできない列は無視されます。
        </p>

        <div>
          <p class="text-xs font-semibold text-gray-500 mb-2">認識された列（{{ recognizedColumns.length }}）</p>
          <div class="flex flex-wrap gap-1.5">
            <span v-for="h in recognizedColumns" :key="h" class="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-xs text-green-700">
              <Icon name="heroicons:check" class="h-3 w-3" />{{ h }}
            </span>
          </div>
        </div>

        <div v-if="unrecognizedColumns.length > 0">
          <p class="text-xs font-semibold text-gray-500 mb-2">認識されない列（{{ unrecognizedColumns.length }}・無視されます）</p>
          <div class="flex flex-wrap gap-1.5">
            <span v-for="h in unrecognizedColumns" :key="h" class="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-500">
              {{ h }}
            </span>
          </div>
        </div>

        <p v-if="buildPreviewError" class="text-sm text-red-500">{{ buildPreviewError }}</p>

        <div class="flex justify-between">
          <button class="btn-secondary" @click="step = 1">← 戻る</button>
          <button class="btn-primary" :disabled="buildingPreview" @click="buildPreviewAndNext">
            <Icon v-if="buildingPreview" name="heroicons:arrow-path" class="h-4 w-4 animate-spin mr-1" />
            次へ：プレビュー確認
            <Icon v-if="!buildingPreview" name="heroicons:arrow-right" class="h-4 w-4 ml-1" />
          </button>
        </div>
      </div>

      <!-- Step 3: プレビュー -->
      <div v-if="step === 3" class="card p-6 space-y-4">
        <h2 class="font-semibold text-gray-900">インポートプレビュー</h2>

        <div class="flex flex-wrap gap-3">
          <div class="flex items-center gap-1.5 rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-700">
            <Icon name="heroicons:check-circle" class="h-4 w-4" />
            {{ newCount }}件 新規
          </div>
          <div v-if="duplicateCount > 0" class="flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700">
            <Icon name="heroicons:document-duplicate" class="h-4 w-4" />
            {{ duplicateCount }}件 重複（既存の顧客と一致）
          </div>
          <div v-if="invalidCount > 0" class="flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600">
            <Icon name="heroicons:exclamation-circle" class="h-4 w-4" />
            {{ invalidCount }}件 エラー（スキップ）
          </div>
          <div v-if="fpUnmatchedCount > 0" class="flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700">
            <Icon name="heroicons:user-circle" class="h-4 w-4" />
            {{ fpUnmatchedCount }}件 担当未来設計士が未一致（メールアドレス不一致）
          </div>
        </div>

        <div class="overflow-x-auto max-h-96 overflow-y-auto">
          <table class="w-full text-sm">
            <thead class="sticky top-0 bg-white">
              <tr class="border-b border-gray-100 bg-gray-50">
                <th class="px-3 py-2 text-left text-xs font-semibold text-gray-500">状態</th>
                <th class="px-3 py-2 text-left text-xs font-semibold text-gray-500">氏名</th>
                <th class="px-3 py-2 text-left text-xs font-semibold text-gray-500">フリガナ</th>
                <th class="px-3 py-2 text-left text-xs font-semibold text-gray-500">生年月日</th>
                <th class="px-3 py-2 text-left text-xs font-semibold text-gray-500">電話番号</th>
                <th class="px-3 py-2 text-left text-xs font-semibold text-gray-500">備考</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-50">
              <tr v-for="(row, i) in previewRows" :key="i" :class="row.status === 'invalid' ? 'bg-red-50' : row.status === 'duplicate' ? 'bg-amber-50' : ''">
                <td class="px-3 py-2">
                  <span v-if="row.status === 'new'" class="inline-flex items-center gap-1 text-xs text-green-600">
                    <Icon name="heroicons:check" class="h-3.5 w-3.5" /> 新規
                  </span>
                  <span v-else-if="row.status === 'duplicate'" class="inline-flex items-center gap-1 text-xs text-amber-700">
                    <Icon name="heroicons:document-duplicate" class="h-3.5 w-3.5" /> 重複
                  </span>
                  <span v-else class="inline-flex items-center gap-1 text-xs text-red-600">
                    <Icon name="heroicons:exclamation-triangle" class="h-3.5 w-3.5" /> エラー
                  </span>
                </td>
                <td class="px-3 py-2 font-medium text-gray-900">{{ row.name || '—' }}</td>
                <td class="px-3 py-2 text-gray-600">{{ row.nameKana || '—' }}</td>
                <td class="px-3 py-2 text-gray-600">{{ row.dob || '—' }}</td>
                <td class="px-3 py-2 text-gray-600">{{ row.tel || '—' }}</td>
                <td class="px-3 py-2 text-xs" :class="row.status === 'invalid' ? 'text-red-500' : 'text-gray-400'">{{ row.note || '' }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="flex justify-between">
          <button class="btn-secondary" @click="step = 2">← 戻る</button>
          <button class="btn-primary" :disabled="newCount === 0 && duplicateCount === 0" @click="step = 4">
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
            インポートを実行すると、<strong>{{ newCount }}件</strong>の顧客が新規追加されます。この操作は取り消せません。
          </div>

          <div v-if="duplicateCount > 0" class="flex items-center gap-3">
            <label class="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input v-model="overwriteMode" type="radio" value="skip" class="text-primary-600" />
              重複データ（{{ duplicateCount }}件）はスキップ
            </label>
            <label class="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input v-model="overwriteMode" type="radio" value="overwrite" class="text-primary-600" />
              重複データ（{{ duplicateCount }}件）は上書き
            </label>
          </div>

          <p v-if="importError" class="text-sm text-red-500">{{ importError }}</p>

          <div class="flex justify-between">
            <button class="btn-secondary" @click="step = 3">← 戻る</button>
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
              <p class="text-2xl font-bold text-gray-400">{{ importResult.skip }}</p>
              <p class="text-gray-500">スキップ</p>
            </div>
            <div class="text-center">
              <p class="text-2xl font-bold text-red-500">{{ importResult.error }}</p>
              <p class="text-gray-500">エラー</p>
            </div>
          </div>
          <NuxtLink to="/personal-data" class="btn-primary inline-flex">
            顧客情報を確認する
          </NuxtLink>
        </div>
      </div>

    </template>
  </div>
</template>
