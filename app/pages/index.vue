<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

// セッションは永続化されている（firebase.client.ts）ため、authStore.isLoggedIn
// は起動直後（Firebaseからまだ応答が来ていない時点）では実際のログイン状態を
// 反映していない。認証確認が完了する（initialized）まで待ってから振り分ける
// （待っている間はapp.vueのスプラッシュが表示される）
definePageMeta({ middleware: [] })

const authStore = useAuthStore()

if (!authStore.initialized) {
  await new Promise<void>((resolve) => {
    const stop = watch(() => authStore.initialized, (val) => {
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
