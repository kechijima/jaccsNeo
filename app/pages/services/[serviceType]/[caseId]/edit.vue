<script setup lang="ts">
import { SERVICE_LABELS } from '~/types/service'
import {
  RESIDENCE_TYPE_OPTIONS, WEEKDAY_OPTIONS, MET_PARENTS_OPTIONS,
  NEW_OR_SWITCH_OPTIONS, PROGRESS_STATUS_OPTIONS,
} from '~/types/lifeInsurance'
import type { LifeInsuranceCaseInput, PolicyCopyFile } from '~/types/lifeInsurance'
import { useLifeInsuranceCases } from '~/composables/useLifeInsuranceCases'
import { useCaseComments } from '~/composables/useCaseComments'
import { useStorage } from '~/composables/useStorage'
import { useToast } from '~/composables/useToast'

definePageMeta({ middleware: ['auth'] })

const route = useRoute()
const serviceType = computed(() => route.params.serviceType as string)
const caseId = computed(() => route.params.caseId as string)
const serviceLabel = computed(() => SERVICE_LABELS[serviceType.value] ?? serviceType.value)
const isLifeInsurance = computed(() => serviceType.value === 'lifeInsurance')

// 現状、編集ページは生命保険アプリのみ対応
if (!isLifeInsurance.value) {
  await navigateTo(`/services/${serviceType.value}`)
}

const { getById, update, fetchAll } = useLifeInsuranceCases()
await fetchAll()
const liCase = getById(caseId)

if (!liCase.value) {
  await navigateTo(`/services/${serviceType.value}`)
}

const { show: showToast } = useToast()

// ── コメント ──────────────────────────────────────────────────────────
const {
  comments, loading: commentsLoading, loadingMore: commentsLoadingMore, hasMore: hasMoreComments,
  fetchInitial: fetchComments, loadMore: loadMoreComments, addComment,
} = useCaseComments(caseId.value)
await fetchComments()

const commentDraft = ref('')
const commentSubmitting = ref(false)

const submitComment = async () => {
  if (!commentDraft.value.trim()) return
  commentSubmitting.value = true
  try {
    await addComment(commentDraft.value)
    commentDraft.value = ''
  } finally {
    commentSubmitting.value = false
  }
}

const commentFmt = (d: Date) => d.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })

const liForm = reactive<LifeInsuranceCaseInput>({
  customerId: liCase.value?.customerId,
  name: liCase.value?.name ?? '',
  nameKana: liCase.value?.nameKana ?? '',
  gender: liCase.value?.gender ?? '',
  dob: liCase.value?.dob ?? '',
  tel: liCase.value?.tel ?? '',
  assignedFpName: liCase.value?.assignedFpName ?? '',
  faceToFaceStaffName: liCase.value?.faceToFaceStaffName ?? '',
  designRequest: liCase.value?.designRequest ?? '',
  newOrSwitch: liCase.value?.newOrSwitch ?? '',
  desiredApptDates: [
    liCase.value?.desiredApptDates?.[0] ?? '',
    liCase.value?.desiredApptDates?.[1] ?? '',
    liCase.value?.desiredApptDates?.[2] ?? '',
  ],
  availableWeekdays: [...(liCase.value?.availableWeekdays ?? [])],
  monthlyBudget: liCase.value?.monthlyBudget ?? '',
  bonus: liCase.value?.bonus ?? '',
  savings: liCase.value?.savings ?? '',
  residenceTypes: [...(liCase.value?.residenceTypes ?? [])],
  metParents: liCase.value?.metParents ?? '',
  planningPurpose: liCase.value?.planningPurpose ?? '',
  policyCopies: [...(liCase.value?.policyCopies ?? [])],
  meetingDate: liCase.value?.meetingDate ?? '',
  scheduledTime: liCase.value?.scheduledTime ?? '',
  reminder: liCase.value?.reminder ?? '',
  progressStatus: liCase.value?.progressStatus ?? '未成約',
  contractContent: liCase.value?.contractContent ?? '',
  planningContent: liCase.value?.planningContent ?? '',
  recordNumber: liCase.value?.recordNumber ?? '',
})

// 保険証券コピー（既存分を引き継ぎつつ、Firebase Storageへ追加アップロード）
const { uploadFile } = useStorage()
const existingCopies = liCase.value?.policyCopies ?? []
const policyCopySlots = ref<Array<{ file: PolicyCopyFile | null; uploading: boolean; error: string }>>([
  { file: existingCopies[0] ?? null, uploading: false, error: '' },
  { file: existingCopies[1] ?? null, uploading: false, error: '' },
  { file: existingCopies[2] ?? null, uploading: false, error: '' },
])

