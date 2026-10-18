<script setup lang="ts">
import { TITLE_OPTIONS, type UserRole, type SpecialTeam, type GroupId } from '~/types/user'
import type { Group } from '~/types/group'
import type { SpecialTeamDef } from '~/types/specialTeam'
import { useGroups } from '~/composables/useGroups'
import { useSpecialTeams } from '~/composables/useSpecialTeams'
import { useOperationLog } from '~/composables/useOperationLog'
import { useDirectorIndex } from '~/composables/useDirectorIndex'

definePageMeta({ middleware: ['auth', 'admin'] })

const route = useRoute()
const uid = computed(() => route.params.uid as string)

const { fetchUser, updateUser, fetchUsers, deleteAuthUser } = useUsers()
const { fetchGroups } = useGroups()
const { fetchAll: fetchSpecialTeams } = useSpecialTeams()
const { sendPasswordReset } = useAuth()
const { upsertDirectorAssignment } = useDirectorIndex()

const loading = ref(false)
const error = ref('')
const submitting = ref(false)

const form = ref({
  name:         '',
  email:        '',
  role:         'general' as UserRole,
  groupId:      '' as GroupId | '',
  kumiaiId:     '',
  position:     '',
  specialTeams: [] as SpecialTeam[],
  mainSupporterUid: '',
  subSupporterUid:  '',
  isActive:     true,
  isWithdrawn:  false,
})

const existingUsers = ref<Array<{ uid: string; displayName: string }>>([])
const groups = ref<Group[]>([])
const specialTeams = ref<SpecialTeamDef[]>([])

// 所属組合は所属グループとは独立して選択できる（別グループの組合に所属するケースがあるため）
// 解体済みの組合は選択肢から除外する（ただし現在選択中のものは表示を保つ）
const allKumiai = computed(() =>
  groups.value.flatMap(g => g.kumiai
    .filter(k => !k.isDissolved || k.id === form.value.kumiaiId)
    .map(k => ({ ...k, groupName: g.name })))
)
const kumiaiOptions = computed(() =>
  allKumiai.value.map(k => ({ id: k.id, label: k.name, sublabel: k.groupName }))
)

const originalRole = ref<UserRole | null>(null)
const originalName = ref('')

onMounted(async () => {
  loading.value = true
  try {
    const [user, users, fetchedGroups, fetchedTeams] = await Promise.all([
      fetchUser(uid.value), fetchUsers().catch(() => []), fetchGroups().catch(() => []),
      fetchSpecialTeams().catch(() => []),
    ])
    existingUsers.value = users.filter(u => u.uid !== uid.value && !u.isWithdrawn)
    groups.value = fetchedGroups
    specialTeams.value = fetchedTeams
    if (user) {
      originalRole.value = user.role
      originalName.value = user.displayName
      form.value = {
        name:         user.displayName,
        email:        user.email,
        role:         user.role,
        groupId:      user.groupId ?? '',
        kumiaiId:     user.kumiaiId ?? '',
        position:     user.position ?? '',
        specialTeams: user.specialTeams ?? [],
        mainSupporterUid: user.mainSupporterUid ?? '',
        subSupporterUid:  user.subSupporterUid ?? '',
        isActive:     user.isActive !== false,
        isWithdrawn:  user.isWithdrawn === true,
      }
    }
  } catch (e: any) {
    error.value = e.message ?? 'ユーザー情報の取得に失敗しました'
  } finally {
    loading.value = false
    await nextTick()
    formReady.value = true
  }
})

const handleSubmit = async () => {
  submitting.value = true
  error.value = ''
  try {
    const kumiaiName = allKumiai.value.find(k => k.id === form.value.kumiaiId)?.name
    await updateUser(uid.value, {
      displayName:  form.value.name,
      role:         form.value.role,
      specialTeams: form.value.specialTeams,
      groupId:      (form.value.groupId as GroupId) || null,
      kumiaiId:     form.value.kumiaiId || null,
      kumiaiName:   kumiaiName || null,
      position:     form.value.position || null,
      mainSupporterUid: form.value.mainSupporterUid || null,
      subSupporterUid:  form.value.subSupporterUid || null,
    })
    if (originalRole.value && originalRole.value !== form.value.role) {
      useOperationLog().log('user_role_change', `${originalName.value || form.value.name}: ${originalRole.value} → ${form.value.role}`).catch(() => {})
    }
    // ディレクター逆引きに反映する（この画面からの編集でも反映されないと、
    // メンバー一覧のディレクター逆引き検索結果に出てこない不具合になるため）
    if (kumiaiName) {
      const mainSupporterName = existingUsers.value.find(u => u.uid === form.value.mainSupporterUid)?.displayName
      const subSupporterName = existingUsers.value.find(u => u.uid === form.value.subSupporterUid)?.displayName
      if (mainSupporterName && form.value.mainSupporterUid) {
        await upsertDirectorAssignment({ directorUid: form.value.mainSupporterUid, directorName: mainSupporterName, kumiaiName, role: 'main', memberUid: uid.value, memberName: form.value.name }).catch(() => {})
      }
      if (subSupporterName && form.value.subSupporterUid) {
        await upsertDirectorAssignment({ directorUid: form.value.subSupporterUid, directorName: subSupporterName, kumiaiName, role: 'sub', memberUid: uid.value, memberName: form.value.name }).catch(() => {})
      }
    }
    await navigateTo('/admin/users')
  } catch (e: any) {
    error.value = e.message ?? '保存に失敗しました'
    submitting.value = false
  }
}

