<script setup lang="ts">
import { useVideos } from '~/composables/useVideos'
import type { ManagedVideo } from '~/types/tools'

definePageMeta({ middleware: ['auth'] })

const { fetchVideos, createVideo, deleteVideo } = useVideos()
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
onMounted(load)

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
const submitting = ref(false)

const submitVideo = async () => {
  if (!formTitle.value.trim() || !formUrl.value.trim() || submitting.value) return
  submitting.value = true
  try {
    await createVideo({
      title: formTitle.value.trim(),
      description: formDescription.value.trim() || undefined,
      url: formUrl.value.trim(),
    })
    formTitle.value = ''
    formDescription.value = ''
    formUrl.value = ''
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

    <div class="flex items-start justify-between gap-3">
      <div>
        <h1 class="text-xl font-bold text-gray-900">動画配信</h1>
        <p class="text-sm text-gray-500 mt-0.5">業務ツールアプリ</p>
      </div>
      <button v-if="isSystemAdmin" type="button" class="btn-primary text-sm" @click="showForm = !showForm">
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
          <p v-if="v.description" class="text-sm text-gray-500 mt-1 whitespace-pre-line">{{ v.description }}</p>
        </div>
      </div>
    </div>

  </div>
</template>