const handlePolicyCopySelect = async (idx: number, e: Event) => {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  const slot = policyCopySlots.value[idx]
  slot.uploading = true
  slot.error = ''
  try {
    const path = `life-insurance/${liCase.value?.customerId || 'unlinked'}/${Date.now()}-${file.name}`
    const url = await uploadFile(path, file)
    slot.file = { name: file.name, url }
  } catch (e: any) {
    const code = e?.code ?? e?.message ?? '不明なエラー'
    slot.error = `アップロードに失敗しました（${code}）`
    console.error('保険証券コピーのアップロードに失敗:', e)
  } finally {
    slot.uploading = false
    input.value = ''
  }
}

const removePolicyCopy = (idx: number) => {
  policyCopySlots.value[idx] = { file: null, uploading: false, error: '' }
}

const anyPolicyUploading = computed(() => policyCopySlots.value.some(s => s.uploading))

const toggleInArray = (arr: string[], value: string) => {
  const idx = arr.indexOf(value)
  if (idx >= 0) arr.splice(idx, 1)
  else arr.push(value)
}

const liSubmitting = ref(false)
const liError = ref('')

const handleLiSubmit = async () => {
  if (policyCopySlots.value.some(s => s.uploading)) {
    liError.value = 'ファイルのアップロードが完了するまでお待ちください'
    return
  }
  liSubmitting.value = true
  liError.value = ''
  try {
    const desiredApptDates = (liForm.desiredApptDates ?? []).filter(Boolean)
    const policyCopies = policyCopySlots.value
      .map(s => s.file)
      .filter((f): f is PolicyCopyFile => !!f)
    await update(caseId.value, {
      ...liForm,
      desiredApptDates: desiredApptDates.length ? desiredApptDates : undefined,
      policyCopies: policyCopies.length ? policyCopies : undefined,
    })
    showToast('案件を更新しました')
    await navigateTo(`/services/${serviceType.value}/${caseId.value}`)
  }
  catch (e: any) {
    liError.value = e.message ?? '保存に失敗しました'
    liSubmitting.value = false
  }
}
</script>

