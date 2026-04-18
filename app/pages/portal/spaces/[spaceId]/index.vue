<script setup lang="ts">
import { MOCK_SPACES, MOCK_ADMIN_USERS } from '~/data/mock'
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
  if (!s) return { id: '', name: '', description: '', memberCount: 0, isAdmin: false, isPinned: false, type: '', headerImage: '' }
  return {
    id:          s.id,
    name:        s.name,
    description: s.description,
    memberCount: s.memberCount,
    isAdmin:     (s.admins ?? []).includes('mock-user-123'),
    isPinned:    s.isPinned,
    type:        s.type,
    headerImage: s.headerImage ?? '',
  }
})

const isFollowing = ref(true)

// ── 投稿一覧（このスペース） ──────────────────────────────────────────
const spacePosts = store.getPostsBySpace(spaceId)
const pinnedPost = computed(() => spacePosts.value.find(p => p.isPinned) ?? null)
const regularPosts = computed(() => spacePosts.value.filter(p => !p.isPinned))

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

// ── メンバーカラー ────────────────────────────────────────────────────
const groupColors: Record<string, string> = {
  reterace: 'bg-indigo-400',
  miraito:  'bg-sky-400',
  asset:    'bg-amber-400',
}
const getGroupColor = (groupId?: string) =>
  groupId ? (groupColors[groupId] ?? 'bg-gray-400') : 'bg-gray-400'

const getGroupLabel = (groupId?: string) => {
  const map: Record<string, string> = { reterace: 'Reterace', miraito: 'Miraito', asset: 'Asset' }
  return groupId ? (map[groupId] ?? '') : ''
}
</script>

