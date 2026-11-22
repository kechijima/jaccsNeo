<script setup lang="ts">
import { exportApoToExcel, downloadExcel } from '~/utils/csvCustomer'
import { useCustomerStore } from '~/composables/useCustomerStore'
import { useOperationLog } from '~/composables/useOperationLog'
import { useAuthStore } from '~/stores/auth'
import type { Customer } from '~/types/customer'

definePageMeta({ middleware: ['auth'] })

const { fetchMyCustomers } = useCustomerStore()
const authStore = useAuthStore()

// ── 閲覧範囲はロールによらず常にログインユーザー自身の担当顧客のみ ──────────
// （全件取得だと読み込みが重いため、Firestore側でassignedFpId/assignedFpNameに
// よる絞り込みクエリを使う。顧客一覧全体の取得は行わない）
const customers = ref<Customer[]>([])
customers.value = await fetchMyCustomers(authStore.user?.uid ?? '', authStore.user?.displayName)
const scopeMessage = '自分のアポ状況を分析できます'

const now = new Date()
const nextWeek = new Date(now.getTime() + 7 * 86400000)

const parse = (dateStr?: string) => (dateStr ? new Date(dateStr) : null)

// ── アポ対象顧客（appointment1 or appointment2 を持つ、またはアポ調整中） ────────
const apoCustomers = computed<Customer[]>(() => customers.value.filter(c =>
  c.appointment1?.place ||
  c.appointment2?.place ||
  c.status1 === 'アポ調整中',
))

// ── 自分の全顧客（アポの有無に関わらず、属性分析の母集団） ──────────────────
const scopedAllCustomers = computed<Customer[]>(() => customers.value)

// 分析対象は常に自分のみのため、FP選択は不要（showFpSelectorは常にfalse）
const selectedFp = ref('')
const fpOptions = computed(() =>
  [...new Set(scopedAllCustomers.value.map(c => c.assignedFpName || '担当未設定'))].sort()
)
const showFpSelector = computed(() => fpOptions.value.length > 1)
const fpSelectOptions = computed(() => fpOptions.value.map(fp => ({ id: fp, label: fp })))

const targetAllCustomers = computed<Customer[]>(() => scopedAllCustomers.value)
const targetApoCustomers = computed<Customer[]>(() => apoCustomers.value)

const BAR_COLORS = ['bg-primary-500', 'bg-sky-500', 'bg-amber-400', 'bg-emerald-500', 'bg-rose-400', 'bg-purple-400', 'bg-gray-400']

const toRatioRows = (list: Customer[], getLabel: (c: Customer) => string) => {
  const total = list.length
  const counts: Record<string, number> = {}
  for (const c of list) {
    const label = getLabel(c) || '未設定'
    counts[label] = (counts[label] ?? 0) + 1
  }
  return Object.entries(counts).map(([label, count]) => ({
    label, count, pct: total ? Math.round((count / total) * 1000) / 10 : 0,
  }))
}

// ── 性別構成（男 → 女 → その他の順、未設定は末尾） ────────────────────────
const GENDER_ORDER = ['男', '女']
const genderStats = computed(() => {
  const rows = toRatioRows(targetAllCustomers.value, c => c.gender ?? '')
  return rows.sort((a, b) => {
    const ai = GENDER_ORDER.indexOf(a.label)
    const bi = GENDER_ORDER.indexOf(b.label)
    if (ai >= 0 && bi >= 0) return ai - bi
    if (ai >= 0) return -1
    if (bi >= 0) return 1
    return b.count - a.count
  })
})

// ── 段数別構成（数字順、未設定は末尾） ────────────────────────────────────
const stageStats = computed(() => {
  const rows = toRatioRows(targetAllCustomers.value, c => c.stage ?? '')
  return rows.sort((a, b) => {
    const an = Number(a.label)
    const bn = Number(b.label)
    const aValid = a.label !== '未設定' && !Number.isNaN(an)
    const bValid = b.label !== '未設定' && !Number.isNaN(bn)
    if (aValid && bValid) return an - bn
    if (aValid) return -1
    if (bValid) return 1
    return a.label.localeCompare(b.label, 'ja')
  })
})

