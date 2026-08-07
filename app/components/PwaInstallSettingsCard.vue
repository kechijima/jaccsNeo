<script setup lang="ts">
const { $pwa } = useNuxtApp()

const isIos = ref(false)
const isStandalone = ref(false)
const installing = ref(false)

onMounted(() => {
  const ua = window.navigator.userAgent
  isIos.value = /iphone|ipad|ipod/i.test(ua) && !(window as any).MSStream
  isStandalone.value = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true
})

const canInstallDirect = computed(() => !!$pwa?.showInstallPrompt?.value)

const handleInstall = async () => {
  installing.value = true
  try {
    await $pwa?.install()
  } finally {
    installing.value = false
  }
}
</script>

<template>
  <div class="card p-5">
    <h2 class="font-semibold text-gray-900 flex items-center gap-2 mb-1">
      <Icon name="heroicons:arrow-down-tray" class="h-5 w-5 text-primary-600" />
      アプリのインストール
    </h2>
    <p class="text-xs text-gray-400 mb-4">
      ホーム画面・デスクトップにアプリとして追加すると、ブラウザなしですぐに開けます
    </p>

    <div v-if="isStandalone" class="flex items-center gap-2 text-sm text-green-700">
      <Icon name="heroicons:check-circle" class="h-5 w-5" />
      すでにアプリとしてインストール済みです
    </div>

    <button
      v-else-if="canInstallDirect"
      class="btn-secondary text-sm flex items-center gap-1.5"
      :disabled="installing"
      @click="handleInstall"
    >
      <Icon v-if="installing" name="heroicons:arrow-path" class="h-4 w-4 animate-spin" />
      <Icon v-else name="heroicons:arrow-down-tray" class="h-4 w-4" />
      {{ installing ? '処理中...' : 'アプリをインストールする' }}
    </button>

    <div v-else-if="isIos" class="text-sm text-gray-600 flex items-start gap-2">
      <Icon name="heroicons:information-circle" class="h-5 w-5 text-gray-400 shrink-0 mt-0.5" />
      <span>
        共有ボタン
        <Icon name="heroicons:arrow-up-on-square" class="h-3.5 w-3.5 inline -mt-0.5" />
        から「ホーム画面に追加」を選ぶとインストールできます
      </span>
    </div>

    <p v-else class="text-xs text-gray-400">
      ご利用のブラウザではインストール機能が利用できないか、既に案内済みです
    </p>
  </div>
</template>
