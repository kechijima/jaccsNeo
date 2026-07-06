<script setup lang="ts">
import { MOCK_NOTIFICATIONS, MOCK_SPACES } from '~/data/mock'
import { usePortalStore } from '~/composables/usePortalStore'
import { useCustomerStore } from '~/composables/useCustomerStore'

definePageMeta({ middleware: ['auth'] })

const { user, displayName } = useCurrentUser()
const portalStore = usePortalStore()
const customerStore = useCustomerStore()

const now = new Date()
const greeting = computed(() => {
  const h = now.getHours()
  if (h < 12) return 'おはようございます'
  if (h < 18) return 'こんにちは'
  return 'こんばんは'
})

// ── お知らせ ───────────────────────────────────────────────────────────────
const allNotifications = computed(() => MOCK_NOTIFICATIONS.slice(0, 5))

const notifTypeLabel = (type: string) => {
  const map: Record<string, string> = {
    post_comment:     'コメント',
    mention:          'メンション',
    post_reaction:    'リアクション',
    event_reminder:   'イベント',
    event_created:    'イベント',
    customer_assigned:'顧客',
    meeting_created:  '商談',
    system:           'システム',
  }
  return map[type] ?? 'お知らせ'
}

const notifTypeColor = (type: string) => {
  const map: Record<string, string> = {
    post_comment:     'bg-blue-100 text-blue-700',
    mention:          'bg-purple-100 text-purple-700',
    post_reaction:    'bg-pink-100 text-pink-700',
    event_reminder:   'bg-amber-100 text-amber-700',
    event_created:    'bg-amber-100 text-amber-700',
    customer_assigned:'bg-green-100 text-green-700',
    meeting_created:  'bg-sky-100 text-sky-700',
    system:           'bg-gray-100 text-gray-600',
  }
  return map[type] ?? 'bg-gray-100 text-gray-600'
}

// ── アプリ shortcuts ───────────────────────────────────────────────────────
const appShortcuts = [
  { label: 'パーソナルデータ', icon: 'heroicons:identification', to: '/personal-data',           color: 'bg-indigo-50 text-indigo-600' },
  { label: '生命保険',    icon: 'heroicons:shield-check',     to: '/services/lifeInsurance',   color: 'bg-blue-50 text-blue-600' },
  { label: '火災保険',    icon: 'heroicons:home-modern',      to: '/services/fireInsurance',   color: 'bg-orange-50 text-orange-600' },
  { label: '不動産売買',  icon: 'heroicons:building-office',  to: '/services/realEstateSale',  color: 'bg-amber-50 text-amber-600' },
  { label: '転職',        icon: 'heroicons:briefcase',        to: '/services/jobChange',       color: 'bg-purple-50 text-purple-600' },
  { label: '通信',        icon: 'heroicons:wifi',             to: '/services/communication',   color: 'bg-sky-50 text-sky-600' },
  { label: '旅行',        icon: 'heroicons:paper-airplane',   to: '/services/travel',          color: 'bg-teal-50 text-teal-600' },
  { label: 'ブライダル',  icon: 'heroicons:heart',            to: '/services/bridal',          color: 'bg-rose-50 text-rose-600' },
  { label: 'すべてのアプリ', icon: 'heroicons:squares-2x2',  to: '/services',                 color: 'bg-gray-100 text-gray-600' },
]

// ── スペース（掲示板） ─────────────────────────────────────────────────────
const spaceColorMap: Record<string, string> = {
  all:     'bg-green-100 text-green-700',
  group:   'bg-indigo-100 text-indigo-700',
  kumiai:  'bg-purple-100 text-purple-700',
  special: 'bg-amber-100 text-amber-700',
}

const spacePosts = computed(() => portalStore.posts.value.slice(0, 5))

// HTMLタグを除去して80文字に切り詰める（80文字以下なら「...」を付けない）
const excerpt = (html: string) => {
  const text = html.replace(/<[^>]*>/g, '')
  return text.length > 80 ? text.slice(0, 80) + '...' : text
}
const pinnedSpaces = computed(() =>
  MOCK_SPACES.filter(s => s.isPinned).map(s => ({
    ...s,
    color: spaceColorMap[s.type] ?? 'bg-indigo-100 text-indigo-700',
    unread: s.id === 's002' ? 2 : s.id === 's001' ? 1 : 0,
  })),
)

// ── KPI ───────────────────────────────────────────────────────────────────
const totalCustomers = computed(() => customerStore.customers.value.length)
const unreadNotifCount = computed(() => MOCK_NOTIFICATIONS.filter(n => !n.isRead).length)
</script>

