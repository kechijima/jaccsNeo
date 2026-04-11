<script setup lang="ts">
import { MOCK_SPACES, MOCK_POSTS } from '~/data/mock'

definePageMeta({ middleware: ['auth'] })

const route = useRoute()
const spaceId = computed(() => route.params.spaceId as string)
const { user } = useCurrentUser()

// ----- スペース情報 -----
const space = computed(() => {
  const s = MOCK_SPACES.find(sp => sp.id === spaceId.value)
  if (!s) return { id: '', name: '', memberCount: 0, isAdmin: false, isPinned: false, description: '' }
  return {
    id:          s.id,
    name:        s.name,
    description: s.description,
    memberCount: s.memberCount,
    isAdmin:     (s.admins ?? []).includes('mock-user-123'),
    isPinned:    s.isPinned,
  }
})

// ----- 投稿一覧 -----
type CommentView = { authorName: string; authorInitial: string; content: string; postedAt: string }
type PostView = {
  id: string
  authorName: string
  authorInitial: string
  authorColor: string
  content: string
  reactions: Record<string, number>
  comments: CommentView[]
  showComments: boolean
  isPinned: boolean
  postedAt: string
}

const localPosts = ref<PostView[]>([])

onMounted(() => {
  const raw = MOCK_POSTS[spaceId.value] ?? []
  localPosts.value = raw.map((p: any): PostView => ({
    id:            p.id,
    authorName:    p.authorName,
    authorInitial: p.authorName.charAt(0),
    authorColor:   'bg-indigo-100 text-indigo-700',
    content:       p.content,
    reactions:     { ...(p.reactions ?? {}) },
    comments:      [],
    showComments:  false,
    isPinned:      p.isPinned,
    postedAt:      p.createdAt.toDate().toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
  }))
})

// ピン留め投稿
const pinnedPost = computed(() => localPosts.value.find(p => p.isPinned) ?? null)

// ----- 投稿フォーム -----
const newPostContent = ref('')
const submitting = ref(false)

const handlePostSubmit = async () => {
  if (!newPostContent.value.trim()) return
  submitting.value = true
  await new Promise(r => setTimeout(r, 300))
  const now = new Date()
  localPosts.value.unshift({
    id:            `local-${Date.now()}`,
    authorName:    user.value?.displayName ?? 'テストユーザー',
    authorInitial: (user.value?.displayName ?? 'T').charAt(0),
    authorColor:   'bg-primary-100 text-primary-700',
    content:       newPostContent.value,
    reactions:     {},
    comments:      [],
    showComments:  false,
    isPinned:      false,
    postedAt:      now.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
  })
  newPostContent.value = ''
  submitting.value = false
}

// ----- コメント -----
const commentInputs = ref<Record<string, string>>({})

const toggleComments = (post: PostView) => {
  post.showComments = !post.showComments
}

const submitComment = (postId: string) => {
  const content = commentInputs.value[postId]?.trim()
  if (!content) return
  const post = localPosts.value.find(p => p.id === postId)
  if (!post) return
  post.comments.push({
    authorName:    user.value?.displayName ?? 'テストユーザー',
    authorInitial: (user.value?.displayName ?? 'T').charAt(0),
    content,
    postedAt:      new Date().toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' }),
  })
  commentInputs.value[postId] = ''
}

// ----- リアクション -----
const addReaction = (post: PostView, emoji: string) => {
  post.reactions[emoji] = (post.reactions[emoji] ?? 0) + 1
}
</script>

