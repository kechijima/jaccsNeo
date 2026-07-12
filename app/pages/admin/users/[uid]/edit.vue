<script setup lang="ts">
import type { UserRole, SpecialTeam, GroupId } from '~/types/user'
import type { Group } from '~/types/group'
import { useGroups } from '~/composables/useGroups'

definePageMeta({ middleware: ['auth', 'admin'] })

const route = useRoute()
const uid = computed(() => route.params.uid as string)

const { fetchUser, updateUser, fetchUsers } = useUsers()
const { fetchGroups } = useGroups()
const { sendPasswordReset } = useAuth()

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
})

const existingUsers = ref<Array<{ uid: string; displayName: string }>>([])
const groups = ref<Group[]>([])

// 所属組合は所属グループとは独立して選択できる（別グループの組合に所属するケースがあるため）
const allKumiai = computed(() =>
  groups.value.flatMap(g => g.kumiai.map(k => ({ ...k, groupName: g.name })))
)
const kumiaiOptions = computed(() =>
  allKumiai.value.map(k => ({ id: k.id, label: k.name, sublabel: k.groupName }))
)

onMounted(async () => {
  loading.value = true
  try {
    const [user, users, fetchedGroups] = await Promise.all([
      fetchUser(uid.value), fetchUsers().catch(() => []), fetchGroups().catch(() => []),
    ])
    existingUsers.value = users.filter(u => u.uid !== uid.value)
    groups.value = fetchedGroups
    if (user) {
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
        isActive:     true,
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
    await navigateTo('/admin/users')
  } catch (e: any) {
    error.value = e.message ?? '保存に失敗しました'
    submitting.value = false
  }
}

const handleDeactivate = async () => {
  if (!confirm(`「${form.value.name}」のアカウントを無効化しますか？`)) return
  try {
    await updateUser(uid.value, { isDisabled: true })
    form.value.isActive = false
  } catch (e: any) {
    error.value = e.message ?? '無効化に失敗しました'
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
        <div class="flex gap-3">
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" :checked="form.specialTeams.includes('real_estate')" class="h-4 w-4 rounded text-primary-600" @change="toggleSpecialTeam('real_estate')" />
            <span class="text-sm text-gray-700">不動産チーム</span>
          </label>
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" :checked="form.specialTeams.includes('non_life_insurance')" class="h-4 w-4 rounded text-primary-600" @change="toggleSpecialTeam('non_life_insurance')" />
            <span class="text-sm text-gray-700">損保チーム</span>
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
        <label class="block text-sm font-medium text-gray-700 mb-1.5">役職</label>
        <input v-model="form.position" type="text" class="input-field" />
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
      </div>
    </div>

  </div>
</template>
