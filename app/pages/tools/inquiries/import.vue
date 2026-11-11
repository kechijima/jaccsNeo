<script setup lang="ts">
// 業務ツールアプリ「問い合わせ管理」のCSV一括インポート。videos/import.vueと
// 同じ3ステップ構成（アップロード→プレビュー・検証→実行）。問い合わせは
// 送信者（createdByUid/createdByName）を持つデータのため、CSVの「送信者
// メールアドレス」列で既存ユーザーと紐付ける（未指定・未一致の場合はインポートを
// 実行した管理者自身の名前で作成する）
import { readCsvFile, parseCsv } from '~/utils/csv'
import { downloadCsv } from '~/utils/csvCustomer'
import { useInquiries } from '~/composables/useInquiries'
import { useUsers } from '~/composables/useUsers'
import { INQUIRY_STATUS_LABELS } from '~/types/tools'
import type { InquiryStatus } from '~/types/tools'
import type { AppUser } from '~/types/user'

definePageMeta({ middleware: ['auth', 'admin'] })

const { createInquiryAdmin } = useInquiries()
const { fetchUsers } = useUsers()

const loadingMaster = ref(true)
const existingUsers = ref<AppUser[]>([])
onMounted(async () => {
  existingUsers.value = await fetchUsers().catch(() => [])
  loadingMaster.value = false
})

// ── CSV列定義 ─────────────────────────────────────────────────
const CSV_COLUMNS = [
  { header: '件名',             key: 'subject' },
  { header: '内容',             key: 'content' },
  { header: 'ステータス',       key: 'status' },
  { header: '送信者メールアドレス', key: 'createdByEmail' },
] as const

const STATUS_LABEL_TO_VALUE: Record<string, InquiryStatus> = Object.fromEntries(
  (Object.entries(INQUIRY_STATUS_LABELS) as [InquiryStatus, string][]).map(([k, v]) => [v, k]),
)

const handleDownloadTemplate = () => {
  const header = CSV_COLUMNS.map(c => `"${c.header}"`).join(',')
  const sample = [
    '"〇〇について"',
    '"お問い合わせ内容のサンプルです"',
    '"未対応"',
    '"example@jaccs.co.jp"',
  ].join(',')
  downloadCsv([header, sample].join('\r\n'), '問い合わせ管理_テンプレート.csv')
}

// ── ステップ管理 ─────────────────────────────────────────────
const step = ref(1)
const steps = ['CSVアップロード', 'プレビュー・検証', 'インポート実行']

// ── Step1: ファイルアップロード・解析 ────────────────────────────
const selectedFile = ref<File | null>(null)
const isDragging = ref(false)
const parsing = ref(false)
const parseError = ref('')
const csvRows = ref<Record<string, string>[]>([])

