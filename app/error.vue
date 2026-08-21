<script setup lang="ts">
const props = defineProps<{
  error: { statusCode?: number; statusMessage?: string; message?: string }
}>()

// 存在しないURL・想定外のエラーはいずれもルート(/)へ誘導する。
// pages/index.vueが現在のログイン状態を待たずに即座に/login・/dashboardへ
// 振り分けるため、ここから直接/dashboardへ飛ばすより高速に復帰できる。
// 以前は/dashboardへ直接遷移させていたが、authミドルウェアの認証確認待ち
// （最大6秒）を経由してしまい、特にアプリ起動時のエラー（Firebase Authの
// 初期化失敗等）から復帰する際に画面が長時間固まって見える原因になっていた
const redirect = async () => {
  await clearError()
  await navigateTo('/', { replace: true })
}

onMounted(() => {
  redirect()
})
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-white p-4">
    <div class="flex flex-col items-center gap-3 text-gray-400">
      <Icon name="heroicons:arrow-path" class="h-6 w-6 animate-spin" />
      <p class="text-sm">読み込み中...</p>
    </div>
  </div>
</template>
