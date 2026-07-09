<script setup lang="ts">
import { useAnnouncementStore } from '~/composables/useAnnouncementStore'
import { useStorage } from '~/composables/useStorage'
import { ANNOUNCEMENT_SCOPE_LABELS, ANNOUNCEMENT_SCOPE_COLORS } from '~/types/announcement'
import type { Announcement, AnnouncementScope } from '~/types/announcement'

definePageMeta({ middleware: ['auth', 'admin'] })

const { user } = useCurrentUser()
const store = useAnnouncementStore()
const { uploadFile } = useStorage()

const loading = ref(true)
const loadError = ref('')

onMounted(async () => {
  try {
    await store.fetchAll()
  } catch (e: any) {
    loadError.value = e.message ?? 'お知らせの取得に失敗しました'
  } finally {
    loading.value = false
  }
})

// ── グループタブ ──────────────────────────────────────────────────────
const TABS: { key: AnnouncementScope; label: string }[] = [
  { key: 'all',      label: '全体' },
  { key: 'reterace', label: 'Reterace' },
  { key: 'miraito',  label: 'Miraito' },
  { key: 'asset',    label: 'Asset' },
]
const activeTab = ref<AnnouncementScope>('all')

const tabCount = (scope: AnnouncementScope) =>
  store.announcements.value.filter(a => a.scope === scope).length

const filtered = computed(() =>
  [...store.announcements.value]
    .filter(a => a.scope === activeTab.value)
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()),
)

// ── 作成・編集モーダル ────────────────────────────────────────────────
const showModal = ref(false)
const editingId  = ref<string | null>(null)
const form = reactive({
  title: '',
  body: '',
  imageUrl: '',
  scope: 'all' as AnnouncementScope,
  isPublished: true,
})

const resetForm = () => {
  form.title = ''
  form.body = ''
  form.imageUrl = ''
  form.scope = activeTab.value
  form.isPublished = true
  editingId.value = null
}

const openCreate = () => {
  resetForm()
  showModal.value = true
}

const openEdit = (a: Announcement) => {
  editingId.value = a.id
  form.title = a.title
  form.body = a.body
  form.imageUrl = a.imageUrl ?? ''
  form.scope = a.scope
  form.isPublished = a.isPublished
  showModal.value = true
}

// ── 画像アップロード ──────────────────────────────────────────────────
const imageInputRef = ref<HTMLInputElement>()
const uploadingImage = ref(false)
const imageError = ref('')

const handleImageSelect = async (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  uploadingImage.value = true
  imageError.value = ''
  try {
    const path = `announcements/${Date.now()}-${file.name}`
    form.imageUrl = await uploadFile(path, file)
  } catch (e: any) {
    imageError.value = e.message ?? '画像のアップロードに失敗しました'
  } finally {
    uploadingImage.value = false
    if (imageInputRef.value) imageInputRef.value.value = ''
  }
}

const removeImage = () => { form.imageUrl = '' }

// ── 保存・削除 ────────────────────────────────────────────────────────
const saving = ref(false)
const saveError = ref('')

const handleSave = async () => {
  if (!form.title.trim() || !form.body.trim()) return
  saving.value = true
  saveError.value = ''
  try {
    const payload = {
      title: form.title,
      body: form.body,
      imageUrl: form.imageUrl || undefined,
      scope: form.scope,
      isPublished: form.isPublished,
    }
    if (editingId.value) {
      await store.update(editingId.value, payload)
    } else {
      await store.create({
        ...payload,
        authorName: user.value?.displayName ?? '管理者',
        publishedAt: new Date(),
      })
    }
    showModal.value = false
    resetForm()
  } catch (e: any) {
    saveError.value = e.message ?? '保存に失敗しました'
  } finally {
    saving.value = false
  }
}

const deletingId = ref<string | null>(null)
const handleDelete = async (a: Announcement) => {
  if (!confirm(`「${a.title}」を削除しますか？`)) return
  deletingId.value = a.id
  try {
    await store.remove(a.id)
  } finally {
    deletingId.value = null
  }
}

const togglingId = ref<string | null>(null)
const handleTogglePublish = async (a: Announcement) => {
  togglingId.value = a.id
  try {
    await store.togglePublish(a.id)
  } finally {
    togglingId.value = null
  }
}

const fmt = (d: Date) => d.toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
</script>

