<script setup lang="ts">
// ユーザー情報（組合員情報）のCSV一括インポート。
// customers/import.vue・admin/apps/[appId]/import.vueと同じ4ステップ構成。
// メールアドレスで既存ユーザーと照合し、未一致なら新規作成（Firebase Auth＋
// Firestore）、一致すればプロフィール更新のみを行う。
import { readCsvFile, parseCsv } from '~/utils/csv'
import { downloadCsv } from '~/utils/csvCustomer'
import { USER_CSV_COLUMNS, ROLE_LABEL_TO_VALUE, splitUserMultiValue, buildUserCsvTemplate } from '~/utils/csvUser'
import { useGroups } from '~/composables/useGroups'
import { useSpecialTeams } from '~/composables/useSpecialTeams'
import { TITLE_OPTIONS, type UserRole, type SpecialTeam, type AppUser } from '~/types/user'
import type { Group } from '~/types/group'
import type { SpecialTeamDef } from '~/types/specialTeam'

definePageMeta({ middleware: ['auth', 'admin'] })

const { fetchUsers, createAuthUser, updateUserProfile } = useUsers()
const { fetchGroups } = useGroups()
const { fetchAll: fetchSpecialTeams } = useSpecialTeams()
const { sendPasswordReset } = useAuth()

const genTempPassword = () =>
  `Jaccs${Math.random().toString(36).slice(-6)}!${Math.floor(Math.random() * 10)}`

// ── マスタデータの読み込み ─────────────────────────────────────
const loadingMaster = ref(true)
const existingUsers = ref<AppUser[]>([])
const groups = ref<Group[]>([])
const specialTeams = ref<SpecialTeamDef[]>([])

// 所属組合は全グループ横断で名前検索する（ユーザー編集画面と同じ扱い。
// 解体済みの組合は対象外）
const allKumiai = computed(() =>
  groups.value.flatMap(g => g.kumiai.filter(k => !k.isDissolved).map(k => ({ ...k, groupName: g.name }))),
)

onMounted(async () => {
  const [users, fetchedGroups, fetchedTeams] = await Promise.all([
    fetchUsers().catch(() => []),
    fetchGroups().catch(() => []),
    fetchSpecialTeams().catch(() => []),
  ])
  existingUsers.value = users
  groups.value = fetchedGroups
  specialTeams.value = fetchedTeams
  loadingMaster.value = false
})

const sendInviteEmail = ref(true)

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

const handleDownloadTemplate = () => downloadCsv(buildUserCsvTemplate(), 'ユーザー情報_テンプレート.csv')

// ── Step2: フィールドマッピング ─────────────────────────────────
const fieldOptions = computed(() => [
  { value: '', label: '（マッピングしない）' },
  ...USER_CSV_COLUMNS.map(c => ({ value: c.key, label: c.header })),
])

const mapping = ref<Record<string, string>>({})

// 列名がテンプレートの見出しと完全一致すれば自動でマッピングする
watch(csvHeaders, (headers) => {
  const byHeader = new Map(USER_CSV_COLUMNS.map(c => [c.header, c.key]))
  const m: Record<string, string> = {}
  headers.forEach((h) => { m[h] = byHeader.get(h) ?? '' })
  mapping.value = m
})

const hasEmailMapping = computed(() => Object.values(mapping.value).includes('email'))

