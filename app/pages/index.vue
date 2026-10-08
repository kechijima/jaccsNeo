<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

// セッションは永続化されている（firebase.client.ts）ため、authStore.isLoggedIn
// は起動直後（Firebaseからまだ応答が来ていない時点）では実際のログイン状態を
// 反映していない。initializedはスプラッシュ解除用のタイムアウトだけでも立つため、
// ここではなく実際にFirebaseから応答を受け取った確定状態（confirmed）を待ってから
// 振り分ける（そうしないと、復元に時間がかかっているだけの正常なセッションが
// 未ログインと誤判定され、F5等のリロードでログイン画面に飛ばされてしまう）
definePageMeta({ middleware: [] })

const authStore = useAuthStore()

if (!authStore.confirmed) {
  await new Promise<void>((resolve) => {
    const stop = watch(() => authStore.confirmed, (val) => {
      if (val) {
        stop()
        resolve()
      }
    })
  })
}

await navigateTo(authStore.isLoggedIn ? '/dashboard' : '/login', { replace: true })
</script>
<template><div /></template>
