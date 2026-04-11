<script setup lang="ts">
import type { SpaceSummary, Post } from '~/types/portal'
import type { EventSummary } from '~/types/event'

definePageMeta({ middleware: ['auth'] })

const { user } = useCurrentUser()
const { fetchSpaces, fetchPosts } = useSpaces()
const { fetchEvents } = useEvents()

const loading = ref(false)
const error = ref('')

// スペース一覧
const allSpaces = ref<Array<{ id: string; name: string; memberCount: number; unread: number; color: string }>>([])

// ピン留めスペース（先頭2件）
const pinnedSpaces = computed(() => allSpaces.value.slice(0, 2))

// 最近の投稿
const recentPosts = ref<Array<{
  id: string
  spaceId: string
  spaceName: string
  authorName: string
  authorInitial: string
  content: string
  reactions: Record<string, number>
  commentCount: number
  postedAt: string
}>>([])

// イベント
const upcomingEvents = ref<EventSummary[]>([])

const spaceColorMap: Record<string, string> = {
  all:     'bg-green-100 text-green-700',
  group:   'bg-indigo-100 text-indigo-700',
  kumiai:  'bg-indigo-100 text-indigo-700',
  special: 'bg-amber-100 text-amber-700',
}

onMounted(async () => {
  loading.value = true
  error.value = ''
  try {
    // スペース取得
    const spaces: SpaceSummary[] = await fetchSpaces()
    allSpaces.value = spaces.map(s => ({
      id:          s.id,
      name:        s.name,
      memberCount: s.memberCount,
      unread:      0,
      color:       spaceColorMap[s.type] ?? 'bg-indigo-100 text-indigo-700',
    }))

    // 最初のスペースの投稿を取得
    if (spaces.length > 0) {
      const firstSpace = spaces[0]
      const posts: Post[] = await fetchPosts(firstSpace.id)
      recentPosts.value = posts.map(p => ({
        id:            p.id,
        spaceId:       firstSpace.id,
        spaceName:     firstSpace.name,
        authorName:    p.authorName,
        authorInitial: p.authorName.charAt(0),
        content:       p.content,
        reactions:     p.reactionCounts,
        commentCount:  p.commentCount,
        postedAt:      p.createdAt.toDate().toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' }),
      }))
    }

    // 直近イベント（上位2件）
    const events = await fetchEvents({ upcoming: true })
    upcomingEvents.value = events.slice(0, 2)
  } catch (e: any) {
    error.value = e?.message ?? 'データの取得に失敗しました'
  } finally {
    loading.value = false
  }
})
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

        <!-- 投稿ボタン（スペース選択） -->
        <div class="card p-4">
          <div class="flex items-center gap-3">
            <div class="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 text-primary-700 font-semibold text-sm shrink-0">
              {{ user?.displayName?.charAt(0) ?? 'U' }}
            </div>
            <NuxtLink
              :to="`/portal/spaces/${pinnedSpaces[0]?.id}`"
              class="flex-1 rounded-full bg-gray-100 px-4 py-2.5 text-sm text-gray-400 hover:bg-gray-200 transition cursor-pointer"
            >
              投稿する...
            </NuxtLink>
          </div>
        </div>

        <!-- フィード投稿一覧 -->
        <div
          v-for="post in recentPosts"
          :key="post.id"
          class="card p-5"
        >
          <div class="flex items-start gap-3">
            <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-semibold text-sm">
              {{ post.authorInitial }}
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="font-semibold text-sm text-gray-900">{{ post.authorName }}</span>
                <span class="text-xs text-gray-400">{{ post.postedAt }}</span>
                <NuxtLink :to="`/portal/spaces/${post.spaceId}`" class="badge bg-gray-100 text-gray-600 text-xs hover:bg-gray-200">
                  {{ post.spaceName }}
                </NuxtLink>
              </div>
              <p class="mt-2 text-sm text-gray-700 leading-relaxed line-clamp-3">{{ post.content }}</p>

              <!-- リアクション・コメント -->
              <div class="mt-3 flex items-center gap-4">
                <div class="flex items-center gap-2">
                  <span
                    v-for="(count, emoji) in post.reactions"
                    :key="emoji"
                    class="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 cursor-pointer hover:bg-primary-50"
                  >
                    {{ emoji }} {{ count }}
                  </span>
                </div>
                <button class="flex items-center gap-1 text-xs text-gray-400 hover:text-primary-600 transition">
                  <Icon name="heroicons:chat-bubble-left" class="h-3.5 w-3.5" />
                  {{ post.commentCount }}件のコメント
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- サイドバー（スペース一覧） -->
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
              >
                {{ space.unread }}
              </span>
            </NuxtLink>
          </div>
          <NuxtLink to="/portal/spaces" class="mt-3 block text-center text-xs text-primary-600 hover:underline">
            すべてのスペースを表示
          </NuxtLink>
        </div>

        <!-- イベント告知 -->
        <div class="card p-4">
          <h2 class="font-semibold text-gray-900 mb-3 text-sm flex items-center gap-2">
            <Icon name="heroicons:calendar-days" class="h-4 w-4 text-primary-600" />
            近日のイベント
          </h2>
          <div class="space-y-2">
            <div class="rounded-lg bg-primary-50 p-3">
              <p class="text-xs font-semibold text-primary-700">4/15（水） 20:00〜</p>
              <p class="text-sm text-gray-800 mt-0.5">りらくす組合 数字会議</p>
            </div>
            <div class="rounded-lg bg-gray-50 p-3">
              <p class="text-xs font-semibold text-gray-500">4/20（日）</p>
              <p class="text-sm text-gray-800 mt-0.5">FP勉強会（全体）</p>
            </div>
          </div>
          <NuxtLink to="/events" class="mt-3 block text-center text-xs text-primary-600 hover:underline">
            イベント一覧を見る
          </NuxtLink>
        </div>

      </div>
    </div>

  </div>
</template>
