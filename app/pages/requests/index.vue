<script setup lang="ts">
import { useRequests } from '~/composables/useRequests'
import { REQUEST_TYPE_LABELS, REQUEST_STATUS_LABELS } from '~/types/request'
import { useAuthStore } from '~/stores/auth'
import type { AppRequest } from '~/types/request'
import { requestStatusBadge, requestPayloadSummary } from '~/utils/requestSummary'

definePageMeta({ middleware: ['auth'] })

const { fetchMine, setResubmitDraft } = useRequests()
const authStore = useAuthStore()

const loading = ref(true)
const loadError = ref('')
const myRequests = ref<AppRequest[]>([])

const loadMyRequests = async () => {
  loading.value = true
  loadError.value = ''
  try {
    myRequests.value = await fetchMine()
  } catch (e: any) {
    console.error('自分の申請一覧の取得に失敗しました', e)
    loadError.value = e.message ?? '申請一覧の取得に失敗しました'
  } finally {
    loading.value = false
  }
}

onMounted(loadMyRequests)

const statusBadge = requestStatusBadge
const payloadSummary = requestPayloadSummary

const fmt = (ts: any) =>
  ts?.toDate?.().toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) ?? ''

// ── 絞り込み（ステータス・申請日） ──────────────────────────────────────
const filterStatus   = ref<'all' | 'pending' | 'approved' | 'rejected'>('all')
const filterDateFrom = ref('')
const filterDateTo   = ref('')
const showFilter     = ref(false)

const activeFilterCount = computed(() =>
  (filterStatus.value !== 'all' ? 1 : 0) + (filterDateFrom.value ? 1 : 0) + (filterDateTo.value ? 1 : 0)
)

const resetFilters = () => {
  filterStatus.value = 'all'
  filterDateFrom.value = ''
  filterDateTo.value = ''
}

const requestDateStr = (r: AppRequest) => r.requestedAt?.toDate?.().toISOString().slice(0, 10) ?? ''

const filteredRequests = computed(() => {
  let list = myRequests.value
  if (filterStatus.value !== 'all') list = list.filter(r => r.status === filterStatus.value)
  if (filterDateFrom.value) list = list.filter(r => requestDateStr(r) >= filterDateFrom.value)
  if (filterDateTo.value)   list = list.filter(r => requestDateStr(r) <= filterDateTo.value)
  return list
})

// 却下された申請の内容をコピーして新規申請フォームへ引き継ぐ
const handleResubmit = (r: AppRequest) => {
  setResubmitDraft(r.type, r.payload)
  navigateTo('/requests/new')
}
</script>

