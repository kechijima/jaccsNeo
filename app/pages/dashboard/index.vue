<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

const { user, displayName } = useCurrentUser()
const { canViewGlobalDashboard, canViewGroupDashboard } = usePermission()

const now = new Date()
const greeting = computed(() => {
  const h = now.getHours()
  if (h < 12) return 'おはようございます'
  if (h < 18) return 'こんにちは'
  return 'こんばんは'
})

const kpiCards = computed(() => [
  { label: '今月の活動数',  value: '－',  unit: '件', icon: 'heroicons:clipboard-document-list', color: 'bg-blue-50 text-blue-700' },
  { label: '今月の成約数',  value: '－',  unit: '件', icon: 'heroicons:trophy',                  color: 'bg-green-50 text-green-700' },
  { label: '担当顧客数',    value: '－',  unit: '名', icon: 'heroicons:users',                   color: 'bg-purple-50 text-purple-700' },
  { label: '紹介獲得数',    value: '－',  unit: '件', icon: 'heroicons:share',                   color: 'bg-amber-50 text-amber-700' },
])

const { fetchEvents } = useEvents()
const { fetchSpaces, fetchPosts } = useSpaces()
const { fetchCustomers } = useCustomers()

const scheduleItems = ref<Array<{ id: string; title: string; startAt: string; location?: string }>>([])
const followUpItems = ref<Array<{ id: string; name: string; tel?: string; note: string }>>([])
const portalPosts = ref<Array<{ id: string; spaceId: string; spaceName: string; authorName: string; content: string }>>([])

onMounted(async () => {
  const [events, spaces] = await Promise.all([
    fetchEvents({ upcoming: true }).catch(() => []),
    fetchSpaces().catch(() => []),
  ])

  scheduleItems.value = events.slice(0, 3).map(e => ({
    id:       e.id,
    title:    e.title,
    startAt:  e.startAt.toDate().toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
    location: e.location,
  }))

  if (spaces.length > 0) {
    const posts = await fetchPosts(spaces[0].id).catch(() => [])
    portalPosts.value = posts.slice(0, 2).map(p => ({
      id:         p.id,
      spaceId:    spaces[0].id,
      spaceName:  spaces[0].name,
      authorName: p.authorName,
      content:    p.content.slice(0, 80) + (p.content.length > 80 ? '...' : ''),
    }))
  }
})
</script>

