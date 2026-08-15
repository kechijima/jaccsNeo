<script setup lang="ts">
import { writeBatch, doc } from 'firebase/firestore'
import { CSV_CUSTOMERS } from '~/data/customersData'

// このページはkintone由来の実顧客データ（約2,613件）をFirestoreへ
// 一度だけ移行するための一時的なページ。移行完了後は、このページと
// customersData.ts自体をリポジトリから削除すること
// （実データがビルド成果物に含まれる期間を最小限にするため）
definePageMeta({ middleware: ['auth', 'admin'] })

const { $db } = useNuxtApp()
const { ensureLoaded, loaded, customers } = useCustomerStore()

const checking = ref(true)
const seeding  = ref(false)
const done     = ref(false)
const error    = ref('')
const progress = ref(0)

onMounted(async () => {
  try {
    await ensureLoaded()
  } catch (e: any) {
    error.value = e.message ?? 'Firestoreへの接続に失敗しました'
  } finally {
    checking.value = false
  }
})

const alreadySeeded = computed(() => customers.value.length > 0)

// Firestoreはundefinedを許可しないため、送信前に取り除く
const stripUndefined = <T extends Record<string, any>>(obj: T): T => {
  const result = {} as T
  for (const key of Object.keys(obj) as (keyof T)[]) {
    if (obj[key] !== undefined) result[key] = obj[key]
  }
  return result
}

const runSeed = async () => {
  seeding.value = true
  error.value = ''
  progress.value = 0
  try {
    const chunkSize = 400
    for (let i = 0; i < CSV_CUSTOMERS.length; i += chunkSize) {
      const batch = writeBatch($db)
      const chunk = CSV_CUSTOMERS.slice(i, i + chunkSize)
      for (const c of chunk) {
        const { id, ...rest } = c
        // 元のCSVレコード番号由来のIDをそのままドキュメントIDとして使うことで、
        // 再実行しても重複せず安全に上書きできるようにする
        batch.set(doc($db, 'customers', id), stripUndefined(rest))
      }
      await batch.commit()
      progress.value = Math.min(i + chunkSize, CSV_CUSTOMERS.length)
    }
    await ensureLoaded(true)
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

    <div class="flex items-center gap-2 text-sm text-gray-400">
      <NuxtLink to="/admin">管理者設定</NuxtLink>
      <Icon name="heroicons:chevron-right" class="h-3 w-3" />
      <span class="text-gray-600">パーソナルデータ移行（実データ・一時ページ）</span>
    </div>

    <div>
      <h1 class="text-xl font-bold text-gray-900 flex items-center gap-2">
        <Icon name="heroicons:shield-exclamation" class="h-6 w-6 text-red-500" />
        パーソナルデータのFirestore移行
      </h1>
      <p class="text-sm text-gray-500 mt-0.5">
        これまでアプリのJSファイルに直接含まれていた実顧客データ（{{ CSV_CUSTOMERS.length }}件）を、
        Firestoreの customers コレクションへ移行します。
      </p>
    </div>

    <div class="rounded-lg bg-red-50 border border-red-200 px-4 py-3 flex items-start gap-3">
      <Icon name="heroicons:exclamation-triangle" class="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
      <div class="text-sm text-red-800">
        <p class="font-semibold">重要: 移行後は必ずこのページとcustomersData.tsを削除してください</p>
        <p class="mt-0.5">このページ自体、実データを含んだファイルをビルドに含んでいます。移行が完了したら、Claudeに削除を依頼してください。</p>
      </div>
    </div>

    <div v-if="checking" class="card p-8 text-center">
      <Icon name="heroicons:arrow-path" class="h-8 w-8 text-gray-300 mx-auto mb-2 animate-spin" />
      <p class="text-sm text-gray-400">Firestoreの状態を確認中...</p>
    </div>

    <template v-else>
      <div v-if="error" class="rounded-lg bg-red-50 border border-red-200 px-4 py-3 flex items-start gap-3">
        <Icon name="heroicons:exclamation-circle" class="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
        <p class="text-sm text-red-700">{{ error }}</p>
      </div>

      <div v-else-if="alreadySeeded && !done" class="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 flex items-start gap-3">
        <Icon name="heroicons:information-circle" class="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
        <div class="text-sm text-blue-800">
          <p class="font-semibold">すでにFirestoreへ投入済みです（現在 {{ customers.length }}件）</p>
          <p class="mt-0.5 text-blue-600">再実行しても、同じIDのレコードは上書きされるだけで重複は作られません。</p>
        </div>
      </div>

      <div v-if="done" class="rounded-lg bg-green-50 border border-green-200 px-4 py-3 flex items-start gap-3">
        <Icon name="heroicons:check-circle" class="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
        <p class="text-sm text-green-700">投入が完了しました（{{ customers.length }}件）。このページの削除をClaudeに依頼してください。</p>
      </div>

      <div v-if="seeding" class="card p-4">
        <p class="text-sm text-gray-600">投入中... {{ progress }} / {{ CSV_CUSTOMERS.length }}件</p>
        <div class="mt-2 h-2 w-full rounded-full bg-gray-100 overflow-hidden">
          <div class="h-2 bg-primary-500 transition-all" :style="{ width: `${(progress / CSV_CUSTOMERS.length) * 100}%` }" />
        </div>
      </div>

      <div class="flex gap-3">
        <button
          class="btn-primary flex items-center gap-2"
          :disabled="seeding"
          @click="runSeed"
        >
          <Icon v-if="seeding" name="heroicons:arrow-path" class="h-4 w-4 animate-spin" />
          <Icon v-else name="heroicons:arrow-up-tray" class="h-4 w-4" />
          {{ seeding ? '投入中...' : alreadySeeded ? '再投入する' : 'Firestoreへ移行する' }}
        </button>
        <NuxtLink v-if="done" to="/personal-data" class="btn-secondary flex items-center gap-2">
          <Icon name="heroicons:identification" class="h-4 w-4" />
          パーソナルデータで確認
        </NuxtLink>
      </div>
    </template>

  </div>
</template>
