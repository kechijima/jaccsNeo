<script setup lang="ts">
const { initAuth } = useAuth()
const { initialized } = useCurrentUser()

// SPA mode: Firebase plugin is always available on client
await initAuth()
</script>

<template>
  <div>
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <!-- 認証初期化中はスプラッシュ表示 -->
    <Transition name="fade">
      <div v-if="!initialized" class="fixed inset-0 z-50 flex items-center justify-center bg-white">
        <div class="flex flex-col items-center gap-4">
          <div class="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-600 shadow-lg">
            <span class="text-2xl font-bold text-white">J</span>
          </div>
          <div class="flex items-center gap-2 text-sm text-gray-500">
            <Icon name="heroicons:arrow-path" class="h-4 w-4 animate-spin" />
            読み込み中...
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style>
.fade-leave-active { transition: opacity 0.3s ease; }
.fade-leave-to    { opacity: 0; }
</style>
