<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

const route = useRoute()
const spaceId = computed(() => route.params.spaceId as string)
const { user } = useCurrentUser()

// ダミーデータ（Phase4でFirestoreから取得）
const space = ref({
  id: 'space_001',
  name: 'りらくす組合',
  memberCount: 119,
  isAdmin: false,
  isPinned: true,
})

const pinnedPost = ref({
  id: 'pin_001',
  content: '4月の数字会議は4/15(水)20時〜開催予定です。参加の方は出席管理にて出欠確認をお願いします。',
  authorName: '牧田 マネージャー',
  postedAt: '4/1',
})

const posts = ref([
  {
    id: 'post_001',
    authorName: '西島 伸樹',
    authorInitial: '西',
    authorColor: 'bg-indigo-100 text-indigo-700',
    content: '本日の活動報告です。田中様と面談し、生命保険の見直しを提案しました。来週中に返答をいただける予定です。\n\nまた、佐藤様から不動産購入のご相談をいただき、初回面談を設定しました。',
    reactions: { '👍': 3, '✨': 1 },
    comments: [
      { authorName: '山田 健太', authorInitial: '山', content: 'いいですね！契約につながるといいですね。', postedAt: '3時間前' },
      { authorName: '池田 健太郎', authorInitial: '池', content: '田中様は以前から検討されていた方ですね。頑張ってください！', postedAt: '2時間前' },
    ],
    showComments: false,
    postedAt: '4時間前',
    attachments: [],
  },
  {
    id: 'post_002',
    authorName: '池田 健太郎',
    authorInitial: '池',
    authorColor: 'bg-purple-100 text-purple-700',
    content: '先週の数字会議の議事録をアップしました。ご確認ください。今月の目標達成に向けて引き続き頑張りましょう！\n\n目標: 新規5件、成約3件\n現状: 新規3件、成約2件',
    reactions: { '👍': 5 },
    comments: [
      { authorName: '田中 洋子', authorInitial: '田', content: '確認しました！残り1週間で頑張ります。', postedAt: '1日前' },
    ],
    showComments: false,
    postedAt: '1日前',
    attachments: [{ name: '議事録_数字会議_4月.pdf', size: '245 KB' }],
  },
  {
    id: 'post_003',
    authorName: '田中 洋子',
    authorInitial: '田',
    authorColor: 'bg-rose-100 text-rose-700',
    content: '鈴木様のご紹介で新規顧客を獲得しました！山本様（35歳）で、まず生命保険の見直しをご希望とのことです。',
    reactions: { '🎉': 4, '👍': 2 },
    comments: [],
    showComments: false,
    postedAt: '2日前',
    attachments: [],
  },
])

const newPostContent = ref('')
const submitting = ref(false)

const handlePostSubmit = async () => {
  if (!newPostContent.value.trim()) return
  submitting.value = true
  // Phase4でFirestoreへの保存処理に差し替え
  await new Promise(r => setTimeout(r, 500))
  submitting.value = false
  newPostContent.value = ''
}

const toggleComments = (post: any) => {
  post.showComments = !post.showComments
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
          {{ user?.name?.charAt(0) ?? 'U' }}
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
