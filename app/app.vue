<script setup lang="ts">
const { initAuth } = useAuth()
const { initialized } = useCurrentUser()
const { pageKey, isRefreshing } = useSoftRefresh()
const route = useRoute()

// SPA mode: Firebase plugin is always available on client
// ここでawaitすると解決するまでスプラッシュ含め何も描画されなくなり、初回表示が
// 実際より重く感じられるため、あえて待たずに呼び出す（完了はinitializedの変化で検知する）
initAuth()

// セッションは永続化されているため、画面更新のたびに未ログイン扱いになるわけ
// ではない。認証確認（initialized）が終わるまでは、ログインページも含めて
// 常にこのスプラッシュを表示する。そうしないと、実際にはログイン済みの
// セッションが復元される場合でも、復元が完了するまでの一瞬だけログイン
// フォームが表示されてしまう（画面更新のたびにログイン画面が一瞬出る不具合の原因）
const showSplash = computed(() => !initialized.value)
</script>

<template>
  <div>
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <!-- pageKeyはヘッダーの更新ボタン用。route.fullPathと組み合わせることで、
           通常のページ遷移では不要な再マウントを起こさず、更新ボタン押下時
           （pageKeyの増加）だけ現在のページを強制的に再マウントしてデータを
           再取得する（ブラウザ自体はリロードしないため、F5等と違いFirebase
           Authの再初期化レースが発生しない） -->
      <NuxtPage :page-key="`${route.fullPath}:${pageKey}`" />
    </NuxtLayout>
    <AppToast />
    <AuthorProfileModal />
    <OnboardingGuideModal v-if="initialized" />
    <PwaInstallBanner v-if="initialized" />
    <UpdateAvailableBanner v-if="initialized" />
    <HelpDrawer v-if="initialized" />
    <!-- 認証初期化中はスプラッシュ表示 -->
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

    <!-- ヘッダーの更新ボタン押下時：ブラウザのリロードではなく現在のページだけ
         再マウントするため、スプラッシュとは別に専用のローディング画面を表示する -->
    <Transition name="fade">
      <div v-if="isRefreshing" class="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-white">
        <img src="/logo.png" alt="" class="w-16 h-16 object-contain" />
        <div class="flex items-center gap-2 text-sm text-gray-500">
          <Icon name="heroicons:arrow-path" class="h-4 w-4 animate-spin" />
          更新中...
        </div>
      </div>
    </Transition>
  </div>
</template>

<style>
.fade-leave-active { transition: opacity 0.3s ease; }
.fade-leave-to    { opacity: 0; }
</style>
