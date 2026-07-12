<script setup lang="ts">
import { useAppDefs } from '~/composables/useAppDefs'
import { useUsers } from '~/composables/useUsers'
import type { AppUser } from '~/types/user'

definePageMeta({ middleware: ['auth', 'admin'] })

const { appDefs, loading, fetchAll, create, duplicateFrom } = useAppDefs()
const { fetchUsers } = useUsers()

const loadError = ref('')
const users = ref<AppUser[]>([])

onMounted(async () => {
  try {
    await fetchAll()
  } catch (e: any) {
    loadError.value = e.message ?? 'アプリ一覧の取得に失敗しました'
  }
  users.value = await fetchUsers().catch(() => [])
})

const userName = (uid?: string) => users.value.find(u => u.uid === uid)?.displayName ?? ''

// ── 新規作成モーダル ──────────────────────────────────────────────────
const showCreate = ref(false)
const createStep = ref<'name' | 'source'>('name')
const createName = ref('')
const createMode = ref<'scratch' | 'duplicate'>('scratch')
const duplicateSourceId = ref('')
const createError = ref('')
const creating = ref(false)

const openCreate = () => {
  createStep.value = 'name'
  createName.value = ''
  createMode.value = 'scratch'
  duplicateSourceId.value = ''
  createError.value = ''
  showCreate.value = true
}

const goToSourceStep = () => {
  if (!createName.value.trim()) { createError.value = 'アプリ名を入力してください'; return }
  createError.value = ''
  createStep.value = 'source'
}

const submitCreate = async () => {
  if (createMode.value === 'duplicate' && !duplicateSourceId.value) {
    createError.value = '複製元のアプリを選択してください'
    return
  }
  creating.value = true
  createError.value = ''
  try {
    const id = createMode.value === 'duplicate'
      ? await duplicateFrom(duplicateSourceId.value, createName.value.trim())
      : await create({ name: createName.value.trim(), fields: [], staffUids: [] })
    showCreate.value = false
    await navigateTo(`/admin/apps/${id}`)
  } catch (e: any) {
    createError.value = e.message ?? '作成に失敗しました'
  } finally {
    creating.value = false
  }
}
</script>

