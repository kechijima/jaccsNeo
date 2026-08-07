import { useAuthStore } from '~/stores/auth'

// 認証初期化(initAuth)の完了を待つ。app.vueはスプラッシュを即座に表示するため
// initAuth()自体はawaitしていないので、authStore.userが埋まる前にページのsetupが
// 走ってしまう（＝担当データが0件に見えるなどの不具合）のを防ぐためここで待機する
const waitForAuthInit = (authStore: ReturnType<typeof useAuthStore>) => {
  if (authStore.initialized) return Promise.resolve()
  return new Promise<void>((resolve) => {
    const stop = watch(() => authStore.initialized, (val) => {
      if (val) {
        stop()
        resolve()
      }
    })
  })
}

export default defineNuxtRouteMiddleware(async (to) => {
  const authStore = useAuthStore()

  await waitForAuthInit(authStore)

  if (!authStore.isLoggedIn) {
    return navigateTo({ path: '/login', query: { redirect: to.fullPath } })
  }
})