<template>
  <div class="p-4 md:p-6 max-w-6xl mx-auto space-y-6">

    <!-- ===== 挨拶ヘッダー ===== -->
    <div>
      <h1 class="text-xl md:text-2xl font-bold text-gray-900">
        {{ greeting }}、{{ displayName }}さん
      </h1>
      <p class="mt-1 text-sm text-gray-500">
        {{ now.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }) }}
      </p>
    </div>

    <!-- ===== KPIカード ===== -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
      <div
        v-for="card in kpiCards"
        :key="card.label"
        class="card p-4"
      >
        <div class="flex items-start justify-between">
          <div>
            <p class="text-xs text-gray-500 font-medium">{{ card.label }}</p>
            <p class="mt-1 text-2xl font-bold text-gray-900">
              {{ card.value }}<span class="text-sm font-normal text-gray-500 ml-1">{{ card.unit }}</span>
            </p>
          </div>
          <span class="inline-flex items-center justify-center h-8 w-8 rounded-lg" :class="card.color">
            <Icon :name="card.icon" class="h-4 w-4" />
          </span>
        </div>
      </div>
    </div>

    <!-- ===== メイングリッド ===== -->
    <div class="grid md:grid-cols-2 gap-4 md:gap-6">

      <!-- 今週のスケジュール -->
      <div class="card p-5">
        <div class="flex items-center justify-between mb-4">
          <h2 class="font-semibold text-gray-900 flex items-center gap-2">
            <Icon name="heroicons:calendar-days" class="h-5 w-5 text-primary-600" />
            今週のスケジュール
          </h2>
          <NuxtLink to="/events" class="text-xs text-primary-600 hover:underline">すべて表示</NuxtLink>
        </div>

        <div v-if="scheduleItems.length === 0" class="text-center py-8">
          <Icon name="heroicons:calendar" class="h-10 w-10 text-gray-300 mx-auto mb-2" />
          <p class="text-sm text-gray-400">予定はありません</p>
          <NuxtLink to="/events/new" class="mt-3 inline-block text-xs text-primary-600 hover:underline">
            イベントを追加する
          </NuxtLink>
        </div>

        <ul v-else class="space-y-2">
          <li
            v-for="item in scheduleItems"
            :key="(item as any).id"
            class="flex items-start gap-3 rounded-lg p-2.5 hover:bg-gray-50"
          >
            <!-- Phase4で実装 -->
          </li>
        </ul>
      </div>

      <!-- フォローアップ要対応 -->
      <div class="card p-5">
        <div class="flex items-center justify-between mb-4">
          <h2 class="font-semibold text-gray-900 flex items-center gap-2">
            <Icon name="heroicons:exclamation-circle" class="h-5 w-5 text-amber-500" />
            フォローアップ要対応
          </h2>
          <NuxtLink to="/customers" class="text-xs text-primary-600 hover:underline">顧客一覧へ</NuxtLink>
        </div>

        <div v-if="followUpItems.length === 0" class="text-center py-8">
          <Icon name="heroicons:check-circle" class="h-10 w-10 text-green-300 mx-auto mb-2" />
          <p class="text-sm text-gray-400">対応が必要な顧客はいません</p>
        </div>

        <ul v-else class="space-y-2">
          <li
            v-for="item in followUpItems"
            :key="(item as any).id"
            class="flex items-center gap-3 rounded-lg p-2.5 hover:bg-gray-50"
          >
            <!-- Phase2で実装 -->
          </li>
        </ul>
      </div>

      <!-- ポータル新着 -->
      <div class="card p-5">
        <div class="flex items-center justify-between mb-4">
          <h2 class="font-semibold text-gray-900 flex items-center gap-2">
            <Icon name="heroicons:chat-bubble-left-right" class="h-5 w-5 text-primary-600" />
            ポータル新着
          </h2>
          <NuxtLink to="/portal" class="text-xs text-primary-600 hover:underline">ポータルへ</NuxtLink>
        </div>

        <div v-if="portalPosts.length === 0" class="text-center py-8">
          <Icon name="heroicons:chat-bubble-left-ellipsis" class="h-10 w-10 text-gray-300 mx-auto mb-2" />
          <p class="text-sm text-gray-400">新着投稿はありません</p>
        </div>
      </div>

      <!-- クイックリンク -->
      <div class="card p-5">
        <h2 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Icon name="heroicons:bolt" class="h-5 w-5 text-primary-600" />
          クイックアクション
        </h2>
        <div class="grid grid-cols-2 gap-2">
          <NuxtLink
            to="/customers/new"
            class="flex flex-col items-center gap-1.5 rounded-lg border border-gray-200 p-3 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-primary-300 transition"
          >
            <Icon name="heroicons:user-plus" class="h-6 w-6 text-primary-600" />
            顧客登録
          </NuxtLink>
          <NuxtLink
            to="/customers"
            class="flex flex-col items-center gap-1.5 rounded-lg border border-gray-200 p-3 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-primary-300 transition"
          >
            <Icon name="heroicons:magnifying-glass" class="h-6 w-6 text-primary-600" />
            顧客検索
          </NuxtLink>
          <NuxtLink
            to="/portal"
            class="flex flex-col items-center gap-1.5 rounded-lg border border-gray-200 p-3 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-primary-300 transition"
          >
            <Icon name="heroicons:pencil-square" class="h-6 w-6 text-primary-600" />
            活動報告
          </NuxtLink>
          <NuxtLink
            to="/events/new"
            class="flex flex-col items-center gap-1.5 rounded-lg border border-gray-200 p-3 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-primary-300 transition"
          >
            <Icon name="heroicons:calendar-plus" class="h-6 w-6 text-primary-600" />
            イベント追加
          </NuxtLink>
        </div>
      </div>

    </div>

    <!-- ===== 全体ダッシュボード（board以上のみ） ===== -->
    <div v-if="canViewGlobalDashboard" class="card p-5">
      <div class="flex items-center justify-between mb-4">
        <h2 class="font-semibold text-gray-900 flex items-center gap-2">
          <Icon name="heroicons:chart-bar" class="h-5 w-5 text-primary-600" />
          チーム全体（管理者ビュー）
        </h2>
        <NuxtLink to="/team" class="text-xs text-primary-600 hover:underline">詳細を見る</NuxtLink>
      </div>
      <p class="text-sm text-gray-400 text-center py-6">
        チームダッシュボードはPhase 5で実装予定です
      </p>
    </div>

  </div>
</template>