<template>
  <div class="p-4 md:p-6 max-w-5xl mx-auto space-y-5">

    <!-- パンくず -->
    <div class="flex items-center gap-2 text-sm text-gray-400">
      <NuxtLink to="/admin">管理者設定</NuxtLink>
      <Icon name="heroicons:chevron-right" class="h-3 w-3" />
      <span class="text-gray-600">アプリ管理</span>
    </div>

    <!-- ヘッダー -->
    <div class="flex items-start justify-between gap-3">
      <div>
        <h1 class="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Icon name="heroicons:squares-2x2" class="h-6 w-6 text-primary-600" />
          アプリ管理
        </h1>
        <p class="text-sm text-gray-500 mt-0.5">フォームのフィールド設計・責任者/担当者の設定</p>
      </div>
      <button class="btn-primary text-sm flex items-center gap-1.5" @click="openCreate">
        <Icon name="heroicons:plus" class="h-4 w-4" />
        新規作成
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

    <!-- 空の状態 -->
    <div v-else-if="appDefs.length === 0" class="card p-16 text-center">
      <Icon name="heroicons:squares-plus" class="h-12 w-12 text-gray-200 mx-auto mb-3" />
      <p class="text-gray-400 font-medium">まだアプリが作成されていません</p>
      <button class="btn-primary text-sm mt-4" @click="openCreate">最初のアプリを作成する</button>
    </div>

    <!-- アプリ一覧 -->
    <div v-else class="grid sm:grid-cols-2 gap-4">
      <NuxtLink
        v-for="app in appDefs"
        :key="app.id"
        :to="`/admin/apps/${app.id}`"
        class="card p-5 hover:shadow-md transition"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="font-semibold text-gray-900 truncate">{{ app.name }}</p>
            <p class="text-xs text-gray-400 mt-0.5">{{ app.fields.length }}項目</p>
          </div>
          <Icon name="heroicons:chevron-right" class="h-5 w-5 text-gray-300 shrink-0" />
        </div>
        <p v-if="app.description" class="text-xs text-gray-500 mt-2 line-clamp-2">{{ app.description }}</p>
        <div class="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
          <span class="flex items-center gap-1">
            <Icon name="heroicons:user" class="h-3.5 w-3.5 text-gray-300" />
            責任者: {{ userName(app.ownerUid) || '未設定' }}
          </span>
          <span v-if="app.staffUids.length > 0" class="flex items-center gap-1">
            <Icon name="heroicons:users" class="h-3.5 w-3.5 text-gray-300" />
            担当者 {{ app.staffUids.length }}名
          </span>
        </div>
      </NuxtLink>
    </div>

    <!-- 新規作成モーダル -->
    <Teleport to="body">
      <div
        v-if="showCreate"
        class="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40"
        @click.self="showCreate = false"
      >
        <div class="bg-white w-full md:max-w-md rounded-t-2xl md:rounded-2xl p-6 space-y-4 shadow-xl max-h-[85vh] overflow-y-auto">
          <div class="flex items-center justify-between">
            <h3 class="font-bold text-gray-900">アプリを新規作成</h3>
            <button class="p-1.5 hover:bg-gray-100 rounded-lg" @click="showCreate = false">
              <Icon name="heroicons:x-mark" class="h-5 w-5 text-gray-500" />
            </button>
          </div>

          <div v-if="createError" class="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            <Icon name="heroicons:exclamation-circle" class="mt-0.5 h-4 w-4 shrink-0" />
            {{ createError }}
          </div>

          <!-- ステップ1: アプリ名 -->
          <template v-if="createStep === 'name'">
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">アプリ名 <span class="text-red-500">*</span></label>
              <input
                v-model="createName"
                type="text"
                placeholder="例: 自動車保険アプリ"
                class="input-field"
                @keydown.enter="goToSourceStep"
              />
            </div>
            <div class="flex gap-3 pt-2">
              <button class="flex-1 btn-secondary" @click="showCreate = false">キャンセル</button>
              <button class="flex-1 btn-primary" @click="goToSourceStep">次へ</button>
            </div>
          </template>

          <!-- ステップ2: 作成方法 -->
          <template v-else>
            <p class="text-sm text-gray-600">「{{ createName }}」をどのように作成しますか？</p>
            <div class="space-y-2">
              <button
                type="button"
                class="w-full flex items-start gap-3 rounded-lg border p-3 text-left transition"
                :class="createMode === 'scratch' ? 'border-primary-400 bg-primary-50' : 'border-gray-200 hover:border-gray-300'"
                @click="createMode = 'scratch'"
              >
                <Icon name="heroicons:document-plus" class="h-5 w-5 text-primary-500 shrink-0 mt-0.5" />
                <span>
                  <span class="block text-sm font-medium text-gray-900">最初から作成</span>
                  <span class="block text-xs text-gray-500 mt-0.5">空の状態からフィールドを設計します</span>
                </span>
              </button>
              <button
                type="button"
                class="w-full flex items-start gap-3 rounded-lg border p-3 text-left transition"
                :class="createMode === 'duplicate' ? 'border-primary-400 bg-primary-50' : 'border-gray-200 hover:border-gray-300'"
                @click="createMode = 'duplicate'"
              >
                <Icon name="heroicons:document-duplicate" class="h-5 w-5 text-primary-500 shrink-0 mt-0.5" />
                <span>
                  <span class="block text-sm font-medium text-gray-900">既存アプリを複製</span>
                  <span class="block text-xs text-gray-500 mt-0.5">既にあるアプリのフィールド構成をコピーして作成します</span>
                </span>
              </button>
            </div>

            <div v-if="createMode === 'duplicate'">
              <label class="block text-xs font-medium text-gray-600 mb-1">複製元のアプリ</label>
              <select v-model="duplicateSourceId" class="input-field text-sm">
                <option value="">選択してください</option>
                <option v-for="app in appDefs" :key="app.id" :value="app.id">{{ app.name }}</option>
              </select>
            </div>

            <div class="flex gap-3 pt-2">
              <button class="flex-1 btn-secondary" @click="createStep = 'name'">戻る</button>
              <button class="flex-1 btn-primary" :disabled="creating" @click="submitCreate">
                <Icon v-if="creating" name="heroicons:arrow-path" class="h-4 w-4 animate-spin mr-1" />
                作成する
              </button>
            </div>
          </template>
        </div>
      </div>
    </Teleport>

  </div>
</template>
