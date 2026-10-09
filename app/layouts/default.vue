<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import { useNotifications } from '~/composables/useNotifications'
import { useGroupLabels } from '~/composables/useGroupLabels'
import { useThemeColor } from '~/composables/useThemeColor'
import { useHelpDrawer } from '~/composables/useHelpDrawer'
import { useDisplayName } from '~/composables/useDisplayName'
import { useSoftRefresh } from '~/composables/useSoftRefresh'

const { logout } = useAuth()
const { open: openHelp } = useHelpDrawer()
const { isRefreshing, refresh } = useSoftRefresh()
const { displayName, user } = useCurrentUser()
const authStore = useAuthStore()
const route = useRoute()
const { subscribeUnreadCount } = useNotifications()
const { ensureLoaded: ensureGroupLabelsLoaded } = useGroupLabels()
const { format: formatDisplayName } = useDisplayName()
const { ensureLoaded: ensureThemeColorLoaded } = useThemeColor()
onMounted(() => { ensureGroupLabelsLoaded(); ensureThemeColorLoaded() })

// F5・Ctrl+R等での誤ったページ更新や、ブラウザを閉じてしまうことへの注意喚起。
// ページ側のJavaScriptでリロード自体を禁止することはブラウザの仕様上できない
// ため（主要ブラウザは意図的にこれを許していない）、ブラウザ標準の確認
// ダイアログ（文言はブラウザ依存で固定・カスタマイズ不可）を表示するに留める。
// ダイアログで続行（OK）を選んだ場合は、ブラウザが現在のURLをそのまま
// 再読み込みするため、ログイン画面ではなく元いた画面に戻る（ログイン状態も
// 維持される。F5更新時の誤ログアウトは別途ミドルウェア側で修正済み）。
// このリスナーは認証済み画面（defaultレイアウト）でのみ有効にし、ログイン
// 画面等（authレイアウト）では表示しない
const handleBeforeUnload = (e: BeforeUnloadEvent) => {
  e.preventDefault()
  e.returnValue = ''
}
onMounted(() => {
  window.addEventListener('beforeunload', handleBeforeUnload)
})
onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload)
})

// 「チーム」メニュー（実績等の統計）は一般ロールには表示しない。
// 「メンバー一覧」はロールに関わらず全員に表示する
const navItems = computed(() => [
  { label: 'ダッシュボード',   icon: 'heroicons:home',                   to: '/dashboard' },
  { label: 'パーソナルデータ', icon: 'heroicons:identification',         to: '/personal-data' },
  { label: 'プロダクトアプリ', icon: 'heroicons:squares-2x2',            to: '/services' },
  { label: '活動報告',         icon: 'heroicons:chat-bubble-left-right', to: '/portal' },
  { label: 'カレンダー',       icon: 'heroicons:calendar-days',          to: '/events' },
  { label: 'リマインダー',     icon: 'heroicons:bell-alert',             to: '/reminders' },
  ...(authStore.user?.role !== 'general'
    ? [{ label: 'チーム', icon: 'heroicons:chart-bar', to: '/team' }]
    : []),
  { label: 'メンバー一覧',     icon: 'heroicons:users',                  to: '/team/members' },
  { label: '業務ツールアプリ', icon: 'heroicons:wrench-screwdriver',     to: '/tools' },
  { label: '申請',             icon: 'heroicons:document-check',         to: '/requests' },
])

// SPボトムナビ用（項目数を絞り、短いラベルで表示崩れを防ぐ）
const mobileNavItems = [
  { label: 'ホーム',   icon: 'heroicons:home',                   to: '/dashboard' },
  { label: 'データ',   icon: 'heroicons:identification',         to: '/personal-data' },
  { label: 'アプリ',   icon: 'heroicons:squares-2x2',            to: '/services' },
  { label: '活動報告', icon: 'heroicons:chat-bubble-left-right', to: '/portal' },
  { label: 'カレンダー', icon: 'heroicons:calendar-days',          to: '/events' },
]

const isActive = (to: string) => route.path.startsWith(to)

const isMobileMenuOpen = ref(false)

// PCサイドバーの開閉状態（アイコンのみの折りたたみ表示）。次回アクセス時も保持する
const SIDEBAR_COLLAPSED_KEY = 'jaccsneo:sidebarCollapsed'
const sidebarCollapsed = ref(false)
onMounted(() => {
  try {
    sidebarCollapsed.value = localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1'
  } catch {
    // プライベートブラウジング等でlocalStorageが使えない場合は展開状態のまま
  }
})
const toggleSidebar = () => {
  sidebarCollapsed.value = !sidebarCollapsed.value
  try {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, sidebarCollapsed.value ? '1' : '0')
  } catch {
    // 保存できなくても画面上の開閉動作には影響しない
  }
}

