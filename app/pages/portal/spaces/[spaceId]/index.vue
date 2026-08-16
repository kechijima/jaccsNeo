<script setup lang="ts">
import { usePortalStore } from '~/composables/usePortalStore'
import { useNotifications } from '~/composables/useNotifications'
import { useUsers } from '~/composables/useUsers'
import { useAuthorProfileModal } from '~/composables/useAuthorProfileModal'
import { useMentionClick } from '~/composables/useMentionClick'
import { resolveSpaceMembers } from '~/composables/useSpaces'
import { useGroupLabels } from '~/composables/useGroupLabels'
import { useFavorites } from '~/composables/useFavorites'
import type { AppUser } from '~/types/user'

definePageMeta({ middleware: ['auth'] })

const route = useRoute()
const spaceId = computed(() => route.params.spaceId as string)
const { user } = useCurrentUser()
const store = usePortalStore()
const { sendMentionNotifications } = useNotifications()
const { fetchUsers } = useUsers()
const { openAuthorProfile } = useAuthorProfileModal()
const { handleMentionClick } = useMentionClick()
const { getGroupLabel, getGroupColor: getGroupColorClass, ensureLoaded: ensureGroupLabelsLoaded } = useGroupLabels()
const { isFavoriteSpace, toggleFavoriteSpace, ensureLoaded: ensureFavoritesLoaded } = useFavorites()
ensureFavoritesLoaded()

await store.fetchPostsForSpace(spaceId.value)
const members = ref<AppUser[]>([])
onMounted(async () => {
  members.value = await fetchUsers().catch(() => [])
  await ensureGroupLabelsLoaded()
})

// ── スペース情報 ──────────────────────────────────────────────────────
const spaceRaw = computed(() => store.spaces.value.find(sp => sp.id === spaceId.value))

const resolvedMembers = computed(() => spaceRaw.value ? resolveSpaceMembers(spaceRaw.value, members.value) : [])

const space = computed(() => {
  const s = spaceRaw.value
  if (!s) return { id: '', name: '', description: '', memberCount: 0, isAdmin: false, isPinned: false, type: '', headerImage: '' }
  return {
    id:          s.id,
    name:        s.name,
    description: s.description ?? '',
    memberCount: resolvedMembers.value.length,
    isAdmin:     (s.adminUids ?? []).includes(user.value?.uid ?? ''),
    isPinned:    s.isPinned,
    type:        s.type,
    headerImage: s.headerImage ?? '',
  }
})

// ── 投稿一覧（このスペース） ──────────────────────────────────────────
const spacePosts = store.getPostsBySpace(spaceId)
const pinnedPost = computed(() => spacePosts.value.find(p => p.isPinned) ?? null)

// ── 絞り込み（投稿者・期間・キーワード） ────────────────────────────────
const searchQuery    = ref('')
const filterAuthorId = ref('')   // '' = すべて
const filterDateFrom = ref('')   // YYYY-MM-DD
const filterDateTo   = ref('')   // YYYY-MM-DD
const sortBy = ref<'new' | 'popular'>('new')   // 'popular' = いいね（リアクション）が多い順
const showFilter     = ref(false)

const activeFilterCount = computed(() =>
  [filterAuthorId.value, filterDateFrom.value, filterDateTo.value, sortBy.value !== 'new' ? '1' : ''].filter(Boolean).length,
)

const resetFilters = () => {
  searchQuery.value    = ''
  filterAuthorId.value = ''
  filterDateFrom.value = ''
  filterDateTo.value   = ''
  sortBy.value         = 'new'
}

// リアクション（いいね等）の合計数。並び替え「いいねが多い順」で使用する
const totalReactions = (p: { reactions: Record<string, number> }) =>
  Object.values(p.reactions).reduce((sum, n) => sum + n, 0)

// 投稿者の選択肢（このスペースに実際に投稿がある著者から動的に生成）
const authorOptions = computed(() => {
  const map = new Map<string, string>()
  for (const p of spacePosts.value) {
    if (p.authorId) map.set(p.authorId, p.authorName)
  }
  return [...map.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name, 'ja'))
})

