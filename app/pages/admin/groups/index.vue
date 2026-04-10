<script setup lang="ts">
definePageMeta({ middleware: ['auth', 'admin'] })

// ダミーデータ（Phase1でFirestoreから取得）
const groups = ref([
  {
    id: 'reterace',
    name: 'Reterace',
    color: 'bg-indigo-500',
    managerName: '岡 リーダー',
    kumiais: [
      { id: 'riraclus', name: 'りらくす組合', adminName: '牧田 PM', memberCount: 119 },
      { id: 'radical', name: 'ラジカル組合', adminName: '中村 PM', memberCount: 63 },
      { id: 'rattrapante', name: 'ラトラパンテ組合', adminName: '田中 PM', memberCount: 48 },
      { id: 'ichika', name: '都華-ichika-組合', adminName: '山田 PM', memberCount: 32 },
    ],
  },
  {
    id: 'miraito',
    name: 'Miraito',
    color: 'bg-sky-500',
    managerName: '川崎 リーダー',
    kumiais: [
      { id: 'miraito_k', name: 'ミライト組合', adminName: '川崎 EM2', memberCount: 87 },
      { id: 'riane', name: 'リアン組合', adminName: '木村 PM', memberCount: 54 },
      { id: 'calest', name: 'カレスト組合', adminName: '佐々木 PM', memberCount: 41 },
    ],
  },
  {
    id: 'asset',
    name: 'Asset',
    color: 'bg-amber-500',
    managerName: '兵頭 リーダー',
    kumiais: [
      { id: 'asset_k', name: 'アセット組合', adminName: '兵頭 EM2', memberCount: 76 },
      { id: 'tegoris', name: 'テゴリス組合', adminName: '服部 PM', memberCount: 68 },
      { id: 'yokoito', name: '緯-yokoito-組合', adminName: '相原 PM', memberCount: 45 },
    ],
  },
])

const expandedGroups = ref(['reterace', 'miraito', 'asset'])
const editingGroup = ref<string | null>(null)
</script>

<template>
  <div class="p-4 md:p-6 max-w-4xl mx-auto space-y-5">

    <div class="flex items-center gap-2 text-sm text-gray-400">
      <NuxtLink to="/admin">管理者設定</NuxtLink>
      <Icon name="heroicons:chevron-right" class="h-3 w-3" />
      <span class="text-gray-600">グループ・組合マスタ</span>
    </div>

    <div class="flex items-start justify-between gap-3">
      <h1 class="text-xl font-bold text-gray-900">グループ・組合マスタ</h1>
      <button class="btn-primary text-sm flex items-center gap-1.5">
        <Icon name="heroicons:plus" class="h-4 w-4" />
        組合を追加
      </button>
    </div>

    <!-- グループ別 -->
    <div v-for="group in groups" :key="group.id" class="card overflow-hidden">
      <div class="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div class="flex items-center gap-3">
          <div class="h-4 w-4 rounded-full" :class="group.color" />
          <h2 class="font-semibold text-gray-900">{{ group.name }}</h2>
          <span class="text-xs text-gray-400">管理者: {{ group.managerName }}</span>
        </div>
        <button class="text-xs text-primary-600 hover:underline">グループ編集</button>
      </div>

      <div class="divide-y divide-gray-50">
        <div
          v-for="kumiai in group.kumiais"
          :key="kumiai.id"
          class="flex items-center justify-between px-5 py-3.5"
        >
          <div>
            <p class="text-sm font-medium text-gray-900">{{ kumiai.name }}</p>
            <p class="text-xs text-gray-400">管理者: {{ kumiai.adminName }} · {{ kumiai.memberCount }}名</p>
          </div>
          <div class="flex items-center gap-2">
            <button class="text-xs text-primary-600 hover:underline">編集</button>
            <button class="text-xs text-gray-400 hover:text-red-500">削除</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 専門チーム -->
    <div class="card overflow-hidden">
      <div class="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50">
        <h2 class="font-semibold text-gray-900">横串専門チーム（グループ横断）</h2>
        <button class="text-xs text-primary-600 hover:underline">チームを追加</button>
      </div>
      <div class="divide-y divide-gray-50">
        <div class="flex items-center justify-between px-5 py-3.5">
          <div>
            <p class="text-sm font-medium text-gray-900">不動産チーム（未来設計ハウジング）</p>
            <p class="text-xs text-gray-400">グループ横断 · 32名</p>
          </div>
          <button class="text-xs text-primary-600 hover:underline">編集</button>
        </div>
        <div class="flex items-center justify-between px-5 py-3.5">
          <div>
            <p class="text-sm font-medium text-gray-900">損保チーム</p>
            <p class="text-xs text-gray-400">グループ横断 · 28名</p>
          </div>
          <button class="text-xs text-primary-600 hover:underline">編集</button>
        </div>
      </div>
    </div>

  </div>
</template>
