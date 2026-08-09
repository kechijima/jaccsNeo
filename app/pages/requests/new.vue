<script setup lang="ts">
import type { RequestType, AppRequest } from '~/types/request'
import { REQUEST_TYPE_LABELS, REQUEST_STATUS_LABELS } from '~/types/request'
import { useRequests } from '~/composables/useRequests'
import { useGroups } from '~/composables/useGroups'
import { useUsers } from '~/composables/useUsers'
import type { Group } from '~/types/group'
import { TITLE_OPTIONS, type AppUser } from '~/types/user'
import { requestStatusBadge, requestPayloadSummary } from '~/utils/requestSummary'

definePageMeta({ middleware: ['auth'] })

const { submit, updateMyRequest, consumeResubmitDraft, fetchMine } = useRequests()
const { fetchGroups } = useGroups()
const { fetchUsers } = useUsers()
const route = useRoute()
const router = useRouter()

const groups = ref<Group[]>([])
const users = ref<AppUser[]>([])
const resubmitted = ref(false)
const pastRequests = ref<AppRequest[]>([])
const pastLoading = ref(true)
const pastError = ref('')
const loadPastRequests = async () => {
  pastLoading.value = true
  pastError.value = ''
  try {
    pastRequests.value = await fetchMine()
  } catch (e: any) {
    console.error('過去の申請一覧の取得に失敗しました', e)
    pastError.value = e.message ?? '過去の申請の取得に失敗しました'
  } finally {
    pastLoading.value = false
  }
}

// ── 承認待ちの自分の申請を編集する（ミス申請の修正用。承認/却下後は編集不可） ──
const isEditing  = ref(false)
const editingId  = ref('')
const editSaved  = ref(false)
const editError  = ref('')

onMounted(async () => {
  const [g, u] = await Promise.all([fetchGroups().catch(() => []), fetchUsers().catch(() => [])])
  groups.value = g
  users.value = u
  await applyResubmitDraft()
  await loadPastRequests()

  const editId = route.query.edit as string | undefined
  if (editId) {
    const target = pastRequests.value.find(r => r.id === editId)
    if (target && target.status === 'pending') {
      await startEditing(target)
    } else {
      editError.value = '編集できる申請が見つかりませんでした（承認待ちの申請のみ編集できます）'
    }
    router.replace({ query: {} })
  }
})

const fmt = (ts: any) =>
  ts?.toDate?.().toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) ?? ''

// ── 過去の申請の絞り込み（ステータス・申請日） ──────────────────────────
const pastFilterStatus   = ref<'all' | 'pending' | 'approved' | 'rejected'>('all')
const pastFilterDateFrom = ref('')
const pastFilterDateTo   = ref('')
const pastShowFilter     = ref(false)

const pastActiveFilterCount = computed(() =>
  (pastFilterStatus.value !== 'all' ? 1 : 0) + (pastFilterDateFrom.value ? 1 : 0) + (pastFilterDateTo.value ? 1 : 0)
)
const resetPastFilters = () => {
  pastFilterStatus.value = 'all'
  pastFilterDateFrom.value = ''
  pastFilterDateTo.value = ''
}
const pastRequestDateStr = (r: AppRequest) => r.requestedAt?.toDate?.().toISOString().slice(0, 10) ?? ''
const filteredPastRequests = computed(() => {
  let list = pastRequests.value
  if (pastFilterStatus.value !== 'all') list = list.filter(r => r.status === pastFilterStatus.value)
  if (pastFilterDateFrom.value) list = list.filter(r => pastRequestDateStr(r) >= pastFilterDateFrom.value)
  if (pastFilterDateTo.value)   list = list.filter(r => pastRequestDateStr(r) <= pastFilterDateTo.value)
  return list
})

const type = ref<RequestType>('kumiai_member_create')
const submitting = ref(false)
const error = ref('')
const done = ref(false)

// ── 組合の登録 ──────────────────────────────────────────────────────────
const kumiaiCreateForm = reactive({ groupId: '', name: '', adminName: '' })