<template>
  <div class="p-4 md:p-6 max-w-3xl mx-auto space-y-5">

    <!-- パンくず -->
    <div class="flex items-center gap-2 text-sm text-gray-400">
      <NuxtLink to="/portal">ポータル</NuxtLink>
      <Icon name="heroicons:chevron-right" class="h-3 w-3" />
      <NuxtLink to="/portal/spaces">スペース</NuxtLink>
      <Icon name="heroicons:chevron-right" class="h-3 w-3" />
      <span class="text-gray-600">{{ space.name }}</span>
    </div>

    <!-- スペースヘッダー -->
    <div class="flex items-start justify-between gap-3">
      <div>
        <h1 class="text-xl font-bold text-gray-900 flex items-center gap-2">
          {{ space.name }}
          <Icon v-if="space.isPinned" name="heroicons:bookmark-solid" class="h-4 w-4 text-primary-500" />
        </h1>
        <p class="text-sm text-gray-500 mt-0.5">メンバー {{ space.memberCount }}名</p>
        <p v-if="space.description" class="text-xs text-gray-400 mt-1">{{ space.description }}</p>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <NuxtLink
          v-if="space.isAdmin"
          :to="`/portal/spaces/${spaceId}/members`"
          class="btn-secondary text-xs flex items-center gap-1"
        >
          <Icon name="heroicons:users" class="h-3.5 w-3.5" />
          メンバー
        </NuxtLink>
        <NuxtLink
          v-if="space.isAdmin"
          :to="`/portal/spaces/${spaceId}/settings`"
          class="btn-secondary text-xs flex items-center gap-1"
        >
          <Icon name="heroicons:cog-6-tooth" class="h-3.5 w-3.5" />
          設定
        </NuxtLink>
      </div>
    </div>

    <!-- ピン留め投稿 -->
    <div v-if="pinnedPost" class="card p-4 border-l-4 border-primary-400 bg-primary-50">
      <div class="flex items-start gap-2">
        <Icon name="heroicons:bookmark-solid" class="h-4 w-4 text-primary-500 shrink-0 mt-0.5" />
        <div>
          <p class="text-sm font-medium text-primary-800">{{ pinnedPost.content }}</p>
          <p class="text-xs text-primary-500 mt-1">{{ pinnedPost.authorName }} · {{ pinnedPost.postedAt }}</p>
        </div>
      </div>
    </div>

    <!-- 投稿フォーム -->
    <div class="card p-4">
      <div class="flex items-start gap-3">
        <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700 font-semibold text-sm">
          {{ user?.displayName?.charAt(0) ?? 'U' }}
        </div>
        <div class="flex-1 space-y-2">
          <textarea
            v-model="newPostContent"
            rows="3"
            placeholder="投稿する..."
            class="input-field resize-none"
          />
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <button class="text-gray-400 hover:text-gray-600 transition p-1.5 rounded-lg hover:bg-gray-100">
                <Icon name="heroicons:photo" class="h-4 w-4" />
              </button>
              <button class="text-gray-400 hover:text-gray-600 transition p-1.5 rounded-lg hover:bg-gray-100">
                <Icon name="heroicons:paper-clip" class="h-4 w-4" />
              </button>
            </div>
            <button
              class="btn-primary text-sm"
              :disabled="!newPostContent.trim() || submitting"
              @click="handlePostSubmit"
            >
              <Icon v-if="submitting" name="heroicons:arrow-path" class="h-3.5 w-3.5 animate-spin mr-1" />
              投稿する
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 投稿一覧 -->
    <div
      v-for="post in localPosts"
      :key="post.id"
      class="card p-5"
    >
      <div class="flex items-start gap-3">
        <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-semibold text-sm" :class="post.authorColor">
          {{ post.authorInitial }}
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="font-semibold text-sm text-gray-900">{{ post.authorName }}</span>
            <span class="text-xs text-gray-400">{{ post.postedAt }}</span>
            <span v-if="post.isPinned" class="badge bg-amber-50 text-amber-600 text-xs flex items-center gap-0.5">
              <Icon name="heroicons:bookmark-solid" class="h-3 w-3" />ピン留め
            </span>
          </div>
          <p class="mt-2 text-sm text-gray-700 leading-relaxed whitespace-pre-line">{{ post.content }}</p>

          <!-- リアクション・コメントボタン -->
          <div class="mt-3 flex items-center gap-3 flex-wrap">
            <div class="flex items-center gap-1.5 flex-wrap">
              <span
                v-for="(count, emoji) in post.reactions"
                :key="String(emoji)"
                class="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 cursor-pointer hover:bg-primary-50 hover:text-primary-600 transition"
                @click="addReaction(post, String(emoji))"
              >{{ String(emoji) }} {{ count }}</span>
              <button class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs text-gray-400 hover:bg-gray-100 transition">
                <Icon name="heroicons:face-smile" class="h-3.5 w-3.5" /> +
              </button>
            </div>
            <button
              class="flex items-center gap-1 text-xs text-gray-400 hover:text-primary-600 transition"
              @click="toggleComments(post)"
            >
              <Icon name="heroicons:chat-bubble-left" class="h-3.5 w-3.5" />
              {{ post.comments.length > 0 ? `${post.comments.length}件のコメント` : 'コメント' }}
            </button>
          </div>

          <!-- コメント展開 -->
          <div v-if="post.showComments" class="mt-3 space-y-2 border-t border-gray-100 pt-3">
            <div
              v-for="comment in post.comments"
              :key="comment.content + comment.postedAt"
              class="flex items-start gap-2"
            >
              <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600 font-semibold text-xs">
                {{ comment.authorInitial }}
              </div>
              <div class="flex-1">
                <p class="text-xs font-semibold text-gray-700">{{ comment.authorName }} <span class="font-normal text-gray-400">{{ comment.postedAt }}</span></p>
                <p class="text-xs text-gray-600 mt-0.5">{{ comment.content }}</p>
              </div>
            </div>
            <div v-if="post.comments.length === 0" class="text-xs text-gray-400">
              コメントはまだありません
            </div>
            <div class="flex items-center gap-2 pt-1">
              <input
                v-model="commentInputs[post.id]"
                placeholder="コメントを入力..."
                class="flex-1 rounded-full bg-gray-100 px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-primary-300"
                @keydown.enter.prevent="submitComment(post.id)"
              />
              <button
                class="text-xs text-primary-600 font-medium hover:underline"
                @click="submitComment(post.id)"
              >送信</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 投稿なし -->
    <div v-if="localPosts.length === 0" class="card p-10 text-center">
      <Icon name="heroicons:chat-bubble-left-right" class="h-10 w-10 text-gray-200 mx-auto mb-2" />
      <p class="text-sm text-gray-400">まだ投稿がありません</p>
      <p class="text-xs text-gray-300 mt-1">最初の投稿者になりましょう</p>
    </div>

  </div>
</template>
