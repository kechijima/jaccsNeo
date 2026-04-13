<script setup lang="ts">
import { MOCK_FP_DETAILS, MOCK_MONTHLY_NEW_CLIENTS } from '~/data/mock'

definePageMeta({ middleware: ['auth'] })

const { canViewGlobalDashboard } = usePermission()

const currentMonth = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' })

const groupKpis = ref([
  { label: 'Reterace', color: 'bg-indigo-500', contracts: 42, newClients: 18, activities: 156 },
  { label: 'Miraito',  color: 'bg-sky-500',    contracts: 38, newClients: 15, activities: 134 },
  { label: 'Asset',    color: 'bg-amber-500',   contracts: 45, newClients: 21, activities: 178 },
])

const serviceRanking = ref([
  { label: '生命保険', count: 35, max: 35 },
  { label: '不動産',   count: 28, max: 35 },
  { label: '転職',     count: 19, max: 35 },
  { label: '火災保険', count: 15, max: 35 },
  { label: '通信',     count: 12, max: 35 },
  { label: '損保',     count: 8,  max: 35 },
])

const fpRanking = ref(
  MOCK_FP_DETAILS.map((fp, i) => ({
    ...fp,
    rank: i + 1,
    badge: i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '',
  }))
)

// 個人KPI（一般FP）
const myKpis = ref([
  { label: '今月の活動数',   value: 24, unit: '件', icon: 'heroicons:clipboard-document-list', color: 'bg-blue-50 text-blue-700' },
  { label: '今月の成約数',   value: 8,  unit: '件', icon: 'heroicons:trophy',                  color: 'bg-green-50 text-green-700' },
  { label: '目標達成率',     value: 80, unit: '%',  icon: 'heroicons:chart-bar',               color: 'bg-purple-50 text-purple-700' },
  { label: '今月の紹介獲得', value: 3,  unit: '件', icon: 'heroicons:share',                   color: 'bg-amber-50 text-amber-700' },
])

// ── FP詳細スライドオーバー ────────────────────────────────────────────
const selectedFp = ref<typeof MOCK_FP_DETAILS[0] | null>(null)

// ── 新規顧客獲得推移グラフ ────────────────────────────────────────────
const maxTotal = computed(() => Math.max(...MOCK_MONTHLY_NEW_CLIENTS.map(m => m.total)))
const groupColors = { reterace: '#6366f1', miraito: '#0ea5e9', asset: '#f59e0b' }
</script>

