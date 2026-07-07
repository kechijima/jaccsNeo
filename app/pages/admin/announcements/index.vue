<script setup lang="ts">
import { useAnnouncementStore } from '~/composables/useAnnouncementStore'
import { ANNOUNCEMENT_SCOPE_LABELS, ANNOUNCEMENT_SCOPE_COLORS } from '~/types/announcement'
import type { Announcement, AnnouncementScope } from '~/types/announcement'

definePageMeta({ middleware: ['auth', 'admin'] })

const { user } = useCurrentUser()
const store = useAnnouncementStore()

const sorted = computed(() =>
  [...store.announcements.value].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()),
)

// ── 作成・編集モーダル ────────────────────────────────────────────────
const showModal = ref(false)
const editingId  = ref<string | null>(null)
const form = reactive({
  title: '',
  body: '',
  scope: 'all' as AnnouncementScope,
  isPublished: true,
})

const resetForm = () => {
  form.title = ''
  form.body = ''
  form.scope = 'all'
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
  form.scope = a.scope
  form.isPublished = a.isPublished
  showModal.value = true
}

const saving = ref(false)
const handleSave = async () => {
  if (!form.title.trim() || !form.body.trim()) return
  saving.value = true
  await new Promise(r => setTimeout(r, 300))
  if (editingId.value) {
    store.update(editingId.value, { ...form })
  } else {
    store.create({
      ...form,
      authorName: user.value?.displayName ?? '管理者',
      publishedAt: new Date(),
    })
  }
  saving.value = false
  showModal.value = false
  resetForm()
}

const handleDelete = (a: Announcement) => {
  if (!confirm(`「${a.title}」を削除しますか？`)) return
  store.remove(a.id)
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
        <p class="text-sm text-gray-500 mt-0.5">ダッシュボードに表示するお知らせをグループ別に公開します</p>
      </div>
      <button class="btn-primary text-sm flex items-center gap-1.5" @click="openCreate">
        <Icon name="heroicons:plus" class="h-4 w-4" />
        新規作成
      </button>
    </div>

    <!-- 一覧 -->
    <div v-if="sorted.length === 0" class="card p-12 text-center">
      <Icon name="heroicons:megaphone" class="h-10 w-10 text-gray-200 mx-auto mb-2" />
      <p class="text-gray-400 text-sm">お知らせはまだありません</p>
    </div>

    <div v-else class="space-y-3">
      <div v-for="a in sorted" :key="a.id" class="card p-4">
        <div class="flex items-start justify-between gap-3 flex-wrap">
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
            <p class="text-sm text-gray-500 mt-1 line-clamp-2">{{ a.body }}</p>
            <p class="text-xs text-gray-400 mt-1">投稿者: {{ a.authorName }}</p>
          </div>
          <div class="flex items-center gap-1.5 shrink-0">
            <button
              class="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
              :title="a.isPublished ? '非公開にする' : '公開する'"
              @click="store.togglePublish(a.id)"
            >
              <Icon :name="a.isPublished ? 'heroicons:eye-slash' : 'heroicons:eye'" class="h-4 w-4" />
            </button>
            <button
              class="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-primary-600 transition"
              title="編集"
              @click="openEdit(a)"
            >
              <Icon name="heroicons:pencil" class="h-4 w-4" />
            </button>
            <button
              class="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 transition"
              title="削除"
              @click="handleDelete(a)"
            >
              <Icon name="heroicons:trash" class="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 作成・編集モーダル -->
    <Teleport to="body">
      <div
        v-if="showModal"
        class="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40"
        @click.self="showModal = false"
      >
        <div class="bg-white w-full md:max-w-lg rounded-t-2xl md:rounded-2xl p-5 space-y-4 shadow-xl">
          <div class="flex items-center justify-between">
            <h3 class="font-bold text-gray-900">{{ editingId ? 'お知らせを編集' : 'お知らせを作成' }}</h3>
            <button class="p-1.5 rounded-lg hover:bg-gray-100 transition" @click="showModal = false">
              <Icon name="heroicons:x-mark" class="h-5 w-5 text-gray-500" />
            </button>
          </div>

          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1.5">タイトル</label>
            <input v-model="form.title" type="text" class="input-field text-sm" placeholder="お知らせのタイトル" />
          </div>

          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1.5">本文</label>
            <textarea v-model="form.body" rows="5" class="input-field text-sm resize-none" placeholder="お知らせの本文を入力してください..." />
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
              :disabled="!form.title.trim() || !form.body.trim() || saving"
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
