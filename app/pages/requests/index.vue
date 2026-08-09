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

    <!-- 申請一覧 -->
    <div v-else class="card overflow-hidden">
      <div class="divide-y divide-gray-50">
        <div v-for="r in myRequests" :key="r.id" class="px-5 py-4 flex items-start justify-between gap-3">
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
            <button
              v-if="r.status === 'rejected'"
              class="btn-secondary text-xs mt-2 flex items-center gap-1"
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
</template>