<template>
  <div v-if="liCase" class="p-4 md:p-6 max-w-5xl mx-auto space-y-5">

    <!-- パンくず -->
    <div class="flex items-center gap-2 text-sm text-gray-400 flex-wrap">
      <NuxtLink to="/services" class="hover:text-primary-600 transition-colors">アプリ</NuxtLink>
      <Icon name="heroicons:chevron-right" class="h-3 w-3" />
      <NuxtLink :to="`/services/${serviceType}`" class="hover:text-primary-600 transition-colors">{{ serviceLabel }}</NuxtLink>
      <Icon name="heroicons:chevron-right" class="h-3 w-3" />
      <NuxtLink :to="`/services/${serviceType}/${caseId}`" class="hover:text-primary-600 transition-colors">案件詳細</NuxtLink>
      <Icon name="heroicons:chevron-right" class="h-3 w-3" />
      <span class="text-gray-600">編集</span>
    </div>

    <h1 class="text-xl font-bold text-gray-900">{{ serviceLabel }} — 案件編集</h1>

    <div class="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-5 items-start">

    <form class="space-y-5" @submit.prevent="handleLiSubmit">

      <div v-if="liError" class="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
        <Icon name="heroicons:exclamation-circle" class="mt-0.5 h-4 w-4 shrink-0" />
        {{ liError }}
      </div>

      <!-- 担当情報 -->
      <div class="card p-5 space-y-4">
        <h3 class="font-semibold text-gray-900 flex items-center gap-2">
          <Icon name="heroicons:user" class="h-5 w-5 text-primary-600" />
          担当情報
        </h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">面前担当者名 <span class="text-red-500">*</span></label>
            <input v-model="liForm.faceToFaceStaffName" type="text" required placeholder="担当者名を入力" class="input-field" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">担当 未来設計士</label>
            <input v-model="liForm.assignedFpName" type="text" class="input-field" />
          </div>
        </div>
      </div>

      <!-- 契約・プランニング -->
      <div class="card p-5 space-y-4">
        <h3 class="font-semibold text-gray-900 flex items-center gap-2">
          <Icon name="heroicons:document-text" class="h-5 w-5 text-primary-600" />
          契約・プランニング
        </h3>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">設計書依頼（保険内容）</label>
          <textarea v-model="liForm.designRequest" rows="3" placeholder="設計書に依頼する保険内容を入力..." class="input-field resize-none" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">新規（無保険状態）or 乗換契約</label>
          <div class="flex gap-2">
            <button
              v-for="opt in NEW_OR_SWITCH_OPTIONS" :key="opt"
              type="button"
              class="flex items-center gap-1.5 cursor-pointer rounded-lg border px-3 py-2 text-sm transition"
              :class="liForm.newOrSwitch === opt ? 'border-primary-400 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'"
              @click="liForm.newOrSwitch = opt"
            >{{ opt }}</button>
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">保険証券コピー</label>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div v-for="i in 3" :key="i">
              <label class="block text-xs text-gray-500 mb-1">証券コピー{{ ['①', '②', '③'][i - 1] }}</label>

              <!-- アップロード済み -->
              <div
                v-if="policyCopySlots[i - 1].file"
                class="flex items-center justify-between gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-xs"
              >
                <a
                  :href="policyCopySlots[i - 1].file!.url"
                  target="_blank"
                  rel="noopener"
                  class="flex items-center gap-1.5 min-w-0 text-green-700 hover:underline"
                >
                  <Icon name="heroicons:document-check" class="h-4 w-4 shrink-0" />
                  <span class="truncate">{{ policyCopySlots[i - 1].file!.name }}</span>
                </a>
                <button type="button" class="shrink-0 text-gray-400 hover:text-red-500 transition" @click="removePolicyCopy(i - 1)">
                  <Icon name="heroicons:x-mark" class="h-4 w-4" />
                </button>
              </div>

              <!-- アップロード中 -->
              <div
                v-else-if="policyCopySlots[i - 1].uploading"
                class="flex items-center justify-center rounded-lg border-2 border-dashed border-primary-200 bg-primary-50 p-4 text-xs text-primary-500"
              >
                <Icon name="heroicons:arrow-path" class="h-4 w-4 animate-spin mr-1.5" />
                アップロード中...
              </div>

              <!-- 未選択 -->
              <div v-else class="flex items-center justify-center rounded-lg border-2 border-dashed border-gray-200 p-4 text-xs text-gray-400 text-center hover:border-primary-300 transition">
                <label class="cursor-pointer w-full">
                  <Icon name="heroicons:paper-clip" class="h-4 w-4 mx-auto mb-1" />
                  <span class="block truncate">ファイルを選択</span>
                  <input type="file" class="hidden" accept="image/*,.pdf" @change="handlePolicyCopySelect(i - 1, $event)" />
                </label>
              </div>
              <p v-if="policyCopySlots[i - 1].error" class="text-xs text-red-500 mt-1">{{ policyCopySlots[i - 1].error }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- アポ -->
      <div class="card p-5 space-y-4">
        <h3 class="font-semibold text-gray-900 flex items-center gap-2">
          <Icon name="heroicons:calendar-days" class="h-5 w-5 text-primary-600" />
          アポ希望
        </h3>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div v-for="i in 3" :key="i">
            <label class="block text-sm font-medium text-gray-700 mb-1.5">アポ希望日{{ ['①', '②', '③'][i - 1] }}</label>
            <input v-model="liForm.desiredApptDates![i - 1]" type="datetime-local" class="input-field text-sm" />
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">アポ可能曜日（日程が合わない場合）</label>
          <div class="flex flex-wrap gap-2">
            <label
              v-for="d in WEEKDAY_OPTIONS" :key="d"
              class="flex items-center gap-1 cursor-pointer rounded-lg border px-3 py-1.5 text-sm transition"
              :class="liForm.availableWeekdays?.includes(d) ? 'border-primary-400 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'"
              @click="toggleInArray(liForm.availableWeekdays!, d)"
            >{{ d }}</label>
          </div>
        </div>
      </div>

      <!-- ヒアリング項目 -->
      <div class="card p-5 space-y-4">
        <h3 class="font-semibold text-gray-900 flex items-center gap-2">
          <Icon name="heroicons:clipboard-document-list" class="h-5 w-5 text-primary-600" />
          ヒアリング項目
        </h3>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">収支（いくら貯金できるか）</label>
            <input v-model="liForm.monthlyBudget" type="text" placeholder="例: 5万円" class="input-field" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">ボーナス</label>
            <input v-model="liForm.bonus" type="text" placeholder="例: 50万円" class="input-field" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">貯蓄</label>
            <input v-model="liForm.savings" type="text" placeholder="例: 300万円" class="input-field" />
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">住居</label>
          <div class="flex flex-wrap gap-2">
            <label
              v-for="r in RESIDENCE_TYPE_OPTIONS" :key="r"
              class="flex items-center gap-1 cursor-pointer rounded-lg border px-3 py-1.5 text-sm transition"
              :class="liForm.residenceTypes?.includes(r) ? 'border-primary-400 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'"
              @click="toggleInArray(liForm.residenceTypes!, r)"
            >{{ r }}</label>
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">親など（ショッカー）に会ったか</label>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="opt in MET_PARENTS_OPTIONS" :key="opt"
              type="button"
              class="flex items-center gap-1.5 cursor-pointer rounded-lg border px-3 py-2 text-sm transition"
              :class="liForm.metParents === opt ? 'border-primary-400 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'"
              @click="liForm.metParents = opt"
            >{{ opt }}</button>
          </div>
        </div>
      </div>

      <!-- 進行状況 -->
      <div class="card p-5 space-y-4">
        <h3 class="font-semibold text-gray-900 flex items-center gap-2">
          <Icon name="heroicons:shield-check" class="h-5 w-5 text-primary-600" />
          進行状況
        </h3>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">進行状況</label>
          <select v-model="liForm.progressStatus" class="input-field">
            <option v-for="s in PROGRESS_STATUS_OPTIONS" :key="s" :value="s">{{ s }}</option>
          </select>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">面前日</label>
            <input v-model="liForm.meetingDate" type="date" class="input-field" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">設定時刻</label>
            <input v-model="liForm.scheduledTime" type="time" class="input-field" />
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">リマインダー</label>
          <input v-model="liForm.reminder" type="text" placeholder="リマインダー内容を入力..." class="input-field" />
        </div>

        <p class="text-sm font-bold text-red-600 pt-2 border-t border-gray-100">担当者以外編集禁止</p>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">契約内容</label>
          <textarea v-model="liForm.contractContent" rows="3" placeholder="契約内容を入力..." class="input-field resize-none" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">プランニング内容</label>
          <textarea v-model="liForm.planningContent" rows="3" placeholder="プランニング内容を入力..." class="input-field resize-none" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">プランニング・目的</label>
          <textarea v-model="liForm.planningPurpose" rows="2" placeholder="プランニングの目的を入力..." class="input-field resize-none" />
        </div>
      </div>

      <!-- ボタン -->
      <div class="flex justify-between pt-2 pb-8">
        <NuxtLink :to="`/services/${serviceType}/${caseId}`" class="btn-secondary">
          キャンセル
        </NuxtLink>
        <button type="submit" class="btn-primary" :disabled="liSubmitting || anyPolicyUploading">
          <Icon v-if="liSubmitting" name="heroicons:arrow-path" class="h-4 w-4 animate-spin mr-1" />
          {{ liSubmitting ? '保存中...' : anyPolicyUploading ? 'アップロード中...' : '変更を保存する' }}
        </button>
      </div>
    </form>

    <!-- コメント -->
    <aside class="card p-4 space-y-4 lg:sticky lg:top-4">
      <h3 class="font-semibold text-gray-900 flex items-center gap-2">
        <Icon name="heroicons:chat-bubble-left-right" class="h-5 w-5 text-primary-600" />
        コメント
      </h3>

      <!-- 入力（@でメンバーを指定できます） -->
      <div class="space-y-2">
        <RichTextEditor v-model="commentDraft" placeholder="コメントを入力...（@でメンバーを指定できます）" class="min-h-[100px]" />
        <div class="flex justify-end gap-2">
          <button type="button" class="btn-secondary text-sm" :disabled="!commentDraft.trim()" @click="commentDraft = ''">キャンセル</button>
          <button type="button" class="btn-primary text-sm" :disabled="!commentDraft.trim() || commentSubmitting" @click="submitComment">
            <Icon v-if="commentSubmitting" name="heroicons:arrow-path" class="h-3.5 w-3.5 animate-spin mr-1" />
            書き込む
          </button>
        </div>
      </div>

      <!-- 履歴 -->
      <div class="border-t border-gray-100 pt-3 space-y-3 max-h-[480px] overflow-y-auto">
        <div v-if="commentsLoading" class="text-center text-xs text-gray-400 py-4">読み込み中...</div>
        <template v-else>
          <button
            v-if="hasMoreComments"
            type="button"
            class="w-full text-center text-xs text-primary-600 hover:underline py-1 disabled:opacity-40"
            :disabled="commentsLoadingMore"
            @click="loadMoreComments"
          >
            <Icon v-if="commentsLoadingMore" name="heroicons:arrow-path" class="h-3 w-3 animate-spin inline mr-1" />
            さらに開く
          </button>

          <div v-if="comments.length === 0" class="text-xs text-gray-400 text-center py-4">コメントはありません。</div>

          <div v-for="c in comments" :key="c.id" class="flex items-start gap-2">
            <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600 font-semibold text-xs">
              {{ (c.authorName || '?').charAt(0) }}
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-xs font-semibold text-gray-700">
                {{ c.authorName || '不明' }}
                <span class="font-normal text-gray-400 ml-1">{{ commentFmt(c.createdAt) }}</span>
              </p>
              <div class="text-xs text-gray-600 mt-0.5 leading-relaxed prose prose-sm max-w-none" v-html="c.content" />
            </div>
          </div>
        </template>
      </div>
    </aside>

    </div>
  </div>
</template>
