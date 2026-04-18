<script setup lang="ts">
import { MOCK_SPACES } from '~/data/mock'
import { usePortalStore } from '~/composables/usePortalStore'

definePageMeta({ middleware: ['auth'] })

const route = useRoute()
const router = useRouter()
const spaceId = computed(() => route.params.spaceId as string)
const postId = computed(() => route.params.postId as string)
const { user } = useCurrentUser()
const store = usePortalStore()

const postRef = store.getPost(postId)
const post = postRef

const space = computed(() => MOCK_SPACES.find(s => s.id === spaceId.value))

const isOwn = computed(() =>
  post.value?.authorId === (user.value?.uid ?? 'mock-user-123'),
)

// ── リアクション ─────────────────────────────────────────────────────
const EMOJIS = ['👍', '❤️', '🎉', '😊', '👏', '🔥']
const showEmojiPicker = ref(false)

const onReaction = (emoji: string) => {
  if (!post.value) return
  store.toggleReaction(post.value.id, emoji)
  showEmojiPicker.value = false
}

// ── コメント ──────────────────────────────────────────────────────────
const commentInput = ref('')

const submitComment = () => {
  if (!commentInput.value.trim() || !post.value) return
  store.addComment(
    post.value.id,
    commentInput.value,
    user.value?.displayName ?? 'テストユーザー',
    user.value?.uid ?? 'mock-user-123',
  )
  commentInput.value = ''
}

// ── 編集 ─────────────────────────────────────────────────────────────
const isEditing = ref(false)
const editContent = ref('')

const openEdit = () => {
  if (!post.value) return
  editContent.value = post.value.content
  isEditing.value = true
}

const saveEdit = () => {
  if (!post.value || !editContent.value.trim()) return
  store.editPost(post.value.id, editContent.value)
  isEditing.value = false
}

// ── 削除 ─────────────────────────────────────────────────────────────
const deletePost = () => {
  if (!post.value) return
  if (!confirm('この投稿を削除しますか？')) return
  store.deletePost(post.value.id)
  router.back()
}
</script>