const regularPosts = computed(() => {
  let list = spacePosts.value.filter(p => !p.isPinned && p.status !== 'draft')

  const q = searchQuery.value.trim().toLowerCase()
  if (q) {
    list = list.filter(p =>
      p.content.toLowerCase().includes(q) ||
      p.authorName.toLowerCase().includes(q),
    )
  }

  if (filterAuthorId.value) {
    list = list.filter(p => p.authorId === filterAuthorId.value)
  }

  if (filterDateFrom.value) {
    const from = new Date(filterDateFrom.value)
    from.setHours(0, 0, 0, 0)
    list = list.filter(p => p.createdAt >= from)
  }

  if (filterDateTo.value) {
    const to = new Date(filterDateTo.value)
    to.setHours(23, 59, 59, 999)
    list = list.filter(p => p.createdAt <= to)
  }

  if (sortBy.value === 'popular') {
    list = list.slice().sort((a, b) => totalReactions(b) - totalReactions(a))
  }

  return list
})

// ── 下書き（このスペース、自分のもののみ） ────────────────────────────
const myDraftsInSpace = computed(() =>
  spacePosts.value
    .filter(p => p.status === 'draft')
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
)

// ── 投稿フォーム ──────────────────────────────────────────────────────
const newPostContent = ref('')
const submitting = ref(false)
const savingDraft = ref(false)

// イベントスペース専用項目（開催日時・カレンダー連携）
const isEventSpace = computed(() => space.value.type === 'event')
const eventStartAt = ref('')
const eventEndAt = ref('')
const syncToCalendar = ref(true)

const handlePostSubmit = async () => {
  if (!newPostContent.value.trim()) return
  if (isEventSpace.value && !eventStartAt.value) return
  submitting.value = true
  const eventOptions = isEventSpace.value && eventStartAt.value
    ? {
        startAt: new Date(eventStartAt.value),
        endAt: eventEndAt.value ? new Date(eventEndAt.value) : undefined,
        syncToCalendar: syncToCalendar.value,
      }
    : undefined
  const postId = await store.addPost(spaceId.value, newPostContent.value, eventOptions)
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
  eventStartAt.value = ''
  eventEndAt.value = ''
  submitting.value = false
}

const handleSaveDraft = async () => {
  if (!newPostContent.value.trim()) return
  savingDraft.value = true
  const eventOptions = isEventSpace.value && eventStartAt.value
    ? {
        startAt: new Date(eventStartAt.value),
        endAt: eventEndAt.value ? new Date(eventEndAt.value) : undefined,
        syncToCalendar: syncToCalendar.value,
      }
    : undefined
  await store.addPost(spaceId.value, newPostContent.value, eventOptions, true)
  newPostContent.value = ''
  eventStartAt.value = ''
  eventEndAt.value = ''
  savingDraft.value = false
}

const publishingDraftId = ref<string | null>(null)

const handlePublishDraft = async (postId: string) => {
  publishingDraftId.value = postId
  await store.publishDraft(postId)
  publishingDraftId.value = null
}

