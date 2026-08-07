<script setup lang="ts">
const { $pwa } = useNuxtApp()

const isIos = ref(false)
const isStandalone = ref(false)
const installing = ref(false)
const showInstructions = ref(false)
const activeTab = ref<'pc' | 'tablet' | 'phone'>('pc')

onMounted(() => {
  const ua = window.navigator.userAgent
  isIos.value = /iphone|ipad|ipod/i.test(ua) && !(window as any).MSStream
  isStandalone.value = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true

  // 開いている端末に応じて最初に表示するタブを推測する
  if (/ipad|android(?!.*mobile)/i.test(ua)) activeTab.value = 'tablet'
  else if (/iphone|ipod|android.*mobile/i.test(ua)) activeTab.value = 'phone'
  else activeTab.value = 'pc'
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

const TABS = [
  { key: 'pc',     label: 'PC',       icon: 'heroicons:computer-desktop' },
  { key: 'tablet', label: 'タブレット', icon: 'heroicons:device-tablet' },
  { key: 'phone',  label: 'スマホ',    icon: 'heroicons:device-phone-mobile' },
] as const
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

    <div v-else class="flex items-center gap-2 flex-wrap">
      <button
        v-if="canInstallDirect"
        class="btn-secondary text-sm flex items-center gap-1.5"
        :disabled="installing"
        @click="handleInstall"
      >
        <Icon v-if="installing" name="heroicons:arrow-path" class="h-4 w-4 animate-spin" />
        <Icon v-else name="heroicons:arrow-down-tray" class="h-4 w-4" />
        {{ installing ? '処理中...' : 'アプリをインストールする' }}
      </button>
      <button
        type="button"
        class="text-sm text-primary-600 hover:underline flex items-center gap-1"
        @click="showInstructions = true"
      >
        <Icon name="heroicons:question-mark-circle" class="h-4 w-4" />
        インストール方法を見る
      </button>
    </div>

    <!-- インストール手順モーダル -->
    <Teleport to="body">
      <div
        v-if="showInstructions"
        class="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40"
        @click.self="showInstructions = false"
      >
        <div class="bg-white w-full md:max-w-md rounded-t-2xl md:rounded-2xl shadow-xl max-h-[85vh] overflow-y-auto">
          <div class="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
            <h3 class="font-bold text-gray-900 flex items-center gap-2">
              <Icon name="heroicons:arrow-down-tray" class="h-5 w-5 text-primary-600" />
              アプリのインストール方法
            </h3>
            <button type="button" class="text-gray-300 hover:text-gray-500 transition" @click="showInstructions = false">
              <Icon name="heroicons:x-mark" class="h-5 w-5" />
            </button>
          </div>

          <!-- タブ -->
          <div class="flex gap-1 px-5 pt-3">
            <button
              v-for="tab in TABS"
              :key="tab.key"
              type="button"
              class="flex-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition"
              :class="activeTab === tab.key ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
              @click="activeTab = tab.key"
            >
              <Icon :name="tab.icon" class="h-4 w-4" />
              {{ tab.label }}
            </button>
          </div>

          <div class="p-5 space-y-5 text-sm text-gray-700">

            <!-- PC -->
            <template v-if="activeTab === 'pc'">
              <div>
                <p class="font-semibold text-gray-900 mb-2">Chrome / Edge（Windows・Mac）</p>
                <ol class="space-y-1.5 list-decimal list-inside text-gray-600 leading-relaxed">
                  <li>アドレスバー右側のインストールアイコン（<Icon name="heroicons:arrow-down-tray" class="h-3.5 w-3.5 inline" />または「＋」）をクリック</li>
                  <li>表示された「インストール」をクリック</li>
                </ol>
                <p class="mt-2 text-xs text-gray-400">
                  アイコンが見当たらない場合は、右上の「⋮」メニュー →「アプリをインストール」からも行えます
                </p>
              </div>
            </template>

            <!-- タブレット -->
            <template v-else-if="activeTab === 'tablet'">
              <div>
                <p class="font-semibold text-gray-900 mb-2">Androidタブレット（Chrome）</p>
                <ol class="space-y-1.5 list-decimal list-inside text-gray-600 leading-relaxed">
                  <li>右上の「⋮」メニューをタップ</li>
                  <li>「アプリをインストール」または「ホーム画面に追加」をタップ</li>
                </ol>
              </div>
              <div>
                <p class="font-semibold text-gray-900 mb-2">iPad（Safari）</p>
                <ol class="space-y-1.5 list-decimal list-inside text-gray-600 leading-relaxed">
                  <li>共有ボタン（<Icon name="heroicons:arrow-up-on-square" class="h-3.5 w-3.5 inline" />）をタップ</li>
                  <li>「ホーム画面に追加」を選択</li>
                </ol>
              </div>
            </template>

            <!-- スマホ -->
            <template v-else>
              <div>
                <p class="font-semibold text-gray-900 mb-2">Android（Chrome）</p>
                <ol class="space-y-1.5 list-decimal list-inside text-gray-600 leading-relaxed">
                  <li>右上の「⋮」メニューをタップ</li>
                  <li>「アプリをインストール」または「ホーム画面に追加」をタップ</li>
                </ol>
              </div>
              <div>
                <p class="font-semibold text-gray-900 mb-2">iPhone（Safari）</p>
                <ol class="space-y-1.5 list-decimal list-inside text-gray-600 leading-relaxed">
                  <li>下部の共有ボタン（<Icon name="heroicons:arrow-up-on-square" class="h-3.5 w-3.5 inline" />）をタップ</li>
                  <li>「ホーム画面に追加」を選択</li>
                </ol>
              </div>
            </template>

          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