// ── グループの登録 ──────────────────────────────────────────────────────
const groupCreateForm = reactive({ name: '' })

// ── 組合員の登録 ────────────────────────────────────────────────────────
const memberCreateForm = reactive({
  displayName: '', email: '', groupId: '', kumiaiId: '', position: '',
  mainSupporterUid: '', subSupporterUid: '',
})
// 所属組合は所属グループとは独立して選択できる（別グループの組合に所属するケースがあるため）
const memberKumiaiOptions = computed(() =>
  groups.value.flatMap(g => g.kumiai
    .filter(k => !k.isDissolved || k.id === memberCreateForm.kumiaiId)
    .map(k => ({ id: k.id, label: k.name, sublabel: g.name }))),
)

// ── プラン変更・サポート者変更（対象ユーザー選択は共通） ────────────────
const MEMBERSHIP_PLAN_OPTIONS = ['Sプラン', 'Bプラン']
const planChangeForm = reactive({ targetUid: '', newPlan: MEMBERSHIP_PLAN_OPTIONS[0] })
const supporterChangeForm = reactive({ targetUid: '', mainSupporterUid: '', subSupporterUid: '' })

// ── 組合員の脱退 ────────────────────────────────────────────────────────
const memberWithdrawForm = reactive({ targetUid: '' })

// ── 組合の解体 ──────────────────────────────────────────────────────────
const kumiaiDissolveForm = reactive({ groupId: '', kumiaiId: '' })
const dissolveKumiaiOptions = computed(() =>
  (groups.value.find(g => g.id === kumiaiDissolveForm.groupId)?.kumiai ?? [])
    .filter(k => !k.isDissolved)
    .map(k => ({ id: k.id, label: k.name })),
)
watch(() => kumiaiDissolveForm.groupId, () => { kumiaiDissolveForm.kumiaiId = '' })

const note = ref('')

const userOptions = computed(() => users.value.filter(u => !u.isWithdrawn).map(u => ({ uid: u.uid, displayName: u.displayName })))

const resetForms = () => {
  Object.assign(kumiaiCreateForm, { groupId: '', name: '', adminName: '' })
  Object.assign(groupCreateForm, { name: '' })
  Object.assign(memberCreateForm, { displayName: '', email: '', groupId: '', kumiaiId: '', position: '', mainSupporterUid: '', subSupporterUid: '' })
  Object.assign(planChangeForm, { targetUid: '', newPlan: MEMBERSHIP_PLAN_OPTIONS[0] })
  Object.assign(supporterChangeForm, { targetUid: '', mainSupporterUid: '', subSupporterUid: '' })
  Object.assign(memberWithdrawForm, { targetUid: '' })
  Object.assign(kumiaiDissolveForm, { groupId: '', kumiaiId: '' })
  note.value = ''
  resubmitted.value = false
}

