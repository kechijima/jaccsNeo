<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

// ダミーデータ（Phase5でFirestoreから取得）
const meetings = ref([
  {
    id: 'mtg_001',
    date: '2026/04/08',
    spaceName: 'りらくす組合 数字会議',
    attendeeCount: 12,
    summary: { totalNewClients: 18, totalContracts: 24, totalActivities: 89 },
  },
  {
    id: 'mtg_002',
    date: '2026/04/01',
    spaceName: 'りらくす組合 数字会議',
    attendeeCount: 11,
    summary: { totalNewClients: 15, totalContracts: 20, totalActivities: 75 },
  },
  {
    id: 'mtg_003',
    date: '2026/03/25',
    spaceName: 'りらくす組合 数字会議',
    attendeeCount: 12,
    summary: { totalNewClients: 22, totalContracts: 30, totalActivities: 102 },
  },
])
</script>

<template>
  <div class="p-4 md:p-6 max-w-3xl mx-auto space-y-5">

    <div class="flex items-center gap-2 text-sm text-gray-400">
      <NuxtLink to="/team">チーム</NuxtLink>
      <Icon name="heroicons:chevron-right" class="h-3 w-3" />
      <span class="text-gray-600">数字会議</span>
    </div>

    <div class="flex items-start justify-between gap-3">
      <h1 class="text-xl font-bold text-gray-900">数字会議</h1>
      <NuxtLink to="/team/meetings/new" class="btn-primary text-sm flex items-center gap-1.5">
        <Icon name="heroicons:plus" class="h-4 w-4" />
        新規入力
      </NuxtLink>
    </div>

    <!-- 会議一覧 -->
    <div class="space-y-3">
      <NuxtLink
        v-for="m in meetings"
        :key="m.id"
        :to="`/team/meetings/${m.id}`"
        class="card p-5 block hover:shadow-md transition"
      >
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-xs text-gray-400 mb-0.5">{{ m.date }}</p>
            <p class="font-semibold text-gray-900">{{ m.spaceName }}</p>
            <p class="text-xs text-gray-500 mt-1">参加者 {{ m.attendeeCount }}名</p>
          </div>
          <div class="flex gap-4 text-center shrink-0">
            <div>
              <p class="text-lg font-bold text-gray-900">{{ m.summary.totalNewClients }}</p>
              <p class="text-xs text-gray-400">新規</p>
            </div>
            <div>
              <p class="text-lg font-bold text-green-600">{{ m.summary.totalContracts }}</p>
              <p class="text-xs text-gray-400">成約</p>
            </div>
            <div>
              <p class="text-lg font-bold text-blue-600">{{ m.summary.totalActivities }}</p>
              <p class="text-xs text-gray-400">活動</p>
            </div>
          </div>
        </div>
      </NuxtLink>
    </div>

  </div>
</template>
