<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

const route = useRoute()
const meetingId = computed(() => route.params.meetingId as string)

// ダミーデータ（Phase5でFirestoreから取得）
const meeting = ref({
  date: '2026/04/08',
  spaceName: 'りらくす組合 数字会議',
  memo: '今月は不動産案件が好調。来週から保険見直しキャンペーンを開始予定。',
  reports: [
    { name: '西島 伸樹', newClients: 4, contracts: 6, activities: 18, notes: '田中様の生保成約が大きかった' },
    { name: '池田 健太郎', newClients: 3, contracts: 5, activities: 15, notes: '' },
    { name: '田中 洋子', newClients: 5, contracts: 4, activities: 22, notes: '不動産紹介を複数獲得' },
    { name: '山田 健太', newClients: 3, contracts: 6, activities: 19, notes: '' },
    { name: '鈴木 真理子', newClients: 3, contracts: 3, activities: 15, notes: '' },
  ],
})

const totals = computed(() => ({
  newClients: meeting.value.reports.reduce((s, r) => s + r.newClients, 0),
  contracts: meeting.value.reports.reduce((s, r) => s + r.contracts, 0),
  activities: meeting.value.reports.reduce((s, r) => s + r.activities, 0),
}))
</script>

<template>
  <div class="p-4 md:p-6 max-w-4xl mx-auto space-y-5">

    <div class="flex items-center gap-2 text-sm text-gray-400">
      <NuxtLink to="/team">チーム</NuxtLink>
      <Icon name="heroicons:chevron-right" class="h-3 w-3" />
      <NuxtLink to="/team/meetings">数字会議</NuxtLink>
      <Icon name="heroicons:chevron-right" class="h-3 w-3" />
      <span class="text-gray-600">詳細</span>
    </div>

    <div class="flex items-start justify-between gap-3">
      <div>
        <h1 class="text-xl font-bold text-gray-900">{{ meeting.spaceName }}</h1>
        <p class="text-sm text-gray-500 mt-0.5">{{ meeting.date }}</p>
      </div>
      <NuxtLink :to="`/team/meetings/new`" class="btn-secondary text-sm">再入力</NuxtLink>
    </div>

    <!-- サマリーKPI -->
    <div class="grid grid-cols-3 gap-4">
      <div class="card p-4 text-center">
        <p class="text-3xl font-bold text-gray-900">{{ totals.newClients }}</p>
        <p class="text-sm text-gray-500 mt-1">新規顧客合計</p>
      </div>
      <div class="card p-4 text-center">
        <p class="text-3xl font-bold text-green-600">{{ totals.contracts }}</p>
        <p class="text-sm text-gray-500 mt-1">成約合計</p>
      </div>
      <div class="card p-4 text-center">
        <p class="text-3xl font-bold text-blue-600">{{ totals.activities }}</p>
        <p class="text-sm text-gray-500 mt-1">活動合計</p>
      </div>
    </div>

    <!-- 個人別結果 -->
    <div class="card overflow-hidden">
      <div class="px-5 py-3 border-b border-gray-100 bg-gray-50">
        <h2 class="font-semibold text-gray-900">担当者別 実績</h2>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-100">
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">担当者</th>
              <th class="px-4 py-3 text-center text-xs font-semibold text-gray-500">新規</th>
              <th class="px-4 py-3 text-center text-xs font-semibold text-gray-500">成約</th>
              <th class="px-4 py-3 text-center text-xs font-semibold text-gray-500">活動</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">メモ</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            <tr v-for="r in meeting.reports" :key="r.name">
              <td class="px-4 py-3 font-medium text-gray-900">{{ r.name }}</td>
              <td class="px-4 py-3 text-center text-gray-700">{{ r.newClients }}</td>
              <td class="px-4 py-3 text-center font-semibold text-green-700">{{ r.contracts }}</td>
              <td class="px-4 py-3 text-center font-semibold text-blue-700">{{ r.activities }}</td>
              <td class="px-4 py-3 text-gray-400 text-xs">{{ r.notes }}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="bg-gray-50 border-t-2 border-gray-200 font-bold">
              <td class="px-4 py-3 text-gray-900">合計</td>
              <td class="px-4 py-3 text-center text-gray-900">{{ totals.newClients }}</td>
              <td class="px-4 py-3 text-center text-green-700">{{ totals.contracts }}</td>
              <td class="px-4 py-3 text-center text-blue-700">{{ totals.activities }}</td>
              <td class="px-4 py-3" />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>

    <!-- メモ -->
    <div v-if="meeting.memo" class="card p-5">
      <h2 class="font-semibold text-gray-900 mb-2">会議メモ</h2>
      <p class="text-sm text-gray-700 whitespace-pre-line">{{ meeting.memo }}</p>
    </div>

  </div>
</template>