// ── ステータス分類 ──────────────────────────────────────────────────────────
const classify = (c: Customer): 'future' | 'adjusting' | 'done' => {
  if (c.status1 === 'アポ調整中') return 'adjusting'
  const apo2 = parse(c.appointment2?.date)
  if (apo2 && apo2 > now) return 'future'
  const apo1 = parse(c.appointment1?.date)
  if (apo1 && apo1 > now) return 'future'
  return 'done'
}

// ── サマリー集計 ─────────────────────────────────────────────────────────────
const summary = computed(() => {
  const all = targetApoCustomers.value
  const future    = all.filter(c => classify(c) === 'future')
  const adjusting = all.filter(c => classify(c) === 'adjusting')
  const done      = all.filter(c => classify(c) === 'done')

  const thisWeek  = future.filter(c => {
    const d1 = parse(c.appointment1?.date)
    const d2 = parse(c.appointment2?.date)
    return (d1 && d1 <= nextWeek) || (d2 && d2 <= nextWeek)
  })
  const laterThan = future.filter(c => {
    const d1 = parse(c.appointment1?.date)
    const d2 = parse(c.appointment2?.date)
    return !((d1 && d1 <= nextWeek) || (d2 && d2 <= nextWeek))
  })

  return { total: all.length, future: future.length, adjusting: adjusting.length, done: done.length, thisWeek: thisWeek.length, laterThan: laterThan.length }
})

// ── アポ一覧（分析対象で絞り込み済み） ───────────────────────────────────────
const filteredList = computed<Customer[]>(() => {
  const list = targetApoCustomers.value

  // 日付順にソート（確定分は近い順、調整中は末尾）
  return [...list].sort((a, b) => {
    const da = parse(a.appointment2?.date) ?? parse(a.appointment1?.date)
    const db = parse(b.appointment2?.date) ?? parse(b.appointment1?.date)
    if (!da && !db) return 0
    if (!da) return 1
    if (!db) return -1
    return da.getTime() - db.getTime()
  })
})

// ── Excel出力（格子付き） ──────────────────────────────────────────────────────
const handleExport = async () => {
  const buffer = await exportApoToExcel(filteredList.value)
  const label = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '')
  downloadExcel(buffer, `apo_report_${label}.xlsx`)
  useOperationLog().log('csv_export', `アポ確認Excel（${filteredList.value.length}件）`).catch(() => {})
}

// ── 表示ヘルパー ──────────────────────────────────────────────────────────────
const apoDate = (c: Customer): string => {
  const d = parse(c.appointment2?.date) ?? parse(c.appointment1?.date)
  if (!d) return '—'
  return d.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' }) +
    ' ' + d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
}

const apoPlace = (c: Customer): string =>
  c.appointment2?.place ?? c.appointment1?.place ?? '—'

const apoNote = (c: Customer): string =>
  c.appointment2?.note ?? c.appointment1?.note ?? ''
</script>

