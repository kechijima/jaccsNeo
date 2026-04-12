<script setup lang="ts">
import { MOCK_SPACES, MOCK_EVENTS } from '~/data/mock'
import { usePortalStore } from '~/composables/usePortalStore'

definePageMeta({ middleware: ['auth'] })

const { user } = useCurrentUser()
const store = usePortalStore()

// ── 検索 ──────────────────────────────────────────────────────────────
const searchQuery = ref('')
const filteredPosts = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return store.posts.value
  return store.posts.value.filter(p =>
    p.content.toLowerCase().includes(q) ||
    p.authorName.toLowerCase().includes(q) ||
    p.spaceName.toLowerCase().includes(q),
  )
})

// ── 投稿モーダル ──────────────────────────────────────────────────────
const showCompose = ref(false)
const composeSpaceId = ref(MOCK_SPACES[0]?.id ?? '')
const composeContent = ref('')
const composeSubmitting = ref(false)

const handleCompose = async () => {
  if (!composeContent.value.trim()) return
  composeSubmitting.value = true
  await new Promise(r => setTimeout(r, 300))
  store.addPost(
    composeSpaceId.value,
    composeContent.value,
    user.value?.displayName ?? 'テストユーザー',
    user.value?.uid ?? 'mock-user-123',
  )
  composeContent.value = ''
  showCompose.value = false
  composeSubmitting.value = false
}

// ── リアクション ─────────────────────────────────────────────────────
const EMOJIS = ['👍', '❤️', '🎉', '😊', '👏', '🔥']
const showEmojiPicker = ref<string | null>(null)

const onReaction = (postId: string, emoji: string) => {
  store.toggleReaction(postId, emoji)
  showEmojiPicker.value = null
}

// ── コメント ──────────────────────────────────────────────────────────
const commentInputs = ref<Record<string, string>>({})

const submitComment = (postId: string) => {
  const content = commentInputs.value[postId]?.trim()
  if (!content) return
  store.addComment(postId, content, user.value?.displayName ?? 'テストユーザー', user.value?.uid ?? 'mock-user-123')
  commentInputs.value[postId] = ''
}

// ── スペース / イベント ───────────────────────────────────────────────
const spaceColorMap: Record<string, string> = {
  all:     'bg-green-100 text-green-700',
  group:   'bg-indigo-100 text-indigo-700',
  kumiai:  'bg-purple-100 text-purple-700',
  special: 'bg-amber-100 text-amber-700',
}

const allSpaces = computed(() =>
  MOCK_SPACES.map(s => ({
    id:     s.id,
    name:   s.name,
    unread: s.id === 's002' ? 2 : s.id === 's001' ? 1 : 0,
    color:  spaceColorMap[s.type] ?? 'bg-indigo-100 text-indigo-700',
  })),
)

const upcomingEvents = computed(() =>
  MOCK_EVENTS
    .filter(e => e.startAt.toDate() >= new Date())
    .sort((a, b) => a.startAt.toDate().getTime() - b.startAt.toDate().getTime())
    .slice(0, 3)
    .map(e => ({
      id:        e.id,
      title:     e.title,
      dateLabel: e.startAt.toDate().toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', weekday: 'short' }),
      timeLabel: e.startAt.toDate().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
      scope:     e.scope,
    })),
)

const eventColorMap: Record<string, string> = {
  all:    'bg-green-50 text-green-700',
  group:  'bg-indigo-50 text-indigo-700',
  kumiai: 'bg-purple-50 text-purple-700',
  space:  'bg-amber-50 text-amber-700',
}
</script>

