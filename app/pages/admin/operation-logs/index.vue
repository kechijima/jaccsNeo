<script setup lang="ts">
import { useOperationLog, OPERATION_LOG_LABELS } from '~/composables/useOperationLog'
import type { OperationLogEntry, OperationLogAction } from '~/composables/useOperationLog'

definePageMeta({ middleware: ['auth', 'admin'] })

const { fetchRecent } = useOperationLog()

const logs = ref<OperationLogEntry[]>([])
const loading = ref(true)
const loadError = ref('')

const load = async () => {
  loading.value = true
  loadError.value = ''
  try {
    logs.value = await fetchRecent()
  } catch (e: any) {
    loadError.value = e.message ?? '操作ログの取得に失敗しました'
  } finally {
    loading.value = false
  }
}
onMounted(load)

const searchQuery = ref('')
const selectedAction = ref<OperationLogAction | ''>('')

const usedActions = computed(() => {
  const set = new Set(logs.value.map(l => l.action))
  return (Object.keys(OPERATION_LOG_LABELS) as OperationLogAction[]).filter(a => set.has(a))
})

const filteredLogs = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  return logs.value.filter((l) => {
    if (selectedAction.value && l.action !== selectedAction.value) return false
    if (q && !`${l.displayName} ${l.detail ?? ''}`.toLowerCase().includes(q)) return false
    return true
  })
})

const fmt = (ts: any) =>
  ts?.toDate?.().toLocaleString('ja-JP', { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) ?? ''

const actionColor = (action: OperationLogAction) => {
  if (action === 'login' || action === 'logout') return 'bg-gray-100 text-gray-500'
  if (action.includes('delete') || action.includes('dissolve') || action === 'request_reject' || action === 'user_withdraw') return 'bg-red-100 text-red-600'
  if (action === 'csv_export' || action === 'csv_import') return 'bg-sky-100 text-sky-700'
  return 'bg-primary-50 text-primary-600'
}
</script>

<template>
  <div class="p-4 md:p-6 max-w-5xl mx-auto space-y-5">

    <div class="flex items-center gap-2 text-sm text-gray-400">
      <NuxtLink to="/admin">管理者設定</NuxtLink>
      <Icon name="heroicons:chevron-right" class="h-3 w-3" />
      <span class="text-gray-600">操作ログ</span>
    </div>

    <div>
      <h1 class="text-xl font-bold text-gray-900">操作ログ</h1>
      <p class="text-sm text-gray-500 mt-0.5">ログイン・削除・承認・権限変更・CSV出力などの重要操作の履歴（直近300件）</p>
    </div>

    <div class="flex items-center gap-2 flex-wrap">
      <div class="relative flex-1 min-w-[180px]">
        <Icon name="heroicons:magnifying-glass" class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input v-model="searchQuery" type="search" placeholder="操作者名・内容で検索..." class="input-field pl-9 text-sm" />
      </div>
      <select v-model="selectedAction" class="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-primary-300">
        <option value="">すべての操作種別</option>
        <option v-for="a in usedActions" :key="a" :value="a">{{ OPERATION_LOG_LABELS[a] }}</option>
      </select>
      <button class="text-xs text-gray-400 hover:text-primary-600 transition flex items-center gap-1" @click="load">
        <Icon name="heroicons:arrow-path" class="h-3.5 w-3.5" />更新
      </button>
    </div>

    <div v-if="loading" class="card p-12 text-center">
      <Icon name="heroicons:arrow-path" class="h-8 w-8 text-gray-300 mx-auto mb-2 animate-spin" />
      <p class="text-sm text-gray-400">読み込み中...</p>
    </div>

    <div v-else-if="loadError" class="card p-12 text-center">
      <p class="text-sm text-red-500">{{ loadError }}</p>
    </div>

    <div v-else-if="filteredLogs.length === 0" class="card p-12 text-center">
      <Icon name="heroicons:document-text" class="h-10 w-10 text-gray-200 mx-auto mb-2" />
      <p class="text-sm text-gray-400">該当する操作ログがありません</p>
    </div>

    <div v-else class="card overflow-hidden">
      <div class="divide-y divide-gray-50">
        <div v-for="l in filteredLogs" :key="l.id" class="flex items-start gap-3 px-5 py-3">
          <span class="badge text-xs shrink-0 mt-0.5" :class="actionColor(l.action)">{{ l.actionLabel }}</span>
          <div class="flex-1 min-w-0">
            <p class="text-sm text-gray-900">
              <span class="font-medium">{{ l.displayName || '不明なユーザー' }}</span>
              <span v-if="l.detail" class="text-gray-500"> — {{ l.detail }}</span>
            </p>
            <p class="text-xs text-gray-400 mt-0.5">{{ fmt(l.createdAt) }}</p>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>
