<script setup lang="ts">
import { MOCK_NOTIFICATIONS } from '~/data/mock'

definePageMeta({ middleware: ['auth'] })

const typeIconMap: Record<string, { icon: string; iconColor: string }> = {
  post_comment:      { icon: 'heroicons:chat-bubble-left',        iconColor: 'bg-green-100 text-green-600' },
  post_reaction:     { icon: 'heroicons:face-smile',              iconColor: 'bg-amber-100 text-amber-600' },
  event_created:     { icon: 'heroicons:calendar-days',           iconColor: 'bg-primary-100 text-primary-600' },
  event_reminder:    { icon: 'heroicons:bell-alert',              iconColor: 'bg-primary-100 text-primary-600' },
  meeting_created:   { icon: 'heroicons:presentation-chart-bar',  iconColor: 'bg-indigo-100 text-indigo-600' },
  system:            { icon: 'heroicons:megaphone',               iconColor: 'bg-gray-100 text-gray-600' },
  customer_assigned: { icon: 'heroicons:user-plus',               iconColor: 'bg-blue-100 text-blue-600' },
  mention:           { icon: 'heroicons:at-symbol',               iconColor: 'bg-rose-100 text-rose-600' },
}

// モックデータをローカル状態に（既読操作に対応）
const notifications = ref(
  MOCK_NOTIFICATIONS.map(n => ({
    ...n,
    ...(typeIconMap[n.type] ?? { icon: 'heroicons:bell', iconColor: 'bg-gray-100 text-gray-600' }),
  }))
)

const activeTab = ref<'all' | 'unread'>('all')

const displayed = computed(() =>
  activeTab.value === 'unread'
    ? notifications.value.filter(n => !n.isRead)
    : notifications.value
)

const unreadCount = computed(() => notifications.value.filter(n => !n.isRead).length)

// 通知タップ：既読にして該当ページへ遷移
const handleTap = (n: typeof notifications.value[0]) => {
  if (!n.isRead) n.isRead = true
  if (n.linkUrl) navigateTo(n.linkUrl)
}

// 全て既読
const markAllRead = () => {
  notifications.value.forEach(n => { n.isRead = true })
}

// 日付フォーマット
const formatDate = (ts: any): string => {
  if (!ts) return ''
  const d: Date = ts?.toDate?.() ?? (ts instanceof Date ? ts : new Date(ts))
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)
  if (diffMin < 1)   return 'たった今'
  if (diffMin < 60)  return `${diffMin}分前`
  if (diffHour < 24) return `${diffHour}時間前`
  if (diffDay < 7)   return `${diffDay}日前`
  return d.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })
}
</script>

<template>
  <div class="p-4 md:p-6 max-w-3xl mx-auto space-y-5">

    <!-- ヘッダー -->
    <div class="flex items-center justify-between gap-3">
      <div>
        <h1 class="text-xl font-bold text-gray-900 flex items-center gap-2">
          通知
          <span
            v-if="unreadCount > 0"
            class="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[11px] font-bold text-white"
          >{{ unreadCount > 9 ? '9+' : unreadCount }}</span>
        </h1>
        <p class="text-sm text-gray-500 mt-0.5">{{ notifications.length }}件 ／ 未読 {{ unreadCount }}件</p>
      </div>
      <button
        v-if="unreadCount > 0"
        class="text-sm text-primary-600 hover:underline"
        @click="markAllRead"
      >
        すべて既読にする
      </button>
    </div>

    <!-- タブ -->
    <div class="flex gap-1 rounded-lg bg-gray-100 p-1 w-fit">
      <button
        class="rounded-md px-4 py-1.5 text-sm font-medium transition"
        :class="activeTab === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'"
        @click="activeTab = 'all'"
      >
        すべて
      </button>
      <button
        class="rounded-md px-4 py-1.5 text-sm font-medium transition flex items-center gap-1.5"
        :class="activeTab === 'unread' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'"
        @click="activeTab = 'unread'"
      >
        未読
        <span
          v-if="unreadCount > 0"
          class="flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white"
        >{{ unreadCount }}</span>
      </button>
    </div>

    <!-- 通知リスト -->
    <div class="card divide-y divide-gray-50 overflow-hidden">
      <div v-if="displayed.length === 0" class="p-12 text-center">
        <Icon name="heroicons:bell-slash" class="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p class="text-sm text-gray-400">
          {{ activeTab === 'unread' ? '未読の通知はありません' : '通知はありません' }}
        </p>
      </div>

      <div
        v-for="n in displayed"
        :key="n.id"
        class="flex items-start gap-4 px-5 py-4 transition hover:bg-gray-50"
        :class="[
          !n.isRead ? 'bg-blue-50/40' : '',
          n.linkUrl ? 'cursor-pointer' : 'cursor-default',
        ]"
        @click="handleTap(n)"
      >
        <!-- アイコン -->
        <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" :class="n.iconColor">
          <Icon :name="n.icon" class="h-5 w-5" />
        </div>

        <!-- 内容 -->
        <div class="flex-1 min-w-0">
          <p class="text-sm text-gray-900" :class="!n.isRead ? 'font-semibold' : 'font-medium'">{{ n.title }}</p>
          <p class="text-xs text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">{{ n.body }}</p>
          <p class="text-xs text-gray-400 mt-1.5">{{ formatDate(n.createdAt) }}</p>
        </div>

        <!-- 未読ドット -->
        <div class="shrink-0 mt-2">
          <div v-if="!n.isRead" class="h-2.5 w-2.5 rounded-full bg-primary-500" />
          <div v-else class="h-2.5 w-2.5" />
        </div>
      </div>
    </div>

  </div>
</template>