<template>
  <div class="p-4 md:p-6 max-w-6xl mx-auto space-y-6">

    <!-- ヘッダー -->
    <div class="flex items-start justify-between gap-3">
      <div>
        <h1 class="text-xl font-bold text-gray-900">チームダッシュボード</h1>
        <p class="text-sm text-gray-500 mt-0.5">{{ currentMonth }}</p>
      </div>
      <div class="flex items-center gap-2">
        <NuxtLink to="/team/meetings" class="btn-secondary text-sm flex items-center gap-1.5">
          <Icon name="heroicons:presentation-chart-bar" class="h-4 w-4" />数字会議
        </NuxtLink>
        <NuxtLink to="/team/members" class="btn-secondary text-sm flex items-center gap-1.5">
          <Icon name="heroicons:users" class="h-4 w-4" />メンバー
        </NuxtLink>
      </div>
    </div>

    <!-- 全体ダッシュボード -->
    <template v-if="canViewGlobalDashboard">

      <!-- グループ別KPI -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div v-for="g in groupKpis" :key="g.label" class="card p-5">
          <div class="flex items-center gap-3 mb-4">
            <div class="h-3 w-3 rounded-full" :class="g.color" />
            <h2 class="font-semibold text-gray-900">{{ g.label }}</h2>
          </div>
          <div class="grid grid-cols-3 gap-2 text-center">
            <div>
              <p class="text-2xl font-bold text-gray-900">{{ g.contracts }}</p>
              <p class="text-xs text-gray-500">成約件数</p>
            </div>
            <div>
              <p class="text-2xl font-bold text-gray-900">{{ g.newClients }}</p>
              <p class="text-xs text-gray-500">新規顧客</p>
            </div>
            <div>
              <p class="text-2xl font-bold text-gray-900">{{ g.activities }}</p>
              <p class="text-xs text-gray-500">活動件数</p>
            </div>
          </div>
        </div>
      </div>

      <!-- サービス別・FPランキング -->
      <div class="grid md:grid-cols-2 gap-5">

        <!-- サービス別成約数 -->
        <div class="card p-5">
          <h2 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Icon name="heroicons:chart-bar" class="h-5 w-5 text-primary-600" />
            サービス別成約数（今月）
          </h2>
          <div class="space-y-3">
            <div v-for="s in serviceRanking" :key="s.label" class="flex items-center gap-3">
              <span class="text-sm text-gray-600 w-20 shrink-0">{{ s.label }}</span>
              <div class="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                <div
                  class="h-full rounded-full bg-primary-400 flex items-center justify-end pr-2 transition-all"
                  :style="{ width: `${(s.count / s.max) * 100}%` }"
                >
                  <span class="text-xs font-semibold text-white">{{ s.count }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- FPランキング -->
        <div class="card p-5">
          <h2 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Icon name="heroicons:trophy" class="h-5 w-5 text-amber-500" />
            FP別 成約数ランキング（今月）
          </h2>
          <div class="space-y-2">
            <div
              v-for="fp in fpRanking"
              :key="fp.rank"
              class="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-gray-50 cursor-pointer transition group"
              @click="selectedFp = fp"
            >
              <span class="w-6 text-center text-sm font-bold text-gray-400 shrink-0">
                {{ fp.badge || fp.rank }}
              </span>
              <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-semibold text-sm">
                {{ fp.avatar }}
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-900 group-hover:text-primary-600 transition-colors">{{ fp.name }}</p>
                <p class="text-xs text-gray-400">{{ fp.group }} · {{ fp.position }}</p>
              </div>
              <div class="text-right shrink-0">
                <p class="text-sm font-bold text-gray-700">{{ fp.contracts }}件</p>
              </div>
              <Icon name="heroicons:chevron-right" class="h-4 w-4 text-gray-300 group-hover:text-primary-400 transition shrink-0" />
            </div>
          </div>
        </div>

      </div>

      <!-- 新規顧客獲得数推移（CSSバーチャート） -->
      <div class="card p-5">
        <h2 class="font-semibold text-gray-900 mb-5 flex items-center gap-2">
          <Icon name="heroicons:arrow-trending-up" class="h-5 w-5 text-primary-600" />
          新規顧客獲得数推移（6ヶ月）
        </h2>

        <!-- 凡例 -->
        <div class="flex items-center gap-5 mb-4 text-xs text-gray-500">
          <span class="flex items-center gap-1.5"><span class="inline-block h-2.5 w-2.5 rounded-sm bg-indigo-400" />Reterace</span>
          <span class="flex items-center gap-1.5"><span class="inline-block h-2.5 w-2.5 rounded-sm bg-sky-400" />Miraito</span>
          <span class="flex items-center gap-1.5"><span class="inline-block h-2.5 w-2.5 rounded-sm bg-amber-400" />Asset</span>
        </div>

        <!-- バーチャート -->
        <div class="flex items-end gap-3 h-40">
          <div
            v-for="m in MOCK_MONTHLY_NEW_CLIENTS"
            :key="m.month"
            class="flex-1 flex flex-col items-center gap-0.5"
          >
            <!-- 積み上げバー -->
            <div class="w-full flex flex-col-reverse gap-px" :style="{ height: `${(m.total / maxTotal) * 130}px` }">
              <div class="w-full bg-indigo-400 rounded-b-sm" :style="{ flex: m.reterace }" />
              <div class="w-full bg-sky-400"    :style="{ flex: m.miraito }" />
              <div class="w-full bg-amber-400 rounded-t-sm" :style="{ flex: m.asset }" />
            </div>
            <!-- 合計ラベル -->
            <p class="text-[10px] font-semibold text-gray-600">{{ m.total }}</p>
            <!-- 月ラベル -->
            <p class="text-[11px] text-gray-400">{{ m.month }}</p>
          </div>
        </div>
      </div>

    </template>

    <!-- 個人ダッシュボード（一般FP） -->
    <template v-else>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div v-for="kpi in myKpis" :key="kpi.label" class="card p-4">
          <div class="flex items-start justify-between">
            <div>
              <p class="text-xs text-gray-500 font-medium">{{ kpi.label }}</p>
              <p class="mt-1 text-2xl font-bold text-gray-900">
                {{ kpi.value }}<span class="text-sm font-normal text-gray-500 ml-0.5">{{ kpi.unit }}</span>
              </p>
            </div>
            <span class="inline-flex items-center justify-center h-8 w-8 rounded-lg" :class="kpi.color">
              <Icon :name="kpi.icon" class="h-4 w-4" />
            </span>
          </div>
        </div>
      </div>

      <div class="card p-5">
        <h2 class="font-semibold text-gray-900 mb-4">今月の目標達成状況</h2>
        <div class="space-y-4">
          <div>
            <div class="flex justify-between text-sm mb-1.5">
              <span class="text-gray-600">成約数</span><span class="font-semibold text-gray-900">8 / 10件</span>
            </div>
            <div class="h-3 w-full rounded-full bg-gray-100">
              <div class="h-3 rounded-full bg-green-400" style="width: 80%" />
            </div>
          </div>
          <div>
            <div class="flex justify-between text-sm mb-1.5">
              <span class="text-gray-600">新規顧客</span><span class="font-semibold text-gray-900">3 / 5件</span>
            </div>
            <div class="h-3 w-full rounded-full bg-gray-100">
              <div class="h-3 rounded-full bg-blue-400" style="width: 60%" />
            </div>
          </div>
          <div>
            <div class="flex justify-between text-sm mb-1.5">
              <span class="text-gray-600">活動件数</span><span class="font-semibold text-gray-900">24 / 30件</span>
            </div>
            <div class="h-3 w-full rounded-full bg-gray-100">
              <div class="h-3 rounded-full bg-purple-400" style="width: 80%" />
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- FP詳細スライドオーバー -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-200"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-150"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="selectedFp"
          class="fixed inset-0 z-50 flex justify-end bg-black/30"
          @click.self="selectedFp = null"
        >
          <div class="w-full max-w-sm bg-white shadow-2xl overflow-y-auto">
            <!-- ヘッダー -->
            <div class="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between z-10">
              <div class="flex items-center gap-3">
                <div class="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-bold text-base">
                  {{ selectedFp.avatar }}
                </div>
                <div>
                  <p class="font-bold text-gray-900 leading-tight">{{ selectedFp.name }}</p>
                  <p class="text-xs text-gray-400">{{ selectedFp.group }} · {{ selectedFp.position }}</p>
                </div>
              </div>
              <button class="p-1.5 rounded-lg hover:bg-gray-100" @click="selectedFp = null">
                <Icon name="heroicons:x-mark" class="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div class="p-5 space-y-5 text-sm">

              <!-- 今月の実績 -->
              <section>
                <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">今月の実績</h3>
                <div class="grid grid-cols-2 gap-3">
                  <div class="rounded-xl bg-green-50 p-3 text-center">
                    <p class="text-2xl font-bold text-green-700">{{ selectedFp.contracts }}</p>
                    <p class="text-xs text-green-600 mt-0.5">成約件数</p>
                  </div>
                  <div class="rounded-xl bg-blue-50 p-3 text-center">
                    <p class="text-2xl font-bold text-blue-700">{{ selectedFp.activities }}</p>
                    <p class="text-xs text-blue-600 mt-0.5">活動件数</p>
                  </div>
                  <div class="rounded-xl bg-purple-50 p-3 text-center">
                    <p class="text-2xl font-bold text-purple-700">{{ selectedFp.newClients }}</p>
                    <p class="text-xs text-purple-600 mt-0.5">新規顧客</p>
                  </div>
                  <div class="rounded-xl bg-amber-50 p-3 text-center">
                    <p class="text-2xl font-bold text-amber-700">{{ selectedFp.referrals }}</p>
                    <p class="text-xs text-amber-600 mt-0.5">紹介獲得</p>
                  </div>
                </div>
              </section>

              <!-- 基本情報 -->
              <section>
                <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">基本情報</h3>
                <dl class="space-y-2">
                  <div class="grid grid-cols-3 gap-1">
                    <dt class="text-gray-500">よみがな</dt>
                    <dd class="col-span-2 text-xs">{{ selectedFp.nameKana }}</dd>
                  </div>
                  <div class="grid grid-cols-3 gap-1">
                    <dt class="text-gray-500">携帯</dt>
                    <dd class="col-span-2">{{ selectedFp.mobile }}</dd>
                  </div>
                  <div class="grid grid-cols-3 gap-1">
                    <dt class="text-gray-500">エリア</dt>
                    <dd class="col-span-2 text-xs">{{ selectedFp.currentArea }}</dd>
                  </div>
                </dl>
              </section>

              <!-- 直近の成約 -->
              <section v-if="selectedFp.recentContracts?.length">
                <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">直近の成約</h3>
                <div class="space-y-2">
                  <div
                    v-for="(c, i) in selectedFp.recentContracts"
                    :key="i"
                    class="flex items-center gap-3 rounded-lg bg-gray-50 px-3 py-2"
                  >
                    <div class="flex-1 min-w-0">
                      <p class="text-xs font-medium text-gray-900">{{ c.customer }}</p>
                      <p class="text-xs text-gray-500">{{ c.service }}</p>
                    </div>
                    <span class="text-xs text-gray-400 shrink-0">{{ c.date }}</span>
                  </div>
                </div>
              </section>

            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>
