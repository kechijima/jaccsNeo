<script setup lang="ts">
definePageMeta({
  layout: 'auth',
  middleware: [],  // 認証不要ページ（初回セットアップ用）
})

const { createAuthUser } = useUsers()
const router = useRouter()

const form = ref({
  displayName: '',
  email: '',
  password: '',
  passwordConfirm: '',
})

const submitting = ref(false)
const error = ref('')
const done = ref(false)

const handleSubmit = async () => {
  error.value = ''
  if (!form.value.displayName || !form.value.email || !form.value.password) {
    error.value = '氏名・メールアドレス・パスワードを入力してください'
    return
  }
  if (form.value.password.length < 6) {
    error.value = 'パスワードは6文字以上で指定してください'
    return
  }
  if (form.value.password !== form.value.passwordConfirm) {
    error.value = 'パスワードが一致しません'
    return
  }

  submitting.value = true
  try {
    await createAuthUser({
      email:        form.value.email,
      password:     form.value.password,
      displayName:  form.value.displayName,
      role:         'system_admin',
      specialTeams: [],
    })
    done.value = true
  } catch (e: any) {
    error.value = e.message ?? 'アカウントの作成に失敗しました'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="w-full max-w-md">
    <!-- ロゴ・タイトル -->
    <div class="text-center mb-8">
      <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-600 shadow-lg mb-4">
        <span class="text-2xl font-bold text-white">J</span>
      </div>
      <h1 class="text-2xl font-bold text-gray-900">jaccsNeo</h1>
      <p class="mt-1 text-sm text-gray-500">初期セットアップ</p>
    </div>

    <div class="card p-8">
      <!-- 完了 -->
      <template v-if="done">
        <div class="text-center space-y-4">
          <Icon name="heroicons:check-circle" class="h-12 w-12 text-green-500 mx-auto" />
          <div>
            <h2 class="text-lg font-semibold text-gray-900">管理者アカウントを作成しました</h2>
            <p class="text-sm text-gray-500 mt-1">作成したメールアドレスでログインしてください</p>
          </div>
          <NuxtLink to="/login" class="btn-primary w-full inline-flex justify-center">ログイン画面へ</NuxtLink>
        </div>
      </template>

      <!-- セットアップフォーム -->
      <template v-else>
        <h2 class="text-lg font-semibold text-gray-900 mb-2">最初の管理者アカウントを作成</h2>
        <p class="text-sm text-gray-500 mb-6">
          このページは、まだユーザーが1人も登録されていない場合にのみ利用できます。
          作成したアカウントはシステム管理者として登録されます。
        </p>

        <form class="space-y-4" @submit.prevent="handleSubmit">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">氏名</label>
            <input v-model="form.displayName" type="text" placeholder="例: 西島 伸樹" class="input-field" :disabled="submitting" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">メールアドレス</label>
            <input v-model="form.email" type="email" autocomplete="email" placeholder="example@jaccs.co.jp" class="input-field" :disabled="submitting" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">パスワード</label>
            <input v-model="form.password" type="password" autocomplete="new-password" placeholder="6文字以上" class="input-field" :disabled="submitting" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">パスワード（確認）</label>
            <input v-model="form.passwordConfirm" type="password" autocomplete="new-password" class="input-field" :disabled="submitting" />
          </div>

          <div v-if="error" class="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            <Icon name="heroicons:exclamation-circle" class="mt-0.5 h-4 w-4 shrink-0" />
            {{ error }}
          </div>

          <button type="submit" class="btn-primary w-full" :disabled="submitting">
            <Icon v-if="submitting" name="heroicons:arrow-path" class="h-4 w-4 animate-spin" />
            {{ submitting ? '作成中...' : '管理者アカウントを作成する' }}
          </button>
        </form>

        <div class="mt-4 text-center">
          <NuxtLink to="/login" class="text-sm text-primary-600 hover:text-primary-700 hover:underline">
            ← ログイン画面に戻る
          </NuxtLink>
        </div>
      </template>
    </div>

    <p class="mt-6 text-center text-xs text-gray-400">
      © {{ new Date().getFullYear() }} jaccsNeo. All rights reserved.
    </p>
  </div>
</template>