const handleDeleteDraft = async (postId: string) => {
  if (!confirm('この下書きを削除しますか？')) return
  await store.deletePost(postId)
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

const submitComment = async (postId: string) => {
  const content = commentInputs.value[postId]?.trim()
  if (!content) return
  commentInputs.value[postId] = ''
  await store.addComment(postId, content)
}

// ── 編集（インライン） ────────────────────────────────────────────────
const editingPostId = ref<string | null>(null)
const editContent = ref('')

const openEdit = (post: { id: string; content: string }) => {
  editingPostId.value = post.id
  editContent.value = post.content
}

const saveEdit = async () => {
  if (!editingPostId.value || !editContent.value.trim()) return
  await store.editPost(editingPostId.value, editContent.value)
  editingPostId.value = null
  editContent.value = ''
}

// ── メンバーカラー ────────────────────────────────────────────────────
const getGroupColor = (groupId?: string) => groupId ? getGroupColorClass(groupId) : 'bg-gray-400'
</script>

<template>
  <div class="flex h-full min-h-screen bg-gray-100">

    <!-- メインコンテンツ -->
    <main class="flex-1 min-w-0 flex flex-col">

      <!-- ヘッダー画像バナー -->
      <div
        class="relative w-full overflow-hidden bg-gradient-to-r from-indigo-500 via-indigo-400 to-sky-400"
        style="height: 144px;"
      >
        <img
          v-if="space.headerImage"
          :src="space.headerImage"
          alt=""
          class="absolute inset-0 w-full h-full object-cover"
        />
        <!-- スペース名オーバーレイ -->
        <div class="absolute inset-0 flex items-end px-4 pb-3" style="background: rgba(0,0,0,0.35)">
          <div class="flex items-end justify-between w-full">
            <div>
              <p class="text-2xl md:text-3xl font-bold text-white drop-shadow">{{ space.name }}</p>
            </div>
            <div class="flex items-center gap-2 shrink-0 pb-0.5">
              <NuxtLink to="/portal" class="text-white/80 hover:text-white transition">
                <Icon name="heroicons:arrow-left" class="h-4 w-4" />
              </NuxtLink>
              <button
                type="button"
                class="p-1.5 rounded-full transition"
                :class="isFavoriteSpace(spaceId)
                  ? 'bg-amber-400 text-white hover:bg-amber-500'
                  : 'bg-white/20 text-white hover:bg-white/30'"
                :aria-label="isFavoriteSpace(spaceId) ? 'お気に入りから外す' : 'お気に入りに追加'"
                :title="isFavoriteSpace(spaceId) ? 'お気に入り登録中' : 'お気に入りに追加'"
                @click="toggleFavoriteSpace(spaceId)"
              >
                <Icon :name="isFavoriteSpace(spaceId) ? 'heroicons:star-solid' : 'heroicons:star'" class="h-4 w-4" />
              </button>
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

      <!-- フィード -->
      <div class="flex-1 p-4 space-y-3 max-w-2xl w-full mx-auto">

        <!-- スペース名・説明 -->
        <div class="bg-white border border-gray-200 rounded-lg p-4">
          <h1 class="text-xl font-bold text-gray-900">{{ space.name }}</h1>
          <template v-if="space.description">
            <p class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mt-3 mb-2">スペースについて</p>
            <div class="text-sm text-gray-700 leading-relaxed prose prose-sm max-w-none" v-html="space.description" @click="handleMentionClick" />
          </template>
        </div>

        <!-- ピン留め投稿 -->
        <div
          v-if="pinnedPost"
          class="bg-white border border-gray-200 rounded-lg overflow-hidden"
        >
          <div class="bg-amber-50 px-4 py-2 flex items-center gap-1.5 border-b border-amber-100">
            <Icon name="heroicons:bookmark-solid" class="h-3.5 w-3.5 text-amber-500" />
            <span class="text-xs font-medium text-amber-700">ピン留め</span>
          </div>
          <div class="p-4">
            <div class="flex items-start gap-3">
              <button
                type="button"
                class="h-9 w-9 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0 bg-amber-400 hover:ring-2 hover:ring-amber-300 transition"
                @click="openAuthorProfile(pinnedPost.authorId, pinnedPost.authorName)"
              >
                {{ pinnedPost.authorInitial }}
              </button>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold text-gray-900">{{ pinnedPost.authorName }}</p>
                <div class="text-sm text-gray-700 mt-1 leading-relaxed prose prose-sm max-w-none" v-html="pinnedPost.content" @click="handleMentionClick" />
              </div>
            </div>
          </div>
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

              <!-- イベントスペース専用: 開催日時・カレンダー連携 -->
              <div v-if="isEventSpace" class="grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-lg bg-sky-50 border border-sky-100 p-3">
                <div>
                  <label class="block text-xs font-medium text-gray-600 mb-1">開催日時 <span class="text-red-500">*</span></label>
                  <input v-model="eventStartAt" type="datetime-local" class="input-field text-sm py-1.5" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-600 mb-1">終了日時（任意）</label>
                  <input v-model="eventEndAt" type="datetime-local" class="input-field text-sm py-1.5" />
                </div>
                <label class="sm:col-span-2 flex items-center gap-2 cursor-pointer text-xs text-gray-600">
                  <input v-model="syncToCalendar" type="checkbox" class="h-4 w-4 rounded text-primary-600" />
                  カレンダーに連携する（この日時・投稿内容でカレンダーにも登録されます）
                </label>
              </div>

              <div class="flex items-center justify-end gap-2">
                <button
                  type="button"
                  class="btn-secondary text-sm px-4 py-1.5"
                  :disabled="!newPostContent.trim() || savingDraft || submitting"
                  @click="handleSaveDraft"
                >
                  <Icon v-if="savingDraft" name="heroicons:arrow-path" class="h-3.5 w-3.5 animate-spin mr-1" />
                  下書き保存
                </button>
                <button
                  class="btn-primary text-sm px-4 py-1.5"
                  :disabled="!newPostContent.trim() || submitting || savingDraft || (isEventSpace && !eventStartAt)"
                  @click="handlePostSubmit"
                >
                  <Icon v-if="submitting" name="heroicons:arrow-path" class="h-3.5 w-3.5 animate-spin mr-1" />
                  投稿する
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 下書き（自分のみ表示） -->
        <div v-if="myDraftsInSpace.length > 0" class="bg-white border border-dashed border-gray-300 rounded-lg overflow-hidden">
          <div class="bg-gray-50 px-4 py-2 flex items-center gap-1.5 border-b border-gray-200">
            <Icon name="heroicons:pencil-square" class="h-3.5 w-3.5 text-gray-400" />
            <span class="text-xs font-medium text-gray-500">下書き（自分のみ表示・{{ myDraftsInSpace.length }}件）</span>
          </div>
          <div class="divide-y divide-gray-100">
            <div v-for="draft in myDraftsInSpace" :key="draft.id" class="p-4">
              <template v-if="editingPostId === draft.id">
                <RichTextEditor v-model="editContent" class="min-h-[140px]" />
                <div class="flex justify-end gap-2 mt-2">
                  <button class="btn-secondary text-sm" @click="editingPostId = null">キャンセル</button>
                  <button class="btn-primary text-sm" :disabled="!editContent.trim()" @click="saveEdit">保存する</button>
                </div>
              </template>
              <template v-else>
                <div class="text-sm text-gray-700 leading-relaxed prose prose-sm max-w-none" v-html="draft.content" @click="handleMentionClick" />
                <div class="flex items-center justify-end gap-3 mt-2">
                  <button type="button" class="text-xs text-gray-400 hover:text-red-500 transition" @click="handleDeleteDraft(draft.id)">削除</button>
                  <button type="button" class="text-xs text-gray-500 hover:text-primary-600 transition" @click="openEdit(draft)">編集</button>
                  <button
                    type="button"
                    class="text-xs font-medium text-primary-600 hover:text-primary-700 transition"
                    :disabled="publishingDraftId === draft.id"
                    @click="handlePublishDraft(draft.id)"
                  >
                    {{ publishingDraftId === draft.id ? '公開中...' : '公開する' }}
                  </button>
                </div>
              </template>
            </div>
          </div>
        </div>

        <!-- 絞り込み -->
        <div class="flex items-center gap-2 flex-wrap">
          <div class="relative flex-1 min-w-[160px]">
            <Icon name="heroicons:magnifying-glass" class="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              v-model="searchQuery"
              type="search"
              placeholder="投稿内容・投稿者で検索..."
              class="input-field pl-8 py-1.5 text-sm"
            />
          </div>
          <button
            type="button"
            class="relative flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition shrink-0"
            :class="activeFilterCount > 0
              ? 'border-primary-400 bg-primary-50 text-primary-700'
              : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'"
            @click="showFilter = !showFilter"
          >
            <Icon name="heroicons:adjustments-horizontal" class="h-4 w-4" />
            絞り込み
            <span
              v-if="activeFilterCount > 0"
              class="flex h-4 w-4 items-center justify-center rounded-full bg-primary-500 text-[10px] text-white font-bold"
            >{{ activeFilterCount }}</span>
          </button>
        </div>

        <div v-if="showFilter" class="bg-white border border-gray-200 rounded-lg p-3 space-y-2.5">
          <div class="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">投稿者</label>
              <select v-model="filterAuthorId" class="input-field text-sm py-1.5">
                <option value="">すべて</option>
                <option v-for="a in authorOptions" :key="a.id" :value="a.id">{{ a.name }}</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">期間（開始）</label>
              <input v-model="filterDateFrom" type="date" class="input-field text-sm py-1.5" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">期間（終了）</label>
              <input v-model="filterDateTo" type="date" class="input-field text-sm py-1.5" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">並び替え</label>
              <select v-model="sortBy" class="input-field text-sm py-1.5">
                <option value="new">新着順</option>
                <option value="popular">いいねが多い順</option>
              </select>
            </div>
          </div>
          <div class="flex items-center justify-between pt-1">
            <p class="text-xs text-gray-500"><span class="font-bold text-primary-600">{{ regularPosts.length }}</span>件が該当</p>
            <button class="text-xs text-gray-400 hover:text-red-500 transition" @click="resetFilters">条件をクリア</button>
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
            <button
              type="button"
              class="h-9 w-9 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0 hover:ring-2 hover:ring-primary-300 transition"
              :class="getGroupColor(members.find(u => u.uid === post.authorId)?.groupId)"
              @click="openAuthorProfile(post.authorId, post.authorName)"
            >
              {{ post.authorInitial }}
            </button>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-sm font-semibold text-gray-900">{{ post.authorName }}</span>
                <span
                  v-if="members.find(u => u.uid === post.authorId)?.groupId"
                  class="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 font-medium"
                >
                  {{ getGroupLabel(members.find(u => u.uid === post.authorId)?.groupId) }}
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
              <NuxtLink
                v-if="post.linkedEventId"
                :to="`/events/${post.linkedEventId}`"
                class="mt-1 inline-flex items-center gap-1 text-[11px] text-sky-600 hover:underline"
              >
                <Icon name="heroicons:calendar-days" class="h-3 w-3" />
                {{ post.eventStartAt?.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) }}
                カレンダーで見る
              </NuxtLink>

              <!-- 本文（編集モード） -->
              <div v-if="editingPostId === post.id" class="mt-2 space-y-2">
                <RichTextEditor v-model="editContent" class="min-h-[140px]" />
                <div class="flex justify-end gap-2">
                  <button class="btn-secondary text-sm" @click="editingPostId = null">キャンセル</button>
                  <button class="btn-primary text-sm" :disabled="!editContent.trim()" @click="saveEdit">保存する</button>
                </div>
              </div>
              <!-- 本文 -->
              <NuxtLink v-else :to="`/portal/spaces/${spaceId}/posts/${post.id}`" class="block mt-2">
                <div
                  class="text-sm text-gray-700 leading-relaxed prose prose-sm max-w-none"
                  v-html="post.content"
                  @click="handleMentionClick"
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
        <div v-if="regularPosts.length === 0 && !pinnedPost" class="bg-white border border-gray-200 rounded-lg p-10 text-center">
          <Icon name="heroicons:chat-bubble-left-right" class="h-10 w-10 text-gray-200 mx-auto mb-2" />
          <p class="text-sm text-gray-400">{{ spacePosts.length === 0 ? 'まだ投稿がありません' : '条件に該当する投稿がありません' }}</p>
        </div>

      </div>
    </main>

    <!-- 右サイドバー：ピープル -->
    <aside class="w-48 shrink-0 bg-white border-l border-gray-200 p-3 space-y-3 hidden lg:block">
      <div class="flex items-center justify-between">
        <span class="text-xs font-semibold text-gray-500 uppercase tracking-wide">メンバー</span>
        <span class="text-xs text-gray-400">{{ space.memberCount }}名</span>
      </div>
      <!-- アバターグリッド -->
      <p v-if="resolvedMembers.length === 0" class="text-xs text-gray-300">メンバーが設定されていません</p>
      <div class="grid grid-cols-3 gap-1.5">
        <div
          v-for="u in resolvedMembers"
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

    <!-- 絵文字ピッカー外クリックで閉じる -->
    <div v-if="showEmojiPicker" class="fixed inset-0 z-10" @click="showEmojiPicker = null" />

  </div>
</template>
