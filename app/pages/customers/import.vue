<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

const { canImportCsv } = usePermission()

// ステップ管理
const step = ref(1)
const steps = ['CSVアップロード', 'フィールドマッピング', 'プレビュー・検証', 'インポート実行']

// ファイル
const selectedFile = ref<File | null>(null)
const isDragging = ref(false)

const onFileSelect = (e: Event) => {
  const input = e.target as HTMLInputElement
  if (input.files?.[0]) selectedFile.value = input.files[0]
}
const onDrop = (e: DragEvent) => {
  isDragging.value = false
  const file = e.dataTransfer?.files[0]
  if (file && file.name.endsWith('.csv')) selectedFile.value = file
}

// ダミーマッピングデータ（Phase2で実際の処理に差し替え）
const csvColumns = ref(['氏名', 'フリガナ', '生年月日', '性別', '電話番号', 'メールアドレス', '郵便番号', '住所', '担当者'])
const fieldOptions = [
  { value: '', label: '（マッピングしない）' },
  { value: 'name', label: '氏名' },
  { value: 'nameKana', label: 'フリガナ' },
  { value: 'dob', label: '生年月日' },
  { value: 'gender', label: '性別' },
  { value: 'tel', label: '電話番号' },
  { value: 'email', label: 'メールアドレス' },
  { value: 'postalCode', label: '郵便番号' },
  { value: 'address', label: '住所' },
  { value: 'assignedFpName', label: '担当FP名' },
]
const mapping = ref<Record<string, string>>({
  '氏名': 'name', 'フリガナ': 'nameKana', '生年月日': 'dob', '性別': 'gender',
  '電話番号': 'tel', 'メールアドレス': 'email', '郵便番号': 'postalCode', '住所': 'address', '担当者': 'assignedFpName',
})

// プレビューダミーデータ
const previewRows = ref([
  { name: '田中 一郎', nameKana: 'タナカ イチロウ', dob: '1980/04/15', gender: '男性', tel: '090-1234-5678', email: 'tanaka@example.com', valid: true },
  { name: '佐藤 花子', nameKana: 'サトウ ハナコ', dob: '1985/09/22', gender: '女性', tel: '080-2345-6789', email: 'sato@example.com', valid: true },
  { name: '山田 太郎', nameKana: '', dob: '1975/01/08', gender: '男性', tel: '070-3456-7890', email: '', valid: false, error: 'フリガナが未入力' },
  { name: '鈴木 美咲', nameKana: 'スズキ ミサキ', dob: '1990/12/30', gender: '女性', tel: '090-4567-8901', email: 'suzuki@example.com', valid: true },
  { name: '伊藤 健二', nameKana: 'イトウ ケンジ', dob: '1988/07/14', gender: '男性', tel: '080-5678-9012', email: 'ito@example.com', valid: true },
])
const validCount = computed(() => previewRows.value.filter(r => r.valid).length)
const errorCount = computed(() => previewRows.value.filter(r => !r.valid).length)

// インポート
const importing = ref(false)
const importDone = ref(false)
const importResult = ref({ success: 0, skip: 0, error: 0 })
const importError = ref('')

const { bulkImport } = useCustomers()

const handleImport = async () => {
  importing.value = true
  importError.value = ''
  try {
    // previewRows の有効行を CustomerForm に変換してインポート
    const validRows = previewRows.value
      .filter(r => r.valid)
      .map(r => ({
        name:     r.name,
        nameKana: r.nameKana,
        dob:      r.dob,
        gender:   r.gender,
        tel:      r.tel,
        email:    r.email,
        type:     'individual' as const,
      }))
    const result = await bulkImport(validRows)
    importResult.value = { success: result.success, skip: 0, error: result.errors.length }
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
      <NuxtLink to="/customers" class="text-sm text-gray-400 hover:text-gray-600">← 顧客管理</NuxtLink>
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

        <div class="flex justify-end">
          <button class="btn-primary" :disabled="!selectedFile" @click="step = 2">
            次へ：フィールドマッピング
            <Icon name="heroicons:arrow-right" class="h-4 w-4 ml-1" />
          </button>
        </div>
      </div>

      <!-- Step 2: フィールドマッピング -->
      <div v-if="step === 2" class="card p-6 space-y-4">
        <h2 class="font-semibold text-gray-900">フィールドマッピング設定</h2>
        <p class="text-sm text-gray-500">CSVの列とシステムのフィールドを対応付けてください</p>

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
              <tr v-for="col in csvColumns" :key="col">
                <td class="px-4 py-2 font-medium text-gray-700">{{ col }}</td>
                <td class="px-4 py-2 text-gray-400 text-xs">（サンプル）</td>
                <td class="px-4 py-2">
                  <select v-model="mapping[col]" class="input-field py-1 text-sm">
                    <option v-for="opt in fieldOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                  </select>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="flex justify-between">
          <button class="btn-secondary" @click="step = 1">← 戻る</button>
          <button class="btn-primary" @click="step = 3">
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
            {{ errorCount }}件 エラー
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
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
              <tr v-for="(row, i) in previewRows" :key="i" :class="!row.valid ? 'bg-red-50' : ''">
                <td class="px-3 py-2">
                  <span v-if="row.valid" class="inline-flex items-center gap-1 text-xs text-green-600">
                    <Icon name="heroicons:check" class="h-3.5 w-3.5" /> OK
                  </span>
                  <span v-else class="inline-flex items-center gap-1 text-xs text-red-600">
                    <Icon name="heroicons:exclamation-triangle" class="h-3.5 w-3.5" /> エラー
                  </span>
                </td>
                <td class="px-3 py-2 font-medium text-gray-900">{{ row.name }}</td>
                <td class="px-3 py-2 text-gray-600">{{ row.nameKana || '—' }}</td>
                <td class="px-3 py-2 text-gray-600">{{ row.dob }}</td>
                <td class="px-3 py-2 text-gray-600">{{ row.tel }}</td>
                <td class="px-3 py-2 text-xs text-red-500">{{ row.error || '' }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="flex justify-between">
          <button class="btn-secondary" @click="step = 2">← 戻る</button>
          <button class="btn-primary" @click="step = 4">
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
            インポートを実行すると、<strong>{{ validCount }}件</strong>のデータが追加されます。この操作は取り消せません。
          </div>

          <div class="flex items-center gap-3">
            <label class="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input type="radio" name="overwrite" value="skip" checked class="text-primary-600" />
              重複データはスキップ
            </label>
            <label class="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input type="radio" name="overwrite" value="overwrite" class="text-primary-600" />
              重複データは上書き
            </label>
          </div>

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
          <NuxtLink to="/customers" class="btn-primary inline-flex">
            顧客一覧を確認する
          </NuxtLink>
        </div>
      </div>

    </template>
  </div>
</template>