// 通知未読数（リアルタイム）
const notificationCount = ref(0)
let unsubscribeNotifCount: (() => void) | null = null
onMounted(() => {
  if (!authStore.user?.uid) return
  unsubscribeNotifCount = subscribeUnreadCount((count) => { notificationCount.value = count })
})
onBeforeUnmount(() => unsubscribeNotifCount?.())

</script>

<template>
  <div class="flex h-screen overflow-hidden bg-gray-50">

    <!-- ========== PCサイドバー ========== -->
    <aside
      class="hidden md:flex md:flex-col md:shrink-0 bg-white border-r border-gray-200 transition-all duration-200"
      :class="sidebarCollapsed ? 'md:w-16' : 'md:w-60'"
    >

      <!-- ロゴ -->
      <div class="flex items-center gap-2.5 px-5 py-4 border-b border-gray-200" :class="sidebarCollapsed ? 'justify-center px-0' : ''">
        <img src="/logo.png" alt="" class="w-8 h-8 object-contain shrink-0" />
        <span v-if="!sidebarCollapsed" class="text-base font-bold text-gray-900 truncate">JACCS Neo</span>
      </div>

      <!-- 開閉トグル -->
      <button
        type="button"
        class="flex items-center gap-2 px-3 py-2 text-xs text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition border-b border-gray-200"
        :class="sidebarCollapsed ? 'justify-center' : ''"
        :title="sidebarCollapsed ? 'メニューを開く' : 'メニューを閉じる'"
        @click="toggleSidebar"
      >
        <Icon :name="sidebarCollapsed ? 'heroicons:chevron-double-right' : 'heroicons:chevron-double-left'" class="h-4 w-4 shrink-0" />
        <span v-if="!sidebarCollapsed">メニューを閉じる</span>
      </button>

      <!-- ナビゲーション -->
      <nav class="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        <NuxtLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition"
          :class="[
            isActive(item.to) ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
            sidebarCollapsed ? 'justify-center px-0' : '',
          ]"
          :title="sidebarCollapsed ? item.label : undefined"
        >
          <Icon :name="item.icon" class="h-5 w-5 shrink-0" />
          <span v-if="!sidebarCollapsed" class="truncate">{{ item.label }}</span>
        </NuxtLink>

        <!-- マイページ -->
        <NuxtLink
          to="/mypage"
          class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition"
          :class="[
            isActive('/mypage') ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
            sidebarCollapsed ? 'justify-center px-0' : '',
          ]"
          :title="sidebarCollapsed ? 'マイページ' : undefined"
        >
          <Icon name="heroicons:user-circle" class="h-5 w-5 shrink-0" />
          <span v-if="!sidebarCollapsed">マイページ</span>
        </NuxtLink>

        <!-- 通知 -->
        <NuxtLink
          to="/notifications"
          class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition"
          :class="[
            isActive('/notifications') ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
            sidebarCollapsed ? 'justify-center px-0' : '',
          ]"
          :title="sidebarCollapsed ? '通知' : undefined"
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
          <span v-if="!sidebarCollapsed">通知</span>
        </NuxtLink>

        <!-- 検索 -->
        <NuxtLink
          to="/search"
          class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition"
          :class="[
            isActive('/search') ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
            sidebarCollapsed ? 'justify-center px-0' : '',
          ]"
          :title="sidebarCollapsed ? '検索' : undefined"
        >
          <Icon name="heroicons:magnifying-glass" class="h-5 w-5 shrink-0" />
          <span v-if="!sidebarCollapsed">検索</span>
        </NuxtLink>

        <!-- 管理者メニュー（system_adminのみ） -->
        <template v-if="authStore.isSystemAdmin">
          <div class="pt-3 pb-1">
            <p v-if="!sidebarCollapsed" class="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">管理者</p>
            <hr v-else class="border-gray-200" />
          </div>
          <NuxtLink
            to="/admin"
            class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition"
            :class="[
              isActive('/admin') ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
              sidebarCollapsed ? 'justify-center px-0' : '',
            ]"
            :title="sidebarCollapsed ? '管理者設定' : undefined"
          >
            <Icon name="heroicons:cog-6-tooth" class="h-5 w-5 shrink-0" />
            <span v-if="!sidebarCollapsed">管理者設定</span>
          </NuxtLink>
        </template>
      </nav>

      <!-- ユーザー情報 -->
      <div class="border-t border-gray-200 p-4">
        <div class="flex items-center gap-3" :class="sidebarCollapsed ? 'flex-col' : ''">
          <NuxtLink
            to="/settings"
            class="flex items-center gap-3 min-w-0 group"
            :class="sidebarCollapsed ? '' : 'flex-1'"
            title="設定"
          >
            <UserAvatar
              :avatar-url="user?.avatarUrl"
              :display-name="displayName"
              :group-id="user?.groupId"
              size="md"
              class="transition group-hover:ring-2 group-hover:ring-offset-1 group-hover:ring-primary-300"
            />
            <div v-if="!sidebarCollapsed" class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium text-gray-900 group-hover:text-primary-700 transition">{{ user ? formatDisplayName(user) : displayName }}</p>
            </div>
          </NuxtLink>
          <button
            type="button"
            class="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition shrink-0"
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
        <div class="flex items-center gap-3">
          <div class="text-sm text-gray-500">
            {{ new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' }) }}
          </div>
          <button
            type="button"
            class="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition disabled:opacity-50"
            aria-label="最新の情報に更新"
            title="最新の情報に更新"
            :disabled="isRefreshing"
            @click="refresh"
          >
            <Icon name="heroicons:arrow-path" class="h-5 w-5" :class="{ 'animate-spin': isRefreshing }" />
          </button>
          <button
            type="button"
            class="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition"
            aria-label="マニュアル"
            @click="openHelp"
          >
            <Icon name="heroicons:book-open" class="h-5 w-5" />
          </button>
        </div>
      </header>

      <!-- スマホヘッダー -->
      <header class="md:hidden flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
        <div class="flex items-center gap-2">
          <img src="/logo.png" alt="" class="w-7 h-7 object-contain shrink-0" />
          <span class="text-sm font-bold text-gray-900">JACCS Neo</span>
        </div>
        <div class="flex items-center gap-1">
          <button
            type="button"
            class="rounded-lg p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-50"
            aria-label="最新の情報に更新"
            :disabled="isRefreshing"
            @click="refresh"
          >
            <Icon name="heroicons:arrow-path" class="h-5 w-5" :class="{ 'animate-spin': isRefreshing }" />
          </button>
          <NuxtLink to="/search" class="rounded-lg p-2 text-gray-500 hover:bg-gray-100" aria-label="検索">
            <Icon name="heroicons:magnifying-glass" class="h-5 w-5" />
          </NuxtLink>
          <NuxtLink to="/reminders" class="rounded-lg p-2 text-gray-500 hover:bg-gray-100" aria-label="リマインダー">
            <Icon name="heroicons:bell-alert" class="h-5 w-5" />
          </NuxtLink>
          <button type="button" class="rounded-lg p-2 text-gray-500 hover:bg-gray-100" aria-label="マニュアル" @click="openHelp">
            <Icon name="heroicons:book-open" class="h-5 w-5" />
          </button>
          <NuxtLink to="/notifications" class="relative rounded-lg p-2 text-gray-500 hover:bg-gray-100">
            <Icon name="heroicons:bell" class="h-5 w-5" />
            <span
              v-if="notificationCount > 0"
              class="absolute top-1 right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white"
            >
              {{ notificationCount > 9 ? '9+' : notificationCount }}
            </span>
          </NuxtLink>
          <button
            type="button"
            class="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
            @click="isMobileMenuOpen = true"
          >
            <Icon name="heroicons:bars-3" class="h-5 w-5" />
          </button>
        </div>
      </header>

      <!-- コンテンツエリア -->
      <main class="flex-1 overflow-y-auto overscroll-contain pb-20 md:pb-0">
        <slot />
      </main>
    </div>

    <!-- ========== SPボトムナビ ========== -->
    <nav class="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white border-t border-gray-200">
      <div class="flex items-stretch">
        <NuxtLink
          v-for="item in mobileNavItems"
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

    <!-- ========== SPメニュー（マイページ・管理者設定・ログアウト） ========== -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-200"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-150"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="isMobileMenuOpen"
          class="md:hidden fixed inset-0 z-50 bg-black/40"
          @click.self="isMobileMenuOpen = false"
        >
          <Transition
            enter-active-class="transition duration-200"
            enter-from-class="translate-x-full"
            enter-to-class="translate-x-0"
            leave-active-class="transition duration-150"
            leave-from-class="translate-x-0"
            leave-to-class="translate-x-full"
          >
            <div v-if="isMobileMenuOpen" class="absolute right-0 top-0 h-full w-72 max-w-[85vw] bg-white shadow-2xl flex flex-col">
              <!-- ユーザー情報 -->
              <div class="flex items-center gap-3 border-b border-gray-200 p-4">
                <NuxtLink to="/settings" class="flex items-center gap-3 min-w-0 flex-1" title="設定" @click="isMobileMenuOpen = false">
                  <UserAvatar
                    :avatar-url="user?.avatarUrl"
                    :display-name="displayName"
                    :group-id="user?.groupId"
                    size="md"
                  />
                  <div class="min-w-0 flex-1">
                    <p class="truncate text-sm font-medium text-gray-900">{{ user ? formatDisplayName(user) : displayName }}</p>
                  </div>
                </NuxtLink>
                <button type="button" class="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 shrink-0" @click="isMobileMenuOpen = false">
                  <Icon name="heroicons:x-mark" class="h-5 w-5" />
                </button>
              </div>

              <!-- ナビゲーション -->
              <nav class="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
                <NuxtLink
                  to="/mypage"
                  class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition"
                  :class="isActive('/mypage') ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-100'"
                  @click="isMobileMenuOpen = false"
                >
                  <Icon name="heroicons:user-circle" class="h-5 w-5 shrink-0" />
                  マイページ
                </NuxtLink>
                <NuxtLink
                  to="/reminders"
                  class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition"
                  :class="isActive('/reminders') ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-100'"
                  @click="isMobileMenuOpen = false"
                >
                  <Icon name="heroicons:bell-alert" class="h-5 w-5 shrink-0" />
                  リマインダー
                </NuxtLink>
                <NuxtLink
                  to="/requests"
                  class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition"
                  :class="isActive('/requests') ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-100'"
                  @click="isMobileMenuOpen = false"
                >
                  <Icon name="heroicons:document-check" class="h-5 w-5 shrink-0" />
                  申請
                </NuxtLink>
                <NuxtLink
                  v-if="authStore.user?.role !== 'general'"
                  to="/team"
                  class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition"
                  :class="isActive('/team') ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-100'"
                  @click="isMobileMenuOpen = false"
                >
                  <Icon name="heroicons:chart-bar" class="h-5 w-5 shrink-0" />
                  チーム
                </NuxtLink>
                <NuxtLink
                  to="/team/members"
                  class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition"
                  :class="isActive('/team/members') ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-100'"
                  @click="isMobileMenuOpen = false"
                >
                  <Icon name="heroicons:users" class="h-5 w-5 shrink-0" />
                  メンバー一覧
                </NuxtLink>
                <NuxtLink
                  to="/tools"
                  class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition"
                  :class="isActive('/tools') ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-100'"
                  @click="isMobileMenuOpen = false"
                >
                  <Icon name="heroicons:wrench-screwdriver" class="h-5 w-5 shrink-0" />
                  業務ツールアプリ
                </NuxtLink>

                <NuxtLink
                  to="/search"
                  class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition"
                  :class="isActive('/search') ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-100'"
                  @click="isMobileMenuOpen = false"
                >
                  <Icon name="heroicons:magnifying-glass" class="h-5 w-5 shrink-0" />
                  検索
                </NuxtLink>
                <button
                  type="button"
                  class="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition text-gray-600 hover:bg-gray-100"
                  @click="isMobileMenuOpen = false; openHelp()"
                >
                  <Icon name="heroicons:book-open" class="h-5 w-5 shrink-0" />
                  マニュアル
                </button>

                <template v-if="authStore.isSystemAdmin">
                  <div class="pt-3 pb-1">
                    <p class="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">管理者</p>
                  </div>
                  <NuxtLink
                    to="/admin"
                    class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition"
                    :class="isActive('/admin') ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-100'"
                    @click="isMobileMenuOpen = false"
                  >
                    <Icon name="heroicons:cog-6-tooth" class="h-5 w-5 shrink-0" />
                    管理者設定
                  </NuxtLink>
                </template>
              </nav>

              <!-- ログアウト -->
              <div class="border-t border-gray-200 p-3">
                <button
                  type="button"
                  class="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 transition"
                  @click="isMobileMenuOpen = false; logout()"
                >
                  <Icon name="heroicons:arrow-right-on-rectangle" class="h-5 w-5 shrink-0" />
                  ログアウト
                </button>
              </div>
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>
