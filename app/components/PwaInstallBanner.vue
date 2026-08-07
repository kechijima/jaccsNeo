<script setup lang="ts">
// アプリのインストールを促すバナー。
// Android/Chrome/デスクトップ等はbeforeinstallpromptに対応しているため@vite-pwa/nuxtの
// $pwa.showInstallPromptで検知して「インストール」ボタンから直接インストールできるようにする。
// iOS Safariはbeforeinstallprompt非対応のため、「ホーム画面に追加」の手順を案内する。
const { $pwa } = useNuxtApp()

const IOS_DISMISS_KEY = 'jaccsneo:ios-install-dismissed'

const isIos = ref(false)
const isStandalone = ref(false)
const iosDismissed = ref(true)
const installing = ref(false)

onMounted(() => {
  const ua = window.navigator.userAgent
  isIos.value = /iphone|ipad|ipod/i.test(ua) && !(window as any).MSStream
  isStandalone.value = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true
  iosDismissed.value = localStorage.getItem(IOS_DISMISS_KEY) === '1'
})

const showAndroidPrompt = computed(() => !!$pwa?.showInstallPrompt?.value)
const showIosPrompt = computed(() => isIos.value && !isStandalone.value && !iosDismissed.value)

const handleInstall = async () => {
  installing.value = true
  try {
    await $pwa?.install()
  } finally {
    installing.value = false
  }
}

const dismissAndroid = () => $pwa?.cancelInstall()
const dismissIos = () => {
  iosDismissed.value = true
  localStorage.setItem(IOS_DISMISS_KEY, '1')
}
</script>

<template>
  <Transition
    enter-active-class="transition duration-200"
    enter-from-class="opacity-0 translate-y-4"
    enter-to-class="opacity-100 translate-y-0"
    leave-active-class="transition duration-150"
    leave-from-class="opacity-100 translate-y-0"
    leave-to-class="opacity-0 translate-y-4"
  >
    <!-- Android/Chrome等: ネイティブのインストールプロンプトを起動 -->
    <div
      v-if="showAndroidPrompt"
      class="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-md rounded-xl bg-white shadow-lg ring-1 ring-gray-200 p-4 flex items-center gap-3"
    >
      <img src="/logo.png" alt="" class="h-10 w-10 object-contain shrink-0" />
      <div class="flex-1 min-w-0">
        <p class="text-sm font-semibold text-gray-900">JACCS Neoをインストール</p>
        <p class="text-xs text-gray-500 mt-0.5">ホーム画面・デスクトップからアプリのようにすぐ開けます</p>
      </div>
      <button class="btn-primary text-xs px-3 py-1.5 shrink-0" :disabled="installing" @click="handleInstall">
        {{ installing ? '処理中...' : 'インストール' }}
      </button>
      <button class="text-gray-300 hover:text-gray-500 transition shrink-0" aria-label="閉じる" @click="dismissAndroid">
        <Icon name="heroicons:x-mark" class="h-4 w-4" />
      </button>
    </div>

    <!-- iOS Safari: 手動での追加手順を案内 -->
    <div
      v-else-if="showIosPrompt"
      class="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-md rounded-xl bg-white shadow-lg ring-1 ring-gray-200 p-4 flex items-start gap-3"
    >
      <img src="/logo.png" alt="" class="h-10 w-10 object-contain shrink-0" />
      <div class="flex-1 min-w-0">
        <p class="text-sm font-semibold text-gray-900">JACCS Neoをホーム画面に追加</p>
        <p class="text-xs text-gray-500 mt-1 leading-relaxed">
          共有ボタン
          <Icon name="heroicons:arrow-up-on-square" class="h-3.5 w-3.5 inline -mt-0.5" />
          から「ホーム画面に追加」を選ぶと、アプリのようにすぐ開けます
        </p>
      </div>
      <button class="text-gray-300 hover:text-gray-500 transition shrink-0" aria-label="閉じる" @click="dismissIos">
        <Icon name="heroicons:x-mark" class="h-4 w-4" />
      </button>
    </div>
  </Transition>
</template>