<template>
  <div class="p-4 md:p-6 max-w-5xl mx-auto space-y-6">

    <!-- パンくず -->
    <div class="flex items-center gap-2 text-sm text-gray-400">
      <NuxtLink to="/admin">管理者設定</NuxtLink>
      <Icon name="heroicons:chevron-right" class="h-3 w-3" />
      <span class="text-gray-600">お知らせ管理</span>
    </div>

    <!-- ヘッダー -->
    <div class="flex items-start justify-between gap-3 flex-wrap">
      <div>
        <h1 class="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Icon name="heroicons:megaphone" class="h-6 w-6 text-primary-600" />
          お知らせ管理
        </h1>
        <p class="text-sm text-gray-500 mt-0.5">掲示板とは別に、ダッシュボードに表示するお知らせをグループ別に公開します</p>
      </div>
      <button class="btn-primary text-sm flex items-center gap-1.5" @click="openCreate">
        <Icon name="heroicons:plus" class="h-4 w-4" />
        新規作成
      </button>
    </div>

    <!-- グループタブ -->
    <div class="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-hide">
      <button
        v-for="tab in TABS"
        :key="tab.key"
        class="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors shrink-0"
        :class="activeTab === tab.key ? 'bg-primary-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100'"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
        <span
          class="text-xs rounded-full px-1.5 py-0.5 font-normal"
          :class="activeTab === tab.key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'"
        >{{ tabCount(tab.key) }}</span>
      </button>
    </div>

    <!-- 読み込み中 -->
    <div v-if="loading" class="card p-12 text-center">
      <Icon name="heroicons:arrow-path" class="h-8 w-8 text-gray-300 mx-auto mb-2 animate-spin" />
      <p class="text-sm text-gray-400">読み込み中...</p>
    </div>

    <!-- エラー -->
    <div v-else-if="loadError" class="card p-12 text-center">
      <Icon name="heroicons:exclamation-circle" class="h-8 w-8 text-red-300 mx-auto mb-2" />
      <p class="text-sm text-red-500">{{ loadError }}</p>
    </div>

    <!-- 一覧 -->
    <template v-else>
      <div v-if="filtered.length === 0" class="card p-12 text-center">
        <Icon name="heroicons:megaphone" class="h-10 w-10 text-gray-200 mx-auto mb-2" />
        <p class="text-gray-400 text-sm">{{ ANNOUNCEMENT_SCOPE_LABELS[activeTab] }}向けのお知らせはまだありません</p>
      </div>

      <div v-else class="space-y-3">
        <div v-for="a in filtered" :key="a.id" class="card p-4">
          <div class="flex items-start gap-4 flex-wrap">
            <img v-if="a.imageUrl" :src="a.imageUrl" alt="" class="h-16 w-16 rounded-lg object-cover shrink-0" />
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2 flex-wrap mb-1">
                <span class="badge text-xs" :class="ANNOUNCEMENT_SCOPE_COLORS[a.scope]">{{ ANNOUNCEMENT_SCOPE_LABELS[a.scope] }}</span>
                <span
                  class="badge text-xs"
                  :class="a.isPublished ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'"
                >{{ a.isPublished ? '公開中' : '下書き' }}</span>
                <span class="text-xs text-gray-400">{{ fmt(a.publishedAt) }}</span>
              </div>
              <p class="font-semibold text-gray-900">{{ a.title }}</p>
              <div class="text-sm text-gray-500 mt-1 line-clamp-2 prose prose-sm max-w-none" v-html="a.body" />
              <p class="text-xs text-gray-400 mt-1">投稿者: {{ a.authorName }}</p>
            </div>
            <div class="flex items-center gap-1.5 shrink-0">
              <NuxtLink
                :to="`/announcements/${a.id}`"
                class="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-primary-600 transition"
                title="詳細ページを見る"
              >
                <Icon name="heroicons:arrow-top-right-on-square" class="h-4 w-4" />
              </NuxtLink>
              <button
                class="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition disabled:opacity-40"
                :disabled="togglingId === a.id"
                :title="a.isPublished ? '非公開にする' : '公開する'"
                @click="handleTogglePublish(a)"
              >
                <Icon v-if="togglingId === a.id" name="heroicons:arrow-path" class="h-4 w-4 animate-spin" />
                <Icon v-else :name="a.isPublished ? 'heroicons:eye-slash' : 'heroicons:eye'" class="h-4 w-4" />
              </button>
              <button
                class="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-primary-600 transition"
                title="編集"
                @click="openEdit(a)"
              >
                <Icon name="heroicons:pencil" class="h-4 w-4" />
              </button>
              <button
                class="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 transition disabled:opacity-40"
                :disabled="deletingId === a.id"
                title="削除"
                @click="handleDelete(a)"
              >
                <Icon v-if="deletingId === a.id" name="heroicons:arrow-path" class="h-4 w-4 animate-spin" />
                <Icon v-else name="heroicons:trash" class="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- 作成・編集モーダル -->
    <Teleport to="body">
      <div
        v-if="showModal"
        class="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 overflow-y-auto py-6"
        @click.self="showModal = false"
      >
        <div class="bg-white w-full md:max-w-lg rounded-t-2xl md:rounded-2xl p-5 space-y-4 shadow-xl my-auto">
          <div class="flex items-center justify-between">
            <h3 class="font-bold text-gray-900">{{ editingId ? 'お知らせを編集' : 'お知らせを作成' }}</h3>
            <button class="p-1.5 rounded-lg hover:bg-gray-100 transition" @click="showModal = false">
              <Icon name="heroicons:x-mark" class="h-5 w-5 text-gray-500" />
            </button>
          </div>

          <div v-if="saveError" class="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            <Icon name="heroicons:exclamation-circle" class="mt-0.5 h-4 w-4 shrink-0" />
            {{ saveError }}
          </div>

          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1.5">タイトル</label>
            <input v-model="form.title" type="text" class="input-field text-sm" placeholder="お知らせのタイトル" />
          </div>

          <!-- 画像 -->
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1.5">画像</label>
            <div v-if="form.imageUrl" class="relative w-full h-32 rounded-lg overflow-hidden border border-gray-200">
              <img :src="form.imageUrl" alt="" class="w-full h-full object-cover" />
              <button
                type="button"
                class="absolute top-1.5 right-1.5 rounded-full bg-black/50 p-1 text-white hover:bg-black/70 transition"
                @click="removeImage"
              >
                <Icon name="heroicons:x-mark" class="h-4 w-4" />
              </button>
            </div>
            <div v-else-if="uploadingImage" class="flex items-center justify-center rounded-lg border-2 border-dashed border-primary-200 bg-primary-50 p-6 text-sm text-primary-500">
              <Icon name="heroicons:arrow-path" class="h-4 w-4 animate-spin mr-1.5" />
              アップロード中...
            </div>
            <div v-else class="flex items-center justify-center rounded-lg border-2 border-dashed border-gray-200 p-6 text-sm text-gray-400 hover:border-primary-300 transition">
              <label class="cursor-pointer flex flex-col items-center gap-1 w-full">
                <Icon name="heroicons:photo" class="h-6 w-6" />
                画像を選択（任意）
                <input ref="imageInputRef" type="file" accept="image/*" class="hidden" @change="handleImageSelect" />
              </label>
            </div>
            <p v-if="imageError" class="text-xs text-red-500 mt-1">{{ imageError }}</p>
          </div>

          <!-- 案内文（リッチエディター） -->
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1.5">案内文</label>
            <RichTextEditor
              v-model="form.body"
              placeholder="お知らせの本文を入力してください..."
              class="min-h-[140px]"
            />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1.5">公開範囲</label>
              <select v-model="form.scope" class="input-field text-sm">
                <option v-for="(label, key) in ANNOUNCEMENT_SCOPE_LABELS" :key="key" :value="key">{{ label }}</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1.5">公開状態</label>
              <select v-model="form.isPublished" class="input-field text-sm">
                <option :value="true">公開する</option>
                <option :value="false">下書き（非公開）</option>
              </select>
            </div>
          </div>

          <div class="flex gap-3 pt-2">
            <button class="flex-1 btn-secondary" @click="showModal = false">キャンセル</button>
            <button
              class="flex-1 btn-primary"
              :disabled="!form.title.trim() || !form.body.trim() || saving || uploadingImage"
              @click="handleSave"
            >
              <Icon v-if="saving" name="heroicons:arrow-path" class="h-4 w-4 animate-spin mr-1" />
              保存する
            </button>
          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>