const loadFile = async (file: File) => {
  selectedFile.value = file
  parsing.value = true
  parseError.value = ''
  try {
    const text = await readCsvFile(file)
    const { headers, rows } = parseCsv(text)
    if (headers.length === 0) throw new Error('CSVの列（ヘッダー行）を読み取れませんでした')
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

// ── Step2: プレビュー・検証 ──────────────────────────────────────
interface PreviewRow {
  subject: string
  content: string
  status: InquiryStatus
  createdByUid?: string
  createdByName?: string
  valid: boolean
  error: string
  warnings: string[]
}

const previewRows = computed<PreviewRow[]>(() => {
  const existingByEmail = new Map(
    existingUsers.value.filter(u => u.email).map(u => [u.email.trim().toLowerCase(), u]),
  )

  return csvRows.value.map((row) => {
    const get = (key: string) => (row[CSV_COLUMNS.find(c => c.key === key)!.header] ?? '').trim()

    const subject = get('subject')
    const content = get('content')
    const statusRaw = get('status')
    const createdByEmail = get('createdByEmail')

    const warnings: string[] = []

    let status: InquiryStatus = 'open'
    if (statusRaw) {
      const resolved = STATUS_LABEL_TO_VALUE[statusRaw]
      if (resolved) status = resolved
      else warnings.push(`ステータス「${statusRaw}」が不明なため「未対応」にします`)
    }

    let createdByUid: string | undefined
    let createdByName: string | undefined
    if (createdByEmail) {
      const u = existingByEmail.get(createdByEmail.toLowerCase())
      if (u) {
        createdByUid = u.uid
        createdByName = u.displayName
      } else {
        warnings.push(`送信者「${createdByEmail}」が見つからないため、インポート実行者の名前で登録します`)
      }
    }

    let error = ''
    if (!subject) error = '件名が未入力です'
    else if (!content) error = '内容が未入力です'

    return {
      subject, content, status, createdByUid, createdByName,
      valid: !error, error, warnings,
    }
  })
})

const validCount = computed(() => previewRows.value.filter(r => r.valid).length)
const errorCount = computed(() => previewRows.value.filter(r => !r.valid).length)
const warningCount = computed(() => previewRows.value.filter(r => r.warnings.length > 0).length)

// ── Step3: インポート実行 ────────────────────────────────────────
const importing = ref(false)
const importDone = ref(false)
const importResult = ref({ success: 0, error: 0 })

const CONCURRENCY = 5

const handleImport = async () => {
  importing.value = true
  const targetRows = previewRows.value.filter(r => r.valid)
  let success = 0
  let errorN = 0

  for (let i = 0; i < targetRows.length; i += CONCURRENCY) {
    const chunk = targetRows.slice(i, i + CONCURRENCY)
    const results = await Promise.allSettled(chunk.map(row => createInquiryAdmin({
      subject: row.subject,
      content: row.content,
      status: row.status,
      createdByUid: row.createdByUid,
      createdByName: row.createdByName,
    })))
    results.forEach((r) => { if (r.status === 'fulfilled') success++; else errorN++ })
  }

  importResult.value = { success, error: errorN }
  importing.value = false
  importDone.value = true
}
</script>

<template>
  <div class="p-4 md:p-6 max-w-4xl mx-auto space-y-6">

    <div class="flex items-center gap-2 text-sm text-gray-400 flex-wrap">
      <NuxtLink to="/tools">業務ツールアプリ</NuxtLink>
      <Icon name="heroicons:chevron-right" class="h-3 w-3" />
      <NuxtLink to="/tools/inquiries">問い合わせ管理</NuxtLink>
      <Icon name="heroicons:chevron-right" class="h-3 w-3" />
      <span class="text-gray-600">CSVインポート</span>
    </div>

    <h1 class="text-xl font-bold text-gray-900 flex items-center gap-2">
      <Icon name="heroicons:arrow-up-tray" class="h-6 w-6 text-primary-600" />
      問い合わせ管理 — CSVインポート
    </h1>

    <div v-if="loadingMaster" class="card p-10 text-center">
      <Icon name="heroicons:arrow-path" class="h-8 w-8 text-gray-300 mx-auto mb-2 animate-spin" />
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
        <div class="flex items-center justify-between">
          <h2 class="font-semibold text-gray-900">CSVファイルを選択</h2>
          <button type="button" class="text-xs text-primary-600 hover:underline flex items-center gap-1" @click="handleDownloadTemplate">
            <Icon name="heroicons:arrow-down-tray" class="h-3.5 w-3.5" />
            テンプレートをダウンロード
          </button>
        </div>
        <p class="text-sm text-gray-500">
          列見出しは「件名・内容・ステータス・送信者メールアドレス」です（テンプレート参照）。
          「ステータス」は「未対応・対応中・完了」のいずれか（未指定なら「未対応」）。
          「送信者メールアドレス」は既存ユーザーと一致すればその人の送信として登録し、
          未指定・未一致の場合はこのインポートを実行した管理者自身の名前で登録します。
        </p>

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
          <p class="text-xs text-gray-400">CSV形式（UTF-8 / Shift-JISいずれも可）</p>
        </div>

        <p v-if="parsing" class="text-sm text-gray-500 flex items-center gap-1.5">
          <Icon name="heroicons:arrow-path" class="h-4 w-4 animate-spin" />読み込み中...
        </p>
        <p v-if="parseError" class="text-sm text-red-600">{{ parseError }}</p>

        <div v-if="selectedFile && csvRows.length > 0" class="flex items-center gap-3 rounded-lg bg-green-50 p-3">
          <Icon name="heroicons:document-text" class="h-5 w-5 text-green-600" />
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium text-gray-900 truncate">{{ selectedFile.name }}</p>
            <p class="text-xs text-gray-500">{{ csvRows.length }}行を検出</p>
          </div>
          <button class="text-gray-400 hover:text-gray-600" @click="selectedFile = null; csvRows = []">
            <Icon name="heroicons:x-mark" class="h-4 w-4" />
          </button>
        </div>

        <div class="flex justify-end">
          <button class="btn-primary" :disabled="csvRows.length === 0" @click="step = 2">
            次へ：プレビュー確認
            <Icon name="heroicons:arrow-right" class="h-4 w-4 ml-1" />
          </button>
        </div>
      </div>

      <!-- Step 2: プレビュー -->
      <div v-if="step === 2" class="card p-6 space-y-4">
        <h2 class="font-semibold text-gray-900">インポートプレビュー</h2>

        <div class="flex flex-wrap gap-3">
          <div class="flex items-center gap-1.5 rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-700">
            <Icon name="heroicons:check-circle" class="h-4 w-4" />
            {{ validCount }}件 インポート可能
          </div>
          <div v-if="errorCount > 0" class="flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600">
            <Icon name="heroicons:exclamation-circle" class="h-4 w-4" />
            {{ errorCount }}件 エラー（スキップされます）
          </div>
          <div v-if="warningCount > 0" class="flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700">
            <Icon name="heroicons:exclamation-triangle" class="h-4 w-4" />
            {{ warningCount }}件 警告あり
          </div>
        </div>

        <div class="overflow-x-auto max-h-96 overflow-y-auto">
          <table class="w-full text-sm">
            <thead class="sticky top-0 bg-white">
              <tr class="border-b border-gray-100 bg-gray-50">
                <th class="px-3 py-2 text-left text-xs font-semibold text-gray-500">状態</th>
                <th class="px-3 py-2 text-left text-xs font-semibold text-gray-500">件名</th>
                <th class="px-3 py-2 text-left text-xs font-semibold text-gray-500">ステータス</th>
                <th class="px-3 py-2 text-left text-xs font-semibold text-gray-500">送信者</th>
                <th class="px-3 py-2 text-left text-xs font-semibold text-gray-500">備考・エラー</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-50">
              <tr v-for="(row, i) in previewRows" :key="i" :class="!row.valid ? 'bg-red-50' : row.warnings.length > 0 ? 'bg-amber-50' : ''">
                <td class="px-3 py-2">
                  <span v-if="!row.valid" class="inline-flex items-center gap-1 text-xs text-red-600">
                    <Icon name="heroicons:exclamation-triangle" class="h-3.5 w-3.5" /> エラー
                  </span>
                  <span v-else-if="row.warnings.length > 0" class="inline-flex items-center gap-1 text-xs text-amber-700">
                    <Icon name="heroicons:exclamation-triangle" class="h-3.5 w-3.5" /> 警告
                  </span>
                  <span v-else class="inline-flex items-center gap-1 text-xs text-green-600">
                    <Icon name="heroicons:check" class="h-3.5 w-3.5" /> OK
                  </span>
                </td>
                <td class="px-3 py-2 font-medium text-gray-900">{{ row.subject || '—' }}</td>
                <td class="px-3 py-2 text-gray-600">{{ INQUIRY_STATUS_LABELS[row.status] }}</td>
                <td class="px-3 py-2 text-gray-600">{{ row.createdByName || '（実行者）' }}</td>
                <td class="px-3 py-2 text-xs" :class="!row.valid ? 'text-red-500' : 'text-amber-700'">{{ row.error || row.warnings.join(' / ') }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="flex justify-between">
          <button class="btn-secondary" @click="step = 1">← 戻る</button>
          <button class="btn-primary" :disabled="validCount === 0" @click="step = 3">
            インポート実行へ
            <Icon name="heroicons:arrow-right" class="h-4 w-4 ml-1" />
          </button>
        </div>
      </div>

      <!-- Step 3: インポート実行 -->
      <div v-if="step === 3" class="card p-6 space-y-6">
        <h2 class="font-semibold text-gray-900">インポート実行</h2>

        <div v-if="!importDone" class="space-y-4">
          <div class="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
            <Icon name="heroicons:exclamation-triangle" class="h-4 w-4 inline mr-1" />
            インポートを実行すると、<strong>{{ validCount }}件</strong>の問い合わせが追加されます。この操作は取り消せません。
          </div>

          <div class="flex justify-between">
            <button class="btn-secondary" :disabled="importing" @click="step = 2">← 戻る</button>
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
          <NuxtLink to="/tools/inquiries" class="btn-primary inline-flex">
            問い合わせ管理を確認する
          </NuxtLink>
        </div>
      </div>

    </template>
  </div>
</template>
