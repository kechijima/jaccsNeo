<script setup lang="ts">
const { initAuth } = useAuth()
const { initialized } = useCurrentUser()

// SPA mode: Firebase plugin is always available on client
// ここでawaitすると解決するまでスプラッシュ含め何も描画されなくなり、初回表示が
// 実際より重く感じられるため、あえて待たずに呼び出す（完了はinitializedの変化で検知する）
initAuth()
</script>

<template>
  <div>
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <AppToast />
    <AuthorProfileModal />
    <!-- 認証初期化中はスプラッシュ表示 -->
    <Transition name="fade">
      <div v-if="!initialized" class="fixed inset-0 z-50 flex items-center justify-center bg-white">
        <div class="flex flex-col items-center gap-4">
          <img src="/logo.png" alt="" class="w-16 h-16 object-contain" />
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
