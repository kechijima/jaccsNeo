<script setup lang="ts">
import type { Unsubscribe } from 'firebase/firestore'
import type { Space, Post, Comment } from '~/types/portal'

definePageMeta({ middleware: ['auth'] })

const route = useRoute()
const spaceId = computed(() => route.params.spaceId as string)
const { user } = useCurrentUser()
const { fetchSpace, subscribePosts, createPost, fetchComments, createComment } = useSpaces()

const loading = ref(false)
const error = ref('')

// ----- スペース情報 -----
type SpaceView = {
  id: string
  name: string
  memberCount: number
  isAdmin: boolean
  isPinned: boolean
}
const space = ref<SpaceView>({
  id: '',
  name: '',
  memberCount: 0,
  isAdmin: false,
  isPinned: false,
})

// ----- ピン留め投稿 -----
type PinnedPostView = { id: string; content: string; authorName: string; postedAt: string } | null
const pinnedPost = ref<PinnedPostView>(null)

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
  postedAt: string
  attachments: { name: string; size: string }[]
}
const posts = ref<PostView[]>([])

// コメント入力バッファ
const commentInputs = ref<Record<string, string>>({})

// Firestoreリアルタイムリスナーの解除関数
let unsubscribe: Unsubscribe | undefined

const mapPost = (p: Post): PostView => ({
  id:            p.id,
  authorName:    p.authorName,
  authorInitial: p.authorName.charAt(0),
  authorColor:   'bg-indigo-100 text-indigo-700',
  content:       p.content,
  reactions:     p.reactionCounts,
  comments:      [],
  showComments:  false,
  postedAt:      p.createdAt.toDate().toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' }),
  attachments:   (p.attachments ?? []).map(a => ({ name: a.name, size: String(a.size) })),
})

onMounted(async () => {
  loading.value = true
  error.value = ''
  try {
    const fetchedSpace: Space | null = await fetchSpace(spaceId.value)
    if (fetchedSpace) {
      space.value = {
        id:          fetchedSpace.id,
        name:        fetchedSpace.name,
        memberCount: fetchedSpace.memberUids.length,
        isAdmin:     fetchedSpace.adminUids.includes(user.value?.uid ?? ''),
        isPinned:    !!fetchedSpace.pinnedPostId,
      }
    }

    // リアルタイム投稿購読
    unsubscribe = subscribePosts(spaceId.value, (rawPosts: Post[]) => {
      // 既存の showComments / comments を保持しながら更新
      const existing = new Map(posts.value.map(p => [p.id, p]))
      posts.value = rawPosts.map(p => {
        const prev = existing.get(p.id)
        const mapped = mapPost(p)
        if (prev) {
          mapped.showComments = prev.showComments
          mapped.comments = prev.comments
        }
        return mapped
      })

      // ピン留め投稿を特定
      const pinned = rawPosts.find(p => p.isPinned)
      pinnedPost.value = pinned
        ? {
            id:         pinned.id,
            content:    pinned.content,
            authorName: pinned.authorName,
            postedAt:   pinned.createdAt.toDate().toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' }),
          }
        : null
    })
  } catch (e: any) {
    error.value = e?.message ?? 'データの取得に失敗しました'
  } finally {
    loading.value = false
  }
})

onUnmounted(() => {
  unsubscribe?.()
})

// ----- 投稿送信 -----
const newPostContent = ref('')
const submitting = ref(false)

const handlePostSubmit = async () => {
  if (!newPostContent.value.trim()) return
  submitting.value = true
  try {
    await createPost(spaceId.value, { content: newPostContent.value })
    newPostContent.value = ''
  } catch (e: any) {
    error.value = e?.message ?? '投稿に失敗しました'
  } finally {
    submitting.value = false
  }
}

