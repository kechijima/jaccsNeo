<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { SERVICE_LABELS, STATUS_LABELS } from '~/types/service'
import { MOCK_CUSTOMERS, MOCK_SERVICE_CASES } from '~/data/mock'
import { useServices } from '~/composables/useServices'
import { useNotifications } from '~/composables/useNotifications'
import { useStorage } from '~/composables/useStorage'
import { usePermission } from '~/composables/usePermission'
import { useAuthStore } from '~/stores/auth'

definePageMeta({ middleware: ['auth'] })

const route = useRoute()
const customerId = computed(() => route.params.id as string)
const serviceType = computed(() => route.params.serviceType as string)
const caseId = computed(() => route.params.caseId as string)
const { fetchCase, updateCaseStatus, addProgressReport } = useServices()
const { sendNotification } = useNotifications()
const { uploadFile } = useStorage()
const { canEditCustomer: checkEditPermission } = usePermission()
const authStore = useAuthStore()

const customer = computed(() => MOCK_CUSTOMERS.find(c => c.id === customerId.value))
const customerName = computed(() => customer.value?.name ?? '')

const canEditCustomer = computed(() => {
  if (!customer.value) return false
  return checkEditPermission(customer.value.assignedFpId || '', customer.value.groupId)
})

const loading = ref(false)
const submittingReport = ref(false)
const newReportContent = ref('')
const attachedFiles = ref<File[]>([])
const serviceLabel = computed(() => SERVICE_LABELS[serviceType.value] ?? serviceType.value)

const dbCase = ref<any>(null)
const caseData = computed(() => {
  const raw = dbCase.value || (MOCK_SERVICE_CASES[customerId.value] ?? {})[serviceType.value]?.find((c: any) => c.id === caseId.value)
  if (!raw) return null
  return {
    ...raw,
    statusLabel: STATUS_LABELS[raw.status as keyof typeof STATUS_LABELS] ?? raw.status ?? '',
    createdAtFmt: raw.createdAt ? (raw.createdAt.toDate ? raw.createdAt.toDate().toLocaleDateString('ja-JP') : new Date(raw.createdAt).toLocaleDateString('ja-JP')) : '',
    updatedAtFmt: raw.updatedAt ? (raw.updatedAt.toDate ? raw.updatedAt.toDate().toLocaleDateString('ja-JP') : new Date(raw.updatedAt).toLocaleDateString('ja-JP')) : '',
  }
})

onMounted(async () => {
  loading.value = true
  const c = await fetchCase(customerId.value, serviceType.value as any, caseId.value)
  if (c) dbCase.value = c
  loading.value = false
})

const handleStatusChange = async (newStatus: any) => {
  if (!caseData.value) return
  const oldStatus = caseData.value.status
  if (newStatus === oldStatus) return
  
  if (!confirm(`ステータスを「${STATUS_LABELS[newStatus as keyof typeof STATUS_LABELS]}」に変更しますか？`)) return
  
  await updateCaseStatus(customerId.value, serviceType.value as any, caseId.value, newStatus, oldStatus)
  // Re-fetch or update local
  dbCase.value = { ...caseData.value, status: newStatus, reports: [...(caseData.value.reports || []), {
    id: `temp_${Date.now()}`,
    authorName: authStore.user?.displayName || '自分',
    content: `ステータスを「${STATUS_LABELS[newStatus as keyof typeof STATUS_LABELS]}」に変更しました。`,
    statusFrom: oldStatus,
    statusTo: newStatus,
    createdAt: { toDate: () => new Date() }
  }] }
}

const handleFileSelect = (e: Event) => {
  const target = e.target as HTMLInputElement
  if (target.files) {
    attachedFiles.value = [...attachedFiles.value, ...Array.from(target.files)]
  }
}

const removeFile = (index: number) => {
  attachedFiles.value.splice(index, 1)
}

