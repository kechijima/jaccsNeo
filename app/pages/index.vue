<script setup lang="ts">
// ルートは常にダッシュボードへリダイレクト
definePageMeta({ middleware: ['auth'] })
await navigateTo('/dashboard', { replace: true })
</script>
<template><div /></template>
