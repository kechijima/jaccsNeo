<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

const { logout } = useAuth()
const { displayName, user } = useCurrentUser()
const authStore = useAuthStore()
const route = useRoute()

const navItems = [
  { label: 'ダッシュボード', icon: 'heroicons:home',         to: '/dashboard' },
  { label: '顧客管理',       icon: 'heroicons:users',        to: '/customers' },
  { label: 'ポータル',       icon: 'heroicons:chat-bubble-left-right', to: '/portal' },
  { label: 'イベント',       icon: 'heroicons:calendar-days', to: '/events' },
  { label: 'チーム',         icon: 'heroicons:chart-bar',    to: '/team' },
]

const isActive = (to: string) => route.path.startsWith(to)

const isMobileMenuOpen = ref(false)

// 通知（Phase4で実装・今はダミー）
const notificationCount = ref(0)

const groupColorClass = computed(() => {
  switch (user.value?.groupId) {
    case 'reterace': return 'bg-reterace'
    case 'miraito':  return 'bg-miraito'
    case 'asset':    return 'bg-asset'
    default:         return 'bg-primary-600'
  }
})

const groupLabel = computed(() => {
  switch (user.value?.groupId) {
    case 'reterace': return 'Reterace'
    case 'miraito':  return 'Miraito'
    case 'asset':    return 'Asset'
    default:         return ''
  }
})
</script>

<template>
  <div class="flex h-screen overflow-hidden bg-gray-50">

    <!-- ========== PCサイドバー ========== -->
    <aside class="hidden md:flex md:flex-col md:w-60 md:shrink-0 bg-white border-r border-gray-200">

      <!-- ロゴ -->
      <div class="flex items-center gap-2.5 px-5 py-4 border-b border-gray-200">
        <div class="flex items-center justify-center w-8 h-8 rounded-lg bg-primary-600">
          <span class="text-sm font-bold text-white">J</span>
        </div>
        <span class="text-base font-bold text-gray-900">jaccsNeo</span>
      </div>

      <!-- ナビゲーション -->
      <nav class="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        <NuxtLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition"
          :class="isActive(item.to)
            ? 'bg-primary-50 text-primary-700'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'"
        >
          <Icon :name="item.icon" class="h-5 w-5 shrink-0" />
          {{ item.label }}
        </NuxtLink>

        <!-- 通知 -->
        <NuxtLink
          to="/notifications"
          class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition"
          :class="isActive('/notifications')
            ? 'bg-primary-50 text-primary-700'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'"
        >
          <div class="relative">
            <Icon name="heroicons:bell" class="h-5 w-5 shrink-0" />
            <span
              v-if="notificationCount > 0"
              class="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white"
            >
              {{ notificationCount > 9 ? '9+' : notificationCount }}
            </span>
          </div>
          通知
        </NuxtLink>

        <!-- 管理者メニュー（system_adminのみ） -->
        <template v-if="authStore.isSystemAdmin">
          <div class="pt-3 pb-1">
            <p class="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">管理者</p>
          </div>
          <NuxtLink
            to="/admin"
            class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition"
            :class="isActive('/admin')
              ? 'bg-primary-50 text-primary-700'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'"
          >
            <Icon name="heroicons:cog-6-tooth" class="h-5 w-5 shrink-0" />
            管理者設定
          </NuxtLink>
        </template>
      </nav>

      <!-- ユーザー情報 -->
      <div class="border-t border-gray-200 p-4">
        <div class="flex items-center gap-3">
          <div
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
            :class="groupColorClass"
          >
            {{ displayName.charAt(0) }}
          </div>
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium text-gray-900">{{ displayName }}</p>
            <p class="truncate text-xs text-gray-500">{{ groupLabel }}</p>
          </div>
          <button
            type="button"
            class="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
            title="ログアウト"
            @click="logout"
          >
            <Icon name="heroicons:arrow-right-on-rectangle" class="h-5 w-5" />
          </button>
        </div>
      </div>
    </aside>

    <!-- ========== メインコンテンツ ========== -->
    <div class="flex flex-1 flex-col overflow-hidden">

      <!-- PCヘッダー（スマホでは非表示） -->
      <header class="hidden md:flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
        <!-- パンくず / ページタイトル -->
        <div>
          <slot name="header" />
        </div>
        <div class="text-sm text-gray-500">
          {{ new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' }) }}
        </div>
      </header>

      <!-- スマホヘッダー -->
      <header class="md:hidden flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
        <div class="flex items-center gap-2">
          <div class="flex items-center justify-center w-7 h-7 rounded-lg bg-primary-600">
            <span class="text-xs font-bold text-white">J</span>
          </div>
          <span class="text-sm font-bold text-gray-900">jaccsNeo</span>
        </div>
        <div class="flex items-center gap-2">
          <NuxtLink to="/notifications" class="relative rounded-lg p-2 text-gray-500 hover:bg-gray-100">
            <Icon name="heroicons:bell" class="h-5 w-5" />
            <span
              v-if="notificationCount > 0"
              class="absolute top-1 right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white"
            >
              {{ notificationCount > 9 ? '9+' : notificationCount }}
            </span>
          </NuxtLink>
        </div>
      </header>

      <!-- コンテンツエリア -->
      <main class="flex-1 overflow-y-auto pb-20 md:pb-0">
        <slot />
      </main>
    </div>

    <!-- ========== SPボトムナビ ========== -->
    <nav class="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white border-t border-gray-200">
      <div class="flex items-stretch">
        <NuxtLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 text-xs font-medium transition"
          :class="isActive(item.to)
            ? 'text-primary-600'
            : 'text-gray-500 hover:text-gray-700'"
        >
          <Icon :name="item.icon" class="h-5 w-5 mb-0.5" />
          <span>{{ item.label }}</span>
        </NuxtLink>
      </div>
    </nav>

  </div>
</template>