<template>
  <div class="flex h-full min-h-screen bg-gray-100">

    <!-- 左サイドバー：メンバー -->
    <aside class="w-44 shrink-0 bg-white border-r border-gray-200 p-3 space-y-3 hidden lg:block">
      <div class="flex items-center justify-between">
        <span class="text-xs font-semibold text-gray-500 uppercase tracking-wide">メンバー</span>
        <span class="text-xs text-gray-400">{{ space.memberCount }}名</span>
      </div>
      <div class="grid grid-cols-3 gap-1.5">
        <div
          v-for="u in MOCK_ADMIN_USERS"
          :key="u.uid"
          class="flex flex-col items-center gap-0.5"
          :title="u.displayName"
        >
          <div
            class="h-10 w-10 rounded-full flex items-center justify-center text-white text-sm font-semibold"
            :class="getGroupColor(u.groupId)"
          >
            {{ u.displayName.charAt(0) }}
          </div>
          <span class="text-[10px] text-gray-500 leading-tight text-center line-clamp-1 w-full">{{ u.lastName }}</span>
        </div>
      </div>
    </aside>

    <!-- メインコンテンツ -->
    <main class="flex-1 min-w-0 flex flex-col">

      <!-- ヘッダー画像バナー -->
      <div
        class="relative w-full h-32 overflow-hidden"
        :class="space.headerImage ? '' : 'bg-gradient-to-r from-indigo-500 via-indigo-400 to-sky-400'"
      >
        <img
          v-if="space.headerImage"
          :src="space.headerImage"
          alt=""
          class="w-full h-full object-cover"
        />
        <!-- スペース名オーバーレイ -->
        <div class="absolute inset-0 bg-black/30 flex items-end px-4 pb-3">
          <div class="flex items-end justify-between w-full">
            <div>
              <h1 class="text-lg font-bold text-white drop-shadow">{{ space.name }}</h1>
              <p v-if="space.description" class="text-xs text-white/80 mt-0.5">{{ space.description }}</p>
            </div>
            <div class="flex items-center gap-2 shrink-0 pb-0.5">
              <NuxtLink to="/portal" class="text-white/80 hover:text-white transition">
                <Icon name="heroicons:arrow-left" class="h-4 w-4" />
              </NuxtLink>
              <NuxtLink
                v-if="space.isAdmin"
                :to="`/portal/spaces/${spaceId}/settings`"
                class="p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition text-white"
              >
                <Icon name="heroicons:cog-6-tooth" class="h-4 w-4" />
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>

      <!-- フォローボタン行 -->
      <div class="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-end gap-2">
        <button
          class="text-xs px-3 py-1.5 rounded border transition font-medium"
          :class="isFollowing
            ? 'border-gray-300 text-gray-600 hover:bg-gray-50'
            : 'border-primary-500 text-primary-600 bg-primary-50 hover:bg-primary-100'"
          @click="isFollowing = !isFollowing"
        >
          {{ isFollowing ? 'フォローを解除' : 'フォローする' }}
        </button>
      </div>

      <!-- フィード -->
      <div class="flex-1 p-4 space-y-3 max-w-2xl w-full mx-auto">

        <!-- ピン留め投稿 -->
        <div
          v-if="pinnedPost"
          class="bg-white border border-gray-200 rounded-lg overflow-hidden"
        >
          <div class="bg-amber-50 px-4 py-2 flex items-center gap-1.5 border-b border-amber-100">
            <Icon name="heroicons:bookmark-solid" class="h-3.5 w-3.5 text-amber-500" />
            <span class="text-xs font-medium text-amber-700">ピン留め</span>
          </div>
          <NuxtLink :to="`/portal/spaces/${spaceId}/posts/${pinnedPost.id}`" class="block p-4 hover:bg-gray-50 transition">
            <div class="flex items-start gap-3">
              <div class="h-9 w-9 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0 bg-amber-400">
                {{ pinnedPost.authorInitial }}
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold text-gray-900">{{ pinnedPost.authorName }}</p>
                <div class="text-sm text-gray-700 mt-1 line-clamp-3 leading-relaxed prose prose-sm max-w-none" v-html="pinnedPost.content" />
              </div>
            </div>
          </NuxtLink>
        </div>

        <!-- 投稿フォーム -->
        <div class="bg-white border border-gray-200 rounded-lg p-3">
          <div class="flex items-start gap-2.5">
            <div class="h-8 w-8 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0 bg-indigo-400">
              {{ user?.displayName?.charAt(0) ?? 'U' }}
            </div>
            <div class="flex-1 space-y-2">
              <RichTextEditor
                v-model="newPostContent"
                placeholder="投稿する..."
              />
              <div class="flex items-center justify-end">
                <button
                  class="btn-primary text-sm px-4 py-1.5"
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
          v-for="post in regularPosts"
          :key="post.id"
          class="bg-white border border-gray-200 rounded-lg"
        >
          <!-- 投稿ヘッダー -->
          <div class="px-4 pt-4 pb-3 flex items-start gap-3">
            <div
              class="h-9 w-9 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0"
              :class="getGroupColor(MOCK_ADMIN_USERS.find(u => u.uid === post.authorId)?.groupId)"
            >
              {{ post.authorInitial }}
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-sm font-semibold text-gray-900">{{ post.authorName }}</span>
                <span
                  v-if="MOCK_ADMIN_USERS.find(u => u.uid === post.authorId)?.groupId"
                  class="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 font-medium"
                >
                  {{ getGroupLabel(MOCK_ADMIN_USERS.find(u => u.uid === post.authorId)?.groupId) }}
                </span>
                <span class="text-xs text-gray-400 ml-auto">{{ post.postedAt }}</span>
                <button
                  v-if="post.authorId === (user?.uid ?? 'mock-user-123')"
                  class="text-xs text-gray-400 hover:text-primary-600 transition flex items-center gap-0.5"
                  @click="openEdit(post)"
                >
                  <Icon name="heroicons:pencil-square" class="h-3.5 w-3.5" />
                </button>
              </div>

              <!-- 本文 -->
              <NuxtLink :to="`/portal/spaces/${spaceId}/posts/${post.id}`" class="block mt-2">
                <div
                  class="text-sm text-gray-700 leading-relaxed prose prose-sm max-w-none"
                  v-html="post.content"
                />
              </NuxtLink>
            </div>
          </div>

          <!-- リアクション -->
          <div class="px-4 py-2 border-t border-gray-100 flex items-center gap-1.5 flex-wrap">
            <span
              v-for="(count, emoji) in post.reactions"
              :key="String(emoji)"
              class="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium cursor-pointer transition select-none"
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

            <NuxtLink
              :to="`/portal/spaces/${spaceId}/posts/${post.id}`"
              class="ml-auto text-xs text-gray-400 hover:text-primary-600 transition flex items-center gap-0.5"
            >
              詳細<Icon name="heroicons:arrow-top-right-on-square" class="h-3 w-3" />
            </NuxtLink>
          </div>

          <!-- コメント -->
          <div class="px-4 py-3 border-t border-gray-100 space-y-2 bg-gray-50/50">
            <div v-if="post.comments.length > 0" class="space-y-2">
              <div v-for="comment in post.comments" :key="comment.id" class="flex items-start gap-2">
                <div class="h-7 w-7 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0 bg-gray-400">
                  {{ comment.authorInitial }}
                </div>
                <div class="flex-1 bg-white rounded-lg px-2.5 py-1.5 border border-gray-100">
                  <p class="text-xs font-semibold text-gray-700">{{ comment.authorName }} <span class="font-normal text-gray-400">{{ comment.postedAt }}</span></p>
                  <p class="text-xs text-gray-600 mt-0.5">{{ comment.content }}</p>
                </div>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <div class="h-7 w-7 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0 bg-indigo-300">
                {{ user?.displayName?.charAt(0) ?? 'U' }}
              </div>
              <input
                v-model="commentInputs[post.id]"
                placeholder="コメントを入力..."
                class="flex-1 rounded-full bg-white border border-gray-200 px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary-300 focus:border-primary-300"
                @keydown.enter.prevent="submitComment(post.id)"
              />
              <button
                class="text-xs text-primary-600 font-medium hover:underline shrink-0"
                @click="submitComment(post.id)"
              >投稿する</button>
            </div>
          </div>
        </div>

        <!-- 投稿なし -->
        <div v-if="spacePosts.length === 0" class="bg-white border border-gray-200 rounded-lg p-10 text-center">
          <Icon name="heroicons:chat-bubble-left-right" class="h-10 w-10 text-gray-200 mx-auto mb-2" />
          <p class="text-sm text-gray-400">まだ投稿がありません</p>
        </div>

      </div>
    </main>

    <!-- 右サイドバー：ピープル -->
    <aside class="w-48 shrink-0 bg-white border-l border-gray-200 p-3 space-y-3 hidden xl:block">
      <span class="text-xs font-semibold text-gray-500 uppercase tracking-wide">ピープル</span>
      <div class="space-y-2">
        <div
          v-for="u in MOCK_ADMIN_USERS"
          :key="u.uid"
          class="flex items-center gap-2"
        >
          <div
            class="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0"
            :class="getGroupColor(u.groupId)"
          >
            {{ u.displayName.charAt(0) }}
          </div>
          <div class="min-w-0">
            <p class="text-xs font-medium text-gray-800 truncate">{{ u.displayName }}</p>
            <p class="text-[10px] text-gray-400 truncate">{{ getGroupLabel(u.groupId) }}</p>
          </div>
        </div>
      </div>
    </aside>

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
