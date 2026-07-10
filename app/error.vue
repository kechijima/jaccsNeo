<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

const props = defineProps<{
  error: { statusCode?: number; statusMessage?: string; message?: string }
}>()

const authStore = useAuthStore()

// 存在しないURL・想定外のエラーはいずれもダッシュボード（未ログイン時はログイン画面）へ誘導する
const redirect = async () => {
  await clearError()
  if (!authStore.isLoggedIn) {
    await navigateTo('/login', { replace: true })
  } else {
    await navigateTo('/dashboard', { replace: true })
  }
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
