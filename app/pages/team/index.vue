<script setup lang="ts">
import type { MeetingSummary } from '~/types/meeting'

definePageMeta({ middleware: ['auth'] })

const { canViewGlobalDashboard, canViewGroupDashboard } = usePermission()
const { user } = useCurrentUser()
const { fetchMeetings } = useMeetings()

// 現在の年月を動的に生成
const currentMonth = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' })

// Phase 5 — aggregate from meetings by group (dummy until per-group data is available)
const groupKpis = ref([
  { label: 'Reterace', color: 'bg-indigo-500', contracts: 42, newClients: 18, activities: 156 },
  { label: 'Miraito', color: 'bg-sky-500', contracts: 38, newClients: 15, activities: 134 },
  { label: 'Asset', color: 'bg-amber-500', contracts: 45, newClients: 21, activities: 178 },
])

const serviceRanking = ref([
  { label: '生命保険', count: 35, max: 35 },
  { label: '不動産', count: 28, max: 35 },
  { label: '転職', count: 19, max: 35 },
  { label: '火災保険', count: 15, max: 35 },
  { label: '通信', count: 12, max: 35 },
  { label: '損保', count: 8, max: 35 },
])

const fpRanking = ref([
  { rank: 1, name: '山田 太郎', group: 'Asset', contracts: 12, badge: '🥇' },
  { rank: 2, name: '西島 伸樹', group: 'Reterace', contracts: 10, badge: '🥈' },
  { rank: 3, name: '田中 花子', group: 'Miraito', contracts: 9, badge: '🥉' },
  { rank: 4, name: '鈴木 健二', group: 'Asset', contracts: 8, badge: '' },
  { rank: 5, name: '池田 美咲', group: 'Reterace', contracts: 7, badge: '' },
])

// 個人KPI（Phase 5 — per-user stats aggregation from Firestore）
const myKpis = ref([
  { label: '今月の活動数', value: 24, unit: '件', icon: 'heroicons:clipboard-document-list', color: 'bg-blue-50 text-blue-700' },
  { label: '今月の成約数', value: 8, unit: '件', icon: 'heroicons:trophy', color: 'bg-green-50 text-green-700' },
  { label: '目標達成率', value: 80, unit: '%', icon: 'heroicons:chart-bar', color: 'bg-purple-50 text-purple-700' },
  { label: '今月の紹介獲得', value: 3, unit: '件', icon: 'heroicons:share', color: 'bg-amber-50 text-amber-700' },
])

onMounted(async () => {
  await fetchMeetings()
})
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
          <Icon name="heroicons:presentation-chart-bar" class="h-4 w-4" />
          数字会議
        </NuxtLink>
        <NuxtLink to="/team/members" class="btn-secondary text-sm flex items-center gap-1.5">
          <Icon name="heroicons:users" class="h-4 w-4" />
          メンバー
        </NuxtLink>
      </div>
    </div>

    <!-- 全体ダッシュボード（管理者・理事会） -->
    <template v-if="canViewGlobalDashboard">

      <!-- グループ別KPI -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          v-for="g in groupKpis"
          :key="g.label"
          class="card p-5"
        >
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
          <div class="space-y-2.5">
            <div v-for="fp in fpRanking" :key="fp.rank" class="flex items-center gap-3">
              <span class="w-6 text-center text-sm font-bold text-gray-400">
                {{ fp.badge || fp.rank }}
              </span>
              <div class="flex-1">
                <p class="text-sm font-medium text-gray-900">{{ fp.name }}</p>
                <p class="text-xs text-gray-400">{{ fp.group }}</p>
              </div>
              <span class="text-sm font-bold text-gray-700">{{ fp.contracts }}件</span>
            </div>
          </div>
        </div>

      </div>

      <!-- 推移グラフプレースホルダー -->
      <div class="card p-5">
        <h2 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Icon name="heroicons:arrow-trending-up" class="h-5 w-5 text-primary-600" />
          新規顧客獲得数推移（6ヶ月）
        </h2>
        <div class="flex items-center justify-center h-40 rounded-xl bg-gray-50 border-2 border-dashed border-gray-200">
          <div class="text-center">
            <Icon name="heroicons:chart-bar-square" class="h-10 w-10 text-gray-300 mx-auto mb-2" />
            <p class="text-sm text-gray-400">グラフはPhase 5で実装予定</p>
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

      <!-- 目標達成ゲージ -->
      <div class="card p-5">
        <h2 class="font-semibold text-gray-900 mb-4">今月の目標達成状況</h2>
        <div class="space-y-4">
          <div>
            <div class="flex justify-between text-sm mb-1.5">
              <span class="text-gray-600">成約数</span>
              <span class="font-semibold text-gray-900">8 / 10件</span>
            </div>
            <div class="h-3 w-full rounded-full bg-gray-100">
              <div class="h-3 rounded-full bg-green-400 transition-all" style="width: 80%" />
            </div>
          </div>
          <div>
            <div class="flex justify-between text-sm mb-1.5">
              <span class="text-gray-600">新規顧客</span>
              <span class="font-semibold text-gray-900">3 / 5件</span>
            </div>
            <div class="h-3 w-full rounded-full bg-gray-100">
              <div class="h-3 rounded-full bg-blue-400 transition-all" style="width: 60%" />
            </div>
          </div>
          <div>
            <div class="flex justify-between text-sm mb-1.5">
              <span class="text-gray-600">活動件数</span>
              <span class="font-semibold text-gray-900">24 / 30件</span>
            </div>
            <div class="h-3 w-full rounded-full bg-gray-100">
              <div class="h-3 rounded-full bg-purple-400 transition-all" style="width: 80%" />
            </div>
          </div>
        </div>
      </div>

    </template>

  </div>
</template>
