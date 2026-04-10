<script setup lang="ts">
import type { CustomerSummary } from '~/types/customer'
import { exportCustomersToCsv, downloadCsv } from '~/utils/csvCustomer'
import { useAuthStore } from '~/stores/auth'

definePageMeta({ middleware: ['auth'] })

const { fetchCustomers, searchByName } = useCustomers()
const { canImportCsv, canExportCsv } = usePermission()
const authStore = useAuthStore()

// ===== 状態 =====
const customers     = ref<CustomerSummary[]>([])
const loading       = ref(false)
const searchQuery   = ref('')
const lastDoc       = ref<any>(null)
const hasMore       = ref(false)
const isSearchMode  = ref(false)

// ===== 初期ロード =====
const loadCustomers = async (reset = false) => {
  if (loading.value) return
  loading.value = true
  try {
    if (reset) {
      customers.value = []
      lastDoc.value = null
    }
    const result = await fetchCustomers({ lastDoc: lastDoc.value })
    customers.value = reset ? result.customers : [...customers.value, ...result.customers]
    lastDoc.value = result.lastVisible
    hasMore.value = result.hasMore
  } finally {
    loading.value = false
  }
}

// ===== 検索 =====
const debouncedSearch = useDebounceFn(async () => {
  if (!searchQuery.value.trim()) {
    isSearchMode.value = false
    await loadCustomers(true)
    return
  }
  isSearchMode.value = true
  loading.value = true
  try {
    customers.value = await searchByName(searchQuery.value.trim())
    hasMore.value = false
  } finally {
    loading.value = false
  }
}, 400)

watch(searchQuery, debouncedSearch)

// ===== CSV エクスポート =====
const handleExport = () => {
  const csv = exportCustomersToCsv(customers.value)
  const now = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '')
  downloadCsv(csv, `customers_${now}.csv`)
}

