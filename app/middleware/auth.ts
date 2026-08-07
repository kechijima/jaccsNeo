import { useAuthStore } from '~/stores/auth'

// 認証初期化(initAuth)の完了を待つ。app.vueはスプラッシュを即座に表示するため
// initAuth()自体はawaitしていないので、authStore.userが埋まる前にページのsetupが
// 走ってしまう（＝担当データが0件に見えるなどの不具合）のを防ぐためここで待機する
// 万一initAuth側で何らかの理由によりinitializedが立たないままになっても
// ページ遷移自体が永久に固まらないよう、保険のタイムアウトを設ける
const waitForAuthInit = (authStore: ReturnType<typeof useAuthStore>) => {
  if (authStore.initialized) return Promise.resolve()
  return new Promise<void>((resolve) => {
    const timeout = setTimeout(() => resolve(), 6000)
    const stop = watch(() => authStore.initialized, (val) => {
      if (val) {
        clearTimeout(timeout)
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