// ── Step3: プレビュー・検証 ─────────────────────────────────────
interface UserPreviewRow {
  email: string
  displayName: string
  mode: 'create' | 'update' | null
  matchedUid: string | null
  accountFields: Record<string, any>
  profileFields: Record<string, any>
  updateFields: Record<string, any>
  password: string
  blockingError: string
  warnings: string[]
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const previewRows = computed<UserPreviewRow[]>(() => {
  const existingByEmail = new Map(
    existingUsers.value.filter(u => u.email).map(u => [u.email.trim().toLowerCase(), u]),
  )
  const seenEmails = new Set<string>()

  return csvRows.value.map((row) => {
    const rawByKey: Record<string, string> = {}
    for (const [col, key] of Object.entries(mapping.value)) {
      if (!key) continue
      rawByKey[key] = (row[col] ?? '').trim()
    }

    const email = rawByKey.email ?? ''
    const warnings: string[] = []
    let blockingError = ''

    if (!email) {
      blockingError = 'メールアドレスが空です'
    } else if (!EMAIL_RE.test(email)) {
      blockingError = 'メールアドレスの形式が不正です'
    } else {
      const key = email.toLowerCase()
      if (seenEmails.has(key)) blockingError = 'CSV内でメールアドレスが重複しています'
      seenEmails.add(key)
    }

    const existing = !blockingError ? existingByEmail.get(email.toLowerCase()) : undefined
    const mode: 'create' | 'update' | null = blockingError ? null : (existing ? 'update' : 'create')

    let role: UserRole | undefined
    if (rawByKey.role) {
      role = ROLE_LABEL_TO_VALUE[rawByKey.role]
      if (!role) warnings.push(`ロール「${rawByKey.role}」が不明なため未設定にします`)
    }

    let specialTeamIds: SpecialTeam[] = []
    if (rawByKey.specialTeams) {
      for (const name of splitUserMultiValue(rawByKey.specialTeams)) {
        const t = specialTeams.value.find(t => t.name === name)
        if (t) specialTeamIds.push(t.id)
        else warnings.push(`専門チーム「${name}」が見つかりません`)
      }
    }

    let groupId: string | undefined
    if (rawByKey.groupId) {
      const g = groups.value.find(g => g.name === rawByKey.groupId)
      if (g) groupId = g.id
      else warnings.push(`所属グループ「${rawByKey.groupId}」が見つかりません`)
    }

    let kumiaiId: string | undefined
    let kumiaiName: string | undefined
    if (rawByKey.kumiaiId) {
      const k = allKumiai.value.find(k => k.name === rawByKey.kumiaiId)
      if (k) { kumiaiId = k.id; kumiaiName = k.name }
      else warnings.push(`所属組合「${rawByKey.kumiaiId}」が見つかりません`)
    }

    let position: string | undefined
    if (rawByKey.position) {
      if ((TITLE_OPTIONS as readonly string[]).includes(rawByKey.position)) position = rawByKey.position
      else warnings.push(`タイトル「${rawByKey.position}」が見つかりません`)
    }

    const password = rawByKey.password || genTempPassword()
    if (mode === 'create' && rawByKey.password && rawByKey.password.length < 6) {
      blockingError = '初期パスワードは6文字以上にしてください'
    }

    const displayName = `${rawByKey.lastName ?? ''}${rawByKey.firstName ?? ''}`.trim() || email

    const accountFields = {
      email,
      password,
      displayName,
      role: role ?? 'general',
      specialTeams: specialTeamIds,
      groupId: groupId || undefined,
      kumiaiId: kumiaiId || undefined,
      position: position || undefined,
    }

    // プロフィール項目（マイページ相当）。新規作成行でもcreateAuthUserが
    // 受け取らない項目はここでまとめてupdateUserProfileに渡す
    const profileFields: Record<string, any> = {}
    for (const col of USER_CSV_COLUMNS) {
      if (col.group !== 'profile') continue
      const v = rawByKey[col.key]
      if (v) profileFields[col.key] = v
    }
    // 姓・名・所属組合名はcreateAuthUserが受け取らない（displayNameの生成にのみ
    // 使われる）ため、AppUserの個別フィールドとしてもここで明示的に反映する
    // （admin/users/new.vueの2段階保存と同じ扱い）
    if (rawByKey.lastName) profileFields.lastName = rawByKey.lastName
    if (rawByKey.firstName) profileFields.firstName = rawByKey.firstName
    if (kumiaiName) profileFields.kumiaiName = kumiaiName

    // 更新行用：ロール・専門チーム・所属グループ・所属組合・タイトルは
    // createAuthUserを経由しないため、CSVで値が指定されている項目のみ
    // profileFieldsに合流させてupdateUserProfileで一括反映する
    // （列が空欄の項目は、既存の設定を上書きしないよう含めない）
    const updateFields: Record<string, any> = { ...profileFields }
    if (role !== undefined) updateFields.role = role
    if (specialTeamIds.length > 0) updateFields.specialTeams = specialTeamIds
    if (groupId !== undefined) updateFields.groupId = groupId
    if (kumiaiId !== undefined) updateFields.kumiaiId = kumiaiId
    if (position !== undefined) updateFields.position = position

    return {
      email, displayName, mode, matchedUid: existing?.uid ?? null,
      accountFields, profileFields, updateFields, password, blockingError, warnings,
    }
  })
})

const createRows = computed(() => previewRows.value.filter(r => r.mode === 'create'))
const updateRows = computed(() => previewRows.value.filter(r => r.mode === 'update'))
const errorRows = computed(() => previewRows.value.filter(r => r.mode === null))

// ── Step4: インポート実行 ───────────────────────────────────────
const importing = ref(false)
const importDone = ref(false)
const importProgress = ref(0)
const importResult = ref({ success: 0, error: 0 })
const rowErrors = ref<Array<{ email: string; message: string }>>([])

const CONCURRENCY = 5

const handleImport = async () => {
  importing.value = true
  importProgress.value = 0
  rowErrors.value = []
  let success = 0
  let errorN = 0
  const total = createRows.value.length + updateRows.value.length
  let done = 0

  // 新規作成行：Firebase Authアカウントの作成を伴うため、並列実行せず1件ずつ処理する
  for (const row of createRows.value) {
    try {
      const uid = await createAuthUser(row.accountFields)
      await updateUserProfile(uid, row.profileFields)
      if (sendInviteEmail.value) await sendPasswordReset(row.email).catch(() => {})
      success++
    } catch (e: any) {
      errorN++
      rowErrors.value.push({ email: row.email, message: e.message ?? '作成に失敗しました' })
    }
    done++
    importProgress.value = Math.min(100, Math.round((done / total) * 100))
  }

  // 更新行：Firestoreへの書き込みのみのため、既存のインポート画面と同じ並列数5で処理する
  for (let i = 0; i < updateRows.value.length; i += CONCURRENCY) {
    const chunk = updateRows.value.slice(i, i + CONCURRENCY)
    const results = await Promise.allSettled(chunk.map(row => updateUserProfile(row.matchedUid!, row.updateFields)))
    results.forEach((r, idx) => {
      if (r.status === 'fulfilled') {
        success++
      } else {
        errorN++
        rowErrors.value.push({ email: chunk[idx].email, message: (r.reason as Error)?.message ?? '更新に失敗しました' })
      }
    })
    done += chunk.length
    importProgress.value = Math.min(100, Math.round((done / total) * 100))
  }

  importResult.value = { success, error: errorN }
  importing.value = false
  importDone.value = true
}
</script>

<template>
  <div class="p-4 md:p-6 max-w-4xl mx-auto space-y-6">

