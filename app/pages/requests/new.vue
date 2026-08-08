<script setup lang="ts">
import type { RequestType } from '~/types/request'
import { REQUEST_TYPE_LABELS } from '~/types/request'
import { useRequests } from '~/composables/useRequests'
import { useGroups } from '~/composables/useGroups'
import { useUsers } from '~/composables/useUsers'
import type { Group } from '~/types/group'
import { TITLE_OPTIONS, type AppUser } from '~/types/user'

definePageMeta({ middleware: ['auth'] })

const { submit, consumeResubmitDraft } = useRequests()
const { fetchGroups } = useGroups()
const { fetchUsers } = useUsers()

const groups = ref<Group[]>([])
const users = ref<AppUser[]>([])
const resubmitted = ref(false)
onMounted(async () => {
  const [g, u] = await Promise.all([fetchGroups().catch(() => []), fetchUsers().catch(() => [])])
  groups.value = g
  users.value = u
  await applyResubmitDraft()
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
const memberKumiaiOptions = computed(() =>
  (groups.value.find(g => g.id === memberCreateForm.groupId)?.kumiai ?? [])
    .filter(k => !k.isDissolved)
    .map(k => ({ id: k.id, label: k.name })),
)
watch(() => memberCreateForm.groupId, () => { memberCreateForm.kumiaiId = '' })

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
const applyResubmitDraft = async () => {
  const draft = consumeResubmitDraft()
  if (!draft) return
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
  resubmitted.value = true
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

const handleSubmit = async () => {
  if (!isValid.value) return
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

    await submit({ type: type.value, payload, note: note.value.trim() || undefined })
    done.value = true
    resetForms()
  } catch (e: any) {
    error.value = e.message ?? '申請に失敗しました'
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
      <span class="text-gray-600">新規申請</span>
    </div>

    <h1 class="text-xl font-bold text-gray-900">新規申請</h1>

    <div v-if="done" class="card p-8 text-center space-y-3">
      <Icon name="heroicons:check-circle" class="h-12 w-12 text-green-400 mx-auto" />
      <p class="text-gray-700 font-medium">申請しました。理事会の承認をお待ちください。</p>
      <div class="flex items-center justify-center gap-3 pt-1">
        <button class="btn-secondary text-sm" @click="done = false">続けて申請する</button>
        <NuxtLink to="/requests" class="btn-primary text-sm">申請一覧へ</NuxtLink>
      </div>
    </div>

    <form v-else class="card p-6 space-y-5" @submit.prevent="handleSubmit">

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
            <SearchableSelect v-model="memberCreateForm.kumiaiId" :items="memberKumiaiOptions" placeholder="（なし）" />
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
          {{ submitting ? '送信中...' : '申請する' }}
        </button>
      </div>

    </form>
  </div>
</template>
