<script setup lang="ts">
definePageMeta({ middleware: ['auth', 'admin'] })

const adminMenus = [
  {
    to: '/admin/announcements',
    icon: 'heroicons:megaphone',
    label: 'お知らせ管理',
    description: 'ホームに表示するグループ別お知らせの作成・公開設定',
    color: 'text-teal-600 bg-teal-50',
  },
  {
    to: '/admin/apps',
    icon: 'heroicons:squares-2x2',
    label: 'アプリ管理',
    description: 'アプリのフォーム設計・フィールド設定・権限管理',
    color: 'text-primary-600 bg-primary-50',
  },
  {
    to: '/admin/users',
    icon: 'heroicons:users',
    label: 'ユーザー管理',
    description: '未来設計士アカウントの作成・編集・権限設定',
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
    to: '/requests/approve',
    icon: 'heroicons:clipboard-document-check',
    label: '申請一覧',
    description: '組合・グループ登録、プラン変更、サポート者変更などの申請を承認',
    color: 'text-emerald-600 bg-emerald-50',
  },
  {
    to: '/admin/request-approvers',
    icon: 'heroicons:key',
    label: '申請承認権限の設定',
    description: '申請種別ごとに承認できる担当者を指定（未設定の種別は理事会メンバー以上が承認）',
    color: 'text-rose-600 bg-rose-50',
  },
  {
    to: '/admin/operation-logs',
    icon: 'heroicons:document-text',
    label: '操作ログ',
    description: 'ログイン・削除・承認・権限変更・CSV出力などの重要操作の履歴',
    color: 'text-gray-600 bg-gray-100',
  },
  // 「制限コンテンツ（JACCS等）」「CSVインポート管理」「サンプルデータ投入」
  // 「生命保険データ投入」「スペースデータ投入」「ディレクター検索インデックス投入」は
  // 開発・初期データ投入用のメニューのため、運用開始に伴いメニューから非表示にした
  // （画面自体は削除していないため、必要時はURLを直接指定すればアクセス可能）
]

const { fetchUsers } = useUsers()
const { fetchAllSpaces } = useSpaces()

const stats = ref([
  { label: '登録ユーザー数',  value: '－', icon: 'heroicons:users',          color: 'text-blue-600' },
  { label: '顧客データ件数',  value: '－', icon: 'heroicons:user-group',      color: 'text-green-600' },
  { label: '有効スペース数',  value: '－', icon: 'heroicons:squares-2x2',     color: 'text-purple-600' },
  { label: '今月のインポート', value: '0', icon: 'heroicons:arrow-up-tray',   color: 'text-amber-600' },
])

onMounted(async () => {
  const [users, spaces] = await Promise.all([
    fetchUsers().catch(() => []),
    fetchAllSpaces().catch(() => []),
  ])
  stats.value[0].value = String(users.length)
  stats.value[2].value = String(spaces.filter(s => !s.isArchived).length)
})
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
