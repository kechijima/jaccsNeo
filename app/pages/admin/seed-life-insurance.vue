<script setup lang="ts">
import { useLifeInsuranceCases } from '~/composables/useLifeInsuranceCases'
import { LIFE_INSURANCE_CASES } from '~/data/lifeInsuranceData'

definePageMeta({ middleware: ['auth', 'admin'] })

const { fetchAll, seedFromStatic, cases } = useLifeInsuranceCases()

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

const alreadySeeded = computed(() => cases.value.length > 0)

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
</script>

<template>
  <div class="p-4 md:p-6 max-w-3xl mx-auto space-y-6">

    <!-- パンくず -->
    <div class="flex items-center gap-2 text-sm text-gray-400">
      <NuxtLink to="/admin">管理者設定</NuxtLink>
      <Icon name="heroicons:chevron-right" class="h-3 w-3" />
      <span class="text-gray-600">生命保険データ投入</span>
    </div>

    <!-- ヘッダー -->
    <div>
      <h1 class="text-xl font-bold text-gray-900 flex items-center gap-2">
        <Icon name="heroicons:shield-check" class="h-6 w-6 text-primary-600" />
        生命保険データ投入（Firestore）
      </h1>
      <p class="text-sm text-gray-500 mt-0.5">
        kintoneからインポートした生命保険案件データ（{{ LIFE_INSURANCE_CASES.length }}件）をFirestoreへ一括投入します
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
          <p class="font-semibold">すでにFirestoreへ投入済みです（現在 {{ cases.length }}件）</p>
          <p class="mt-0.5 text-blue-600">
            再実行すると、CSVインポート時点の内容で上書きされます。既にアプリ上で編集した内容がある場合は失われるためご注意ください。
          </p>
        </div>
      </div>

      <!-- 完了 -->
      <div v-if="done" class="rounded-lg bg-green-50 border border-green-200 px-4 py-3 flex items-start gap-3">
        <Icon name="heroicons:check-circle" class="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
        <p class="text-sm text-green-700">投入が完了しました（{{ cases.length }}件）</p>
      </div>

      <!-- 注意 -->
      <div class="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 flex items-start gap-3">
        <Icon name="heroicons:exclamation-triangle" class="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
        <p class="text-sm text-amber-800">
          この操作は通常、運用開始前に一度だけ実行します。すでにデータが存在する状態で再実行すると、
          該当レコードがCSVインポート時点の内容で上書きされます。
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
        <NuxtLink v-if="done" to="/services/lifeInsurance" class="btn-secondary flex items-center gap-2">
          <Icon name="heroicons:shield-check" class="h-4 w-4" />
          生命保険アプリで確認
        </NuxtLink>
      </div>
    </template>

  </div>
</template>
