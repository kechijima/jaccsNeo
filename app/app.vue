<script setup lang="ts">
const { initAuth } = useAuth()
const { initialized } = useCurrentUser()
const route = useRoute()

// SPA mode: Firebase plugin is always available on client
// ここでawaitすると解決するまでスプラッシュ含め何も描画されなくなり、初回表示が
// 実際より重く感じられるため、あえて待たずに呼び出す（完了はinitializedの変化で検知する）
initAuth()

// ログインは毎回必須（セッションを永続化していない）ため、ログインページ自体は
// 認証確認を待たずに即座に表示できる（pages/index.vueも待たずに/loginへ振り分けている）。
// このスプラッシュは、保護ページへ直接アクセスした場合など、認証確認の完了を
// 待つ必要があるケースの保険としてのみ表示する
const showSplash = computed(() => !initialized.value && route.path !== '/login')
</script>

<template>
  <div>
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <AppToast />
    <AuthorProfileModal />
    <OnboardingGuideModal v-if="initialized" />
    <PwaInstallBanner v-if="initialized" />
    <UpdateAvailableBanner v-if="initialized" />
    <HelpDrawer v-if="initialized" />
    <!-- 認証初期化中はスプラッシュ表示（ログインページを除く） -->
    <Transition name="fade">
      <div v-if="showSplash" class="fixed inset-0 z-50 flex flex-col items-center overflow-y-auto bg-white py-10">
        <div class="flex flex-1 flex-col items-center justify-center gap-4 min-h-[40vh]">
          <img src="/logo.png" alt="" class="w-16 h-16 object-contain" />
          <div class="flex items-center gap-2 text-sm text-gray-500">
            <Icon name="heroicons:arrow-path" class="h-4 w-4 animate-spin" />
            読み込み中...
          </div>
        </div>
        <!-- 回線状況によっては起動に時間がかかることがあるため、待っている間に
             マニュアルを見られるようにする -->
        <BootManualPreview />
      </div>
    </Transition>
  </div>
</template>

<style>
.fade-leave-active { transition: opacity 0.3s ease; }
.fade-leave-to    { opacity: 0; }
</style>
