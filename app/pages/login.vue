<script setup lang="ts">
definePageMeta({
  layout: 'auth',
  middleware: [],  // 認証不要ページ
})

const { login, sendPasswordReset } = useAuth()
const { isLoggedIn } = useCurrentUser()
const route = useRoute()

// 既にログイン済みならダッシュボードへ（直接アクセス時）
watchEffect(() => {
  if (isLoggedIn.value) {
    const redirect = route.query.redirect as string | undefined
    navigateTo(redirect || '/dashboard')
  }
})

const email    = ref('')
const password = ref('')
const error    = ref('')
const loading  = ref(false)

// パスワードリセットモード
const isResetMode   = ref(false)
const resetSent     = ref(false)
const resetLoading  = ref(false)
const resetError    = ref('')

const errorMessages: Record<string, string> = {
  'auth/user-not-found':       'メールアドレスが見つかりません',
  'auth/wrong-password':       'パスワードが正しくありません',
  'auth/invalid-email':        'メールアドレスの形式が正しくありません',
  'auth/too-many-requests':    'ログイン試行が多すぎます。しばらく待ってからお試しください',
  'auth/user-disabled':        'このアカウントは無効化されています',
  'auth/invalid-credential':   'メールアドレスまたはパスワードが正しくありません',
}

const handleLogin = async () => {
  if (!email.value || !password.value) {
    error.value = 'メールアドレスとパスワードを入力してください'
    return
  }
  loading.value = true
  error.value = ''
  try {
    await login(email.value, password.value)
  } catch (e: any) {
    error.value = errorMessages[e.code] ?? 'ログインに失敗しました。もう一度お試しください'
  } finally {
    loading.value = false
  }
}

const handlePasswordReset = async () => {
  if (!email.value) {
    resetError.value = 'メールアドレスを入力してください'
    return
  }
  resetLoading.value = true
  resetError.value = ''
  try {
    await sendPasswordReset(email.value)
    resetSent.value = true
  } catch (e: any) {
    resetError.value = errorMessages[e.code] ?? 'パスワードリセットメールの送信に失敗しました'
  } finally {
    resetLoading.value = false
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
      <p class="mt-1 text-sm text-gray-500">FP業務管理システム</p>
    </div>

    <!-- カード -->
    <div class="card p-8">

      <!-- ログインフォーム -->
      <template v-if="!isResetMode">
        <h2 class="text-lg font-semibold text-gray-900 mb-6">ログイン</h2>

        <form @submit.prevent="handleLogin" class="space-y-4">
          <!-- メールアドレス -->
          <div>
            <label for="email" class="block text-sm font-medium text-gray-700 mb-1">
              メールアドレス
            </label>
            <input
              id="email"
              v-model="email"
              type="email"
              autocomplete="email"
              placeholder="example@email.com"
              class="input-field"
              :disabled="loading"
            />
          </div>

          <!-- パスワード -->
          <div>
            <label for="password" class="block text-sm font-medium text-gray-700 mb-1">
              パスワード
            </label>
            <input
              id="password"
              v-model="password"
              type="password"
              autocomplete="current-password"
              placeholder="••••••••"
              class="input-field"
              :disabled="loading"
            />
          </div>

          <!-- エラーメッセージ -->
          <div v-if="error" class="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            <Icon name="heroicons:exclamation-circle" class="mt-0.5 h-4 w-4 shrink-0" />
            {{ error }}
          </div>

          <!-- ログインボタン -->
          <button
            type="submit"
            class="btn-primary w-full"
            :disabled="loading"
          >
            <Icon v-if="loading" name="heroicons:arrow-path" class="h-4 w-4 animate-spin" />
            {{ loading ? 'ログイン中...' : 'ログイン' }}
          </button>
        </form>

        <!-- パスワードリセットリンク -->
        <div class="mt-4 text-center">
          <button
            type="button"
            class="text-sm text-primary-600 hover:text-primary-700 hover:underline"
            @click="isResetMode = true; error = ''"
          >
            パスワードをお忘れの方
          </button>
        </div>
      </template>

      <!-- パスワードリセットフォーム -->
      <template v-else>
        <h2 class="text-lg font-semibold text-gray-900 mb-2">パスワードのリセット</h2>
        <p class="text-sm text-gray-500 mb-6">
          登録済みのメールアドレスにリセット用リンクを送信します。
        </p>

        <!-- 送信完了メッセージ -->
        <div v-if="resetSent" class="flex items-start gap-2 rounded-lg bg-green-50 p-4 text-sm text-green-700 mb-4">
          <Icon name="heroicons:check-circle" class="mt-0.5 h-4 w-4 shrink-0" />
          <span>リセット用メールを送信しました。メールをご確認ください。</span>
        </div>

        <template v-else>
          <form @submit.prevent="handlePasswordReset" class="space-y-4">
            <div>
              <label for="reset-email" class="block text-sm font-medium text-gray-700 mb-1">
                メールアドレス
              </label>
              <input
                id="reset-email"
                v-model="email"
                type="email"
                autocomplete="email"
                placeholder="example@email.com"
                class="input-field"
                :disabled="resetLoading"
              />
            </div>

            <div v-if="resetError" class="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              <Icon name="heroicons:exclamation-circle" class="mt-0.5 h-4 w-4 shrink-0" />
              {{ resetError }}
            </div>

            <button type="submit" class="btn-primary w-full" :disabled="resetLoading">
              <Icon v-if="resetLoading" name="heroicons:arrow-path" class="h-4 w-4 animate-spin" />
              {{ resetLoading ? '送信中...' : 'リセットメールを送信' }}
            </button>
          </form>
        </template>

        <div class="mt-4 text-center">
          <button
            type="button"
            class="text-sm text-primary-600 hover:text-primary-700 hover:underline"
            @click="isResetMode = false; resetSent = false; resetError = ''"
          >
            ← ログインに戻る
          </button>
        </div>
      </template>
    </div>

    <!-- フッター -->
    <p class="mt-6 text-center text-xs text-gray-400">
      © {{ new Date().getFullYear() }} jaccsNeo. All rights reserved.
    </p>
  </div>
</template>