// ----- コメント展開 -----
const toggleComments = async (post: PostView) => {
  post.showComments = !post.showComments
  if (post.showComments && post.comments.length === 0) {
    try {
      const rawComments: Comment[] = await fetchComments(spaceId.value, post.id)
      post.comments = rawComments.map(c => ({
        authorName:    c.authorName,
        authorInitial: c.authorName.charAt(0),
        content:       c.content,
        postedAt:      c.createdAt.toDate().toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' }),
      }))
    } catch (_) {
      // コメント取得失敗は静かに処理
    }
  }
}

// ----- コメント送信 -----
const submitComment = async (postId: string) => {
  const content = commentInputs.value[postId]?.trim()
  if (!content) return
  try {
    await createComment(spaceId.value, postId, content)
    commentInputs.value[postId] = ''
    // コメントを再取得
    const post = posts.value.find(p => p.id === postId)
    if (post) {
      const rawComments: Comment[] = await fetchComments(spaceId.value, postId)
      post.comments = rawComments.map(c => ({
        authorName:    c.authorName,
        authorInitial: c.authorName.charAt(0),
        content:       c.content,
        postedAt:      c.createdAt.toDate().toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' }),
      }))
    }
  } catch (e: any) {
    error.value = e?.message ?? 'コメントの投稿に失敗しました'
  }
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
      v-for="post in posts"
      :key="post.id"
      class="card p-5"
    >
      <div class="flex items-start gap-3">
        <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-semibold text-sm" :class="post.authorColor">
          {{ post.authorInitial }}
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span class="font-semibold text-sm text-gray-900">{{ post.authorName }}</span>
            <span class="text-xs text-gray-400">{{ post.postedAt }}</span>
          </div>
          <p class="mt-2 text-sm text-gray-700 leading-relaxed whitespace-pre-line">{{ post.content }}</p>

          <!-- 添付ファイル -->
          <div v-if="post.attachments.length > 0" class="mt-2 space-y-1">
            <div
              v-for="f in post.attachments"
              :key="f.name"
              class="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600"
            >
              <Icon name="heroicons:document" class="h-3.5 w-3.5 text-gray-400" />
              {{ f.name }}
              <span class="text-gray-400">{{ f.size }}</span>
            </div>
          </div>

          <!-- リアクション・コメントボタン -->
          <div class="mt-3 flex items-center gap-3">
            <div class="flex items-center gap-1.5">
              <span
                v-for="(count, emoji) in post.reactions"
                :key="emoji"
                class="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 cursor-pointer hover:bg-primary-50 hover:text-primary-600 transition"
              >
                {{ emoji }} {{ count }}
              </span>
              <button class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs text-gray-400 hover:bg-gray-100 transition">
                <Icon name="heroicons:face-smile" class="h-3.5 w-3.5" /> +
              </button>
            </div>
            <button
              class="flex items-center gap-1 text-xs text-gray-400 hover:text-primary-600 transition"
              @click="toggleComments(post)"
            >
              <Icon name="heroicons:chat-bubble-left" class="h-3.5 w-3.5" />
              {{ post.comments.length }}件のコメント
            </button>
          </div>

          <!-- コメント展開 -->
          <div v-if="post.showComments && post.comments.length > 0" class="mt-3 space-y-2 border-t border-gray-100 pt-3">
            <div
              v-for="comment in post.comments"
              :key="comment.content"
              class="flex items-start gap-2"
            >
              <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600 font-semibold text-xs">
                {{ comment.authorInitial }}
              </div>
              <div class="flex-1">
                <p class="text-xs font-semibold text-gray-700">{{ comment.authorName }} <span class="font-normal text-gray-400">{{ comment.postedAt }}</span></p>
                <p class="text-xs text-gray-600">{{ comment.content }}</p>
              </div>
            </div>
            <div class="flex items-center gap-2 pt-1">
              <input placeholder="コメントを入力..." class="flex-1 rounded-full bg-gray-100 px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-primary-300" />
              <button class="text-xs text-primary-600 font-medium hover:underline">送信</button>
            </div>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>