<template>
  <div class="p-4 md:p-6 max-w-7xl mx-auto space-y-6">

    <!-- ===== 挨拶ヘッダー ===== -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h1 class="text-xl md:text-2xl font-bold text-gray-900">
          {{ greeting }}、{{ displayName }}さん
        </h1>
        <p class="mt-1 text-sm text-gray-500">
          {{ now.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }) }}
        </p>
      </div>
      <div class="flex items-center gap-2">
        <NuxtLink to="/customers/new" class="btn-primary text-sm flex items-center gap-1.5">
          <Icon name="heroicons:user-plus" class="h-4 w-4" />
          顧客登録
        </NuxtLink>
        <NuxtLink to="/mypage" class="btn-secondary text-sm flex items-center gap-1.5">
          <Icon name="heroicons:user-circle" class="h-4 w-4" />
          マイページ
        </NuxtLink>
      </div>
    </div>

    <!-- ===== KPI mini ===== -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div class="card p-4 flex items-center gap-3">
        <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50">
          <Icon name="heroicons:users" class="h-5 w-5 text-primary-600" />
        </div>
        <div>
          <p class="text-xs text-gray-500">顧客数</p>
          <p class="text-lg font-bold text-gray-900">{{ totalCustomers }}<span class="text-xs font-normal text-gray-400 ml-1">名</span></p>
        </div>
      </div>
      <div class="card p-4 flex items-center gap-3">
        <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50">
          <Icon name="heroicons:bell" class="h-5 w-5 text-amber-600" />
        </div>
        <div>
          <p class="text-xs text-gray-500">未読通知</p>
          <p class="text-lg font-bold text-gray-900">{{ unreadNotifCount }}<span class="text-xs font-normal text-gray-400 ml-1">件</span></p>
        </div>
      </div>
      <div class="card p-4 flex items-center gap-3">
        <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-50">
          <Icon name="heroicons:squares-2x2" class="h-5 w-5 text-green-600" />
        </div>
        <div>
          <p class="text-xs text-gray-500">アプリ</p>
          <p class="text-lg font-bold text-gray-900">18<span class="text-xs font-normal text-gray-400 ml-1">種</span></p>
        </div>
      </div>
      <div class="card p-4 flex items-center gap-3">
        <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50">
          <Icon name="heroicons:chat-bubble-left-right" class="h-5 w-5 text-indigo-600" />
        </div>
        <div>
          <p class="text-xs text-gray-500">スペース</p>
          <p class="text-lg font-bold text-gray-900">{{ pinnedSpaces.length }}<span class="text-xs font-normal text-gray-400 ml-1">件</span></p>
        </div>
      </div>
    </div>

    <!-- ===== 3カラムグリッド ===== -->
    <div class="grid md:grid-cols-3 gap-5">

      <!-- ===== 1. お知らせ ===== -->
      <div class="card overflow-hidden flex flex-col">
        <div class="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 class="font-bold text-gray-900 flex items-center gap-2">
            <Icon name="heroicons:bell" class="h-5 w-5 text-amber-500" />
            お知らせ
            <span v-if="unreadNotifCount > 0" class="ml-1 flex h-5 px-1.5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white min-w-[20px]">
              {{ unreadNotifCount }}
            </span>
          </h2>
          <NuxtLink to="/notifications" class="text-xs text-primary-600 hover:underline">すべて</NuxtLink>
        </div>

        <div class="flex-1 divide-y divide-gray-50 overflow-y-auto">
          <div
            v-for="notif in allNotifications"
            :key="notif.id"
            class="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition"
            :class="!notif.isRead ? 'bg-blue-50/40' : ''"
          >
            <div class="mt-0.5 flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="badge text-[10px] font-semibold px-1.5" :class="notifTypeColor(notif.type)">
                  {{ notifTypeLabel(notif.type) }}
                </span>
                <span v-if="!notif.isRead" class="inline-block h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
              </div>
              <p class="text-xs font-semibold text-gray-800 mt-0.5 truncate">{{ notif.title }}</p>
              <p class="text-xs text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">{{ notif.body }}</p>
            </div>
          </div>
          <div v-if="allNotifications.length === 0" class="flex flex-col items-center justify-center py-12">
            <Icon name="heroicons:bell-slash" class="h-10 w-10 text-gray-200 mb-2" />
            <p class="text-sm text-gray-400">お知らせはありません</p>
          </div>
        </div>

        <div class="px-5 py-3 border-t border-gray-100 bg-gray-50/50">
          <NuxtLink to="/notifications" class="block text-center text-xs text-primary-600 hover:underline font-medium">
            通知センターを開く →
          </NuxtLink>
        </div>
      </div>

      <!-- ===== 2. アプリ ===== -->
      <div class="card overflow-hidden flex flex-col">
        <div class="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 class="font-bold text-gray-900 flex items-center gap-2">
            <Icon name="heroicons:squares-2x2" class="h-5 w-5 text-green-600" />
            アプリ
          </h2>
          <NuxtLink to="/services" class="text-xs text-primary-600 hover:underline">一覧</NuxtLink>
        </div>

        <div class="flex-1 p-4">
          <div class="grid grid-cols-3 gap-2">
            <NuxtLink
              v-for="app in appShortcuts"
              :key="app.to"
              :to="app.to"
              class="flex flex-col items-center gap-1.5 rounded-xl p-2.5 text-center hover:bg-gray-50 transition group"
            >
              <div class="flex h-10 w-10 items-center justify-center rounded-xl" :class="app.color">
                <Icon :name="app.icon" class="h-5 w-5" />
              </div>
              <span class="text-[10px] font-medium text-gray-600 group-hover:text-primary-700 leading-tight">{{ app.label }}</span>
            </NuxtLink>
          </div>
        </div>

        <div class="px-5 py-3 border-t border-gray-100 bg-gray-50/50">
          <NuxtLink to="/services" class="block text-center text-xs text-primary-600 hover:underline font-medium">
            すべてのアプリを見る →
          </NuxtLink>
        </div>
      </div>

      <!-- ===== 3. スペース（掲示板） ===== -->
      <div class="card overflow-hidden flex flex-col">
        <div class="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 class="font-bold text-gray-900 flex items-center gap-2">
            <Icon name="heroicons:chat-bubble-left-right" class="h-5 w-5 text-indigo-600" />
            掲示板
          </h2>
          <NuxtLink to="/portal" class="text-xs text-primary-600 hover:underline">すべて</NuxtLink>
        </div>

        <!-- ピン留めスペース -->
        <div class="px-4 py-3 border-b border-gray-100">
          <p class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">スペース</p>
          <div class="space-y-1">
            <NuxtLink
              v-for="space in pinnedSpaces"
              :key="space.id"
              :to="`/portal/spaces/${space.id}`"
              class="flex items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-gray-50 transition"
            >
              <div class="flex items-center gap-2 min-w-0">
                <div class="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[10px] font-bold" :class="space.color">
                  {{ space.name.charAt(0) }}
                </div>
                <span class="truncate text-gray-700 text-xs">{{ space.name }}</span>
              </div>
              <span v-if="space.unread > 0" class="ml-2 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary-500 text-[9px] font-bold text-white">
                {{ space.unread }}
              </span>
            </NuxtLink>
          </div>
        </div>

        <!-- 最新投稿 -->
        <div class="flex-1 overflow-y-auto divide-y divide-gray-50">
          <p class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-4 pt-3 pb-1">最新投稿</p>
          <div
            v-for="post in spacePosts"
            :key="post.id"
            class="px-4 py-3 hover:bg-gray-50 transition"
          >
            <NuxtLink :to="`/portal/spaces/${post.spaceId}/posts/${post.id}`" class="block">
              <div class="flex items-center gap-2 mb-1">
                <span class="text-xs font-semibold text-gray-800">{{ post.authorName }}</span>
                <span class="badge text-[10px]" :class="post.spaceColor">{{ post.spaceName }}</span>
              </div>
              <p class="text-xs text-gray-500 line-clamp-2 leading-relaxed">{{ excerpt(post.content) }}</p>
            </NuxtLink>
          </div>
          <div v-if="spacePosts.length === 0" class="flex flex-col items-center justify-center py-8">
            <Icon name="heroicons:chat-bubble-left" class="h-8 w-8 text-gray-200 mb-2" />
            <p class="text-xs text-gray-400">投稿はありません</p>
          </div>
        </div>

        <div class="px-5 py-3 border-t border-gray-100 bg-gray-50/50">
          <NuxtLink to="/portal" class="block text-center text-xs text-primary-600 hover:underline font-medium">
            掲示板を開く →
          </NuxtLink>
        </div>
      </div>

    </div>

    <!-- ===== クイックアクション ===== -->
    <div class="card p-5">
      <h2 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Icon name="heroicons:bolt" class="h-5 w-5 text-primary-600" />
        クイックアクション
      </h2>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <NuxtLink to="/customers/new" class="flex items-center gap-2 rounded-lg border border-gray-200 p-3 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-primary-300 transition">
          <Icon name="heroicons:user-plus" class="h-5 w-5 text-primary-600 shrink-0" />
          顧客登録
        </NuxtLink>
        <NuxtLink to="/personal-data" class="flex items-center gap-2 rounded-lg border border-gray-200 p-3 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-primary-300 transition">
          <Icon name="heroicons:magnifying-glass" class="h-5 w-5 text-primary-600 shrink-0" />
          顧客検索
        </NuxtLink>
        <NuxtLink to="/portal" class="flex items-center gap-2 rounded-lg border border-gray-200 p-3 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-primary-300 transition">
          <Icon name="heroicons:pencil-square" class="h-5 w-5 text-primary-600 shrink-0" />
          掲示板に投稿
        </NuxtLink>
        <NuxtLink to="/events" class="flex items-center gap-2 rounded-lg border border-gray-200 p-3 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-primary-300 transition">
          <Icon name="heroicons:calendar-days" class="h-5 w-5 text-primary-600 shrink-0" />
          イベント一覧
        </NuxtLink>
      </div>
    </div>

  </div>
</template>
