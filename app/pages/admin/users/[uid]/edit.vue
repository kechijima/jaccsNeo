<script setup lang="ts">
definePageMeta({ middleware: ['auth', 'admin'] })

const route = useRoute()
const uid = computed(() => route.params.uid as string)

// フォーム初期値（Phase1でFirestoreから読み込み）
const form = ref({
  name: '西島 伸樹',
  email: 'nishijima@example.com',
  role: 'general',
  groupId: 'reterace',
  kumiaiId: 'riraclus',
  position: 'PM',
  specialTeams: [] as string[],
  isActive: true,
})

const submitting = ref(false)

const handleSubmit = async () => {
  submitting.value = true
  await new Promise(r => setTimeout(r, 800))
  submitting.value = false
  await navigateTo('/admin/users')
}

const handleDeactivate = () => {
  if (!confirm(`「${form.value.name}」のアカウントを無効化しますか？`)) return
  form.value.isActive = false
}

const handlePasswordReset = () => {
  // Firebase Auth でパスワードリセットメールを送信
  alert('パスワードリセットメールを送信しました（Phase1で実装予定）')
}

const toggleSpecialTeam = (team: string) => {
  if (form.value.specialTeams.includes(team)) {
    form.value.specialTeams = form.value.specialTeams.filter(t => t !== team)
  } else {
    form.value.specialTeams.push(team)
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
            <input type="checkbox" :checked="form.specialTeams.includes('non_life')" class="h-4 w-4 rounded text-primary-600" @change="toggleSpecialTeam('non_life')" />
            <span class="text-sm text-gray-700">損保チーム</span>
          </label>
        </div>
      </div>

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
          <label class="block text-sm font-medium text-gray-700 mb-1.5">所属組合ID</label>
          <input v-model="form.kumiaiId" type="text" class="input-field" />
        </div>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1.5">役職</label>
        <input v-model="form.position" type="text" class="input-field" />
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
