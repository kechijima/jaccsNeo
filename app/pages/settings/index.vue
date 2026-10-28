<script setup lang="ts">
import { useUsers } from '~/composables/useUsers'
import { useAuthStore } from '~/stores/auth'
import { NOTIFICATION_PREF_LABELS } from '~/types/notification'
import type { NotificationPrefs } from '~/types/notification'
import type { AppUser } from '~/types/user'
import { usePushNotifications } from '~/composables/usePushNotifications'
import { useAppearance, DEFAULT_PRIMARY_COLOR } from '~/composables/useAppearance'

definePageMeta({ middleware: ['auth'] })

const { user } = useCurrentUser()
const { updateMyProfile } = useUsers()
const { sendPasswordReset } = useAuth()
const authStore = useAuthStore()

// ── 表示設定（ライト/ダーク・メインカラー） ───────────────────────────────
const { colorMode, primaryColor, ensureLoaded: ensureAppearanceLoaded, setColorMode, setPrimaryColor } = useAppearance()
ensureAppearanceLoaded()

const PRESET_COLORS = ['#00AFCC', '#2563EB', '#7C3AED', '#DB2777', '#DC2626', '#EA580C', '#16A34A', '#0F172A']
const isCustomColor = computed(() => !PRESET_COLORS.some(c => c.toLowerCase() === primaryColor.value.toLowerCase()))
const onCustomColorChange = (e: Event) => setPrimaryColor((e.target as HTMLInputElement).value)

// ── push通知（端末への通知） ─────────────────────────────────────────────
const { status: pushStatus, unsupportedReasons, syncStatus: syncPushStatus, enablePush, disablePush } = usePushNotifications()
onMounted(syncPushStatus)

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
      <span class="text-gray-600">個人設定</span>
    </div>

    <h1 class="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
      <Icon name="heroicons:cog-6-tooth" class="h-6 w-6 text-primary-600" />
      個人設定
    </h1>

    <!-- 表示設定 -->
    <div class="card p-5">
      <h2 class="font-semibold text-gray-900 flex items-center gap-2 mb-1">
        <Icon name="heroicons:swatch" class="h-5 w-5 text-primary-600" />
        表示設定
      </h2>
      <p class="text-xs text-gray-400 mb-4">画面の表示モードとメインカラーを設定します</p>

      <div class="space-y-4">
        <div>
          <p class="text-xs font-medium text-gray-500 mb-2">表示モード</p>
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="flex items-center gap-2 rounded-lg border-2 px-3 py-2 text-sm font-medium transition"
              :class="colorMode === 'light' ? 'border-primary-400 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'"
              @click="setColorMode('light')"
            >
              <Icon name="heroicons:sun" class="h-4 w-4 shrink-0" />
              ライト
            </button>
            <button
              type="button"
              class="flex items-center gap-2 rounded-lg border-2 px-3 py-2 text-sm font-medium transition"
              :class="colorMode === 'dark' ? 'border-primary-400 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'"
              @click="setColorMode('dark')"
            >
              <Icon name="heroicons:moon" class="h-4 w-4 shrink-0" />
              ダーク
            </button>
          </div>
        </div>

        <div>
          <p class="text-xs font-medium text-gray-500 mb-2">メインカラー</p>
          <div class="flex items-center gap-2.5 flex-wrap">
            <button
              v-for="c in PRESET_COLORS"
              :key="c"
              type="button"
              class="h-8 w-8 rounded-full transition"
              :class="primaryColor.toLowerCase() === c.toLowerCase() ? 'ring-2 ring-offset-2 ring-gray-900' : 'ring-1 ring-inset ring-black/10 hover:scale-110'"
              :style="{ backgroundColor: c }"
              :aria-label="c"
              @click="setPrimaryColor(c)"
            />
            <label
              class="relative h-8 w-8 rounded-full cursor-pointer flex items-center justify-center overflow-hidden transition"
              :class="isCustomColor ? 'ring-2 ring-offset-2 ring-gray-900' : 'border-2 border-dashed border-gray-300 hover:border-gray-400'"
              :style="isCustomColor ? { backgroundColor: primaryColor } : {}"
              title="カスタムカラーを選択"
            >
              <Icon v-if="!isCustomColor" name="heroicons:plus" class="h-4 w-4 text-gray-400" />
              <input type="color" :value="primaryColor" class="absolute inset-0 h-full w-full opacity-0 cursor-pointer" @change="onCustomColorChange" />
            </label>
          </div>
          <button
            v-if="primaryColor.toLowerCase() !== DEFAULT_PRIMARY_COLOR.toLowerCase()"
            type="button"
            class="mt-2 text-xs text-gray-400 hover:text-gray-600 underline"
            @click="setPrimaryColor(DEFAULT_PRIMARY_COLOR)"
          >
            既定の色に戻す
          </button>
        </div>
      </div>
    </div>

    <!-- push通知 -->
    <div class="card p-5">
      <h2 class="font-semibold text-gray-900 flex items-center gap-2 mb-1">
        <Icon name="heroicons:device-phone-mobile" class="h-5 w-5 text-primary-600" />
        push通知
      </h2>
      <p class="text-xs text-gray-400 mb-4">この端末（ブラウザ）がアプリを開いていないときでも、新着メンションやコメントなどを通知として受け取れるようにします</p>

      <div v-if="pushStatus === 'unsupported'" class="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-500">
        <p>この端末・ブラウザはpush通知に対応していません</p>
        <ul v-if="unsupportedReasons.length > 0" class="mt-2 space-y-1 text-xs text-gray-400 list-disc list-inside">
          <li v-for="(reason, i) in unsupportedReasons" :key="i">{{ reason }}</li>
        </ul>
      </div>
      <div v-else-if="pushStatus === 'denied'" class="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700">
        通知がブロックされています。ブラウザの設定からこのサイトの通知を許可してください
      </div>
      <div v-else class="flex items-center justify-between">
        <span class="text-sm text-gray-700">{{ pushStatus === 'granted' ? 'この端末では有効です' : 'この端末では無効です' }}</span>
        <button
          v-if="pushStatus === 'granted'"
          type="button"
          class="btn-secondary text-sm"
          @click="disablePush"
        >
          無効にする
        </button>
        <button
          v-else
          type="button"
          class="btn-primary text-sm"
          :disabled="pushStatus === 'requesting'"
          @click="enablePush"
        >
          <Icon v-if="pushStatus === 'requesting'" name="heroicons:arrow-path" class="h-4 w-4 animate-spin mr-1" />
          push通知を有効にする
        </button>
      </div>
    </div>

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