<template>
  <div class="p-4 md:p-6 max-w-6xl mx-auto space-y-5">

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

    <!-- 検索バー -->
    <div class="relative">
      <Icon name="heroicons:magnifying-glass" class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
      <input
        v-model="searchQuery"
        type="search"
        placeholder="投稿・著者・スペースを検索..."
        class="input-field pl-9"
      />
      <button
        v-if="searchQuery"
        class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        @click="searchQuery = ''"
      >
        <Icon name="heroicons:x-mark" class="h-4 w-4" />
      </button>
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
            <button
              class="flex-1 rounded-full bg-gray-100 px-4 py-2.5 text-sm text-gray-400 hover:bg-gray-200 transition text-left"
              @click="showCompose = true"
            >
              投稿する...
            </button>
          </div>
        </div>

        <!-- 検索結果なし -->
        <div v-if="searchQuery && filteredPosts.length === 0" class="card p-10 text-center">
          <Icon name="heroicons:magnifying-glass" class="h-10 w-10 text-gray-200 mx-auto mb-2" />
          <p class="text-sm text-gray-400">「{{ searchQuery }}」に一致する投稿がありません</p>
        </div>

        <!-- フィード -->
        <div
          v-for="post in filteredPosts"
          :key="post.id"
          class="card p-5"
        >
          <div class="flex items-start gap-3">
            <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-semibold text-sm">
              {{ post.authorInitial }}
            </div>
            <div class="flex-1 min-w-0">
              <!-- メタ情報 -->
              <div class="flex items-center gap-2 flex-wrap">
                <span class="font-semibold text-sm text-gray-900">{{ post.authorName }}</span>
                <span class="text-xs text-gray-400">{{ post.postedAt }}</span>
                <span class="badge text-xs" :class="post.spaceColor">{{ post.spaceName }}</span>
                <span v-if="post.isPinned" class="badge bg-amber-50 text-amber-600 text-xs flex items-center gap-0.5">
                  <Icon name="heroicons:bookmark-solid" class="h-3 w-3" />ピン留め
                </span>
              </div>

              <!-- 本文（タップで詳細へ） -->
              <NuxtLink :to="`/portal/spaces/${post.spaceId}/posts/${post.id}`" class="block mt-2">
                <p class="text-sm text-gray-700 leading-relaxed line-clamp-4 hover:text-gray-900 transition-colors">{{ post.content }}</p>
              </NuxtLink>

              <!-- アクションバー -->
              <div class="mt-3 flex items-center gap-2 flex-wrap">
                <!-- 既存リアクション -->
                <span
                  v-for="(count, emoji) in post.reactions"
                  :key="String(emoji)"
                  class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium cursor-pointer transition"
                  :class="post.myReactions.includes(String(emoji))
                    ? 'bg-primary-100 text-primary-700 ring-1 ring-primary-300'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
                  @click="onReaction(post.id, String(emoji))"
                >{{ String(emoji) }} {{ count }}</span>

                <!-- 絵文字追加ボタン -->
                <div class="relative">
                  <button
                    class="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs text-gray-400 hover:bg-gray-100 transition"
                    @click.stop="showEmojiPicker = showEmojiPicker === post.id ? null : post.id"
                  >
                    <Icon name="heroicons:face-smile" class="h-3.5 w-3.5" /> +
                  </button>
                  <div
                    v-if="showEmojiPicker === post.id"
                    class="absolute z-20 left-0 top-full mt-1 flex gap-1 bg-white border border-gray-200 rounded-xl shadow-lg p-2"
                  >
                    <button
                      v-for="em in EMOJIS"
                      :key="em"
                      class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-base transition"
                      @click="onReaction(post.id, em)"
                    >{{ em }}</button>
                  </div>
                </div>

                <!-- コメント -->
                <button
                  class="flex items-center gap-1 text-xs text-gray-400 hover:text-primary-600 transition"
                  @click="post.showComments = !post.showComments"
                >
                  <Icon name="heroicons:chat-bubble-left" class="h-3.5 w-3.5" />
                  {{ post.commentCount }}件
                </button>

                <!-- 詳細リンク -->
                <NuxtLink
                  :to="`/portal/spaces/${post.spaceId}/posts/${post.id}`"
                  class="ml-auto text-xs text-gray-400 hover:text-primary-600 transition flex items-center gap-0.5"
                >
                  詳細
                  <Icon name="heroicons:arrow-top-right-on-square" class="h-3 w-3" />
                </NuxtLink>
              </div>

              <!-- コメント展開 -->
              <div v-if="post.showComments" class="mt-3 space-y-2 border-t border-gray-100 pt-3">
                <div v-if="post.comments.length === 0" class="text-xs text-gray-400">コメントはまだありません</div>
                <div v-for="comment in post.comments" :key="comment.id" class="flex items-start gap-2">
                  <div class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600 font-semibold text-xs">
                    {{ comment.authorInitial }}
                  </div>
                  <div>
                    <p class="text-xs font-semibold text-gray-700">{{ comment.authorName }} <span class="font-normal text-gray-400">{{ comment.postedAt }}</span></p>
                    <p class="text-xs text-gray-600 mt-0.5">{{ comment.content }}</p>
                  </div>
                </div>
                <div class="flex items-center gap-2 pt-1">
                  <input
                    v-model="commentInputs[post.id]"
                    placeholder="コメントを入力..."
                    class="flex-1 rounded-full bg-gray-100 px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-primary-300"
                    @keydown.enter.prevent="submitComment(post.id)"
                  />
                  <button class="text-xs text-primary-600 font-medium hover:underline" @click="submitComment(post.id)">送信</button>
                </div>
              </div>
            </div>
          </div>
        </div>

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
              <span v-if="space.unread > 0" class="ml-2 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-500 text-[10px] font-bold text-white">
                {{ space.unread }}
              </span>
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

    <!-- 投稿モーダル -->
    <Teleport to="body">
      <div
        v-if="showCompose"
        class="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40"
        @click.self="showCompose = false"
      >
        <div class="bg-white w-full md:max-w-lg rounded-t-2xl md:rounded-2xl p-5 space-y-4 shadow-xl">
          <div class="flex items-center justify-between">
            <h3 class="font-bold text-gray-900">投稿する</h3>
            <button class="p-1.5 rounded-lg hover:bg-gray-100 transition" @click="showCompose = false">
              <Icon name="heroicons:x-mark" class="h-5 w-5 text-gray-500" />
            </button>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1.5">投稿先スペース</label>
            <select v-model="composeSpaceId" class="input-field text-sm">
              <option v-for="s in MOCK_SPACES" :key="s.id" :value="s.id">{{ s.name }}</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1.5">内容</label>
            <textarea
              v-model="composeContent"
              rows="5"
              placeholder="投稿内容を入力してください..."
              class="input-field resize-none text-sm"
            />
          </div>
          <div class="flex gap-3">
            <button class="flex-1 btn-secondary" @click="showCompose = false">キャンセル</button>
            <button
              class="flex-1 btn-primary"
              :disabled="!composeContent.trim() || composeSubmitting"
              @click="handleCompose"
            >
              <Icon v-if="composeSubmitting" name="heroicons:arrow-path" class="h-4 w-4 animate-spin mr-1" />
              投稿する
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 絵文字ピッカー外クリックで閉じる -->
    <div v-if="showEmojiPicker" class="fixed inset-0 z-10" @click="showEmojiPicker = null" />

  </div>
</template>
