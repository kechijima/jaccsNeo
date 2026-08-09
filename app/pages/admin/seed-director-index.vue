<script setup lang="ts">
import { useDirectorIndex } from '~/composables/useDirectorIndex'
import { DIRECTOR_INDEX_DATA } from '~/data/directorIndexData'

definePageMeta({ middleware: ['auth', 'admin'] })

const { fetchAll, seedFromStatic, cleanupWithdrawnMembers, rows } = useDirectorIndex()

const checking = ref(true)
const seeding  = ref(false)
const done     = ref(false)
const error    = ref('')

onMounted(async () => {
  try {
    await fetchAll()
  } catch (e: any) {
    error.value = e.message ?? 'Firestoreへの接続に失敗しました'
  } finally {
    checking.value = false
  }
})

const alreadySeeded = computed(() => rows.value.length > 0)

const runSeed = async () => {
  seeding.value = true
  error.value = ''
  try {
    await seedFromStatic()
    done.value = true
  } catch (e: any) {
    error.value = e.message ?? '投入に失敗しました'
  } finally {
    seeding.value = false
  }
}

// ── 脱退済みメンバーのクリーンアップ ─────────────────────────────────────
// この機能を追加する前に脱退承認された組合員が、ディレクター逆引きに
// 残ったままになっている場合の一括除去
const cleaning = ref(false)
const cleanupResult = ref<{ removedNames: string[]; touchedRows: number } | null>(null)
const cleanupError = ref('')

const runCleanup = async () => {
  cleaning.value = true
  cleanupError.value = ''
  cleanupResult.value = null
  try {
    cleanupResult.value = await cleanupWithdrawnMembers()
  } catch (e: any) {
    cleanupError.value = e.message ?? '除去処理に失敗しました'
  } finally {
    cleaning.value = false
  }
}
</script>

<template>
  <div class="p-4 md:p-6 max-w-3xl mx-auto space-y-6">

    <!-- パンくず -->
    <div class="flex items-center gap-2 text-sm text-gray-400">
      <NuxtLink to="/admin">管理者設定</NuxtLink>
      <Icon name="heroicons:chevron-right" class="h-3 w-3" />
      <span class="text-gray-600">ディレクター検索インデックス投入</span>
    </div>

    <!-- ヘッダー -->
    <div>
      <h1 class="text-xl font-bold text-gray-900 flex items-center gap-2">
        <Icon name="heroicons:magnifying-glass" class="h-6 w-6 text-primary-600" />
        ディレクター検索インデックス投入（Firestore）
      </h1>
      <p class="text-sm text-gray-500 mt-0.5">
        ディレクター（サポート者）×組合×役割ごとの担当メンバー検索インデックス（{{ DIRECTOR_INDEX_DATA.length }}件）をFirestoreへ一括投入します。
        投入後はチーム画面のメンバー一覧からディレクター名で逆引き検索できます。
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
          <p class="font-semibold">すでにFirestoreへ投入済みです（現在 {{ rows.length }}件）</p>
          <p class="mt-0.5 text-blue-600">再実行すると、Excel取り込み時点の内容で上書きされます。</p>
        </div>
      </div>

      <!-- 完了 -->
      <div v-if="done" class="rounded-lg bg-green-50 border border-green-200 px-4 py-3 flex items-start gap-3">
        <Icon name="heroicons:check-circle" class="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
        <p class="text-sm text-green-700">投入が完了しました（{{ rows.length }}件）</p>
      </div>

      <!-- 注意 -->
      <div class="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 flex items-start gap-3">
        <Icon name="heroicons:exclamation-triangle" class="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
        <p class="text-sm text-amber-800">
          この操作は通常、運用開始前に一度だけ実行します。2026年7月時点（202607）のスナップショットです。
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
        <NuxtLink v-if="done" to="/team/members" class="btn-secondary flex items-center gap-2">
          <Icon name="heroicons:users" class="h-4 w-4" />
          メンバー一覧で確認
        </NuxtLink>
      </div>

      <!-- 脱退済みメンバーのクリーンアップ -->
      <div class="border-t border-gray-100 pt-6 mt-2 space-y-3">
        <div>
          <h2 class="font-semibold text-gray-900 flex items-center gap-2">
            <Icon name="heroicons:user-minus" class="h-5 w-5 text-primary-600" />
            脱退済みメンバーのクリーンアップ
          </h2>
          <p class="text-sm text-gray-500 mt-0.5">
            組合員の脱退承認時にディレクター逆引きから自動的に除外する機能を追加する前に脱退承認されたメンバーが、
            担当メンバー一覧に残ったままになっている場合があります。このボタンで一括除去できます（何度実行しても問題ありません）。
          </p>
        </div>

        <div v-if="cleanupError" class="rounded-lg bg-red-50 border border-red-200 px-4 py-3 flex items-start gap-3">
          <Icon name="heroicons:exclamation-circle" class="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
          <p class="text-sm text-red-700">{{ cleanupError }}</p>
        </div>

        <div v-if="cleanupResult" class="rounded-lg bg-green-50 border border-green-200 px-4 py-3 flex items-start gap-3">
          <Icon name="heroicons:check-circle" class="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
          <div class="text-sm text-green-700">
            <p v-if="cleanupResult.removedNames.length === 0">脱退済みメンバーの残留はありませんでした。</p>
            <p v-else>{{ cleanupResult.removedNames.length }}名を{{ cleanupResult.touchedRows }}件の担当行から除外しました。</p>
            <p v-if="cleanupResult.removedNames.length > 0" class="mt-0.5 text-green-600">
              除外したメンバー: {{ cleanupResult.removedNames.join('、') }}
            </p>
          </div>
        </div>

        <button
          class="btn-secondary flex items-center gap-2"
          :disabled="cleaning"
          @click="runCleanup"
        >
          <Icon v-if="cleaning" name="heroicons:arrow-path" class="h-4 w-4 animate-spin" />
          <Icon v-else name="heroicons:user-minus" class="h-4 w-4" />
          {{ cleaning ? '確認中...' : '脱退済みメンバーを除去する' }}
        </button>
      </div>
    </template>

  </div>
</template>
