<script setup lang="ts">
import { useVideos } from '~/composables/useVideos'
import { useGroups } from '~/composables/useGroups'
import { useSpecialTeams } from '~/composables/useSpecialTeams'
import type { ManagedVideo } from '~/types/tools'
import type { Group } from '~/types/group'
import type { SpecialTeamDef } from '~/types/specialTeam'
import { TITLE_OPTIONS } from '~/types/user'

definePageMeta({ middleware: ['auth'] })

const { fetchVideos, createVideo, deleteVideo } = useVideos()
const { fetchGroups } = useGroups()
const { fetchAll: fetchSpecialTeams } = useSpecialTeams()
const { isSystemAdmin } = usePermission()
const { user: currentUser } = useCurrentUser()

const loading = ref(true)
const loadError = ref('')
const videos = ref<ManagedVideo[]>([])

const load = async () => {
  loading.value = true
  try {
    videos.value = await fetchVideos()
  } catch (e: any) {
    loadError.value = e.message ?? '動画の取得に失敗しました'
  } finally {
    loading.value = false
  }
}
onMounted(() => {
  load()
  // 管理者は一覧カードにも公開範囲のラベルを表示するため、フォームを開く前から読み込んでおく
  if (isSystemAdmin.value) ensureScopeOptionsLoaded()
})

// 公開範囲の選択肢（グループ・専門チーム）。管理者が動画登録フォームを開いた時に読み込む
const groups = ref<Group[]>([])
const specialTeams = ref<SpecialTeamDef[]>([])
const scopeOptionsLoaded = ref(false)
const ensureScopeOptionsLoaded = async () => {
  if (scopeOptionsLoaded.value) return
  const [g, t] = await Promise.all([fetchGroups().catch(() => []), fetchSpecialTeams().catch(() => [])])
  groups.value = g
  specialTeams.value = t
  scopeOptionsLoaded.value = true
}

const groupLabel = (id: string) => groups.value.find(g => g.id === id)?.name
  ?? specialTeams.value.find(t => `team:${t.id}` === id)?.name
  ?? id

// YouTubeの通常URL・短縮URLを埋め込み用URLに変換する（それ以外はそのままiframeに渡す）
const toEmbedUrl = (url: string): string => {
  const watchMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/)
  if (watchMatch) return `https://www.youtube.com/embed/${watchMatch[1]}`
  return url
}

// ── 新規動画登録（管理者のみ） ────────────────────────────────────
const showForm = ref(false)
const formTitle = ref('')
const formDescription = ref('')
const formUrl = ref('')
const formGenre = ref('')
const formVisibleGroupIds = ref<string[]>([])
const formMinTitleLevel = ref('')
const submitting = ref(false)

const openForm = async () => {
  await ensureScopeOptionsLoaded()
  showForm.value = true
}

const toggleVisibleGroup = (id: string) => {
  formVisibleGroupIds.value = formVisibleGroupIds.value.includes(id)
    ? formVisibleGroupIds.value.filter(g => g !== id)
    : [...formVisibleGroupIds.value, id]
}

const submitVideo = async () => {
  if (!formTitle.value.trim() || !formUrl.value.trim() || submitting.value) return
  submitting.value = true
  try {
    await createVideo({
      title: formTitle.value.trim(),
      description: formDescription.value.trim() || undefined,
      url: formUrl.value.trim(),
      genre: formGenre.value.trim() || undefined,
      visibleGroupIds: formVisibleGroupIds.value,
      minTitleLevel: formMinTitleLevel.value || undefined,
    })
    formTitle.value = ''
    formDescription.value = ''
    formUrl.value = ''
    formGenre.value = ''
    formVisibleGroupIds.value = []
    formMinTitleLevel.value = ''
    showForm.value = false
    await load()
  } finally {
    submitting.value = false
  }
}

const removeVideo = async (id: string) => {
  if (!confirm('この動画を削除しますか？')) return
  await deleteVideo(id)
  videos.value = videos.value.filter(v => v.id !== id)
}
</script>