const handleSubmitReport = async () => {
  if (!newReportContent.value.trim() || submittingReport.value) return
  submittingReport.value = true
  
  try {
    // ファイルアップロード
    const reportAttachments: any[] = []
    for (const file of attachedFiles.value) {
      const path = `customers/${customerId.value}/services/${serviceType.value}/cases/${caseId.value}/reports/${Date.now()}_${file.name}`
      const url = await uploadFile(path, file)
      reportAttachments.push({
        name: file.name,
        url,
        size: file.size,
        uploadedAt: { toDate: () => new Date() }
      })
    }

    await addProgressReport(customerId.value, serviceType.value as any, caseId.value, newReportContent.value)
    
    // メンション抽出 & 通知送信
    const parser = new DOMParser()
    const doc = parser.parseFromString(newReportContent.value, 'text/html')
    const mentions = doc.querySelectorAll('span[data-type="mention"]')
    mentions.forEach(el => {
      const targetUid = el.getAttribute('data-id')
      if (targetUid && targetUid !== authStore.user?.uid) {
        sendNotification(targetUid, {
          type: 'mention',
          title: 'メンションされました',
          body: `${authStore.user?.displayName}さんが「${serviceLabel.value}」の案件であなたをメンションしました。`,
          linkUrl: route.fullPath,
          relatedId: caseId.value
        })
      }
    })

    // Update local UI
    dbCase.value = { 
      ...caseData.value, 
      reports: [...(caseData.value.reports || []), {
        id: `temp_${Date.now()}`,
        authorName: authStore.user?.displayName || '自分',
        content: newReportContent.value,
        attachments: reportAttachments,
        createdAt: { toDate: () => new Date() }
      }],
      attachments: [...(caseData.value.attachments || []), ...reportAttachments]
    }
    
    newReportContent.value = ''
    attachedFiles.value = []
  } catch (e) {
    console.error('Submit report error:', e)
  } finally {
    submittingReport.value = false
  }
}

const statusClass = (status: string) => {
  switch (status) {
    case 'contracted': return 'bg-green-100 text-green-700'
    case 'completed': return 'bg-blue-100 text-blue-700'
    case 'considering': return 'bg-amber-100 text-amber-700'
    case 'consulting': return 'bg-sky-100 text-sky-700'
    case 'failed': return 'bg-red-100 text-red-600'
    default: return 'bg-gray-100 text-gray-500'
  }
}

const handleDelete = () => {
  if (!confirm('この案件を削除してよろしいですか？')) return
  alert('モックのため削除できません')
}
</script>