const handleDeactivate = async () => {
  if (!confirm(`「${form.value.name}」のアカウントを無効化しますか？`)) return
  try {
    await updateUser(uid.value, { isActive: false })
    form.value.isActive = false
  } catch (e: any) {
    error.value = e.message ?? '無効化に失敗しました'
  }
}

// 脱退申請を経由しない、理事会・管理者による手動での脱退フラグ変更
// （本人からの脱退申請が無いケース、申請前に急ぎ対応したいケース向け）
const handleWithdraw = async () => {
  if (!confirm(`「${form.value.name}」を脱退済みにしますか？\nログインできなくなります。`)) return
  try {
    await updateUser(uid.value, { isWithdrawn: true })
    form.value.isWithdrawn = true
    form.value.isActive = false
    useOperationLog().log('user_withdraw', form.value.name).catch(() => {})
  } catch (e: any) {
    error.value = e.message ?? '脱退処理に失敗しました'
  }
}

const handleUnwithdraw = async () => {
  if (!confirm(`「${form.value.name}」の脱退を取り消し、アカウントを有効に戻しますか？`)) return
  try {
    await updateUser(uid.value, { isWithdrawn: false, isActive: true })
    form.value.isWithdrawn = false
    form.value.isActive = true
  } catch (e: any) {
    error.value = e.message ?? '脱退取り消しに失敗しました'
  }
}

// メールアドレスを誤って入力したまま作成してしまったアカウント等、正式な脱退
// フローを経ずにアカウントごと削除したい場合に使う（脱退フラグとは異なり、
// Firebase Auth・Firestoreのユーザー情報を完全に削除する。元に戻せない）
const deletingUser = ref(false)
const handleDeleteUser = async () => {
  if (!confirm(`「${form.value.name}」のアカウントを完全に削除します。\nこの操作は取り消せません。メールアドレス誤入力等での削除用です。よろしいですか？`)) return
  deletingUser.value = true
  error.value = ''
  try {
    await deleteAuthUser(uid.value)
    await navigateTo('/admin/users')
  } catch (e: any) {
    error.value = e.message ?? 'アカウントの削除に失敗しました'
    deletingUser.value = false
  }
}

const handlePasswordReset = async () => {
  try {
    await sendPasswordReset(form.value.email)
    alert('パスワードリセットメールを送信しました')
  } catch (e: any) {
    error.value = e.message ?? 'メール送信に失敗しました'
  }
}

const toggleSpecialTeam = (team: string) => {
  const t = team as SpecialTeam
  if (form.value.specialTeams.includes(t)) {
    form.value.specialTeams = form.value.specialTeams.filter(s => s !== t)
  } else {
    form.value.specialTeams.push(t)
  }
}
</script>