<template>
  <div class="p-4 md:p-6 max-w-4xl mx-auto space-y-5">

    <div class="flex items-center gap-2 text-sm text-gray-400">
      <NuxtLink to="/tools">業務ツールアプリ</NuxtLink>
      <Icon name="heroicons:chevron-right" class="h-3 w-3" />
      <span class="text-gray-600">動画配信</span>
    </div>

    <div class="flex items-start justify-between gap-3">
      <div>
        <h1 class="text-xl font-bold text-gray-900">動画配信</h1>
      </div>
      <button v-if="isSystemAdmin && !showForm" type="button" class="btn-primary text-sm" @click="openForm">
        <Icon name="heroicons:plus" class="h-4 w-4" />
        動画を追加
      </button>
    </div>

    <!-- 新規登録フォーム -->
    <div v-if="showForm" class="card p-5 space-y-3">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">タイトル</label>
        <input v-model="formTitle" type="text" class="input-field" placeholder="タイトルを入力" />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">説明（任意）</label>
        <textarea v-model="formDescription" rows="2" class="input-field" placeholder="説明を入力" />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">動画URL（YouTube等）</label>
        <input v-model="formUrl" type="url" class="input-field" placeholder="https://www.youtube.com/watch?v=..." />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">動画ジャンル（任意）</label>
        <input v-model="formGenre" type="text" class="input-field" placeholder="例: 研修、商品説明" />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">公開範囲（グループ・専門チーム）</label>
        <p class="text-xs text-gray-400 mb-2">未選択の場合は全員に公開されます</p>
        <div class="flex flex-wrap gap-2">
          <label
            v-for="g in groups"
            :key="g.id"
            class="flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-sm cursor-pointer transition"
            :class="formVisibleGroupIds.includes(g.id) ? 'border-primary-300 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'"
          >
            <input type="checkbox" class="hidden" :checked="formVisibleGroupIds.includes(g.id)" @change="toggleVisibleGroup(g.id)" />
            {{ g.name }}
          </label>
          <label
            v-for="t in specialTeams"
            :key="t.id"
            class="flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-sm cursor-pointer transition"
            :class="formVisibleGroupIds.includes(`team:${t.id}`) ? 'border-primary-300 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'"
          >
            <input type="checkbox" class="hidden" :checked="formVisibleGroupIds.includes(`team:${t.id}`)" @change="toggleVisibleGroup(`team:${t.id}`)" />
            {{ t.name }}
          </label>
        </div>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">視聴に必要な最低タイトル（任意）</label>
        <select v-model="formMinTitleLevel" class="input-field">
          <option value="">制限なし</option>
          <option v-for="t in TITLE_OPTIONS" :key="t" :value="t">{{ t }}以上</option>
        </select>
      </div>
      <div class="flex justify-end gap-2">
        <button type="button" class="btn-secondary text-sm" @click="showForm = false">キャンセル</button>
        <button
          type="button"
          class="btn-primary text-sm"
          :disabled="!formTitle.trim() || !formUrl.trim() || submitting"
          @click="submitVideo"
        >
          <Icon v-if="submitting" name="heroicons:arrow-path" class="h-3.5 w-3.5 animate-spin mr-1" />
          登録する
        </button>
      </div>
    </div>

    <div v-if="loading" class="card p-12 text-center">
      <Icon name="heroicons:arrow-path" class="h-8 w-8 text-gray-300 mx-auto mb-2 animate-spin" />
      <p class="text-sm text-gray-400">読み込み中...</p>
    </div>

    <div v-else-if="loadError" class="card p-12 text-center">
      <p class="text-sm text-red-500">{{ loadError }}</p>
    </div>

    <div v-else-if="videos.length === 0" class="card p-12 text-center">
      <Icon name="heroicons:play-circle" class="h-10 w-10 text-gray-200 mx-auto mb-2" />
      <p class="text-sm text-gray-400">動画はまだありません</p>
    </div>

    <div v-else class="grid md:grid-cols-2 gap-4">
      <div v-for="v in videos" :key="v.id" class="card overflow-hidden">
        <div class="aspect-video bg-black">
          <iframe :src="toEmbedUrl(v.url)" class="w-full h-full" allowfullscreen frameborder="0" />
        </div>
        <div class="p-4">
          <div class="flex items-start justify-between gap-2">
            <p class="font-semibold text-gray-900 text-sm">{{ v.title }}</p>
            <button
              v-if="isSystemAdmin || v.createdByUid === currentUser?.uid"
              type="button"
              class="text-gray-300 hover:text-red-500 transition shrink-0"
              @click="removeVideo(v.id)"
            >
              <Icon name="heroicons:trash" class="h-4 w-4" />
            </button>
          </div>
          <p v-if="v.genre" class="inline-block mt-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">{{ v.genre }}</p>
          <p v-if="v.description" class="text-sm text-gray-500 mt-1 whitespace-pre-line">{{ v.description }}</p>
          <p v-if="isSystemAdmin && ((v.visibleGroupIds?.length ?? 0) > 0 || v.minTitleLevel)" class="text-xs text-gray-400 mt-1.5">
            公開範囲:
            <span v-if="(v.visibleGroupIds?.length ?? 0) > 0">{{ v.visibleGroupIds!.map(groupLabel).join('・') }}</span>
            <span v-else>全体</span>
            <span v-if="v.minTitleLevel">（{{ v.minTitleLevel }}以上）</span>
          </p>
        </div>
      </div>
    </div>

  </div>
</template>
