<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

// ダミーデータ（Phase4でFirestoreリアルタイムリスナーに差し替え）
const notifications = ref([
  {
    id: 'n001',
    type: 'mention',
    icon: 'heroicons:at-symbol',
    iconColor: 'bg-blue-100 text-blue-600',
    message: '池田 健太郎 さんがあなたをメンションしました',
    detail: 'りらくす組合 — 「西島さん、先週の田中様の件どうなりましたか？」',
    link: '/portal/spaces/space_001',
    isRead: false,
    createdAt: '30分前',
  },
  {
    id: 'n002',
    type: 'comment',
    icon: 'heroicons:chat-bubble-left',
    iconColor: 'bg-green-100 text-green-600',
    message: '山田 健太 さんがコメントしました',
    detail: 'りらくす組合 — 「いいですね！契約につながるといいですね。」',
    link: '/portal/spaces/space_001',
    isRead: false,
    createdAt: '2時間前',
  },
  {
    id: 'n003',
    type: 'event',
    icon: 'heroicons:calendar-days',
    iconColor: 'bg-primary-100 text-primary-600',
    message: 'イベントリマインダー: りらくす組合 数字会議',
    detail: '明日（4/15）20:00〜 オンライン（Zoom）',
    link: '/events/evt_001',
    isRead: false,
    createdAt: '3時間前',
  },
  {
    id: 'n004',
    type: 'reaction',
    icon: 'heroicons:face-smile',
    iconColor: 'bg-amber-100 text-amber-600',
    message: '田中 洋子 さんがリアクションしました 👍',
    detail: 'あなたの投稿: 「本日の活動報告です...」',
    link: '/portal/spaces/space_001',
    isRead: true,
    createdAt: '1日前',
  },
  {
    id: 'n005',
    type: 'status',
    icon: 'heroicons:document-text',
    iconColor: 'bg-purple-100 text-purple-600',
    message: '案件ステータスが更新されました',
    detail: '田中 一郎 — 生命保険 → 成約',
    link: '/customers/cust_001/services/lifeInsurance/case001',
    isRead: true,
    createdAt: '2日前',
  },
  {
    id: 'n006',
    type: 'system',
    icon: 'heroicons:megaphone',
    iconColor: 'bg-gray-100 text-gray-600',
    message: '【全体連絡】4月の目標・方針について',
    detail: '全体連絡スペースに新しいお知らせが届いています。',
    link: '/portal/spaces/all_001',
    isRead: true,
    createdAt: '3日前',
  },
])

const unreadCount = computed(() => notifications.value.filter(n => !n.isRead).length)

const markAllRead = () => {
  notifications.value = notifications.value.map(n => ({ ...n, isRead: true }))
}

const markRead = (id: string) => {
  const n = notifications.value.find(n => n.id === id)
  if (n) n.isRead = true
}
</script>

<template>
  <div class="p-4 md:p-6 max-w-3xl mx-auto space-y-5">

    <!-- ヘッダー -->
    <div class="flex items-center justify-between gap-3">
      <div>
        <h1 class="text-xl font-bold text-gray-900 flex items-center gap-2">
          通知
          <span v-if="unreadCount > 0" class="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[11px] font-bold text-white">
            {{ unreadCount > 9 ? '9+' : unreadCount }}
          </span>
        </h1>
      </div>
      <button
        v-if="unreadCount > 0"
        class="text-sm text-primary-600 hover:underline"
        @click="markAllRead"
      >
        すべて既読にする
      </button>
    </div>

    <!-- フィルタータブ -->
    <div class="flex gap-1 rounded-lg bg-gray-100 p-1 w-fit">
      <button class="rounded-md px-4 py-1.5 text-sm font-medium bg-white text-gray-900 shadow-sm">すべて</button>
      <button class="rounded-md px-4 py-1.5 text-sm font-medium text-gray-500 hover:text-gray-700">未読</button>
    </div>

    <!-- 通知リスト -->
    <div class="card divide-y divide-gray-50 overflow-hidden">
      <div v-if="notifications.length === 0" class="p-12 text-center">
        <Icon name="heroicons:bell-slash" class="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p class="text-sm text-gray-400">通知はありません</p>
      </div>

      <NuxtLink
        v-for="n in notifications"
        :key="n.id"
        :to="n.link"
        class="flex items-start gap-4 px-5 py-4 transition hover:bg-gray-50"
        :class="!n.isRead ? 'bg-blue-50/50' : ''"
        @click="markRead(n.id)"
      >
        <!-- アイコン -->
        <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" :class="n.iconColor">
          <Icon :name="n.icon" class="h-5 w-5" />
        </div>

        <!-- 内容 -->
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-gray-900" :class="!n.isRead ? 'font-semibold' : ''">{{ n.message }}</p>
          <p class="text-xs text-gray-500 mt-0.5 line-clamp-1">{{ n.detail }}</p>
          <p class="text-xs text-gray-400 mt-1">{{ n.createdAt }}</p>
        </div>

        <!-- 未読ドット -->
        <div class="shrink-0 mt-2">
          <div v-if="!n.isRead" class="h-2.5 w-2.5 rounded-full bg-primary-500" />
        </div>
      </NuxtLink>
    </div>

  </div>
</template>
