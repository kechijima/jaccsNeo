<script setup lang="ts">
// 存在しないURLは常にダッシュボードへリダイレクト（未ログイン時はauthミドルウェアがログイン画面へ誘導）
definePageMeta({ middleware: ['auth'] })
await navigateTo('/dashboard', { replace: true })
</script>
<template><div /></template>