// ===== 日付フォーマット =====
const formatDate = (val: any) => {
  if (!val) return '—'
  const d = val?.toDate?.() ?? (val instanceof Date ? val : null)
  if (!d) return '—'
  return d.toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

onMounted(() => loadCustomers(true))
</script>

<template>
  <div class="p-4 md:p-6 max-w-7xl mx-auto space-y-4">

    <!-- ===== ページヘッダー ===== -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h1 class="text-xl font-bold text-gray-900">顧客管理</h1>
        <p class="mt-0.5 text-sm text-gray-500">
          {{ isSearchMode ? `検索結果: ${customers.length}件` : `${customers.length}件表示中` }}
        </p>
      </div>
      <div class="flex items-center gap-2">
        <!-- CSVインポート（EM2以上） -->
        <NuxtLink
          v-if="canImportCsv"
          to="/customers/import"
          class="btn-secondary text-sm flex items-center gap-1.5"
        >
          <Icon name="heroicons:arrow-up-tray" class="h-4 w-4" />
          CSVインポート
        </NuxtLink>
        <!-- CSVエクスポート（全員） -->
        <button
          v-if="canExportCsv && customers.length > 0"
          class="btn-secondary text-sm flex items-center gap-1.5"
          @click="handleExport"
        >
          <Icon name="heroicons:arrow-down-tray" class="h-4 w-4" />
          CSVエクスポート
        </button>
        <!-- 新規登録 -->
        <NuxtLink to="/customers/new" class="btn-primary text-sm flex items-center gap-1.5">
          <Icon name="heroicons:user-plus" class="h-4 w-4" />
          新規登録
        </NuxtLink>
      </div>
    </div>

    <!-- ===== 検索バー ===== -->
    <div class="relative">
      <Icon name="heroicons:magnifying-glass" class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
      <input
        v-model="searchQuery"
        type="search"
        placeholder="氏名で検索..."
        class="input-field pl-9"
      />
    </div>

    <!-- ===== テーブル（PC） ===== -->
    <div class="hidden md:block card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-100 bg-gray-50">
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">氏名</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">TEL</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">メール</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">担当FP</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">関係性</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">状況</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">更新日</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            <tr v-if="loading && customers.length === 0">
              <td colspan="7" class="text-center py-12 text-gray-400">
                <Icon name="heroicons:arrow-path" class="h-6 w-6 animate-spin mx-auto mb-2" />
                読み込み中...
              </td>
            </tr>
            <tr v-else-if="customers.length === 0">
              <td colspan="7" class="text-center py-12 text-gray-400">
                <Icon name="heroicons:users" class="h-10 w-10 mx-auto mb-2 text-gray-300" />
                {{ isSearchMode ? '検索結果がありません' : '顧客データがありません' }}
              </td>
            </tr>
            <tr
              v-for="c in customers"
              :key="c.id"
              class="hover:bg-gray-50 cursor-pointer transition"
              @click="navigateTo(`/customers/${c.id}`)"
            >
              <td class="px-4 py-3">
                <div class="font-medium text-gray-900">{{ c.name }}</div>
                <div v-if="c.nameKana" class="text-xs text-gray-400">{{ c.nameKana }}</div>
              </td>
              <td class="px-4 py-3 text-gray-600">{{ c.tel || '—' }}</td>
              <td class="px-4 py-3 text-gray-600 max-w-[180px] truncate">{{ c.email || '—' }}</td>
              <td class="px-4 py-3 text-gray-600">{{ c.assignedFpName || '—' }}</td>
              <td class="px-4 py-3">
                <span v-if="c.relationship" class="badge bg-gray-100 text-gray-600">{{ c.relationship }}</span>
                <span v-else class="text-gray-400">—</span>
              </td>
              <td class="px-4 py-3">
                <span v-if="c.status1" class="badge bg-primary-50 text-primary-700">{{ c.status1 }}</span>
                <span v-else class="text-gray-400">—</span>
              </td>
              <td class="px-4 py-3 text-gray-500 text-xs">{{ formatDate(c.updatedAt) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- もっと読み込む -->
      <div v-if="hasMore && !isSearchMode" class="border-t border-gray-100 p-4 text-center">
        <button
          class="btn-secondary text-sm"
          :disabled="loading"
          @click="loadCustomers(false)"
        >
          <Icon v-if="loading" name="heroicons:arrow-path" class="h-4 w-4 animate-spin" />
          {{ loading ? '読み込み中...' : 'さらに読み込む' }}
        </button>
      </div>
    </div>

    <!-- ===== カードリスト（SP） ===== -->
    <div class="md:hidden space-y-2">
      <div v-if="loading && customers.length === 0" class="text-center py-12 text-gray-400">
        <Icon name="heroicons:arrow-path" class="h-6 w-6 animate-spin mx-auto mb-2" />
        読み込み中...
      </div>
      <div v-else-if="customers.length === 0" class="text-center py-12 text-gray-400">
        <Icon name="heroicons:users" class="h-10 w-10 mx-auto mb-2 text-gray-300" />
        {{ isSearchMode ? '検索結果がありません' : '顧客データがありません' }}
      </div>
      <div
        v-for="c in customers"
        :key="c.id"
        class="card p-4 cursor-pointer"
        @click="navigateTo(`/customers/${c.id}`)"
      >
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0">
            <p class="font-semibold text-gray-900 truncate">{{ c.name }}</p>
            <p v-if="c.nameKana" class="text-xs text-gray-400 truncate">{{ c.nameKana }}</p>
            <p v-if="c.tel" class="text-sm text-gray-600 mt-1">{{ c.tel }}</p>
          </div>
          <div class="flex flex-col items-end gap-1 shrink-0">
            <span v-if="c.status1" class="badge bg-primary-50 text-primary-700 text-xs">{{ c.status1 }}</span>
            <span v-if="c.relationship" class="badge bg-gray-100 text-gray-600 text-xs">{{ c.relationship }}</span>
          </div>
        </div>
        <div class="flex items-center justify-between mt-2 text-xs text-gray-400">
          <span>{{ c.assignedFpName || '担当なし' }}</span>
          <span>{{ formatDate(c.updatedAt) }}</span>
        </div>
      </div>

      <div v-if="hasMore && !isSearchMode" class="text-center pt-2">
        <button class="btn-secondary text-sm w-full" :disabled="loading" @click="loadCustomers(false)">
          さらに読み込む
        </button>
      </div>
    </div>

  </div>
</template>
