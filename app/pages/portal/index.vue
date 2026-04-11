<script setup lang="ts">
import { MOCK_SPACES, MOCK_POSTS, MOCK_EVENTS } from '~/data/mock'

definePageMeta({ middleware: ['auth'] })

const { user } = useCurrentUser()

const spaceColorMap: Record<string, string> = {
  all:     'bg-green-100 text-green-700',
  group:   'bg-indigo-100 text-indigo-700',
  kumiai:  'bg-purple-100 text-purple-700',
  special: 'bg-amber-100 text-amber-700',
}

const allSpaces = computed(() =>
  MOCK_SPACES.map(s => ({
    id:          s.id,
    name:        s.name,
    memberCount: s.memberCount,
    unread:      s.id === 's002' ? 2 : s.id === 's001' ? 1 : 0,
    color:       spaceColorMap[s.type] ?? 'bg-indigo-100 text-indigo-700',
  }))
)

// 全スペースの最新投稿をまとめてフィードに表示
const recentPosts = computed(() => {
  const posts: any[] = []
  for (const space of MOCK_SPACES) {
    const spacePosts = MOCK_POSTS[space.id] ?? []
    for (const p of spacePosts.slice(0, 2)) {
      posts.push({
        id:            p.id,
        spaceId:       space.id,
        spaceName:     space.name,
        spaceColor:    spaceColorMap[space.type] ?? 'bg-indigo-100 text-indigo-700',
        authorName:    p.authorName,
        authorInitial: p.authorName.charAt(0),
        content:       p.content,
        reactions:     p.reactions,
        commentCount:  p.commentCount,
        isPinned:      p.isPinned,
        postedAt:      p.createdAt.toDate().toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      })
    }
  }
  // ピン留め優先、次に日付降順
  return posts.sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0))
})

const upcomingEvents = computed(() =>
  MOCK_EVENTS
    .filter(e => e.startAt.toDate() >= new Date())
    .sort((a, b) => a.startAt.toDate().getTime() - b.startAt.toDate().getTime())
    .slice(0, 3)
    .map(e => ({
      id:       e.id,
      title:    e.title,
      dateLabel: e.startAt.toDate().toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', weekday: 'short' }),
      timeLabel: e.startAt.toDate().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
      scope:    e.scope,
    }))
)

const eventColorMap: Record<string, string> = {
  all:    'bg-green-50 text-green-700',
  group:  'bg-indigo-50 text-indigo-700',
  kumiai: 'bg-purple-50 text-purple-700',
  space:  'bg-amber-50 text-amber-700',
}
</script>

<template>
  <div class="p-4 md:p-6 max-w-6xl mx-auto space-y-6">

    <!-- ヘッダー -->
    <div class="flex items-start justify-between gap-3">
      <div>
        <h1 class="text-xl font-bold text-gray-900">ポータル</h1>
        <p class="text-sm text-gray-500 mt-0.5">スペースへの投稿・活動報告</p>
      </div>
      <NuxtLink to="/portal/spaces" class="btn-secondary text-sm flex items-center gap-1.5">
        <Icon name="heroicons:squares-2x2" class="h-4 w-4" />
        スペース一覧
      </NuxtLink>
    </div>

    <div class="grid md:grid-cols-3 gap-5">

      <!-- 投稿フィード（左2カラム） -->
      <div class="md:col-span-2 space-y-4">

        <!-- 投稿ボタン -->
        <div class="card p-4">
          <div class="flex items-center gap-3">
            <div class="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 text-primary-700 font-semibold text-sm shrink-0">
              {{ user?.displayName?.charAt(0) ?? 'T' }}
            </div>
            <NuxtLink
              :to="`/portal/spaces/${allSpaces[1]?.id}`"
              class="flex-1 rounded-full bg-gray-100 px-4 py-2.5 text-sm text-gray-400 hover:bg-gray-200 transition cursor-pointer"
            >
              投稿する...
            </NuxtLink>
          </div>
        </div>

        <!-- フィード投稿一覧 -->
        <NuxtLink
          v-for="post in recentPosts"
          :key="post.id"
          :to="`/portal/spaces/${post.spaceId}`"
          class="card p-5 block hover:shadow-md transition"
        >
          <div class="flex items-start gap-3">
            <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-semibold text-sm">
              {{ post.authorInitial }}
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="font-semibold text-sm text-gray-900">{{ post.authorName }}</span>
                <span class="text-xs text-gray-400">{{ post.postedAt }}</span>
                <span class="badge text-xs" :class="post.spaceColor">{{ post.spaceName }}</span>
                <span v-if="post.isPinned" class="badge bg-amber-50 text-amber-600 text-xs flex items-center gap-0.5">
                  <Icon name="heroicons:bookmark-solid" class="h-3 w-3" />ピン留め
                </span>
              </div>
              <p class="mt-2 text-sm text-gray-700 leading-relaxed line-clamp-3">{{ post.content }}</p>
              <div class="mt-3 flex items-center gap-3">
                <span
                  v-for="(count, emoji) in post.reactions"
                  :key="String(emoji)"
                  class="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600"
                >{{ String(emoji) }} {{ count }}</span>
                <span class="flex items-center gap-1 text-xs text-gray-400">
                  <Icon name="heroicons:chat-bubble-left" class="h-3.5 w-3.5" />
                  {{ post.commentCount }}件
                </span>
              </div>
            </div>
          </div>
        </NuxtLink>

      </div>

      <!-- サイドバー -->
      <div class="space-y-4">

        <!-- 参加スペース -->
        <div class="card p-4">
          <h2 class="font-semibold text-gray-900 mb-3 text-sm flex items-center gap-2">
            <Icon name="heroicons:squares-2x2" class="h-4 w-4 text-primary-600" />
            参加スペース
          </h2>
          <div class="space-y-1">
            <NuxtLink
              v-for="space in allSpaces"
              :key="space.id"
              :to="`/portal/spaces/${space.id}`"
              class="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm hover:bg-gray-50 transition"
            >
              <div class="flex items-center gap-2.5 min-w-0">
                <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold" :class="space.color">
                  {{ space.name.charAt(0) }}
                </div>
                <span class="truncate text-gray-700">{{ space.name }}</span>
              </div>
              <span
                v-if="space.unread > 0"
                class="ml-2 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-500 text-[10px] font-bold text-white"
              >{{ space.unread }}</span>
            </NuxtLink>
          </div>
          <NuxtLink to="/portal/spaces" class="mt-3 block text-center text-xs text-primary-600 hover:underline">
            すべてのスペースを表示
          </NuxtLink>
        </div>

        <!-- 近日のイベント -->
        <div class="card p-4">
          <h2 class="font-semibold text-gray-900 mb-3 text-sm flex items-center gap-2">
            <Icon name="heroicons:calendar-days" class="h-4 w-4 text-primary-600" />
            近日のイベント
          </h2>
          <div class="space-y-2">
            <NuxtLink
              v-for="ev in upcomingEvents"
              :key="ev.id"
              :to="`/events/${ev.id}`"
              class="block rounded-lg p-3 hover:opacity-80 transition"
              :class="eventColorMap[ev.scope] ?? 'bg-gray-50 text-gray-700'"
            >
              <p class="text-xs font-semibold">{{ ev.dateLabel }} {{ ev.timeLabel }}〜</p>
              <p class="text-sm mt-0.5 leading-snug">{{ ev.title }}</p>
            </NuxtLink>
          </div>
          <NuxtLink to="/events" class="mt-3 block text-center text-xs text-primary-600 hover:underline">
            イベント一覧を見る
          </NuxtLink>
        </div>

      </div>
    </div>

  </div>
</template>