    <div class="flex items-center gap-2 text-sm text-gray-400">
      <NuxtLink to="/admin">管理者設定</NuxtLink>
      <Icon name="heroicons:chevron-right" class="h-3 w-3" />
      <NuxtLink to="/admin/users">ユーザー管理</NuxtLink>
      <Icon name="heroicons:chevron-right" class="h-3 w-3" />
      <span class="text-gray-600">CSVインポート</span>
    </div>

    <div class="flex items-start justify-between gap-3 flex-wrap">
      <h1 class="text-xl font-bold text-gray-900 flex items-center gap-2">
        <Icon name="heroicons:arrow-up-tray" class="h-6 w-6 text-primary-600" />
        ユーザー情報CSVインポート
      </h1>
      <button type="button" class="btn-secondary text-sm flex items-center gap-1.5" @click="handleDownloadTemplate">
        <Icon name="heroicons:arrow-down-tray" class="h-4 w-4" />
        CSVテンプレートをダウンロード
      </button>
    </div>

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
        <h2 class="font-semibold text-gray-900">CSVファイルを選択</h2>
        <p class="text-sm text-gray-500">メールアドレスで既存ユーザーと照合します。一致すれば情報を更新、一致しなければ新規にアカウントを作成します。</p>
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
          CSVの列とシステムの項目を対応付けてください。「メールアドレス」は既存ユーザーとの照合に使うため必須です。
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

        <p v-if="!hasEmailMapping" class="text-sm text-red-600 flex items-center gap-1.5">
          <Icon name="heroicons:exclamation-circle" class="h-4 w-4" />
          「メールアドレス」に対応する列を1つ選択してください
        </p>

        <div class="rounded-lg bg-blue-50 border border-blue-200 p-4">
          <label class="flex items-center gap-2 cursor-pointer">
            <input v-model="sendInviteEmail" type="checkbox" class="h-4 w-4 rounded text-primary-600" />
            <div>
              <p class="text-sm font-medium text-blue-900">新規作成したユーザーに招待メールを送る</p>
              <p class="text-xs text-blue-600 mt-0.5">初期パスワード設定リンクをメールで送信します（更新のみの行には送信されません）</p>
            </div>
          </label>
        </div>

