<script setup lang="ts">
import { MOCK_SPACES } from '~/data/mock'
import { usePortalStore } from '~/composables/usePortalStore'
import { useNotifications } from '~/composables/useNotifications'

definePageMeta({ middleware: ['auth'] })

const route = useRoute()
const spaceId = computed(() => route.params.spaceId as string)
const { user } = useCurrentUser()
const store = usePortalStore()
const { sendMentionNotifications } = useNotifications()

// ── スペース情報 ──────────────────────────────────────────────────────
const space = computed(() => {
  const s = MOCK_SPACES.find(sp => sp.id === spaceId.value)
  if (!s) return { id: '', name: '', description: '', memberCount: 0, isAdmin: false, isPinned: false }
  return {
    id:          s.id,
    name:        s.name,
    description: s.description,
    memberCount: s.memberCount,
    isAdmin:     (s.admins ?? []).includes('mock-user-123'),
    isPinned:    s.isPinned,
  }
})

// ── 投稿一覧（このスペース） ──────────────────────────────────────────
const spacePosts = store.getPostsBySpace(spaceId)
const pinnedPost = computed(() => spacePosts.value.find(p => p.isPinned) ?? null)

// ── 投稿フォーム ──────────────────────────────────────────────────────
const newPostContent = ref('')
const submitting = ref(false)

