<script setup lang="ts">
import { MOCK_CUSTOMERS, MOCK_ADMIN_USERS } from '~/data/mock'
import { exportApoToCsv, downloadCsv } from '~/utils/csvCustomer'
import type { Customer } from '~/types/customer'

definePageMeta({ middleware: ['auth'] })

const now = new Date()
const nextWeek = new Date(now.getTime() + 7 * 86400000)
const twoWeeks = new Date(now.getTime() + 14 * 86400000)

const parse = (dateStr?: string) => (dateStr ? new Date(dateStr) : null)

// ── フィルター ────────────────────────────────────────────────────────────────
const filterFp     = ref('')
const filterState  = ref('')  // 'future' | 'adjusting' | 'done'

// ── アポ対象顧客（appointment1 or appointment2 を持つ、またはアポ調整中） ────
const apoCustomers = computed<Customer[]>(() => {
  return MOCK_CUSTOMERS.filter(c =>
    c.appointment1?.place ||
    c.appointment2?.place ||
    c.status1 === 'アポ調整中',
  )
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
  const all = apoCustomers.value
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

// ── FP別集計 ─────────────────────────────────────────────────────────────────
const fpStats = computed(() => {
  const fpMap: Record<string, { name: string; future: number; adjusting: number; done: number; total: number }> = {}

  for (const fp of MOCK_ADMIN_USERS.filter(u => u.uid !== 'mock-user-123')) {
    fpMap[fp.uid] = { name: fp.displayName, future: 0, adjusting: 0, done: 0, total: 0 }
  }

  for (const c of apoCustomers.value) {
    const fpId = (c as any).assignedFpId
    if (!fpId || !fpMap[fpId]) continue
    const cls = classify(c)
    fpMap[fpId][cls]++
    fpMap[fpId].total++
  }

  return Object.values(fpMap)
    .filter(fp => fp.total > 0)
    .sort((a, b) => b.total - a.total)
})

const maxFpTotal = computed(() => Math.max(...fpStats.value.map(f => f.total), 1))

// ── アポ一覧（フィルタリング済み） ───────────────────────────────────────────
const filteredList = computed<Customer[]>(() => {
  let list = apoCustomers.value

  if (filterFp.value)    list = list.filter(c => (c as any).assignedFpId === filterFp.value)
  if (filterState.value) list = list.filter(c => classify(c) === filterState.value)

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

// ── CSV出力 ──────────────────────────────────────────────────────────────────
const handleExport = () => {
  const csv = exportApoToCsv(filteredList.value)
  const label = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '')
  downloadCsv(csv, `apo_report_${label}.csv`)
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

const apoType = (c: Customer): string => {
  if (c.appointment2?.place) return 'ツーアポ'
  if (c.appointment1?.place) return 'ワンアポ'
  return 'アポ調整中'
}

const stateBadge = (c: Customer) => {
  const cls = classify(c)
  const nextWeekDate = parse(c.appointment2?.date) ?? parse(c.appointment1?.date)
  const isThisWeek = nextWeekDate && nextWeekDate <= nextWeek && nextWeekDate > now
  if (cls === 'future') {
    return isThisWeek
      ? { text: '今週予定',  cls: 'bg-green-100 text-green-700' }
      : { text: 'アポ確定',  cls: 'bg-primary-100 text-primary-700' }
  }
  if (cls === 'adjusting') return { text: '調整中',    cls: 'bg-amber-100 text-amber-700' }
  return                          { text: '実施済み',  cls: 'bg-gray-100 text-gray-500' }
}

const fpOptions = MOCK_ADMIN_USERS.filter(u => u.uid !== 'mock-user-123')
</script>

<template>
  <div class="p-4 md:p-6 max-w-5xl mx-auto space-y-6">

    <!-- ヘッダー -->
    <div class="flex items-start justify-between gap-3 flex-wrap">
      <div>
        <div class="flex items-center gap-2">
          <NuxtLink to="/customers" class="text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1">
            <Icon name="heroicons:chevron-left" class="h-4 w-4" />顧客管理
          </NuxtLink>
        </div>
        <h1 class="text-xl font-bold text-gray-900 mt-1 flex items-center gap-2">
          <Icon name="heroicons:chart-bar" class="h-5 w-5 text-primary-500" />
          アポ状況分析
        </h1>
        <p class="text-sm text-gray-500 mt-0.5">アポの状況をサポート者と確認・共有する</p>
      </div>
      <button class="btn-primary text-sm flex items-center gap-1.5" @click="handleExport">
        <Icon name="heroicons:arrow-down-tray" class="h-4 w-4" />
        アポCSV出力
      </button>
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

    <!-- FP別アポ状況 -->
    <div class="card p-5 space-y-4">
      <h2 class="font-semibold text-gray-900 flex items-center gap-2">
        <Icon name="heroicons:users" class="h-5 w-5 text-primary-500" />
        担当FP別アポ状況
      </h2>

      <div class="space-y-3">
        <div v-for="fp in fpStats" :key="fp.name">
          <div class="flex items-center gap-3">
            <span class="text-sm font-medium text-gray-700 w-20 shrink-0 truncate">{{ fp.name }}</span>
            <div class="flex-1 flex gap-0.5 rounded overflow-hidden h-6">
              <!-- アポ確定 -->
              <div
                v-if="fp.future > 0"
                class="bg-primary-500 flex items-center justify-center text-white text-[11px] font-semibold transition-all"
                :style="{ width: `${(fp.future / maxFpTotal) * 100}%` }"
                :title="`アポ確定: ${fp.future}件`"
              >{{ fp.future }}</div>
              <!-- 調整中 -->
              <div
                v-if="fp.adjusting > 0"
                class="bg-amber-400 flex items-center justify-center text-white text-[11px] font-semibold transition-all"
                :style="{ width: `${(fp.adjusting / maxFpTotal) * 100}%` }"
                :title="`調整中: ${fp.adjusting}件`"
              >{{ fp.adjusting }}</div>
              <!-- 実施済み -->
              <div
                v-if="fp.done > 0"
                class="bg-gray-200 flex items-center justify-center text-gray-500 text-[11px] font-semibold transition-all"
                :style="{ width: `${(fp.done / maxFpTotal) * 100}%` }"
                :title="`実施済み: ${fp.done}件`"
              >{{ fp.done }}</div>
            </div>
            <span class="text-sm font-bold text-gray-700 w-8 text-right shrink-0">{{ fp.total }}</span>
          </div>
        </div>
      </div>

      <!-- 凡例 -->
      <div class="flex items-center gap-4 pt-1">
        <span class="flex items-center gap-1.5 text-xs text-gray-500">
          <span class="h-2.5 w-2.5 rounded-sm bg-primary-500 inline-block"></span>アポ確定
        </span>
        <span class="flex items-center gap-1.5 text-xs text-gray-500">
          <span class="h-2.5 w-2.5 rounded-sm bg-amber-400 inline-block"></span>調整中
        </span>
        <span class="flex items-center gap-1.5 text-xs text-gray-500">
          <span class="h-2.5 w-2.5 rounded-sm bg-gray-200 inline-block"></span>実施済み
        </span>
      </div>
    </div>

    <!-- アポ一覧 -->
    <div class="card overflow-hidden">
      <!-- フィルター行 -->
      <div class="flex items-center gap-3 px-5 py-3 border-b border-gray-100 bg-gray-50 flex-wrap">
        <h2 class="font-semibold text-gray-900 text-sm flex items-center gap-1.5 shrink-0">
          <Icon name="heroicons:calendar-days" class="h-4 w-4 text-primary-500" />
          アポ一覧
          <span class="text-gray-400 font-normal text-xs ml-1">{{ filteredList.length }}件</span>
        </h2>
        <div class="flex items-center gap-2 ml-auto flex-wrap">
          <!-- FP フィルター -->
          <select v-model="filterFp" class="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-primary-300">
            <option value="">全FP</option>
            <option v-for="fp in fpOptions" :key="fp.uid" :value="fp.uid">{{ fp.displayName }}</option>
          </select>
          <!-- 状態フィルター -->
          <select v-model="filterState" class="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-primary-300">
            <option value="">すべての状態</option>
            <option value="future">アポ確定</option>
            <option value="adjusting">調整中</option>
            <option value="done">実施済み</option>
          </select>
        </div>
      </div>

      <!-- PC テーブル -->
      <div class="hidden md:block overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-100">
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">氏名</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">担当FP</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">種別</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">日時</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">場所</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">状態</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">状況</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">メモ</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            <tr v-if="filteredList.length === 0">
              <td colspan="8" class="text-center py-10 text-sm text-gray-400">
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
              <td class="px-4 py-3">
                <span class="badge text-xs" :class="apoType(c) === 'ツーアポ' ? 'bg-indigo-50 text-indigo-600' : apoType(c) === 'ワンアポ' ? 'bg-primary-50 text-primary-600' : 'bg-amber-50 text-amber-600'">
                  {{ apoType(c) }}
                </span>
              </td>
              <td class="px-4 py-3 tabular-nums text-gray-700 text-xs whitespace-nowrap">{{ apoDate(c) }}</td>
              <td class="px-4 py-3 text-gray-600 text-xs max-w-[140px] truncate">{{ apoPlace(c) }}</td>
              <td class="px-4 py-3">
                <span class="badge text-xs" :class="stateBadge(c).cls">{{ stateBadge(c).text }}</span>
              </td>
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
            <div class="flex flex-col items-end gap-1 shrink-0">
              <span class="badge text-xs" :class="stateBadge(c).cls">{{ stateBadge(c).text }}</span>
              <span class="badge text-xs" :class="apoType(c) === 'ツーアポ' ? 'bg-indigo-50 text-indigo-600' : 'bg-primary-50 text-primary-600'">{{ apoType(c) }}</span>
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