        <div class="flex justify-between">
          <button class="btn-secondary" @click="step = 1">← 戻る</button>
          <button class="btn-primary" :disabled="!hasEmailMapping" @click="step = 3">
            次へ：プレビュー確認
            <Icon name="heroicons:arrow-right" class="h-4 w-4 ml-1" />
          </button>
        </div>
      </div>

      <!-- Step 3: プレビュー -->
      <div v-if="step === 3" class="card p-6 space-y-4">
        <h2 class="font-semibold text-gray-900">インポートプレビュー</h2>

        <div class="flex gap-3 flex-wrap">
          <div class="flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700">
            <Icon name="heroicons:user-plus" class="h-4 w-4" />
            {{ createRows.length }}件 新規作成
          </div>
          <div class="flex items-center gap-1.5 rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-700">
            <Icon name="heroicons:arrow-path" class="h-4 w-4" />
            {{ updateRows.length }}件 更新
          </div>
          <div v-if="errorRows.length > 0" class="flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600">
            <Icon name="heroicons:exclamation-circle" class="h-4 w-4" />
            {{ errorRows.length }}件 エラー（スキップされます）
          </div>
        </div>

        <div class="overflow-x-auto max-h-96 overflow-y-auto">
          <table class="w-full text-sm">
            <thead class="sticky top-0 bg-white">
              <tr class="border-b border-gray-100 bg-gray-50">
                <th class="px-3 py-2 text-left text-xs font-semibold text-gray-500">状態</th>
                <th class="px-3 py-2 text-left text-xs font-semibold text-gray-500">氏名</th>
                <th class="px-3 py-2 text-left text-xs font-semibold text-gray-500">メールアドレス</th>
                <th class="px-3 py-2 text-left text-xs font-semibold text-gray-500">備考・エラー</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-50">
              <tr v-for="(row, i) in previewRows" :key="i" :class="row.blockingError ? 'bg-red-50' : row.warnings.length > 0 ? 'bg-amber-50' : ''">
                <td class="px-3 py-2">
                  <span v-if="row.mode === 'create'" class="inline-flex items-center gap-1 text-xs text-blue-600">
                    <Icon name="heroicons:user-plus" class="h-3.5 w-3.5" /> 新規
                  </span>
                  <span v-else-if="row.mode === 'update'" class="inline-flex items-center gap-1 text-xs text-green-600">
                    <Icon name="heroicons:check" class="h-3.5 w-3.5" /> 更新
                  </span>
                  <span v-else class="inline-flex items-center gap-1 text-xs text-red-600">
                    <Icon name="heroicons:exclamation-triangle" class="h-3.5 w-3.5" /> エラー
                  </span>
                </td>
                <td class="px-3 py-2 font-medium text-gray-900">{{ row.displayName || '—' }}</td>
                <td class="px-3 py-2 text-gray-600">{{ row.email || '—' }}</td>
                <td class="px-3 py-2 text-xs">
                  <p v-if="row.blockingError" class="text-red-500">{{ row.blockingError }}</p>
                  <p v-for="(w, wi) in row.warnings" :key="wi" class="text-amber-600">{{ w }}</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="flex justify-between">
          <button class="btn-secondary" @click="step = 2">← 戻る</button>
          <button class="btn-primary" :disabled="createRows.length + updateRows.length === 0" @click="step = 4">
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
            インポートを実行すると、<strong>{{ createRows.length }}件</strong>のユーザーが新規作成され、
            <strong>{{ updateRows.length }}件</strong>のユーザー情報が更新されます。新規作成はFirebase
            Authアカウント作成を伴うため、1件ずつ順番に処理します（件数が多いと時間がかかります）。
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
        <div v-else class="space-y-5">
          <div class="text-center py-4 space-y-4">
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
          </div>

          <div v-if="rowErrors.length > 0" class="rounded-lg border border-red-200 bg-red-50 p-4">
            <p class="text-sm font-medium text-red-700 mb-2">エラーになった行（修正して再度インポートしてください）</p>
            <ul class="space-y-1 text-xs text-red-600 max-h-48 overflow-y-auto">
              <li v-for="(e, i) in rowErrors" :key="i">{{ e.email }}：{{ e.message }}</li>
            </ul>
          </div>

          <div class="flex justify-center">
            <NuxtLink to="/admin/users" class="btn-primary inline-flex">
              ユーザー管理に戻る
            </NuxtLink>
          </div>
        </div>
      </div>

    </template>
  </div>
</template>
