<script setup lang="ts">
const props = defineProps<{
  error: { statusCode?: number; statusMessage?: string; message?: string }
}>()

// 存在しないURL・想定外のエラーはいずれもダッシュボードへ誘導する。
// ここではまだ認証確認(initAuth)が終わっているとは限らないため、ログイン状態の
// 判定は行わない（誤って未確定の状態を「未ログイン」とみなし、実際にはログイン中
// なのにログイン画面へ飛ばしてしまう不具合の原因になっていた）。
// 未ログインだった場合は、遷移先のauthミドルウェアが確認完了後に正しく
// /loginへ振り分ける
const redirect = async () => {
  await clearError()
  await navigateTo('/dashboard', { replace: true })
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