<template>
  <div class="p-4 md:p-6 max-w-2xl mx-auto space-y-5">

    <div class="flex items-center gap-2 text-sm text-gray-400">
      <NuxtLink to="/admin">管理者設定</NuxtLink>
      <Icon name="heroicons:chevron-right" class="h-3 w-3" />
      <NuxtLink to="/admin/users">ユーザー管理</NuxtLink>
      <Icon name="heroicons:chevron-right" class="h-3 w-3" />
      <span class="text-gray-600">{{ form.name }}</span>
    </div>

    <h1 class="text-xl font-bold text-gray-900">ユーザー編集</h1>

    <form class="card p-6 space-y-5" @submit.prevent="handleSubmit">

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1.5">氏名</label>
        <input v-model="form.name" type="text" class="input-field" />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1.5">メールアドレス</label>
        <input v-model="form.email" type="email" class="input-field bg-gray-50" readonly />
        <p class="mt-1 text-xs text-gray-400">メールアドレスはFirebase Authから変更してください</p>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1.5">ロール</label>
        <select v-model="form.role" class="input-field">
          <option value="general">一般</option>
          <option value="em2_above">EM2以上</option>
          <option value="board">理事会メンバー</option>
          <option value="system_admin">システム管理者</option>
        </select>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">専門チーム（追加付与）</label>
        <div v-if="specialTeams.length === 0" class="text-xs text-gray-400">専門チームが登録されていません（「グループ・組合マスタ」画面から追加できます）</div>
        <div v-else class="flex flex-wrap gap-3">
          <label v-for="t in specialTeams" :key="t.id" class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" :checked="form.specialTeams.includes(t.id)" class="h-4 w-4 rounded text-primary-600" @change="toggleSpecialTeam(t.id)" />
            <span class="text-sm text-gray-700">{{ t.name }}</span>
          </label>
        </div>
      </div>

      <div class="grid sm:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">所属グループ</label>
          <select v-model="form.groupId" class="input-field">
            <option value="">（なし）</option>
            <option v-for="g in groups" :key="g.id" :value="g.id">{{ g.name }}</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">所属組合</label>
          <SearchableSelect v-model="form.kumiaiId" :items="kumiaiOptions" search-placeholder="組合名で検索..." />
          <p class="mt-1 text-xs text-gray-400">所属グループとは別のグループの組合も選択できます</p>
        </div>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1.5">タイトル</label>
        <select v-model="form.position" class="input-field">
          <option value="">未選択</option>
          <option v-for="t in TITLE_OPTIONS" :key="t" :value="t">{{ t }}</option>
        </select>
      </div>

      <!-- 組織図（サポート） -->
      <div class="grid sm:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">メインサポート</label>
          <SearchableUserSelect v-model="form.mainSupporterUid" :users="existingUsers" />
          <p class="mt-1 text-xs text-gray-400">組織図でこのメンバーの上位に表示されます</p>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">サブサポート（任意）</label>
          <SearchableUserSelect v-model="form.subSupporterUid" :users="existingUsers" />
        </div>
      </div>

      <!-- アカウント状態 -->
      <div class="flex items-center justify-between rounded-lg border border-gray-200 p-4">
        <div>
          <p class="text-sm font-medium text-gray-900">アカウント状態</p>
          <p class="text-xs text-gray-500 mt-0.5">{{ form.isActive ? '現在有効です' : '現在無効です' }}</p>
        </div>
        <span class="badge" :class="form.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'">
          {{ form.isActive ? '有効' : '無効' }}
        </span>
      </div>

      <!-- 脱退状態 -->
      <div v-if="form.isWithdrawn" class="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-4">
        <div>
          <p class="text-sm font-medium text-red-700">脱退済み</p>
          <p class="text-xs text-red-500 mt-0.5">ログインできません</p>
        </div>
        <span class="badge bg-red-100 text-red-600">脱退済み</span>
      </div>

      <div class="flex justify-between pt-2">
        <NuxtLink to="/admin/users" class="btn-secondary">キャンセル</NuxtLink>
        <button type="submit" class="btn-primary" :disabled="submitting">
          <Icon v-if="submitting" name="heroicons:arrow-path" class="h-4 w-4 animate-spin mr-1" />
          {{ submitting ? '保存中...' : '変更を保存する' }}
        </button>
      </div>

    </form>

    <!-- アカウント操作 -->
    <div class="card p-5 border border-orange-200">
      <h2 class="font-semibold text-orange-700 mb-3">アカウント操作</h2>
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-800">パスワードリセット</p>
            <p class="text-xs text-gray-500">リセット用メールを送信します</p>
          </div>
          <button class="btn-secondary text-sm" @click="handlePasswordReset">送信</button>
        </div>
        <div v-if="form.isActive" class="flex items-center justify-between border-t border-gray-100 pt-3">
          <div>
            <p class="text-sm font-medium text-gray-800">アカウント無効化</p>
            <p class="text-xs text-gray-500">ログイン不可になります</p>
          </div>
          <button class="btn-danger text-sm" @click="handleDeactivate">無効化</button>
        </div>
        <div v-if="!form.isWithdrawn" class="flex items-center justify-between border-t border-gray-100 pt-3">
          <div>
            <p class="text-sm font-medium text-gray-800">脱退（手動）</p>
            <p class="text-xs text-gray-500">脱退申請を経由せず、ここから直接脱退済みにします</p>
          </div>
          <button class="btn-danger text-sm" @click="handleWithdraw">脱退済みにする</button>
        </div>
        <div v-else class="flex items-center justify-between border-t border-gray-100 pt-3">
          <div>
            <p class="text-sm font-medium text-gray-800">脱退の取り消し</p>
            <p class="text-xs text-gray-500">脱退状態を解除し、アカウントを有効に戻します</p>
          </div>
          <button class="btn-secondary text-sm" @click="handleUnwithdraw">取り消す</button>
        </div>
        <div class="flex items-center justify-between border-t border-gray-100 pt-3">
          <div>
            <p class="text-sm font-medium text-red-600">アカウントを完全に削除</p>
            <p class="text-xs text-gray-500">メールアドレスの誤入力等で作成してしまった場合に使用します（元に戻せません）</p>
          </div>
          <button class="btn-danger text-sm" :disabled="deletingUser" @click="handleDeleteUser">
            <Icon v-if="deletingUser" name="heroicons:arrow-path" class="h-4 w-4 animate-spin mr-1" />
            削除する
          </button>
        </div>
      </div>
    </div>

  </div>
</template>
