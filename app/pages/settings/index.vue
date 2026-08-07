<script setup lang="ts">
import { useUsers } from '~/composables/useUsers'
import { useAuthStore } from '~/stores/auth'
import { NOTIFICATION_PREF_LABELS } from '~/types/notification'
import type { NotificationPrefs } from '~/types/notification'
import type { AppUser } from '~/types/user'

definePageMeta({ middleware: ['auth'] })

const { user } = useCurrentUser()
const { updateMyProfile } = useUsers()
const { sendPasswordReset } = useAuth()
const authStore = useAuthStore()

// ── 通知設定 ─────────────────────────────────────────────────────────────
const PREF_KEYS = Object.keys(NOTIFICATION_PREF_LABELS) as (keyof NotificationPrefs)[]

const prefs = reactive<Required<NotificationPrefs>>({
  mention: true,
  comment: true,
  event:   true,
  system:  true,
})

const loadPrefs = () => {
  const saved = user.value?.notificationPrefs
  for (const key of PREF_KEYS) {
    prefs[key] = saved?.[key] ?? true
  }
}
onMounted(loadPrefs)
watch(() => user.value?.uid, loadPrefs)

const savingPrefs = ref(false)
const prefsSaved   = ref(false)
const prefsError   = ref('')

const togglePref = async (key: keyof NotificationPrefs) => {
  prefs[key] = !prefs[key]
  savingPrefs.value = true
  prefsError.value = ''
  try {
    const next = { ...prefs }
    await updateMyProfile({ notificationPrefs: next })
    if (authStore.user) authStore.setUser({ ...authStore.user, notificationPrefs: next } as AppUser)
    prefsSaved.value = true
    setTimeout(() => { prefsSaved.value = false }, 1500)
  } catch (e: any) {
    prefs[key] = !prefs[key] // 失敗時は元に戻す
    prefsError.value = e.message ?? '通知設定の保存に失敗しました'
  } finally {
    savingPrefs.value = false
  }
}

// ── パスワード設定 ───────────────────────────────────────────────────────
const sendingReset = ref(false)
const resetSent     = ref(false)
const resetError    = ref('')

const handlePasswordReset = async () => {
  if (!user.value?.email) return
  sendingReset.value = true
  resetError.value = ''
  try {
    await sendPasswordReset(user.value.email)
    resetSent.value = true
  } catch (e: any) {
    resetError.value = e.message ?? 'パスワード再設定メールの送信に失敗しました'
  } finally {
    sendingReset.value = false
  }
}
</script>

<template>
  <div class="p-4 md:p-6 max-w-2xl mx-auto space-y-5">

    <div class="flex items-center gap-2 text-sm text-gray-400">
      <NuxtLink to="/mypage">マイページ</NuxtLink>
      <Icon name="heroicons:chevron-right" class="h-3 w-3" />
      <span class="text-gray-600">設定</span>
    </div>

    <h1 class="text-xl font-bold text-gray-900 flex items-center gap-2">
      <Icon name="heroicons:cog-6-tooth" class="h-6 w-6 text-primary-600" />
      設定
    </h1>

    <!-- 通知設定 -->
    <div class="card p-5">
      <div class="flex items-center justify-between mb-1">
        <h2 class="font-semibold text-gray-900 flex items-center gap-2">
          <Icon name="heroicons:bell" class="h-5 w-5 text-primary-600" />
          通知設定
        </h2>
        <span v-if="prefsSaved" class="text-xs text-green-600 flex items-center gap-1">
          <Icon name="heroicons:check" class="h-3.5 w-3.5" />保存しました
        </span>
      </div>
      <p class="text-xs text-gray-400 mb-4">アプリ内通知（画面右上のベルアイコン）を受け取るかどうかを設定します</p>

      <div class="divide-y divide-gray-100">
        <div
          v-for="key in PREF_KEYS"
          :key="key"
          class="flex items-center justify-between py-3"
        >
          <span class="text-sm text-gray-700">{{ NOTIFICATION_PREF_LABELS[key] }}</span>
          <button
            type="button"
            role="switch"
            :aria-checked="prefs[key]"
            class="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors"
            :class="prefs[key] ? 'bg-primary-600' : 'bg-gray-200'"
            :disabled="savingPrefs"
            @click="togglePref(key)"
          >
            <span
              class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
              :class="prefs[key] ? 'translate-x-6' : 'translate-x-1'"
            />
          </button>
        </div>
      </div>
      <p v-if="prefsError" class="mt-2 text-xs text-red-500">{{ prefsError }}</p>
    </div>

    <!-- パスワード設定 -->
    <div class="card p-5">
      <h2 class="font-semibold text-gray-900 flex items-center gap-2 mb-1">
        <Icon name="heroicons:key" class="h-5 w-5 text-primary-600" />
        パスワード設定
      </h2>
      <p class="text-xs text-gray-400 mb-4">
        登録メールアドレス（{{ user?.email }}）宛にパスワード再設定用のリンクを送信します
      </p>

      <div v-if="resetSent" class="rounded-lg bg-green-50 border border-green-200 px-4 py-3 flex items-start gap-2">
        <Icon name="heroicons:check-circle" class="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
        <p class="text-sm text-green-700">
          {{ user?.email }} 宛にパスワード再設定メールを送信しました。メール内のリンクから新しいパスワードを設定してください。
        </p>
      </div>
      <template v-else>
        <button class="btn-secondary text-sm flex items-center gap-1.5" :disabled="sendingReset" @click="handlePasswordReset">
          <Icon v-if="sendingReset" name="heroicons:arrow-path" class="h-4 w-4 animate-spin" />
          <Icon v-else name="heroicons:paper-airplane" class="h-4 w-4" />
          {{ sendingReset ? '送信中...' : 'パスワード再設定メールを送信する' }}
        </button>
        <p v-if="resetError" class="mt-2 text-xs text-red-500">{{ resetError }}</p>
      </template>
    </div>

    <!-- アプリのインストール -->
    <PwaInstallSettingsCard />

  </div>
</template>
