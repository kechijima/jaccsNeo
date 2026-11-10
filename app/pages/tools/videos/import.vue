<script setup lang="ts">
// 業務ツールアプリ「動画管理」のCSV一括インポート。他のCSVインポート画面
// （customers/import.vue・admin/users/import.vue）と同じ3〜4ステップ構成だが、
// ManagedVideoFormの項目数が少なく（タイトル・説明・URL・ジャンル・公開範囲・
// 最低タイトルの6項目）、外部データ形式との突合も不要なため、フィールド
// マッピングのステップは設けず「アップロード→プレビュー・検証→実行」の
// 3ステップとする。列見出しはテンプレートダウンロードで示す固定の日本語見出し
// を期待する（utils/csv.tsのreadCsvFile/parseCsvをそのまま再利用）
import { readCsvFile, parseCsv } from '~/utils/csv'
import { downloadCsv } from '~/utils/csvCustomer'
import { useVideos } from '~/composables/useVideos'
import { useVisibilityScope } from '~/composables/useVisibilityScope'
import { TITLE_OPTIONS } from '~/types/user'
import type { ManagedVideoForm } from '~/types/tools'

definePageMeta({ middleware: ['auth', 'admin'] })

const { createVideo } = useVideos()
const { groups, specialTeams, ensureLoaded: ensureScopeOptionsLoaded } = useVisibilityScope()

// ── CSV列定義 ─────────────────────────────────────────────────
const CSV_COLUMNS = [
  { header: 'タイトル',   key: 'title' },
  { header: '説明',       key: 'description' },
  { header: 'URL',        key: 'url' },
  { header: 'ジャンル',   key: 'genre' },
  { header: '公開範囲',   key: 'visibleGroupIds' },
  { header: '最低タイトル', key: 'minTitleLevel' },
] as const

const handleDownloadTemplate = () => {
  const header = CSV_COLUMNS.map(c => `"${c.header}"`).join(',')
  const sample = [
    '"研修動画サンプル"',
    '"新人研修用の動画です"',
    '"https://www.youtube.com/watch?v=xxxxxxxxxxx"',
    '"研修"',
    '"Reteraceグループ、生命保険募集人"',
    '"EM2"',
  ].join(',')
  downloadCsv([header, sample].join('\r\n'), '動画管理_テンプレート.csv')
}

// 読点・カンマ区切りの複数値（公開範囲：グループ名・専門チーム名）を分解する
const splitMultiValue = (raw: string): string[] =>
  raw.split(/[、,]/).map(s => s.trim()).filter(Boolean)

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
    await ensureScopeOptionsLoaded()
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
  form: ManagedVideoForm
  title: string
  url: string
  valid: boolean
  error: string
  warnings: string[]
}

const previewRows = computed<PreviewRow[]>(() => csvRows.value.map((row) => {
  const get = (key: string) => (row[CSV_COLUMNS.find(c => c.key === key)!.header] ?? '').trim()

  const title = get('title')
  const url = get('url')
  const description = get('description')
  const genre = get('genre')
  const minTitleLevelRaw = get('minTitleLevel')
  const visibleGroupIdsRaw = get('visibleGroupIds')

  const warnings: string[] = []

  let minTitleLevel: string | undefined
  if (minTitleLevelRaw) {
    if ((TITLE_OPTIONS as readonly string[]).includes(minTitleLevelRaw)) {
      minTitleLevel = minTitleLevelRaw
    } else {
      warnings.push(`最低タイトル「${minTitleLevelRaw}」が見つかりません`)
    }
  }

  const visibleGroupIds: string[] = []
  if (visibleGroupIdsRaw) {
    for (const name of splitMultiValue(visibleGroupIdsRaw)) {
      const g = groups.value.find(g => g.name === name)
      if (g) { visibleGroupIds.push(g.id); continue }
      const t = specialTeams.value.find(t => t.name === name)
      if (t) { visibleGroupIds.push(`team:${t.id}`); continue }
      warnings.push(`公開範囲「${name}」（グループ・専門チーム）が見つかりません`)
    }
  }

  let error = ''
  if (!title) error = 'タイトルが未入力です'
  else if (!url) error = 'URLが未入力です'

  return {
    form: { title, description: description || undefined, url, genre: genre || undefined, visibleGroupIds, minTitleLevel },
    title, url, valid: !error, error, warnings,
  }
}))

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
    const results = await Promise.allSettled(chunk.map(row => createVideo(row.form)))
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
      <NuxtLink to="/tools/videos">動画管理</NuxtLink>
      <Icon name="heroicons:chevron-right" class="h-3 w-3" />
      <span class="text-gray-600">CSVインポート</span>
    </div>

    <h1 class="text-xl font-bold text-gray-900 flex items-center gap-2">
      <Icon name="heroicons:arrow-up-tray" class="h-6 w-6 text-primary-600" />
      動画管理 — CSVインポート
    </h1>

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
        列見出しは「タイトル・説明・URL・ジャンル・公開範囲・最低タイトル」です（テンプレート参照）。
        「公開範囲」はグループ名・専門チーム名を「、」または「,」区切りで指定してください（未指定なら全員に公開）。
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
              <th class="px-3 py-2 text-left text-xs font-semibold text-gray-500">タイトル</th>
              <th class="px-3 py-2 text-left text-xs font-semibold text-gray-500">URL</th>
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
              <td class="px-3 py-2 font-medium text-gray-900">{{ row.title || '—' }}</td>
              <td class="px-3 py-2 text-gray-600 truncate max-w-[200px]">{{ row.url || '—' }}</td>
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
          インポートを実行すると、<strong>{{ validCount }}件</strong>の動画が追加されます。この操作は取り消せません。
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
        <NuxtLink to="/tools/videos" class="btn-primary inline-flex">
          動画管理を確認する
        </NuxtLink>
      </div>
    </div>

  </div>
</template>
