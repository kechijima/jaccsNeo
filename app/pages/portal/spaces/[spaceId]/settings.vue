<script setup lang="ts">
import type { SpaceForm } from '~/types/portal'
import { useSpaces } from '~/composables/useSpaces'

definePageMeta({ middleware: ['auth'] })

const route = useRoute()
const spaceId = computed(() => route.params.spaceId as string)
const { fetchSpace, updateSpace } = useSpaces()

const loading = ref(true)
const error = ref('')
const saving = ref(false)
const saved = ref(false)

const form = ref({
  name:        '',
  description: '',
  type:        'kumiai',
  headerImage: '',
})

onMounted(async () => {
  try {
    const s = await fetchSpace(spaceId.value)
    if (s) {
      form.value = {
        name:        s.name,
        description: s.description ?? '',
        type:        s.type,
        headerImage: s.headerImage ?? '',
      }
    }
  } catch (e: any) {
    error.value = e.message ?? 'スペース情報の取得に失敗しました'
  } finally {
    loading.value = false
  }
})

const handleSave = async () => {
  saving.value = true
  error.value = ''
  saved.value = false
  try {
    await updateSpace(spaceId.value, {
      name:        form.value.name,
      description: form.value.description,
      type:        form.value.type as SpaceForm['type'],
      headerImage: form.value.headerImage,
    })
    saved.value = true
    setTimeout(() => { saved.value = false }, 3000)
  } catch (e: any) {
    error.value = e.message ?? '保存に失敗しました'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="p-4 md:p-6 max-w-2xl mx-auto space-y-5">

    <!-- パンくず -->
    <div class="flex items-center gap-2 text-sm text-gray-400">
      <NuxtLink to="/portal">掲示板</NuxtLink>
      <Icon name="heroicons:chevron-right" class="h-3 w-3" />
      <NuxtLink :to="`/portal/spaces/${spaceId}`">{{ form.name }}</NuxtLink>
      <Icon name="heroicons:chevron-right" class="h-3 w-3" />
      <span class="text-gray-600">設定</span>
    </div>

    <h1 class="text-xl font-bold text-gray-900">スペース設定</h1>

    <!-- 保存完了メッセージ -->
    <div v-if="saved" class="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700">
      <Icon name="heroicons:check-circle" class="h-4 w-4 shrink-0" />
      設定を保存しました
    </div>
    <div v-if="error" class="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
      <Icon name="heroicons:exclamation-circle" class="h-4 w-4 shrink-0" />
      {{ error }}
    </div>

    <!-- 読み込み中 -->
    <div v-if="loading" class="card p-12 text-center">
      <Icon name="heroicons:arrow-path" class="h-8 w-8 text-gray-300 mx-auto mb-2 animate-spin" />
      <p class="text-sm text-gray-400">読み込み中...</p>
    </div>

    <!-- 基本設定 -->
    <form v-else class="card p-6 space-y-5" @submit.prevent="handleSave">
      <h2 class="font-semibold text-gray-900">基本情報</h2>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1.5">スペース名 <span class="text-red-500">*</span></label>
        <input v-model="form.name" type="text" class="input-field" required />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1.5">説明</label>
        <textarea v-model="form.description" rows="3" class="input-field" />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1.5">スペース種別</label>
        <select v-model="form.type" class="input-field">
          <option value="all">全体スペース</option>
          <option value="group">グループスペース</option>
          <option value="board">理事会スペース</option>
          <option value="kumiai">組合スペース</option>
          <option value="meeting">数字会議スペース</option>
          <option value="specialist">専門チームスペース</option>
          <option value="position">役職スペース</option>
        </select>
      </div>

      <!-- ヘッダー画像 -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1.5">ヘッダー画像URL</label>
        <input v-model="form.headerImage" type="url" class="input-field" placeholder="https://example.com/image.jpg" />
        <p class="text-xs text-gray-400 mt-1">スペースページの上部に表示されるカバー画像のURLを入力してください</p>
        <!-- プレビュー -->
        <div v-if="form.headerImage" class="mt-2 rounded-lg overflow-hidden h-24 border border-gray-200">
          <img :src="form.headerImage" alt="ヘッダープレビュー" class="w-full h-full object-cover" />
        </div>
        <div v-else class="mt-2 rounded-lg h-24 border border-gray-200 bg-gradient-to-r from-indigo-500 via-indigo-400 to-sky-400 flex items-center justify-center">
          <span class="text-xs text-white/70">画像未設定（グラデーション表示）</span>
        </div>
      </div>

      <div class="flex justify-end">
        <button type="submit" class="btn-primary" :disabled="saving">
          <Icon v-if="saving" name="heroicons:arrow-path" class="h-4 w-4 animate-spin mr-1" />
          {{ saving ? '保存中...' : '変更を保存する' }}
        </button>
      </div>
    </form>

  </div>
</template>