// 却下された申請の「コピーして再申請」で渡された内容をフォームへ反映する
const FORMS_BY_TYPE: Record<RequestType, Record<string, any>> = {
  kumiai_create:          kumiaiCreateForm,
  group_create:           groupCreateForm,
  kumiai_member_create:   memberCreateForm,
  plan_change:            planChangeForm,
  supporter_change:       supporterChangeForm,
  kumiai_member_withdraw: memberWithdrawForm,
  kumiai_dissolve:        kumiaiDissolveForm,
}
// groupId変更で連動して選択組合(kumiaiId)がリセットされるフォームがあるため、
// groupIdを先に反映してwatchによるリセットを済ませてからkumiaiIdを反映する
const applyDraft = async (draft: { type: RequestType; payload: Record<string, any> }) => {
  type.value = draft.type
  const form = FORMS_BY_TYPE[draft.type]
  for (const key of Object.keys(form)) {
    if (key === 'kumiaiId') continue
    if (draft.payload[key] !== undefined) form[key] = draft.payload[key]
  }
  await nextTick()
  if ('kumiaiId' in form && draft.payload.kumiaiId !== undefined) {
    form.kumiaiId = draft.payload.kumiaiId
  }
}
const applyResubmitDraft = async () => {
  const draft = consumeResubmitDraft()
  if (!draft) return
  await applyDraft(draft)
  resubmitted.value = true
}
// 過去の申請一覧から直接「コピーして再申請」した場合（画面遷移せずそのままフォームへ反映）
const handleResubmitFromHistory = async (r: AppRequest) => {
  done.value = false
  isEditing.value = false
  editingId.value = ''
  editSaved.value = false
  await applyDraft({ type: r.type, payload: r.payload })
  resubmitted.value = true
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
// 承認待ちの自分の申請を編集モードで開く（画面遷移せずそのままフォームへ反映）
const startEditing = async (r: AppRequest) => {
  done.value = false
  editSaved.value = false
  resubmitted.value = false
  isEditing.value = true
  editingId.value = r.id
  await applyDraft({ type: r.type, payload: r.payload })
  note.value = r.note ?? ''
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
const cancelEditing = () => {
  isEditing.value = false
  editingId.value = ''
  resetForms()
}

const isValid = computed(() => {
  if (type.value === 'kumiai_create') return !!kumiaiCreateForm.groupId && !!kumiaiCreateForm.name.trim()
  if (type.value === 'group_create') return !!groupCreateForm.name.trim()
  if (type.value === 'kumiai_member_create') return !!memberCreateForm.displayName.trim() && !!memberCreateForm.email.trim()
  if (type.value === 'plan_change') return !!planChangeForm.targetUid && !!planChangeForm.newPlan.trim()
  if (type.value === 'supporter_change') return !!supporterChangeForm.targetUid
  if (type.value === 'kumiai_member_withdraw') return !!memberWithdrawForm.targetUid
  if (type.value === 'kumiai_dissolve') return !!kumiaiDissolveForm.groupId && !!kumiaiDissolveForm.kumiaiId
  return false
})

// Enterキー押下でも<form>のsubmitイベントは発火してしまうため、誤申請防止のため
// 実際の送信前に必ず確認ダイアログを挟む（ボタンクリックでも同様に確認する）
const handleSubmit = () => {
  if (!isValid.value) return
  const confirmMessage = isEditing.value ? 'この内容で申請を更新しますか？' : 'この内容で申請しますか？'
  if (!confirm(confirmMessage)) return
  doSubmit()
}

const doSubmit = async () => {
  submitting.value = true
  error.value = ''
  try {
    let payload: Record<string, any> = {}
    if (type.value === 'kumiai_create') {
      payload = {
        groupId: kumiaiCreateForm.groupId,
        groupName: groups.value.find(g => g.id === kumiaiCreateForm.groupId)?.name,
        name: kumiaiCreateForm.name.trim(),
        adminName: kumiaiCreateForm.adminName.trim() || undefined,
      }
    } else if (type.value === 'group_create') {
      payload = { name: groupCreateForm.name.trim() }
    } else if (type.value === 'kumiai_member_create') {
      payload = {
        displayName: memberCreateForm.displayName.trim(),
        email: memberCreateForm.email.trim(),
        groupId: memberCreateForm.groupId || undefined,
        groupName: groups.value.find(g => g.id === memberCreateForm.groupId)?.name,
        kumiaiId: memberCreateForm.kumiaiId || undefined,
        kumiaiName: memberKumiaiOptions.value.find(k => k.id === memberCreateForm.kumiaiId)?.label,
        position: memberCreateForm.position.trim() || undefined,
        mainSupporterUid: memberCreateForm.mainSupporterUid || undefined,
        mainSupporterName: users.value.find(u => u.uid === memberCreateForm.mainSupporterUid)?.displayName,
        subSupporterUid: memberCreateForm.subSupporterUid || undefined,
        subSupporterName: users.value.find(u => u.uid === memberCreateForm.subSupporterUid)?.displayName,
      }
    } else if (type.value === 'plan_change') {
      payload = {
        targetUid: planChangeForm.targetUid,
        targetName: users.value.find(u => u.uid === planChangeForm.targetUid)?.displayName,
        newPlan: planChangeForm.newPlan.trim(),
      }
    } else if (type.value === 'supporter_change') {
      payload = {
        targetUid: supporterChangeForm.targetUid,
        targetName: users.value.find(u => u.uid === supporterChangeForm.targetUid)?.displayName,
        mainSupporterUid: supporterChangeForm.mainSupporterUid || undefined,
        mainSupporterName: users.value.find(u => u.uid === supporterChangeForm.mainSupporterUid)?.displayName,
        subSupporterUid: supporterChangeForm.subSupporterUid || undefined,
        subSupporterName: users.value.find(u => u.uid === supporterChangeForm.subSupporterUid)?.displayName,
      }
    } else if (type.value === 'kumiai_member_withdraw') {
      payload = {
        targetUid: memberWithdrawForm.targetUid,
        targetName: users.value.find(u => u.uid === memberWithdrawForm.targetUid)?.displayName,
      }
    } else if (type.value === 'kumiai_dissolve') {
      payload = {
        groupId: kumiaiDissolveForm.groupId,
        groupName: groups.value.find(g => g.id === kumiaiDissolveForm.groupId)?.name,
        kumiaiId: kumiaiDissolveForm.kumiaiId,
        kumiaiName: dissolveKumiaiOptions.value.find(k => k.id === kumiaiDissolveForm.kumiaiId)?.label,
      }
    }

    if (isEditing.value && editingId.value) {
      await updateMyRequest(editingId.value, { type: type.value, payload, note: note.value.trim() || undefined })
      isEditing.value = false
      editingId.value = ''
      editSaved.value = true
    } else {
      await submit({ type: type.value, payload, note: note.value.trim() || undefined })
      done.value = true
      resetForms()
    }
    await loadPastRequests()
  } catch (e: any) {
    error.value = e.message ?? (isEditing.value ? '更新に失敗しました' : '申請に失敗しました')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="p-4 md:p-6 max-w-2xl mx-auto space-y-5">

    <div class="flex items-center gap-2 text-sm text-gray-400">
      <NuxtLink to="/requests">申請</NuxtLink>
      <Icon name="heroicons:chevron-right" class="h-3 w-3" />
      <span class="text-gray-600">{{ isEditing ? '申請の編集' : '新規申請' }}</span>
    </div>

    <h1 class="text-xl font-bold text-gray-900">{{ isEditing ? '申請の編集' : '新規申請' }}</h1>

    <div v-if="editError" class="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
      <Icon name="heroicons:exclamation-circle" class="mt-0.5 h-4 w-4 shrink-0" />
      {{ editError }}
    </div>

    <div v-if="done" class="card p-8 text-center space-y-3">
      <Icon name="heroicons:check-circle" class="h-12 w-12 text-green-400 mx-auto" />
      <p class="text-gray-700 font-medium">申請しました。理事会の承認をお待ちください。</p>
      <div class="flex items-center justify-center gap-3 pt-1">
        <button class="btn-secondary text-sm" @click="done = false">続けて申請する</button>
        <NuxtLink to="/requests" class="btn-primary text-sm">申請一覧へ</NuxtLink>
      </div>
    </div>

    <div v-else-if="editSaved" class="card p-8 text-center space-y-3">
      <Icon name="heroicons:check-circle" class="h-12 w-12 text-green-400 mx-auto" />
      <p class="text-gray-700 font-medium">申請内容を更新しました。理事会の承認をお待ちください。</p>
      <div class="flex items-center justify-center gap-3 pt-1">
        <NuxtLink to="/requests" class="btn-primary text-sm">申請一覧へ</NuxtLink>
      </div>
    </div>

    <form v-else class="card p-6 space-y-5" @submit.prevent="handleSubmit">

      <div v-if="isEditing" class="flex items-start gap-2 rounded-lg bg-blue-50 p-3 text-sm text-blue-700">
        <Icon name="heroicons:pencil-square" class="mt-0.5 h-4 w-4 shrink-0" />
        承認待ちの申請を編集しています。内容を確認して更新してください。
        <button type="button" class="ml-auto text-xs text-blue-600 hover:underline shrink-0" @click="cancelEditing">編集をやめる</button>
      </div>

      <div v-if="resubmitted" class="flex items-start gap-2 rounded-lg bg-blue-50 p-3 text-sm text-blue-700">
        <Icon name="heroicons:document-duplicate" class="mt-0.5 h-4 w-4 shrink-0" />
        却下された申請の内容をコピーしました。内容を確認・修正のうえ再申請してください。
      </div>

      <div v-if="error" class="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
        <Icon name="heroicons:exclamation-circle" class="mt-0.5 h-4 w-4 shrink-0" />
        {{ error }}
      </div>

      <!-- 申請種別 -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1.5">申請種別 <span class="text-red-500">*</span></label>
        <select v-model="type" class="input-field">
          <option v-for="(label, key) in REQUEST_TYPE_LABELS" :key="key" :value="key">{{ label }}</option>
        </select>
      </div>

      <!-- 組合の登録 -->
      <template v-if="type === 'kumiai_create'">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">所属グループ <span class="text-red-500">*</span></label>
          <select v-model="kumiaiCreateForm.groupId" class="input-field">
            <option value="">選択してください</option>
            <option v-for="g in groups" :key="g.id" :value="g.id">{{ g.name }}</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">組合名 <span class="text-red-500">*</span></label>
          <input v-model="kumiaiCreateForm.name" type="text" placeholder="例: りらくす組合" class="input-field" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">組合管理者名（任意）</label>
          <input v-model="kumiaiCreateForm.adminName" type="text" class="input-field" />
        </div>
      </template>

      <!-- グループの登録 -->
      <template v-else-if="type === 'group_create'">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">グループ名 <span class="text-red-500">*</span></label>
          <input v-model="groupCreateForm.name" type="text" placeholder="例: Sunrise" class="input-field" />
        </div>
      </template>

      <!-- 組合員の登録 -->
      <template v-else-if="type === 'kumiai_member_create'">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">氏名 <span class="text-red-500">*</span></label>
          <input v-model="memberCreateForm.displayName" type="text" placeholder="例: 西島 伸樹" class="input-field" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">メールアドレス <span class="text-red-500">*</span></label>
          <input v-model="memberCreateForm.email" type="email" placeholder="example@jaccs.co.jp" class="input-field" />
        </div>
        <div class="grid sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">所属グループ</label>
            <select v-model="memberCreateForm.groupId" class="input-field">
              <option value="">（なし）</option>
              <option v-for="g in groups" :key="g.id" :value="g.id">{{ g.name }}</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">所属組合</label>
            <SearchableSelect v-model="memberCreateForm.kumiaiId" :items="memberKumiaiOptions" placeholder="（なし）" search-placeholder="組合名で検索..." />
            <p class="mt-1 text-xs text-gray-400">所属グループとは別のグループの組合も選択できます</p>
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">タイトル</label>
          <select v-model="memberCreateForm.position" class="input-field">
            <option value="">未選択</option>
            <option v-for="t in TITLE_OPTIONS" :key="t" :value="t">{{ t }}</option>
          </select>
        </div>
        <div class="grid sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">メインサポート</label>
            <SearchableUserSelect v-model="memberCreateForm.mainSupporterUid" :users="userOptions" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">サブサポート（任意）</label>
            <SearchableUserSelect v-model="memberCreateForm.subSupporterUid" :users="userOptions" />
          </div>
        </div>
        <p class="text-xs text-gray-400">承認されると仮パスワード付きのアカウントが作成され、招待メールが送信されます。所属・タイトル・サポート者もチーム画面に反映されます。</p>
      </template>

      <!-- プラン変更 -->
      <template v-else-if="type === 'plan_change'">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">対象の組合員 <span class="text-red-500">*</span></label>
          <SearchableUserSelect v-model="planChangeForm.targetUid" :users="userOptions" placeholder="対象を選択..." />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">変更後のプラン <span class="text-red-500">*</span></label>
          <select v-model="planChangeForm.newPlan" class="input-field">
            <option v-for="plan in MEMBERSHIP_PLAN_OPTIONS" :key="plan" :value="plan">{{ plan }}</option>
          </select>
        </div>
      </template>

      <!-- サポート者の変更 -->
      <template v-else-if="type === 'supporter_change'">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">対象の組合員 <span class="text-red-500">*</span></label>
          <SearchableUserSelect v-model="supporterChangeForm.targetUid" :users="userOptions" placeholder="対象を選択..." />
        </div>
        <div class="grid sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">新しいメインサポート</label>
            <SearchableUserSelect v-model="supporterChangeForm.mainSupporterUid" :users="userOptions" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">新しいサブサポート（任意）</label>
            <SearchableUserSelect v-model="supporterChangeForm.subSupporterUid" :users="userOptions" />
          </div>
        </div>
      </template>

      <!-- 組合員の脱退 -->
      <template v-else-if="type === 'kumiai_member_withdraw'">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">対象の組合員 <span class="text-red-500">*</span></label>
          <SearchableUserSelect v-model="memberWithdrawForm.targetUid" :users="userOptions" placeholder="対象を選択..." />
        </div>
        <div class="rounded-lg bg-red-50 border border-red-200 p-3 flex items-start gap-2">
          <Icon name="heroicons:exclamation-triangle" class="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
          <p class="text-xs text-red-700">承認されると脱退フラグが設定され、対象者はシステムにログインできなくなります。</p>
        </div>
      </template>

      <!-- 組合の解体 -->
      <template v-else-if="type === 'kumiai_dissolve'">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">所属グループ <span class="text-red-500">*</span></label>
          <select v-model="kumiaiDissolveForm.groupId" class="input-field">
            <option value="">選択してください</option>
            <option v-for="g in groups" :key="g.id" :value="g.id">{{ g.name }}</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">解体する組合 <span class="text-red-500">*</span></label>
          <SearchableSelect v-model="kumiaiDissolveForm.kumiaiId" :items="dissolveKumiaiOptions" placeholder="組合を選択..." search-placeholder="組合名で検索..." />
        </div>
        <div class="rounded-lg bg-red-50 border border-red-200 p-3 flex items-start gap-2">
          <Icon name="heroicons:exclamation-triangle" class="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
          <p class="text-xs text-red-700">承認されると、以後この組合は各種選択肢に表示されなくなります（データ自体は削除されません）。</p>
        </div>
      </template>

      <!-- 備考 -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1.5">備考（任意）</label>
        <textarea v-model="note" rows="3" placeholder="申請理由や補足があれば入力してください" class="input-field" />
      </div>

      <div class="flex justify-between pt-2">
        <NuxtLink to="/requests" class="btn-secondary">キャンセル</NuxtLink>
        <button type="submit" class="btn-primary" :disabled="submitting || !isValid">
          <Icon v-if="submitting" name="heroicons:arrow-path" class="h-4 w-4 animate-spin mr-1" />
          {{ submitting ? (isEditing ? '更新中...' : '送信中...') : (isEditing ? '更新する' : '申請する') }}
        </button>
      </div>

    </form>

    <!-- 過去の自分の申請 -->
    <div class="space-y-2">
      <div class="flex items-center justify-between gap-2 flex-wrap">
        <h2 class="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
          <Icon name="heroicons:clock" class="h-4 w-4 text-gray-400" />
          過去の申請
        </h2>
        <div v-if="!pastLoading && !pastError && pastRequests.length > 0" class="flex items-center gap-2">
          <button
            class="relative flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition"
            :class="pastActiveFilterCount > 0
              ? 'border-primary-400 bg-primary-50 text-primary-700'
              : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'"
            @click="pastShowFilter = !pastShowFilter"
          >
            <Icon name="heroicons:adjustments-horizontal" class="h-3.5 w-3.5" />
            絞り込み
            <span
              v-if="pastActiveFilterCount > 0"
              class="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary-500 text-[9px] text-white font-bold"
            >{{ pastActiveFilterCount }}</span>
          </button>
          <button
            v-if="pastActiveFilterCount > 0"
            class="text-xs text-gray-400 hover:text-red-500 transition flex items-center gap-0.5"
            @click="resetPastFilters"
          >
            <Icon name="heroicons:x-mark" class="h-3.5 w-3.5" />リセット
          </button>
        </div>
      </div>

      <Transition
        enter-active-class="transition duration-150"
        enter-from-class="opacity-0 -translate-y-2"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition duration-100"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 -translate-y-2"
      >
        <div v-if="pastShowFilter" class="card p-3 grid sm:grid-cols-3 gap-3">
          <div class="space-y-1">
            <label class="text-xs font-medium text-gray-500">ステータス</label>
            <select v-model="pastFilterStatus" class="input-field text-sm py-1.5">
              <option value="all">すべて</option>
              <option value="pending">承認待ち</option>
              <option value="approved">承認済み</option>
              <option value="rejected">却下</option>
            </select>
          </div>
          <div class="space-y-1">
            <label class="text-xs font-medium text-gray-500">申請日（開始）</label>
            <input v-model="pastFilterDateFrom" type="date" class="input-field text-sm py-1.5" />
          </div>
          <div class="space-y-1">
            <label class="text-xs font-medium text-gray-500">申請日（終了）</label>
            <input v-model="pastFilterDateTo" type="date" class="input-field text-sm py-1.5" />
          </div>
        </div>
      </Transition>

      <div v-if="pastLoading" class="card p-6 text-center">
        <Icon name="heroicons:arrow-path" class="h-5 w-5 text-gray-300 mx-auto animate-spin" />
      </div>

      <div v-else-if="pastError" class="card p-6 text-center">
        <p class="text-sm text-red-500">{{ pastError }}</p>
        <button class="mt-2 text-xs text-primary-600 hover:underline" @click="loadPastRequests">再試行</button>
      </div>

      <div v-else-if="pastRequests.length === 0" class="card p-6 text-center text-sm text-gray-400">
        過去の申請はありません
      </div>

      <div v-else-if="filteredPastRequests.length === 0" class="card p-6 text-center text-sm text-gray-400">
        条件に一致する申請がありません
        <button class="block mx-auto mt-1 text-xs text-primary-600 hover:underline" @click="resetPastFilters">絞り込みをリセット</button>
      </div>

      <div v-else class="card overflow-hidden">
        <div class="divide-y divide-gray-50">
          <div v-for="r in filteredPastRequests" :key="r.id" class="px-5 py-3 flex items-start justify-between gap-3">
            <div class="min-w-0">
              <div class="flex items-center gap-2 flex-wrap mb-1">
                <span class="badge text-xs bg-gray-100 text-gray-600">{{ REQUEST_TYPE_LABELS[r.type] }}</span>
                <span class="badge text-xs" :class="requestStatusBadge(r.status)">{{ REQUEST_STATUS_LABELS[r.status] }}</span>
              </div>
              <p class="text-sm text-gray-800 truncate">{{ requestPayloadSummary(r) }}</p>
              <p class="text-xs text-gray-400 mt-0.5">{{ fmt(r.requestedAt) }} 申請</p>
              <p v-if="r.status === 'rejected' && r.rejectReason" class="text-xs text-red-500 mt-1">却下理由: {{ r.rejectReason }}</p>
              <div class="flex items-center gap-2 mt-2">
                <button
                  v-if="r.status === 'pending'"
                  class="btn-secondary text-xs flex items-center gap-1"
                  @click="startEditing(r)"
                >
                  <Icon name="heroicons:pencil-square" class="h-3.5 w-3.5" />
                  編集する
                </button>
                <button
                  v-if="r.status === 'rejected'"
                  class="btn-secondary text-xs flex items-center gap-1"
                  @click="handleResubmitFromHistory(r)"
                >
                  <Icon name="heroicons:document-duplicate" class="h-3.5 w-3.5" />
                  コピーして再申請
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <NuxtLink to="/requests" class="text-xs text-primary-600 hover:underline inline-block">申請一覧をすべて見る →</NuxtLink>
    </div>
  </div>
</template>
