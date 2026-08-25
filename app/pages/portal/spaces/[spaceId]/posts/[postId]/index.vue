<script setup lang="ts">
import { usePortalStore } from '~/composables/usePortalStore'
import { useAuthorProfileModal } from '~/composables/useAuthorProfileModal'
import { useMentionClick } from '~/composables/useMentionClick'
import { useSpaces } from '~/composables/useSpaces'
import { useUsers } from '~/composables/useUsers'
import type { AppUser } from '~/types/user'

definePageMeta({ middleware: ['auth'] })

const route = useRoute()
const router = useRouter()
const spaceId = computed(() => route.params.spaceId as string)
const postId = computed(() => route.params.postId as string)
const { user } = useCurrentUser()
const store = usePortalStore()
const { openAuthorProfile } = useAuthorProfileModal()
const { handleMentionClick } = useMentionClick()
const { fetchReactorUids } = useSpaces()
const { fetchUsers } = useUsers()

await store.fetchPostsForSpace(spaceId.value)
const postRef = store.getPost(postId)
const post = postRef

const members = ref<AppUser[]>([])
onMounted(async () => {
  members.value = await fetchUsers().catch(() => [])
})

const space = computed(() => store.spaces.value.find(s => s.id === spaceId.value))

const isOwn = computed(() =>
  post.value?.authorId === (user.value?.uid ?? 'mock-user-123'),
)

// ── リアクション（👍のみ。誰が押したか確認できる） ──────────────────────────
const REACTION_EMOJI = '👍'
const reactorNames    = ref<string[]>([])
const reactorsLoading = ref(false)
const showReactorList = ref(false)

const onReaction = () => {
  if (!post.value) return
  store.toggleReaction(post.value.id, REACTION_EMOJI)
}

const toggleReactorList = async () => {
  if (!post.value) return
  if (showReactorList.value) {
    showReactorList.value = false
    return
  }
  showReactorList.value = true
  reactorsLoading.value = true
  try {
    const uids = await fetchReactorUids(spaceId.value, post.value.id, REACTION_EMOJI)
    const nameByUid = new Map(members.value.map(u => [u.uid, u.displayName]))
    reactorNames.value = uids.map(uid => nameByUid.get(uid) ?? '不明なユーザー')
  } finally {
    reactorsLoading.value = false
  }
}

// ── コメント ──────────────────────────────────────────────────────────
const commentInput = ref('')

const submitComment = async () => {
  if (!commentInput.value.trim() || !post.value) return
  const content = commentInput.value
  commentInput.value = ''
  await store.addComment(post.value.id, content)
}

// ── 編集 ─────────────────────────────────────────────────────────────
const isEditing = ref(false)
const editContent = ref('')

const openEdit = () => {
  if (!post.value) return
  editContent.value = post.value.content
  isEditing.value = true
}

const saveEdit = async () => {
  if (!post.value || !editContent.value.trim()) return
  await store.editPost(post.value.id, editContent.value)
  isEditing.value = false
}

// ── 削除 ─────────────────────────────────────────────────────────────
const deletePost = async () => {
  if (!post.value) return
  if (!confirm('この投稿を削除しますか？')) return
  await store.deletePost(post.value.id)
  router.back()
}
</script>

<template>
  <div class="p-4 md:p-6 max-w-3xl mx-auto space-y-5">

    <!-- パンくず -->
    <div class="flex items-center justify-between gap-3 flex-wrap">
      <div class="flex items-center gap-2 text-sm text-gray-400 flex-wrap">
        <NuxtLink to="/portal">掲示板</NuxtLink>
        <Icon name="heroicons:chevron-right" class="h-3 w-3" />
        <NuxtLink :to="`/portal/spaces/${spaceId}`">{{ space?.name ?? 'スペース' }}</NuxtLink>
        <Icon name="heroicons:chevron-right" class="h-3 w-3" />
        <span class="text-gray-600">投稿詳細</span>
      </div>
      <NuxtLink
        v-if="space?.type === 'event'"
        :to="post?.linkedEventId ? `/events/${post.linkedEventId}` : '/events'"
        class="btn-secondary text-xs flex items-center gap-1.5 shrink-0"
      >
        <Icon name="heroicons:calendar-days" class="h-3.5 w-3.5" />
        カレンダーで見る
      </NuxtLink>
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
          <button
            type="button"
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-semibold hover:ring-2 hover:ring-indigo-300 transition"
            @click="openAuthorProfile(post.authorId, post.authorName)"
          >
            {{ post.authorInitial }}
          </button>
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

            <!-- 本文（編集モード） -->
            <div v-if="isEditing" class="mt-3 space-y-2">
              <RichTextEditor v-model="editContent" class="min-h-[160px]" />
              <div class="flex justify-end gap-2">
                <button class="btn-secondary text-sm" @click="isEditing = false">キャンセル</button>
                <button class="btn-primary text-sm" :disabled="!editContent.trim()" @click="saveEdit">保存する</button>
              </div>
            </div>
            <!-- 本文 -->
            <div v-else class="mt-3 text-sm text-gray-800 leading-relaxed prose prose-sm max-w-none" v-html="post.content" @click="handleMentionClick" />
          </div>
        </div>

        <!-- リアクション（Good/👍のみ） -->
        <div class="mt-4 pt-4 border-t border-gray-100">
          <div class="flex items-center gap-2 flex-wrap">
            <button
              class="inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium transition select-none"
              :class="post.myReactions.includes('👍')
                ? 'bg-primary-100 text-primary-700 ring-1 ring-primary-300'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
              @click="onReaction()"
            >
              👍 Good<span v-if="(post.reactions?.['👍'] ?? 0) > 0"> {{ post.reactions['👍'] }}</span>
            </button>

            <button
              v-if="(post.reactions?.['👍'] ?? 0) > 0"
              type="button"
              class="text-xs text-gray-400 hover:text-primary-600 hover:underline"
              @click.stop="toggleReactorList()"
            >
              誰がGoodしたか見る
            </button>
          </div>

          <!-- Goodした人の一覧 -->
          <div v-if="showReactorList" class="mt-2 text-xs text-gray-500">
            <span v-if="reactorsLoading">読み込み中...</span>
            <span v-else-if="reactorNames.length === 0">まだ誰もGoodしていません</span>
            <span v-else>{{ reactorNames.join('、') }}</span>
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

  </div>
</template>