<template>
  <div class="p-4 md:p-6 max-w-3xl mx-auto space-y-5">

    <!-- パンくず -->
    <div class="flex items-center gap-2 text-sm text-gray-400 flex-wrap">
      <NuxtLink :to="`/customers/${customerId}`">{{ customerName }}</NuxtLink>
      <Icon name="heroicons:chevron-right" class="h-3 w-3" />
      <NuxtLink :to="`/customers/${customerId}/services/${serviceType}`">{{ serviceLabel }}</NuxtLink>
      <Icon name="heroicons:chevron-right" class="h-3 w-3" />
      <span class="text-gray-600">案件詳細</span>
    </div>

    <!-- 案件が見つからない場合 -->
    <div v-if="!caseData" class="card p-10 text-center">
      <Icon name="heroicons:exclamation-circle" class="h-10 w-10 text-gray-300 mx-auto mb-2" />
      <p class="text-sm text-gray-400">案件が見つかりません</p>
    </div>

    <template v-else>
      <!-- ヘッダー -->
      <div class="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <div class="relative group">
              <span class="badge cursor-pointer hover:ring-2 ring-primary-300 transition" :class="statusClass(caseData.status)">
                {{ caseData.statusLabel }}
                <Icon name="heroicons:chevron-down" class="ml-1 h-3 w-3" />
              </span>
              <!-- ステータス変更ドロップダウン -->
              <div class="absolute left-0 top-full mt-1 z-20 hidden group-hover:block bg-white border border-gray-200 rounded-xl shadow-xl p-1 min-w-[140px]">
                <button
                  v-for="(label, key) in STATUS_LABELS"
                  :key="key"
                  class="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-gray-50 flex items-center justify-between"
                  :class="caseData.status === key ? 'text-primary-600 font-bold bg-primary-50' : 'text-gray-700'"
                  @click="handleStatusChange(key)"
                >
                  {{ label }}
                  <Icon v-if="caseData.status === key" name="heroicons:check" class="h-3 w-3" />
                </button>
              </div>
            </div>
            <h1 class="text-xl font-bold text-gray-900">{{ caseData.company || serviceLabel }}</h1>
          </div>
          <p class="text-sm text-gray-500">{{ customerName }} さん / {{ serviceLabel }}</p>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <NuxtLink
            v-if="canEditCustomer"
            :to="`/customers/${customerId}/services/${serviceType}/${caseId}/edit`"
            class="btn-secondary text-sm flex items-center gap-1.5"
          >
            <Icon name="heroicons:pencil" class="h-4 w-4" />
            編集
          </NuxtLink>
          <button
            v-if="canEditCustomer"
            class="btn-danger text-sm flex items-center gap-1.5"
            @click="handleDelete"
          >
            <Icon name="heroicons:trash" class="h-4 w-4" />
          </button>
        </div>
      </div>

      <!-- 基本情報 -->
      <div class="card p-5">
        <h2 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Icon name="heroicons:document-text" class="h-5 w-5 text-primary-600" />
          案件情報
        </h2>
        <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div v-if="caseData.contractDate">
            <dt class="text-gray-500">成約日</dt>
            <dd class="font-medium text-gray-900">{{ caseData.contractDate }}</dd>
          </div>
          <div v-if="caseData.date">
            <dt class="text-gray-500">対応開始日</dt>
            <dd class="font-medium text-gray-900">{{ caseData.date }}</dd>
          </div>
          <div v-if="caseData.amount">
            <dt class="text-gray-500">金額・保険料</dt>
            <dd class="font-medium text-gray-900">{{ caseData.amount }}</dd>
          </div>
          <div v-if="caseData.insuranceType">
            <dt class="text-gray-500">保険種別</dt>
            <dd class="font-medium text-gray-900">{{ caseData.insuranceType }}</dd>
          </div>
          <div v-if="caseData.insuranceAmount">
            <dt class="text-gray-500">保険金額</dt>
            <dd class="font-medium text-gray-900">{{ caseData.insuranceAmount }}</dd>
          </div>
          <div v-if="caseData.paymentMethod">
            <dt class="text-gray-500">支払方法</dt>
            <dd class="font-medium text-gray-900">{{ caseData.paymentMethod }}</dd>
          </div>
          <div v-if="caseData.expiryDate">
            <dt class="text-gray-500">満期日</dt>
            <dd class="font-medium text-gray-900">{{ caseData.expiryDate }}</dd>
          </div>
          <div>
            <dt class="text-gray-500">担当FP</dt>
            <dd class="font-medium text-gray-900">{{ caseData.assignedFp }}</dd>
          </div>
          <div class="sm:col-span-2">
            <dt class="text-gray-500">作成日 / 更新日</dt>
            <dd class="font-medium text-gray-900">{{ caseData.createdAtFmt }} / {{ caseData.updatedAtFmt }}</dd>
          </div>
          <div v-if="caseData.notes" class="sm:col-span-2">
            <dt class="text-gray-500">備考・メモ</dt>
            <dd class="font-medium text-gray-900 whitespace-pre-line">{{ caseData.notes }}</dd>
          </div>
        </dl>
      </div>

      <!-- 案件資料一覧 -->
      <div class="card p-5">
        <h2 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Icon name="heroicons:folder-open" class="h-5 w-5 text-primary-600" />
          案件資料一覧
        </h2>
        <div v-if="!caseData.attachments || caseData.attachments.length === 0" class="text-center py-6">
          <p class="text-sm text-gray-400">登録された資料はありません</p>
        </div>
        <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <a
            v-for="file in caseData.attachments"
            :key="file.url"
            :href="file.url"
            target="_blank"
            class="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50 hover:bg-white hover:border-primary-300 hover:shadow-sm transition group"
          >
            <div class="h-10 w-10 shrink-0 rounded-lg bg-white border border-gray-100 flex items-center justify-center text-gray-400 group-hover:text-primary-600">
              <Icon name="heroicons:document" class="h-6 w-6" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-xs font-bold text-gray-800 truncate">{{ file.name }}</p>
              <p class="text-[10px] text-gray-400 mt-0.5">{{ Math.round(file.size / 1024) }} KB</p>
            </div>
          </a>
        </div>
      </div>

      <!-- 進捗報告（タイムライン） -->
      <div class="space-y-4">
        <h2 class="font-semibold text-gray-900 flex items-center gap-2 ml-1">
          <Icon name="heroicons:chat-bubble-bottom-center-text" class="h-5 w-5 text-primary-600" />
          進捗報告・履歴
        </h2>

        <!-- 新規報告入力 -->
        <div class="card p-4 bg-gray-50/50">
          <div class="flex flex-col gap-3">
            <RichTextEditor
              v-model="newReportContent"
              placeholder="@名前 でメンション、進捗状況を報告..."
              class="min-h-[100px]"
            />
            
            <!-- 添付ファイル選択 -->
            <div class="flex flex-wrap gap-2">
              <div v-for="(file, idx) in attachedFiles" :key="idx" class="badge bg-white shadow-sm flex items-center gap-1.5 py-1.5">
                <Icon name="heroicons:paper-clip" class="h-3 w-3 text-gray-400" />
                <span class="max-w-[120px] truncate">{{ file.name }}</span>
                <button @click="removeFile(idx)" class="hover:text-red-500"><Icon name="heroicons:x-mark" class="h-3 w-3" /></button>
              </div>
              <label class="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-gray-300 text-xs text-gray-500 hover:bg-white hover:border-primary-400 hover:text-primary-600 transition">
                <Icon name="heroicons:plus" class="h-3 w-3" />
                ファイルを添付
                <input type="file" multiple class="hidden" @change="handleFileSelect" />
              </label>
            </div>

            <div class="flex justify-end pt-2 border-t border-gray-100">
              <button
                class="btn-primary text-xs"
                :disabled="(!newReportContent.trim() && attachedFiles.length === 0) || submittingReport"
                @click="handleSubmitReport"
              >
                <Icon v-if="submittingReport" name="heroicons:arrow-path" class="h-3 w-3 animate-spin mr-1" />
                報告を追加
              </button>
            </div>
          </div>
        </div>

        <!-- タイムライン -->
        <div v-if="!caseData.reports || caseData.reports.length === 0" class="py-10 text-center">
          <p class="text-sm text-gray-400 font-medium">履歴はまだありません</p>
        </div>
        <div v-else class="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 before:to-transparent">
          <div v-for="rep in (caseData.reports as any[]).slice().reverse()" :key="rep.id" class="relative pl-10">
            <!-- タイムラインの点 -->
            <span class="absolute left-0 mt-1.5 h-10 w-10 flex items-center justify-center rounded-full bg-white ring-4 ring-gray-50 shrink-0">
              <div class="h-2.5 w-2.5 rounded-full" :class="rep.statusTo ? 'bg-primary-500 animate-pulse' : 'bg-gray-300'" />
            </span>
            
            <div class="card p-4">
              <div class="flex items-center justify-between mb-2">
                <p class="text-xs font-bold text-gray-900">{{ rep.authorName }}</p>
                <p class="text-[10px] text-gray-400">{{ rep.createdAt.toDate().toLocaleString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) }}</p>
              </div>
              
              <!-- ステータス変更表示 -->
              <div v-if="rep.statusFrom && rep.statusTo" class="mb-2 p-1.5 rounded-lg bg-gray-50 flex items-center gap-2 text-[11px] font-medium text-gray-600">
                <span class="badge !px-1.5" :class="statusClass(rep.statusFrom)">{{ STATUS_LABELS[rep.statusFrom as keyof typeof STATUS_LABELS] }}</span>
                <Icon name="heroicons:arrow-right" class="h-3 w-3" />
                <span class="badge !px-1.5" :class="statusClass(rep.statusTo)">{{ STATUS_LABELS[rep.statusTo as keyof typeof STATUS_LABELS] }}</span>
              </div>

              <!-- 本文 -->
              <div
                class="text-sm text-gray-700 leading-relaxed prose prose-sm max-w-none"
                v-html="rep.content"
              />

              <!-- 報告内添付ファイル -->
              <div v-if="rep.attachments && rep.attachments.length > 0" class="mt-3 flex flex-wrap gap-2">
                <a
                  v-for="file in rep.attachments"
                  :key="file.url"
                  :href="file.url"
                  target="_blank"
                  class="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-gray-100 border border-gray-200 text-[10px] text-gray-600 hover:bg-white hover:border-primary-300 transition"
                >
                  <Icon name="heroicons:document" class="h-3 w-3" />
                  {{ file.name }}
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

  </div>
</template>
