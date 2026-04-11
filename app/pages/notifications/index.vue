<script setup lang="ts">
import type { Unsubscribe } from 'firebase/firestore'
import type { Notification, NotificationType } from '~/types/notification'

definePageMeta({ middleware: ['auth'] })

const { subscribeNotifications, markAsRead, markAllAsRead } = useNotifications()

const notifications = ref<Array<Notification & { icon: string; iconColor: string }>>([])
let unsubscribe: Unsubscribe | undefined

const typeIconMap: Record<NotificationType, { icon: string; iconColor: string }> = {
  post_comment:      { icon: 'heroicons:chat-bubble-left',   iconColor: 'bg-green-100 text-green-600' },
  post_reaction:     { icon: 'heroicons:face-smile',         iconColor: 'bg-amber-100 text-amber-600' },
  event_created:     { icon: 'heroicons:calendar-days',      iconColor: 'bg-primary-100 text-primary-600' },
  event_reminder:    { icon: 'heroicons:calendar-days',      iconColor: 'bg-primary-100 text-primary-600' },
  meeting_created:   { icon: 'heroicons:presentation-chart-bar', iconColor: 'bg-indigo-100 text-indigo-600' },
  system:            { icon: 'heroicons:megaphone',          iconColor: 'bg-gray-100 text-gray-600' },
  customer_assigned: { icon: 'heroicons:user-plus',          iconColor: 'bg-blue-100 text-blue-600' },
}

onMounted(() => {
  unsubscribe = subscribeNotifications((notifs) => {
    notifications.value = notifs.map(n => ({
      ...n,
      ...typeIconMap[n.type] ?? { icon: 'heroicons:bell', iconColor: 'bg-gray-100 text-gray-600' },
    }))
  })
})

onUnmounted(() => {
  unsubscribe?.()
})

const unreadCount = computed(() => notifications.value.filter(n => !n.isRead).length)

const markAllRead = async () => {
  await markAllAsRead()
}

const markRead = async (id: string) => {
  const n = notifications.value.find(n => n.id === id)
  if (n && !n.isRead) await markAsRead(id)
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
