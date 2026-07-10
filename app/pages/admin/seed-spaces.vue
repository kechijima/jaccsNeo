<script setup lang="ts">
import { useSpaces } from '~/composables/useSpaces'
import { MOCK_SPACES } from '~/data/mock'

definePageMeta({ middleware: ['auth', 'admin'] })

const { fetchAllSpaces, seedFromMock } = useSpaces()

const checking = ref(true)
const seeding  = ref(false)
const done     = ref(false)
const error    = ref('')
const existingCount = ref(0)
const result = ref<{ spaces: number; posts: number } | null>(null)

onMounted(async () => {
  try {
    existingCount.value = (await fetchAllSpaces()).length
  } catch (e: any) {
    error.value = e.message ?? 'Firestoreへの接続に失敗しました'
  } finally {
    checking.value = false
  }
})

const alreadySeeded = computed(() => existingCount.value > 0)

const runSeed = async () => {
  seeding.value = true
  error.value = ''
  try {
    result.value = await seedFromMock()
    done.value = true
  } catch (e: any) {
    error.value = e.message ?? '投入に失敗しました'
  } finally {
    seeding.value = false
  }
}
</script>

<template>
  <div class="p-4 md:p-6 max-w-3xl mx-auto space-y-6">

    <!-- パンくず -->
    <div class="flex items-center gap-2 text-sm text-gray-400">
      <NuxtLink to="/admin">管理者設定</NuxtLink>
      <Icon name="heroicons:chevron-right" class="h-3 w-3" />
      <span class="text-gray-600">スペースデータ投入</span>
    </div>

    <!-- ヘッダー -->
    <div>
      <h1 class="text-xl font-bold text-gray-900 flex items-center gap-2">
        <Icon name="heroicons:chat-bubble-left-right" class="h-6 w-6 text-primary-600" />
        掲示板スペースデータ投入（Firestore）
      </h1>
      <p class="text-sm text-gray-500 mt-0.5">
        全体スペース・Reteraceグループ活動報告など既存{{ MOCK_SPACES.length }}スペースと、その投稿をFirestoreへ一括投入します
      </p>
    </div>

    <!-- 状態確認中 -->
    <div v-if="checking" class="card p-8 text-center">
      <Icon name="heroicons:arrow-path" class="h-8 w-8 text-gray-300 mx-auto mb-2 animate-spin" />
      <p class="text-sm text-gray-400">Firestoreの状態を確認中...</p>
    </div>

    <template v-else>
      <!-- エラー -->
      <div v-if="error" class="rounded-lg bg-red-50 border border-red-200 px-4 py-3 flex items-start gap-3">
        <Icon name="heroicons:exclamation-circle" class="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
        <p class="text-sm text-red-700">{{ error }}</p>
      </div>

      <!-- 投入済み -->
      <div v-else-if="alreadySeeded && !done" class="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 flex items-start gap-3">
        <Icon name="heroicons:information-circle" class="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
        <div class="text-sm text-blue-800">
          <p class="font-semibold">すでにFirestoreへ投入済みです（現在 {{ existingCount }}スペース）</p>
          <p class="mt-0.5 text-blue-600">
            再実行すると、同じIDのスペース・投稿がこのページのデータ内容で上書きされます。すでにアプリ上で編集した内容がある場合は失われるためご注意ください。
          </p>
        </div>
      </div>

      <!-- 完了 -->
      <div v-if="done" class="rounded-lg bg-green-50 border border-green-200 px-4 py-3 flex items-start gap-3">
        <Icon name="heroicons:check-circle" class="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
        <p class="text-sm text-green-700">投入が完了しました（スペース {{ result?.spaces }}件・投稿 {{ result?.posts }}件）</p>
      </div>

      <!-- 注意 -->
      <div class="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 flex items-start gap-3">
        <Icon name="heroicons:exclamation-triangle" class="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
        <p class="text-sm text-amber-800">
          この操作は通常、運用開始前に一度だけ実行します。実行したユーザーが各スペースの管理者・メンバーとして登録されます。
        </p>
      </div>

      <!-- 実行ボタン -->
      <div class="flex gap-3">
        <button
          class="btn-primary flex items-center gap-2"
          :disabled="seeding"
          @click="runSeed"
        >
          <Icon v-if="seeding" name="heroicons:arrow-path" class="h-4 w-4 animate-spin" />
          <Icon v-else name="heroicons:arrow-up-tray" class="h-4 w-4" />
          {{ seeding ? '投入中...' : alreadySeeded ? '再投入する' : 'Firestoreへ投入する' }}
        </button>
        <NuxtLink v-if="done" to="/portal" class="btn-secondary flex items-center gap-2">
          <Icon name="heroicons:chat-bubble-left-right" class="h-4 w-4" />
          掲示板で確認
        </NuxtLink>
      </div>
    </template>

  </div>
</template>