const handlePostSubmit = async () => {
  if (!newPostContent.value.trim()) return
  submitting.value = true
  await new Promise(r => setTimeout(r, 300))
  const postId = store.addPost(
    spaceId.value,
    newPostContent.value,
    user.value?.displayName ?? 'テストユーザー',
    user.value?.uid ?? 'mock-user-123',
  )
  if (postId) {
    await sendMentionNotifications(
      newPostContent.value,
      user.value?.displayName ?? 'テストユーザー',
      spaceId.value,
      postId,
      'post',
    )
  }
  newPostContent.value = ''
  submitting.value = false
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

// ── 編集モーダル ──────────────────────────────────────────────────────
const editingPostId = ref<string | null>(null)
const editContent = ref('')

const openEdit = (post: { id: string; content: string }) => {
  editingPostId.value = post.id
  editContent.value = post.content
}

const saveEdit = () => {
  if (!editingPostId.value || !editContent.value.trim()) return
  store.editPost(editingPostId.value, editContent.value)
  editingPostId.value = null
  editContent.value = ''
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
        <NuxtLink v-if="space.isAdmin" :to="`/portal/spaces/${spaceId}/members`" class="btn-secondary text-xs flex items-center gap-1">
          <Icon name="heroicons:users" class="h-3.5 w-3.5" />メンバー
        </NuxtLink>
        <NuxtLink v-if="space.isAdmin" :to="`/portal/spaces/${spaceId}/settings`" class="btn-secondary text-xs flex items-center gap-1">
          <Icon name="heroicons:cog-6-tooth" class="h-3.5 w-3.5" />設定
        </NuxtLink>
      </div>
    </div>

    <!-- ピン留め投稿 -->
    <NuxtLink
      v-if="pinnedPost"
      :to="`/portal/spaces/${spaceId}/posts/${pinnedPost.id}`"
      class="block card p-4 border-l-4 border-primary-400 bg-primary-50 hover:opacity-90 transition"
    >
      <div class="flex items-start gap-2">
        <Icon name="heroicons:bookmark-solid" class="h-4 w-4 text-primary-500 shrink-0 mt-0.5" />
        <div>
          <p class="text-sm font-medium text-primary-800 line-clamp-2">{{ pinnedPost.content }}</p>
          <p class="text-xs text-primary-500 mt-1">{{ pinnedPost.authorName }} · {{ pinnedPost.postedAt }}</p>
        </div>
      </div>
    </NuxtLink>

    <!-- 投稿フォーム -->
    <div class="card p-4">
      <div class="flex items-start gap-3">
        <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700 font-semibold text-sm">
          {{ user?.displayName?.charAt(0) ?? 'U' }}
        </div>
        <div class="flex-1 space-y-2">
          <RichTextEditor
            v-model="newPostContent"
            placeholder="投稿する..."
            class="min-h-[120px]"
          />
          <div class="flex items-center justify-end">
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
    <div v-for="post in spacePosts" :key="post.id" class="card p-5">
      <div class="flex items-start gap-3">
        <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-semibold text-sm">
          {{ post.authorInitial }}
        </div>
        <div class="flex-1 min-w-0">
          <!-- メタ -->
          <div class="flex items-center gap-2 flex-wrap">
            <span class="font-semibold text-sm text-gray-900">{{ post.authorName }}</span>
            <span class="text-xs text-gray-400">{{ post.postedAt }}</span>
            <span v-if="post.isPinned" class="badge bg-amber-50 text-amber-600 text-xs flex items-center gap-0.5">
              <Icon name="heroicons:bookmark-solid" class="h-3 w-3" />ピン留め
            </span>
            <!-- 自分の投稿なら編集ボタン -->
            <button
              v-if="post.authorId === (user?.uid ?? 'mock-user-123')"
              class="ml-auto text-xs text-gray-400 hover:text-primary-600 transition flex items-center gap-0.5"
              @click="openEdit(post)"
            >
              <Icon name="heroicons:pencil-square" class="h-3.5 w-3.5" />編集
            </button>
          </div>

          <!-- 本文（タップで詳細へ） -->
          <NuxtLink :to="`/portal/spaces/${spaceId}/posts/${post.id}`" class="block mt-2">
            <div
              class="text-sm text-gray-700 leading-relaxed prose prose-sm max-w-none hover:text-gray-900 transition-colors"
              v-html="post.content"
            />
          </NuxtLink>

          <!-- アクションバー -->
          <div class="mt-3 flex items-center gap-2 flex-wrap">
            <span
              v-for="(count, emoji) in post.reactions"
              :key="String(emoji)"
              class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium cursor-pointer transition"
              :class="post.myReactions.includes(String(emoji))
                ? 'bg-primary-100 text-primary-700 ring-1 ring-primary-300'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
              @click="onReaction(post.id, String(emoji))"
            >{{ String(emoji) }} {{ count }}</span>

            <!-- 絵文字ボタン -->
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

            <!-- 詳細 -->
            <NuxtLink
              :to="`/portal/spaces/${spaceId}/posts/${post.id}`"
              class="ml-auto text-xs text-gray-400 hover:text-primary-600 transition flex items-center gap-0.5"
            >
              詳細<Icon name="heroicons:arrow-top-right-on-square" class="h-3 w-3" />
            </NuxtLink>
          </div>

          <!-- コメント展開 -->
          <div v-if="post.showComments" class="mt-3 space-y-2 border-t border-gray-100 pt-3">
            <div v-if="post.comments.length === 0" class="text-xs text-gray-400">コメントはまだありません</div>
            <div v-for="comment in post.comments" :key="comment.id" class="flex items-start gap-2">
              <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600 font-semibold text-xs">
                {{ comment.authorInitial }}
              </div>
              <div class="flex-1">
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

    <!-- 投稿なし -->
    <div v-if="spacePosts.length === 0" class="card p-10 text-center">
      <Icon name="heroicons:chat-bubble-left-right" class="h-10 w-10 text-gray-200 mx-auto mb-2" />
      <p class="text-sm text-gray-400">まだ投稿がありません</p>
    </div>

    <!-- 絵文字ピッカー外クリックで閉じる -->
    <div v-if="showEmojiPicker" class="fixed inset-0 z-10" @click="showEmojiPicker = null" />

    <!-- 編集モーダル -->
    <Teleport to="body">
      <div
        v-if="editingPostId"
        class="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40"
        @click.self="editingPostId = null"
      >
        <div class="bg-white w-full md:max-w-lg rounded-t-2xl md:rounded-2xl p-5 space-y-4 shadow-xl">
          <div class="flex items-center justify-between">
            <h3 class="font-bold text-gray-900">投稿を編集</h3>
            <button class="p-1.5 rounded-lg hover:bg-gray-100 transition" @click="editingPostId = null">
              <Icon name="heroicons:x-mark" class="h-5 w-5 text-gray-500" />
            </button>
          </div>
          <RichTextEditor
            v-model="editContent"
            class="min-h-[200px]"
          />
          <div class="flex gap-3">
            <button class="flex-1 btn-secondary" @click="editingPostId = null">キャンセル</button>
            <button class="flex-1 btn-primary" :disabled="!editContent.trim()" @click="saveEdit">保存する</button>
          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>
