<script setup lang="ts">
definePageMeta({
  layout: 'auth',
  middleware: [],  // 認証不要ページ
})

const { login, sendPasswordReset, resetPasswordWithDob } = useAuth()

const email    = ref('')
const password = ref('')
const error    = ref('')
const loading  = ref(false)

// パスワードリセットモード
const isResetMode   = ref(false)
const resetSent     = ref(false)
const resetLoading  = ref(false)
const resetError    = ref('')

// メールが届かない場合の代替手段（メールアドレス＋生年月日でその場変更）
const showDobReset        = ref(false)
const dobEmail             = ref('')
const dobBirthday          = ref('')
const dobNewPassword       = ref('')
const dobNewPasswordConfirm = ref('')
const dobResetLoading      = ref(false)
const dobResetError        = ref('')
const dobResetDone         = ref(false)

const errorMessages: Record<string, string> = {
  'auth/user-not-found':       'メールアドレスが見つかりません',
  'auth/wrong-password':       'パスワードが正しくありません',
  'auth/invalid-email':        'メールアドレスの形式が正しくありません',
  'auth/too-many-requests':    'ログイン試行が多すぎます。しばらく待ってからお試しください',
  'auth/user-disabled':        'このアカウントは無効化されています',
  'auth/invalid-credential':   'メールアドレスまたはパスワードが正しくありません',
  'app/profile-not-found':     'ユーザープロフィールが見つかりません。管理者にお問い合わせください',
  'app/withdrawn':             'このアカウントは脱退手続きが完了しており、ご利用いただけません',
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

const handleDobReset = async () => {
  if (!dobEmail.value || !dobBirthday.value || !dobNewPassword.value || !dobNewPasswordConfirm.value) {
    dobResetError.value = 'すべての項目を入力してください'
    return
  }
  if (dobNewPassword.value !== dobNewPasswordConfirm.value) {
    dobResetError.value = '新しいパスワードが一致しません'
    return
  }
  if (dobNewPassword.value.length < 6) {
    dobResetError.value = 'パスワードは6文字以上で入力してください'
    return
  }
  dobResetLoading.value = true
  dobResetError.value = ''
  try {
    await resetPasswordWithDob(dobEmail.value, dobBirthday.value, dobNewPassword.value)
    dobResetDone.value = true
  } catch (e: any) {
    dobResetError.value = e?.message || 'パスワードの変更に失敗しました。入力内容をご確認ください'
  } finally {
    dobResetLoading.value = false
  }
}
</script>

<template>
  <div class="w-full max-w-md">
    <!-- ロゴ・タイトル -->
    <div class="text-center mb-8">
      <img src="/logo.png" alt="" class="w-16 h-16 object-contain mx-auto mb-4" />
      <h1 class="text-2xl font-bold text-gray-900">JACCS Neo</h1>
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
        <!-- 通常のリセットメール送信 -->
        <template v-if="!showDobReset">
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

            <div class="mt-4 text-center">
              <button
                type="button"
                class="text-xs text-gray-400 hover:text-gray-600 hover:underline"
                @click="showDobReset = true"
              >
                メールが届かない場合はこちら
              </button>
            </div>
          </template>
        </template>

        <!-- メールアドレス＋生年月日による変更（リセットメールが届かない場合の代替手段） -->
        <template v-else>
          <h2 class="text-lg font-semibold text-gray-900 mb-2">メールアドレスと生年月日で変更</h2>
          <p class="text-sm text-gray-500 mb-6">
            登録済みのメールアドレスと生年月日が一致すれば、メールを使わずその場でパスワードを変更できます。
            マイページ等で生年月日を登録していない場合はこの方法はご利用いただけません。
          </p>

          <!-- 変更完了メッセージ -->
          <div v-if="dobResetDone" class="flex items-start gap-2 rounded-lg bg-green-50 p-4 text-sm text-green-700 mb-4">
            <Icon name="heroicons:check-circle" class="mt-0.5 h-4 w-4 shrink-0" />
            <span>パスワードを変更しました。新しいパスワードでログインしてください。</span>
          </div>

          <template v-else>
            <form @submit.prevent="handleDobReset" class="space-y-4">
              <div>
                <label for="dob-reset-email" class="block text-sm font-medium text-gray-700 mb-1">
                  メールアドレス
                </label>
                <input
                  id="dob-reset-email"
                  v-model="dobEmail"
                  type="email"
                  autocomplete="email"
                  placeholder="example@email.com"
                  class="input-field"
                  :disabled="dobResetLoading"
                />
              </div>

              <div>
                <label for="dob-reset-birthday" class="block text-sm font-medium text-gray-700 mb-1">
                  生年月日
                </label>
                <input
                  id="dob-reset-birthday"
                  v-model="dobBirthday"
                  type="date"
                  class="input-field"
                  :disabled="dobResetLoading"
                />
              </div>

              <div>
                <label for="dob-reset-password" class="block text-sm font-medium text-gray-700 mb-1">
                  新しいパスワード
                </label>
                <input
                  id="dob-reset-password"
                  v-model="dobNewPassword"
                  type="password"
                  autocomplete="new-password"
                  placeholder="6文字以上"
                  class="input-field"
                  :disabled="dobResetLoading"
                />
              </div>

              <div>
                <label for="dob-reset-password-confirm" class="block text-sm font-medium text-gray-700 mb-1">
                  新しいパスワード（確認）
                </label>
                <input
                  id="dob-reset-password-confirm"
                  v-model="dobNewPasswordConfirm"
                  type="password"
                  autocomplete="new-password"
                  class="input-field"
                  :disabled="dobResetLoading"
                />
              </div>

              <div v-if="dobResetError" class="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                <Icon name="heroicons:exclamation-circle" class="mt-0.5 h-4 w-4 shrink-0" />
                {{ dobResetError }}
              </div>

              <button type="submit" class="btn-primary w-full" :disabled="dobResetLoading">
                <Icon v-if="dobResetLoading" name="heroicons:arrow-path" class="h-4 w-4 animate-spin" />
                {{ dobResetLoading ? '変更中...' : 'パスワードを変更' }}
              </button>
            </form>
          </template>

          <div class="mt-4 text-center">
            <button
              type="button"
              class="text-sm text-primary-600 hover:text-primary-700 hover:underline"
              @click="showDobReset = false; dobResetDone = false; dobResetError = ''"
            >
              ← メールでリセットする方法に戻る
            </button>
          </div>
        </template>

        <div class="mt-4 text-center">
          <button
            type="button"
            class="text-sm text-primary-600 hover:text-primary-700 hover:underline"
            @click="isResetMode = false; resetSent = false; resetError = ''; showDobReset = false; dobResetDone = false; dobResetError = ''"
          >
            ← ログインに戻る
          </button>
        </div>
      </template>
    </div>

    <!-- フッター -->
    <p class="mt-6 text-center text-xs text-gray-400">
      © {{ new Date().getFullYear() }} JACCS Neo. All rights reserved.
    </p>
  </div>
</template>
