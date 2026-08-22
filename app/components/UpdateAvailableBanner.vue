<script setup lang="ts">
// 新しいデプロイが検知された（$pwa.needRefresh）際に、内容を破棄して即座に
// 再読み込みするのではなく、ユーザーが好きなタイミングで更新できるようバナーで案内する。
// nuxt.config.tsのpwa.registerType: 'prompt'設定と対になっている
const { $pwa } = useNuxtApp()

const updating = ref(false)

const handleUpdate = async () => {
  updating.value = true
  try {
    await $pwa?.updateServiceWorker(true)
  } catch (e) {
    console.error('Service Workerの更新に失敗しました', e)
  } finally {
    // updateServiceWorker(true)は本来、新しいService Workerへの切り替え完了
    // （controllerchangeイベント）を検知して自動的に画面を再読み込みするが、
    // 環境によってはこのイベントが発火せず、ボタンを押しても何も起きない
    // ように見えることがあった。確実に反映させるため、ここでも明示的に
    // 再読み込みする（すでにSW側の処理で再読み込みが始まっていた場合、
    // ここが実行される頃にはページは離脱中のため、実質何も起こらない）
    window.location.reload()
  }
}

const dismiss = () => { $pwa?.cancelPrompt() }
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
    <div
      v-if="$pwa?.needRefresh"
      class="fixed bottom-20 md:bottom-4 left-1/2 -translate-x-1/2 z-[60] w-[calc(100%-2rem)] max-w-md rounded-xl bg-white shadow-lg ring-1 ring-gray-200 p-4 flex items-center gap-3"
    >
      <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-600">
        <Icon name="heroicons:arrow-path" class="h-5 w-5" />
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-semibold text-gray-900">新しいバージョンがあります</p>
        <p class="text-xs text-gray-500 mt-0.5">更新すると最新の内容が反映されます</p>
      </div>
      <button class="btn-primary text-xs px-3 py-1.5 shrink-0" :disabled="updating" @click="handleUpdate">
        {{ updating ? '更新中...' : '更新する' }}
      </button>
      <button class="text-gray-300 hover:text-gray-500 transition shrink-0" aria-label="閉じる" @click="dismiss">
        <Icon name="heroicons:x-mark" class="h-4 w-4" />
      </button>
    </div>
  </Transition>
</template>
