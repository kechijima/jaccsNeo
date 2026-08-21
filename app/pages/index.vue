<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

// ログインは毎回必須（セッションを永続化していない）ため、認証確認の完了を
// 待たずに現時点のログイン状態だけで即座に振り分ける。初回起動時は
// 必ず未ログイン状態なので、待たずにそのままログイン画面へ進める
definePageMeta({ middleware: [] })

const authStore = useAuthStore()
await navigateTo(authStore.isLoggedIn ? '/dashboard' : '/login', { replace: true })
</script>
<template><div /></template>