<template>
  <div class="p-4 md:p-6 max-w-3xl mx-auto space-y-5">

    <!-- ヘッダー -->
    <div class="flex items-start justify-between gap-3">
      <div>
        <h1 class="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Icon name="heroicons:document-check" class="h-6 w-6 text-primary-600" />
          申請
        </h1>
        <p class="text-sm text-gray-500 mt-0.5">組合・グループ登録、プラン変更、サポート者変更などの申請</p>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <NuxtLink v-if="authStore.isBoard" to="/requests/approve" class="btn-secondary text-sm flex items-center gap-1.5">
          <Icon name="heroicons:clipboard-document-check" class="h-4 w-4" />
          承認キュー
        </NuxtLink>
        <NuxtLink to="/requests/new" class="btn-primary text-sm flex items-center gap-1.5">
          <Icon name="heroicons:plus" class="h-4 w-4" />
          新規申請
        </NuxtLink>
      </div>
    </div>

    <!-- 絞り込み -->
    <div v-if="!loading && !loadError && myRequests.length > 0" class="flex items-center gap-2">
      <button
        class="relative flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition"
        :class="activeFilterCount > 0
          ? 'border-primary-400 bg-primary-50 text-primary-700'
          : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'"
        @click="showFilter = !showFilter"
      >
        <Icon name="heroicons:adjustments-horizontal" class="h-4 w-4" />
        絞り込み
        <span
          v-if="activeFilterCount > 0"
          class="flex h-4 w-4 items-center justify-center rounded-full bg-primary-500 text-[10px] text-white font-bold"
        >{{ activeFilterCount }}</span>
      </button>
      <button
        v-if="activeFilterCount > 0"
        class="text-xs text-gray-400 hover:text-red-500 transition flex items-center gap-0.5"
        @click="resetFilters"
      >
        <Icon name="heroicons:x-mark" class="h-3.5 w-3.5" />リセット
      </button>
    </div>

    <Transition
      enter-active-class="transition duration-150"
      enter-from-class="opacity-0 -translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-100"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-2"
    >
      <div v-if="showFilter" class="card p-4 grid sm:grid-cols-3 gap-4">
        <div class="space-y-1">
          <label class="text-xs font-medium text-gray-500">ステータス</label>
          <select v-model="filterStatus" class="input-field text-sm py-1.5">
            <option value="all">すべて</option>
            <option value="pending">承認待ち</option>
            <option value="approved">承認済み</option>
            <option value="rejected">却下</option>
          </select>
        </div>
        <div class="space-y-1">
          <label class="text-xs font-medium text-gray-500">申請日（開始）</label>
          <input v-model="filterDateFrom" type="date" class="input-field text-sm py-1.5" />
        </div>
        <div class="space-y-1">
          <label class="text-xs font-medium text-gray-500">申請日（終了）</label>
          <input v-model="filterDateTo" type="date" class="input-field text-sm py-1.5" />
        </div>
      </div>
    </Transition>

    <!-- 読み込み中 -->
    <div v-if="loading" class="card p-12 text-center">
      <Icon name="heroicons:arrow-path" class="h-8 w-8 text-gray-300 mx-auto mb-2 animate-spin" />
      <p class="text-sm text-gray-400">読み込み中...</p>
    </div>

    <!-- エラー -->
    <div v-else-if="loadError" class="card p-12 text-center">
      <Icon name="heroicons:exclamation-circle" class="h-8 w-8 text-red-300 mx-auto mb-2" />
      <p class="text-sm text-red-500">{{ loadError }}</p>
      <button class="mt-3 text-xs text-primary-600 hover:underline" @click="loadMyRequests">再試行</button>
    </div>

    <!-- 空の状態 -->
    <div v-else-if="myRequests.length === 0" class="card p-16 text-center">
      <Icon name="heroicons:document-check" class="h-12 w-12 text-gray-200 mx-auto mb-3" />
      <p class="text-gray-400 font-medium">申請はまだありません</p>
      <NuxtLink to="/requests/new" class="btn-primary text-sm mt-4 inline-flex">申請する</NuxtLink>
    </div>

    <!-- 絞り込み結果なし -->
    <div v-else-if="filteredRequests.length === 0" class="card p-16 text-center">
      <Icon name="heroicons:funnel" class="h-12 w-12 text-gray-200 mx-auto mb-3" />
      <p class="text-gray-400 font-medium">条件に一致する申請がありません</p>
      <button class="mt-3 text-xs text-primary-600 hover:underline" @click="resetFilters">絞り込みをリセット</button>
    </div>

    <!-- 申請一覧 -->
    <div v-else class="card overflow-hidden">
      <div class="divide-y divide-gray-50">
        <div v-for="r in filteredRequests" :key="r.id" class="px-5 py-4 flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="flex items-center gap-2 flex-wrap mb-1">
              <span class="badge text-xs bg-gray-100 text-gray-600">{{ REQUEST_TYPE_LABELS[r.type] }}</span>
              <span class="badge text-xs" :class="statusBadge(r.status)">{{ REQUEST_STATUS_LABELS[r.status] }}</span>
            </div>
            <p class="text-sm text-gray-800 truncate">{{ payloadSummary(r) }}</p>
            <p class="text-xs text-gray-400 mt-0.5">申請者: {{ r.requestedByName }}（{{ fmt(r.requestedAt) }}）</p>
            <p v-if="r.status !== 'pending' && r.reviewedByName" class="text-xs text-gray-400 mt-0.5">
              承認者: {{ r.reviewedByName }}（{{ fmt(r.reviewedAt) }}）
            </p>
            <p v-if="r.status === 'rejected' && r.rejectReason" class="text-xs text-red-500 mt-1">却下理由: {{ r.rejectReason }}</p>
            <div class="flex items-center gap-2 mt-2">
              <NuxtLink
                v-if="r.status === 'pending'"
                :to="`/requests/new?edit=${r.id}`"
                class="btn-secondary text-xs flex items-center gap-1"
              >
                <Icon name="heroicons:pencil-square" class="h-3.5 w-3.5" />
                編集する
              </NuxtLink>
              <button
                v-if="r.status === 'rejected'"
                class="btn-secondary text-xs flex items-center gap-1"
                @click="handleResubmit(r)"
              >
                <Icon name="heroicons:document-duplicate" class="h-3.5 w-3.5" />
                コピーして再申請
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>
