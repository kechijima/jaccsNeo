<script setup lang="ts">
import { useInquiries } from '~/composables/useInquiries'
import { INQUIRY_STATUS_LABELS } from '~/types/tools'
import type { Inquiry, InquiryStatus } from '~/types/tools'

definePageMeta({ middleware: ['auth'] })

const { fetchInquiries, createInquiry, updateInquiryStatus, deleteInquiry } = useInquiries()
const { isSystemAdmin, isEm2OrAbove } = usePermission()
const { user: currentUser } = useCurrentUser()
const canManage = computed(() => isSystemAdmin.value || isEm2OrAbove.value)

const loading = ref(true)
const loadError = ref('')
const inquiries = ref<Inquiry[]>([])

const statusFilter = ref<InquiryStatus | ''>('')
const filteredInquiries = computed(() =>
  statusFilter.value ? inquiries.value.filter(i => i.status === statusFilter.value) : inquiries.value,
)

const load = async () => {
  loading.value = true
  try {
    inquiries.value = await fetchInquiries()
  } catch (e: any) {
    loadError.value = e.message ?? '問い合わせの取得に失敗しました'
  } finally {
    loading.value = false
  }
}
onMounted(load)

// ── 新規問い合わせ ──────────────────────────────────────────────
const showForm = ref(false)
const formSubject = ref('')
const formContent = ref('')
const submitting = ref(false)

const submitInquiry = async () => {
  if (!formSubject.value.trim() || !formContent.value.trim() || submitting.value) return
  submitting.value = true
  try {
    await createInquiry({ subject: formSubject.value.trim(), content: formContent.value.trim() })
    formSubject.value = ''
    formContent.value = ''
    showForm.value = false
    await load()
  } finally {
    submitting.value = false
  }
}

const changeStatus = async (id: string, status: InquiryStatus) => {
  await updateInquiryStatus(id, status)
  const target = inquiries.value.find(i => i.id === id)
  if (target) target.status = status
}

const removeInquiry = async (id: string) => {
  if (!confirm('この問い合わせを削除しますか？')) return
  await deleteInquiry(id)
  inquiries.value = inquiries.value.filter(i => i.id !== id)
}

const statusBadgeClass = (status: InquiryStatus) => {
  if (status === 'open') return 'bg-red-100 text-red-600'
  if (status === 'in_progress') return 'bg-amber-100 text-amber-700'
  return 'bg-green-100 text-green-700'
}

const fmt = (ts: any) => ts?.toDate?.().toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) ?? ''
</script>

<template>
  <div class="p-4 md:p-6 max-w-4xl mx-auto space-y-5">

    <div class="flex items-start justify-between gap-3">
      <div>
        <h1 class="text-xl font-bold text-gray-900">問い合わせ管理</h1>
        <p class="text-sm text-gray-500 mt-0.5">業務ツールアプリ</p>
      </div>
      <button type="button" class="btn-primary text-sm" @click="showForm = !showForm">
        <Icon name="heroicons:plus" class="h-4 w-4" />
        問い合わせを送る
      </button>
    </div>

    <!-- 新規問い合わせフォーム -->
    <div v-if="showForm" class="card p-5 space-y-3">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">件名</label>
        <input v-model="formSubject" type="text" class="input-field" placeholder="件名を入力" />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">内容</label>
        <textarea v-model="formContent" rows="4" class="input-field" placeholder="内容を入力" />
      </div>
      <div class="flex justify-end gap-2">
        <button type="button" class="btn-secondary text-sm" @click="showForm = false">キャンセル</button>
        <button
          type="button"
          class="btn-primary text-sm"
          :disabled="!formSubject.trim() || !formContent.trim() || submitting"
          @click="submitInquiry"
        >
          <Icon v-if="submitting" name="heroicons:arrow-path" class="h-3.5 w-3.5 animate-spin mr-1" />
          送信する
        </button>
      </div>
    </div>

    <!-- フィルタ -->
    <div class="flex items-center gap-2 flex-wrap">
      <select v-model="statusFilter" class="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-primary-300">
        <option value="">すべてのステータス</option>
        <option v-for="(label, key) in INQUIRY_STATUS_LABELS" :key="key" :value="key">{{ label }}</option>
      </select>
    </div>

    <div v-if="loading" class="card p-12 text-center">
      <Icon name="heroicons:arrow-path" class="h-8 w-8 text-gray-300 mx-auto mb-2 animate-spin" />
      <p class="text-sm text-gray-400">読み込み中...</p>
    </div>

    <div v-else-if="loadError" class="card p-12 text-center">
      <p class="text-sm text-red-500">{{ loadError }}</p>
    </div>

    <div v-else-if="filteredInquiries.length === 0" class="card p-12 text-center">
      <Icon name="heroicons:chat-bubble-left-ellipsis" class="h-10 w-10 text-gray-200 mx-auto mb-2" />
      <p class="text-sm text-gray-400">問い合わせはまだありません</p>
    </div>

    <div v-else class="card overflow-hidden">
      <div class="divide-y divide-gray-50">
        <div v-for="i in filteredInquiries" :key="i.id" class="p-4">
          <div class="flex items-start justify-between gap-2 mb-1.5">
            <p class="font-semibold text-gray-900 text-sm">{{ i.subject }}</p>
            <span class="badge text-xs shrink-0" :class="statusBadgeClass(i.status)">{{ INQUIRY_STATUS_LABELS[i.status] }}</span>
          </div>
          <p class="text-sm text-gray-600 whitespace-pre-line mb-2">{{ i.content }}</p>
          <div class="flex items-center justify-between text-xs text-gray-400">
            <span>{{ i.createdByName }} ・ {{ fmt(i.createdAt) }}</span>
            <div v-if="canManage" class="flex items-center gap-1.5">
              <select
                :value="i.status"
                class="text-xs border border-gray-200 rounded-lg px-1.5 py-1 bg-white"
                @change="changeStatus(i.id, ($event.target as HTMLSelectElement).value as InquiryStatus)"
              >
                <option v-for="(label, key) in INQUIRY_STATUS_LABELS" :key="key" :value="key">{{ label }}</option>
              </select>
              <button type="button" class="text-gray-300 hover:text-red-500 transition" @click="removeInquiry(i.id)">
                <Icon name="heroicons:trash" class="h-4 w-4" />
              </button>
            </div>
            <button
              v-else-if="i.createdByUid === currentUser?.uid"
              type="button"
              class="text-gray-300 hover:text-red-500 transition"
              @click="removeInquiry(i.id)"
            >
              <Icon name="heroicons:trash" class="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>
