<script setup lang="ts">
import type { RequestType } from '~/types/request'
import { REQUEST_TYPE_LABELS } from '~/types/request'
import { useRequests } from '~/composables/useRequests'
import { useGroups } from '~/composables/useGroups'
import { useUsers } from '~/composables/useUsers'
import type { Group } from '~/types/group'
import type { AppUser } from '~/types/user'

definePageMeta({ middleware: ['auth'] })

const { submit } = useRequests()
const { fetchGroups } = useGroups()
const { fetchUsers } = useUsers()

const groups = ref<Group[]>([])
const users = ref<AppUser[]>([])
onMounted(async () => {
  const [g, u] = await Promise.all([fetchGroups().catch(() => []), fetchUsers().catch(() => [])])
  groups.value = g
  users.value = u
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
    .map(k => ({ id: k.id, label: k.name })),
)
watch(() => memberCreateForm.groupId, () => { memberCreateForm.kumiaiId = '' })

// ── プラン変更・サポート者変更（対象ユーザー選択は共通） ────────────────
const planChangeForm = reactive({ targetUid: '', newPlan: '' })
const supporterChangeForm = reactive({ targetUid: '', mainSupporterUid: '', subSupporterUid: '' })

const note = ref('')

const userOptions = computed(() => users.value.map(u => ({ uid: u.uid, displayName: u.displayName })))

const resetForms = () => {
  Object.assign(kumiaiCreateForm, { groupId: '', name: '', adminName: '' })
  Object.assign(groupCreateForm, { name: '' })
  Object.assign(memberCreateForm, { displayName: '', email: '', groupId: '', kumiaiId: '', position: '', mainSupporterUid: '', subSupporterUid: '' })
  Object.assign(planChangeForm, { targetUid: '', newPlan: '' })
  Object.assign(supporterChangeForm, { targetUid: '', mainSupporterUid: '', subSupporterUid: '' })
  note.value = ''
}

const isValid = computed(() => {
  if (type.value === 'kumiai_create') return !!kumiaiCreateForm.groupId && !!kumiaiCreateForm.name.trim()
  if (type.value === 'group_create') return !!groupCreateForm.name.trim()
  if (type.value === 'kumiai_member_create') return !!memberCreateForm.displayName.trim() && !!memberCreateForm.email.trim()
  if (type.value === 'plan_change') return !!planChangeForm.targetUid && !!planChangeForm.newPlan.trim()
  if (type.value === 'supporter_change') return !!supporterChangeForm.targetUid
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
          <label class="block text-sm font-medium text-gray-700 mb-1.5">役職</label>
          <input v-model="memberCreateForm.position" type="text" placeholder="例: 一般FP" class="input-field" />
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
        <p class="text-xs text-gray-400">承認されると仮パスワード付きのアカウントが作成され、招待メールが送信されます。所属・役職・サポート者もチーム画面に反映されます。</p>
      </template>

      <!-- プラン変更 -->
      <template v-else-if="type === 'plan_change'">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">対象の組合員 <span class="text-red-500">*</span></label>
          <SearchableUserSelect v-model="planChangeForm.targetUid" :users="userOptions" placeholder="対象を選択..." />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">変更後のプラン <span class="text-red-500">*</span></label>
          <input v-model="planChangeForm.newPlan" type="text" placeholder="例: プレミアムプラン" class="input-field" />
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