<template>
  <div class="p-4 md:p-6 max-w-3xl mx-auto space-y-5">

    <!-- パンくず -->
    <div class="flex items-center gap-2 text-sm text-gray-400 flex-wrap">
      <NuxtLink to="/portal">ポータル</NuxtLink>
      <Icon name="heroicons:chevron-right" class="h-3 w-3" />
      <NuxtLink :to="`/portal/spaces/${spaceId}`">{{ space?.name ?? 'スペース' }}</NuxtLink>
      <Icon name="heroicons:chevron-right" class="h-3 w-3" />
      <span class="text-gray-600">投稿詳細</span>
    </div>

    <!-- 投稿が見つからない -->
    <div v-if="!post" class="card p-10 text-center">
      <Icon name="heroicons:exclamation-circle" class="h-10 w-10 text-gray-300 mx-auto mb-2" />
      <p class="text-gray-400">投稿が見つかりませんでした</p>
      <button class="mt-3 text-sm text-primary-600 hover:underline" @click="router.back()">← 戻る</button>
    </div>

    <template v-else>

      <!-- 投稿カード -->
      <div class="card p-5">
        <div class="flex items-start gap-3">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-semibold">
            {{ post.authorInitial }}
          </div>
          <div class="flex-1 min-w-0">
            <!-- メタ -->
            <div class="flex items-start justify-between gap-2">
              <div>
                <p class="font-semibold text-gray-900">{{ post.authorName }}</p>
                <div class="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span class="text-xs text-gray-400">{{ post.postedAt }}</span>
                  <span class="badge text-xs" :class="post.spaceColor">{{ post.spaceName }}</span>
                  <span v-if="post.isPinned" class="badge bg-amber-50 text-amber-600 text-xs flex items-center gap-0.5">
                    <Icon name="heroicons:bookmark-solid" class="h-3 w-3" />ピン留め
                  </span>
                </div>
              </div>
              <!-- 自分の投稿: 編集・削除メニュー -->
              <div v-if="isOwn" class="flex items-center gap-2 shrink-0">
                <button
                  class="text-xs text-gray-400 hover:text-primary-600 transition flex items-center gap-0.5"
                  @click="openEdit"
                >
                  <Icon name="heroicons:pencil-square" class="h-4 w-4" />編集
                </button>
                <button
                  class="text-xs text-gray-400 hover:text-red-500 transition flex items-center gap-0.5"
                  @click="deletePost"
                >
                  <Icon name="heroicons:trash" class="h-4 w-4" />削除
                </button>
              </div>
            </div>

            <!-- 本文 -->
            <div class="mt-3 text-sm text-gray-800 leading-relaxed prose prose-sm max-w-none" v-html="post.content" />
          </div>
        </div>

        <!-- リアクション -->
        <div class="mt-4 pt-4 border-t border-gray-100">
          <div class="flex items-center gap-2 flex-wrap">
            <span
              v-for="(count, emoji) in post.reactions"
              :key="String(emoji)"
              class="inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium cursor-pointer transition"
              :class="post.myReactions.includes(String(emoji))
                ? 'bg-primary-100 text-primary-700 ring-1 ring-primary-300'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
              @click="onReaction(String(emoji))"
            >{{ String(emoji) }} {{ count }}</span>

            <!-- 絵文字ボタン -->
            <div class="relative">
              <button
                class="inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm text-gray-400 bg-gray-100 hover:bg-gray-200 transition"
                @click.stop="showEmojiPicker = !showEmojiPicker"
              >
                <Icon name="heroicons:face-smile" class="h-4 w-4" /> リアクション
              </button>
              <div
                v-if="showEmojiPicker"
                class="absolute z-20 left-0 top-full mt-1 flex gap-1 bg-white border border-gray-200 rounded-xl shadow-lg p-2"
              >
                <button
                  v-for="em in EMOJIS"
                  :key="em"
                  class="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 text-lg transition"
                  @click="onReaction(em)"
                >{{ em }}</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- コメントセクション -->
      <div class="card p-5 space-y-4">
        <h2 class="font-semibold text-gray-900 flex items-center gap-2">
          <Icon name="heroicons:chat-bubble-left-right" class="h-5 w-5 text-primary-600" />
          コメント（{{ post.comments.length }}件）
        </h2>

        <!-- コメント一覧 -->
        <div v-if="post.comments.length > 0" class="space-y-4 divide-y divide-gray-50">
          <div v-for="comment in post.comments" :key="comment.id" class="flex items-start gap-3 pt-4 first:pt-0">
            <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600 font-semibold text-sm">
              {{ comment.authorInitial }}
            </div>
            <div class="flex-1">
              <p class="text-sm font-semibold text-gray-800">{{ comment.authorName }}
                <span class="font-normal text-xs text-gray-400 ml-1">{{ comment.postedAt }}</span>
              </p>
              <p class="text-sm text-gray-700 mt-0.5 leading-relaxed">{{ comment.content }}</p>
            </div>
          </div>
        </div>
        <div v-else class="text-sm text-gray-400 py-2">コメントはまだありません。最初のコメントを投稿しましょう。</div>

        <!-- コメント入力 -->
        <div class="flex items-start gap-3 pt-2 border-t border-gray-100">
          <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700 font-semibold text-sm">
            {{ user?.displayName?.charAt(0) ?? 'T' }}
          </div>
          <div class="flex-1 space-y-2">
            <textarea
              v-model="commentInput"
              rows="2"
              placeholder="コメントを入力..."
              class="input-field resize-none text-sm"
              @keydown.ctrl.enter.prevent="submitComment"
            />
            <div class="flex justify-end">
              <button
                class="btn-primary text-sm"
                :disabled="!commentInput.trim()"
                @click="submitComment"
              >コメントする</button>
            </div>
          </div>
        </div>
      </div>

    </template>

    <!-- 絵文字ピッカー外クリックで閉じる -->
    <div v-if="showEmojiPicker" class="fixed inset-0 z-10" @click="showEmojiPicker = false" />

    <!-- 編集モーダル -->
    <Teleport to="body">
      <div
        v-if="isEditing"
        class="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40"
        @click.self="isEditing = false"
      >
        <div class="bg-white w-full md:max-w-lg rounded-t-2xl md:rounded-2xl p-5 space-y-4 shadow-xl">
          <div class="flex items-center justify-between">
            <h3 class="font-bold text-gray-900">投稿を編集</h3>
            <button class="p-1.5 rounded-lg hover:bg-gray-100 transition" @click="isEditing = false">
              <Icon name="heroicons:x-mark" class="h-5 w-5 text-gray-500" />
            </button>
          </div>
          <textarea v-model="editContent" rows="7" class="input-field resize-none text-sm" />
          <div class="flex gap-3">
            <button class="flex-1 btn-secondary" @click="isEditing = false">キャンセル</button>
            <button class="flex-1 btn-primary" :disabled="!editContent.trim()" @click="saveEdit">保存する</button>
          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>