<template>
  <div class="p-4 md:p-6 max-w-5xl mx-auto space-y-6">

    <!-- ヘッダー -->
    <div class="flex items-start justify-between gap-3 flex-wrap">
      <div>
        <div class="flex items-center gap-2">
          <NuxtLink to="/personal-data" class="text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1">
            <Icon name="heroicons:chevron-left" class="h-4 w-4" />顧客情報
          </NuxtLink>
        </div>
        <h1 class="text-xl font-bold text-gray-900 mt-1 flex items-center gap-2">
          <Icon name="heroicons:chart-bar" class="h-5 w-5 text-primary-500" />
          アポ状況分析
        </h1>
        <p class="text-sm text-gray-500 mt-0.5">アポの状況をサポート者と確認・共有する</p>
        <p class="text-xs text-gray-400 mt-0.5">{{ scopeMessage }}</p>
      </div>
      <button class="btn-primary text-sm flex items-center gap-1.5" @click="handleExport">
        <Icon name="heroicons:arrow-down-tray" class="h-4 w-4" />
        フォロー表出力
      </button>
    </div>

    <!-- 分析対象FP（閲覧範囲内で複数人いる場合のみ表示。件数が多くても検索できるコンボボックス） -->
    <div v-if="showFpSelector" class="flex items-center gap-2">
      <span class="text-xs text-gray-400 shrink-0">分析対象</span>
      <div class="w-64">
        <SearchableSelect
          v-model="selectedFp"
          :items="fpSelectOptions"
          placeholder="自分の担当すべて"
          clear-label="自分の担当すべて"
          search-placeholder="担当者名で検索..."
        />
      </div>
    </div>

    <!-- サマリーカード -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div class="card p-4 text-center space-y-1">
        <p class="text-xs text-gray-500 font-medium">アポ確定</p>
        <p class="text-3xl font-bold text-primary-600">{{ summary.future }}</p>
        <p class="text-xs text-gray-400">件</p>
      </div>
      <div class="card p-4 text-center space-y-1">
        <p class="text-xs text-green-600 font-medium">今週の予定</p>
        <p class="text-3xl font-bold text-green-600">{{ summary.thisWeek }}</p>
        <p class="text-xs text-gray-400">件</p>
      </div>
      <div class="card p-4 text-center space-y-1">
        <p class="text-xs text-amber-600 font-medium">調整中</p>
        <p class="text-3xl font-bold text-amber-500">{{ summary.adjusting }}</p>
        <p class="text-xs text-gray-400">件</p>
      </div>
      <div class="card p-4 text-center space-y-1">
        <p class="text-xs text-gray-500 font-medium">実施済み</p>
        <p class="text-3xl font-bold text-gray-400">{{ summary.done }}</p>
        <p class="text-xs text-gray-400">件</p>
      </div>
    </div>


    <!-- 顧客属性分析（性別・段数） -->
    <div class="grid sm:grid-cols-2 gap-4">
      <div class="card p-5 space-y-4">
        <h2 class="font-semibold text-gray-900 flex items-center gap-2">
          <Icon name="heroicons:user-group" class="h-5 w-5 text-primary-500" />
          性別構成
          <span class="text-gray-400 font-normal text-xs ml-1">{{ targetAllCustomers.length }}件</span>
        </h2>
        <div v-if="genderStats.length === 0" class="text-sm text-gray-400 text-center py-6">データがありません</div>
        <div v-else class="space-y-2.5">
          <div v-for="(g, i) in genderStats" :key="g.label">
            <div class="flex items-center justify-between text-xs text-gray-600 mb-1">
              <span class="font-medium">{{ g.label }}</span>
              <span>{{ g.count }}件（{{ g.pct }}%）</span>
            </div>
            <div class="h-2.5 rounded-full bg-gray-100 overflow-hidden">
              <div
                class="h-full rounded-full transition-all"
                :class="BAR_COLORS[i % BAR_COLORS.length]"
                :style="{ width: `${g.pct}%` }"
              />
            </div>
          </div>
        </div>
      </div>

      <div class="card p-5 space-y-4">
        <h2 class="font-semibold text-gray-900 flex items-center gap-2">
          <Icon name="heroicons:chart-pie" class="h-5 w-5 text-primary-500" />
          段数別構成
          <span class="text-gray-400 font-normal text-xs ml-1">{{ targetAllCustomers.length }}件</span>
        </h2>
        <div v-if="stageStats.length === 0" class="text-sm text-gray-400 text-center py-6">データがありません</div>
        <div v-else class="space-y-2.5">
          <div v-for="(s, i) in stageStats" :key="s.label">
            <div class="flex items-center justify-between text-xs text-gray-600 mb-1">
              <span class="font-medium">{{ s.label === '未設定' ? s.label : `${s.label}段` }}</span>
              <span>{{ s.count }}件（{{ s.pct }}%）</span>
            </div>
            <div class="h-2.5 rounded-full bg-gray-100 overflow-hidden">
              <div
                class="h-full rounded-full transition-all"
                :class="BAR_COLORS[i % BAR_COLORS.length]"
                :style="{ width: `${s.pct}%` }"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- アポ一覧 -->
    <div class="card overflow-hidden">
      <!-- 見出し -->
      <div class="flex items-center gap-3 px-5 py-3 border-b border-gray-100 bg-gray-50">
        <h2 class="font-semibold text-gray-900 text-sm flex items-center gap-1.5 shrink-0">
          <Icon name="heroicons:calendar-days" class="h-4 w-4 text-primary-500" />
          アポ一覧
          <span class="text-gray-400 font-normal text-xs ml-1">{{ filteredList.length }}件</span>
        </h2>
      </div>

      <!-- PC テーブル -->
      <div class="hidden md:block overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-100">
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">氏名</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">担当未来設計士</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">日時</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">場所</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">状況</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">メモ</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            <tr v-if="filteredList.length === 0">
              <td colspan="6" class="text-center py-10 text-sm text-gray-400">
                <Icon name="heroicons:calendar" class="h-10 w-10 mx-auto mb-2 text-gray-200" />
                アポ情報がありません
              </td>
            </tr>
            <tr
              v-for="c in filteredList"
              :key="c.id"
              class="hover:bg-gray-50 cursor-pointer transition"
              :class="classify(c) === 'done' ? 'opacity-60' : ''"
              @click="navigateTo(`/customers/${c.id}`)"
            >
              <td class="px-4 py-3">
                <p class="font-medium text-gray-900">{{ c.name }}</p>
                <p class="text-xs text-gray-400">{{ c.relationship }}</p>
              </td>
              <td class="px-4 py-3 text-gray-600 text-xs">{{ c.assignedFpName }}</td>
              <td class="px-4 py-3 tabular-nums text-gray-700 text-xs whitespace-nowrap">{{ apoDate(c) }}</td>
              <td class="px-4 py-3 text-gray-600 text-xs max-w-[140px] truncate">{{ apoPlace(c) }}</td>
              <td class="px-4 py-3 text-gray-600 text-xs">{{ c.status1 }}</td>
              <td class="px-4 py-3 text-gray-400 text-xs max-w-[140px] truncate">{{ apoNote(c) || '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- SP カードリスト -->
      <div class="md:hidden divide-y divide-gray-50">
        <div v-if="filteredList.length === 0" class="text-center py-10 text-sm text-gray-400">
          アポ情報がありません
        </div>
        <div
          v-for="c in filteredList"
          :key="c.id"
          class="px-4 py-3 cursor-pointer hover:bg-gray-50 transition"
          :class="classify(c) === 'done' ? 'opacity-60' : ''"
          @click="navigateTo(`/customers/${c.id}`)"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <p class="font-medium text-gray-900 truncate">{{ c.name }}</p>
              <p class="text-xs text-gray-500 mt-0.5">{{ c.assignedFpName }}</p>
            </div>
          </div>
          <div class="mt-1.5 space-y-0.5">
            <p class="text-xs text-gray-600 flex items-center gap-1.5">
              <Icon name="heroicons:clock" class="h-3.5 w-3.5 text-gray-400 shrink-0" />
              {{ apoDate(c) }}
            </p>
            <p class="text-xs text-gray-600 flex items-center gap-1.5">
              <Icon name="heroicons:map-pin" class="h-3.5 w-3.5 text-gray-400 shrink-0" />
              {{ apoPlace(c) }}
            </p>
            <p v-if="apoNote(c)" class="text-xs text-gray-400 flex items-center gap-1.5">
              <Icon name="heroicons:chat-bubble-left" class="h-3.5 w-3.5 shrink-0" />
              {{ apoNote(c) }}
            </p>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>
