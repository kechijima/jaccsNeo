<script setup lang="ts">
definePageMeta({ middleware: ['auth', 'admin'] })

const adminMenus = [
  {
    to: '/admin/users',
    icon: 'heroicons:users',
    label: 'ユーザー管理',
    description: 'FPアカウントの作成・編集・権限設定',
    color: 'text-blue-600 bg-blue-50',
  },
  {
    to: '/admin/groups',
    icon: 'heroicons:building-office-2',
    label: 'グループ・組合マスタ',
    description: 'グループ・組合の作成・編集・メンバー管理',
    color: 'text-indigo-600 bg-indigo-50',
  },
  {
    to: '/admin/spaces',
    icon: 'heroicons:squares-2x2',
    label: 'スペース管理',
    description: 'ポータルスペースの作成・設定・アーカイブ',
    color: 'text-purple-600 bg-purple-50',
  },
  {
    to: '/admin/restricted',
    icon: 'heroicons:lock-closed',
    label: '制限コンテンツ（JACCS等）',
    description: '管理者専用コンテンツの管理・アクセスログ',
    color: 'text-red-600 bg-red-50',
  },
  {
    to: '/admin/import',
    icon: 'heroicons:arrow-up-tray',
    label: 'CSVインポート管理',
    description: 'kintoneデータのバッチインポート・履歴',
    color: 'text-green-600 bg-green-50',
  },
]

// ダミー統計（Phase1で実際のFirestoreデータに差し替え）
const stats = ref([
  { label: '登録ユーザー数', value: 42, icon: 'heroicons:users', color: 'text-blue-600' },
  { label: '顧客データ件数', value: '27,780', icon: 'heroicons:user-group', color: 'text-green-600' },
  { label: '有効スペース数', value: 38, icon: 'heroicons:squares-2x2', color: 'text-purple-600' },
  { label: '今月のインポート', value: 0, icon: 'heroicons:arrow-up-tray', color: 'text-amber-600' },
])
</script>

<template>
  <div class="p-4 md:p-6 max-w-5xl mx-auto space-y-6">

    <!-- ヘッダー -->
    <div>
      <h1 class="text-xl font-bold text-gray-900 flex items-center gap-2">
        <Icon name="heroicons:cog-6-tooth" class="h-6 w-6 text-gray-600" />
        管理者設定
      </h1>
      <p class="text-sm text-gray-500 mt-0.5">システム管理者専用メニュー</p>
    </div>

    <!-- 統計 -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div v-for="s in stats" :key="s.label" class="card p-4 text-center">
        <Icon :name="s.icon" class="h-6 w-6 mx-auto mb-1" :class="s.color" />
        <p class="text-2xl font-bold text-gray-900">{{ s.value }}</p>
        <p class="text-xs text-gray-500 mt-0.5">{{ s.label }}</p>
      </div>
    </div>

    <!-- メニューカード -->
    <div class="grid md:grid-cols-2 gap-4">
      <NuxtLink
        v-for="menu in adminMenus"
        :key="menu.to"
        :to="menu.to"
        class="card p-5 flex items-start gap-4 hover:shadow-md transition"
      >
        <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl" :class="menu.color">
          <Icon :name="menu.icon" class="h-6 w-6" />
        </div>
        <div class="min-w-0">
          <p class="font-semibold text-gray-900">{{ menu.label }}</p>
          <p class="text-xs text-gray-500 mt-0.5">{{ menu.description }}</p>
        </div>
        <Icon name="heroicons:chevron-right" class="h-5 w-5 text-gray-300 shrink-0 mt-3" />
      </NuxtLink>
    </div>

  </div>
</template>
