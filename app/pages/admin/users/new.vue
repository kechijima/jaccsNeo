<script setup lang="ts">
import type { UserRole, SpecialTeam, GroupId } from '~/types/user'

definePageMeta({ middleware: ['auth', 'admin'] })

const { createAuthUser, updateUser, fetchUsers } = useUsers()
const { sendPasswordReset } = useAuth()

const genTempPassword = () =>
  `Jaccs${Math.random().toString(36).slice(-6)}!${Math.floor(Math.random() * 10)}`

const form = ref({
  name:            '',
  email:           '',
  password:        genTempPassword(),  // 仮パスワード（招待メールのリンクから変更してもらう）
  role:            'general' as UserRole,
  groupId:         '' as GroupId | '',
  kumiaiId:        '',
  position:        '',
  specialTeams:    [] as SpecialTeam[],
  mainSupporterUid: '',
  subSupporterUid:  '',
  sendInviteEmail: true,
})

const existingUsers = ref<Array<{ uid: string; displayName: string }>>([])
onMounted(async () => {
  existingUsers.value = await fetchUsers().catch(() => [])
})

const submitting = ref(false)
const error = ref('')

const handleSubmit = async () => {
  submitting.value = true
  error.value = ''
  try {
    // Cloud Functions経由でFirebase Authユーザー + Firestoreプロフィールを作成
    // （管理者自身のセッションはログインしたままになる）
    const uid = await createAuthUser({
      email:        form.value.email,
      password:     form.value.password,
      displayName:  form.value.name,
      role:         form.value.role,
      specialTeams: form.value.specialTeams,
      groupId:      form.value.groupId || undefined,
      kumiaiId:     form.value.kumiaiId || undefined,
      position:     form.value.position || undefined,
    })

    // 組織図（メインサポート・サブサポート）はクライアント側で追加登録する
    if (form.value.mainSupporterUid || form.value.subSupporterUid) {
      await updateUser(uid, {
        mainSupporterUid: form.value.mainSupporterUid || null,
        subSupporterUid:  form.value.subSupporterUid || null,
      })
    }

    if (form.value.sendInviteEmail) {
      // 失敗してもユーザー作成自体は成功しているので処理は継続する
      await sendPasswordReset(form.value.email).catch(() => {})
    }

    await navigateTo('/admin/users')
  } catch (e: any) {
    error.value = e.message ?? 'ユーザーの作成に失敗しました'
    submitting.value = false
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
      <span class="text-gray-600">ユーザー追加</span>
    </div>

    <h1 class="text-xl font-bold text-gray-900">新規ユーザー追加</h1>

    <form class="card p-6 space-y-5" @submit.prevent="handleSubmit">

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1.5">氏名 <span class="text-red-500">*</span></label>
        <input v-model="form.name" type="text" placeholder="例: 西島 伸樹" class="input-field" required />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1.5">メールアドレス <span class="text-red-500">*</span></label>
        <input v-model="form.email" type="email" placeholder="example@jaccs.co.jp" class="input-field" required />
      </div>

      <!-- ロール -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1.5">ロール <span class="text-red-500">*</span></label>
        <select v-model="form.role" class="input-field">
          <option value="general">一般</option>
          <option value="em2_above">EM2以上</option>
          <option value="board">理事会メンバー</option>
          <option value="system_admin">システム管理者</option>
        </select>
        <p class="mt-1 text-xs text-gray-400">
          <span v-if="form.role === 'general'">担当顧客の管理・自組合スペースの閲覧・投稿</span>
          <span v-else-if="form.role === 'em2_above'">所属グループ・組合の顧客データ管理</span>
          <span v-else-if="form.role === 'board'">全体の実績・活動データの閲覧</span>
          <span v-else>全データ・全設定の管理</span>
        </p>
      </div>

      <!-- 専門チーム -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">専門チーム（追加付与）</label>
        <div class="flex gap-3">
          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              :checked="form.specialTeams.includes('real_estate')"
              class="h-4 w-4 rounded text-primary-600"
              @change="toggleSpecialTeam('real_estate')"
            />
            <span class="text-sm text-gray-700">不動産チーム</span>
          </label>
          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              :checked="form.specialTeams.includes('non_life_insurance')"
              class="h-4 w-4 rounded text-primary-600"
              @change="toggleSpecialTeam('non_life_insurance')"
            />
            <span class="text-sm text-gray-700">損保チーム</span>
          </label>
        </div>
      </div>

      <!-- グループ・組合 -->
      <div class="grid sm:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">所属グループ</label>
          <select v-model="form.groupId" class="input-field">
            <option value="">（なし）</option>
            <option value="reterace">Reterace</option>
            <option value="miraito">Miraito</option>
            <option value="asset">Asset</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">所属組合</label>
          <input v-model="form.kumiaiId" type="text" placeholder="組合ID" class="input-field" />
        </div>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1.5">役職</label>
        <input v-model="form.position" type="text" placeholder="例: PM、EM2、一般FP" class="input-field" />
      </div>

      <!-- 組織図（サポート） -->
      <div class="grid sm:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">メインサポート</label>
          <select v-model="form.mainSupporterUid" class="input-field">
            <option value="">（なし）</option>
            <option v-for="u in existingUsers" :key="u.uid" :value="u.uid">{{ u.displayName }}</option>
          </select>
          <p class="mt-1 text-xs text-gray-400">組織図でこのメンバーの上位に表示されます</p>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">サブサポート（任意）</label>
          <select v-model="form.subSupporterUid" class="input-field">
            <option value="">（なし）</option>
            <option v-for="u in existingUsers" :key="u.uid" :value="u.uid">{{ u.displayName }}</option>
          </select>
        </div>
      </div>

      <!-- 招待メール -->
      <div class="rounded-lg bg-blue-50 border border-blue-200 p-4">
        <label class="flex items-center gap-2 cursor-pointer">
          <input v-model="form.sendInviteEmail" type="checkbox" class="h-4 w-4 rounded text-primary-600" />
          <div>
            <p class="text-sm font-medium text-blue-900">招待メールを送る</p>
            <p class="text-xs text-blue-600 mt-0.5">登録完了後、初期パスワード設定リンクをメールで送信します</p>
          </div>
        </label>
      </div>

      <div class="flex justify-between pt-2">
        <NuxtLink to="/admin/users" class="btn-secondary">キャンセル</NuxtLink>
        <button type="submit" class="btn-primary" :disabled="submitting">
          <Icon v-if="submitting" name="heroicons:arrow-path" class="h-4 w-4 animate-spin mr-1" />
          {{ submitting ? '作成中...' : 'ユーザーを追加する' }}
        </button>
      </div>

    </form>
  </div>
</template>
