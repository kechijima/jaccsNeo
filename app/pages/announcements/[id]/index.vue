<script setup lang="ts">
import { useAnnouncementStore } from '~/composables/useAnnouncementStore'
import { ANNOUNCEMENT_SCOPE_LABELS, ANNOUNCEMENT_SCOPE_COLORS } from '~/types/announcement'

definePageMeta({ middleware: ['auth'] })

const route = useRoute()
const id = computed(() => route.params.id as string)

const store = useAnnouncementStore()
const announcement = store.getById(id)

const loading = ref(true)
const error = ref('')

onMounted(async () => {
  try {
    await store.fetchAll()
    if (!announcement.value) error.value = 'お知らせが見つかりませんでした'
  } catch (e: any) {
    error.value = e.message ?? 'お知らせの取得に失敗しました'
  } finally {
    loading.value = false
  }
})

const fmt = (d: Date) => d.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
</script>

<template>
  <div class="p-4 md:p-6 max-w-3xl mx-auto space-y-5">

    <!-- パンくず -->
    <div class="flex items-center gap-2 text-sm text-gray-400">
      <NuxtLink to="/dashboard">ダッシュボード</NuxtLink>
      <Icon name="heroicons:chevron-right" class="h-3 w-3" />
      <span class="text-gray-600">お知らせ</span>
    </div>

    <!-- 読み込み中 -->
    <div v-if="loading" class="card p-12 text-center">
      <Icon name="heroicons:arrow-path" class="h-8 w-8 text-gray-300 mx-auto mb-2 animate-spin" />
      <p class="text-sm text-gray-400">読み込み中...</p>
    </div>

    <!-- エラー -->
    <div v-else-if="error || !announcement" class="card p-12 text-center">
      <Icon name="heroicons:exclamation-circle" class="h-8 w-8 text-red-300 mx-auto mb-2" />
      <p class="text-sm text-red-500">{{ error }}</p>
      <NuxtLink to="/dashboard" class="mt-4 inline-block text-sm text-primary-600 hover:underline">ダッシュボードに戻る</NuxtLink>
    </div>

    <template v-else>
      <div class="card overflow-hidden">
        <img v-if="announcement.imageUrl" :src="announcement.imageUrl" alt="" class="w-full max-h-72 object-cover" />

        <div class="p-5 md:p-6 space-y-4">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="badge text-xs" :class="ANNOUNCEMENT_SCOPE_COLORS[announcement.scope]">
              {{ ANNOUNCEMENT_SCOPE_LABELS[announcement.scope] }}
            </span>
            <span class="text-xs text-gray-400">{{ fmt(announcement.publishedAt) }}</span>
          </div>

          <h1 class="text-xl md:text-2xl font-bold text-gray-900">{{ announcement.title }}</h1>

          <p class="text-xs text-gray-400">投稿者: {{ announcement.authorName }}</p>

          <div class="prose prose-sm max-w-none text-gray-800 pt-2 border-t border-gray-100" v-html="announcement.body" />
        </div>
      </div>
    </template>

  </div>
</template>
