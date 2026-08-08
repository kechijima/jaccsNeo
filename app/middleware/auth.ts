import { useAuthStore } from '~/stores/auth'

// 認証初期化(initAuth)の完了を待つ。app.vueはスプラッシュを即座に表示するため
// initAuth()自体はawaitしていないので、authStore.userが埋まる前にページのsetupが
// 走ってしまう（＝担当データが0件に見えるなどの不具合）のを防ぐためここで待機する
// 万一initAuth側で何らかの理由によりinitializedが立たないままになっても
// ページ遷移自体が永久に固まらないよう、保険のタイムアウトを設ける
const waitForAuthInit = (authStore: ReturnType<typeof useAuthStore>) => {
  if (authStore.initialized) return Promise.resolve()
  return new Promise<void>((resolve) => {
    // initAuth自体のタイムアウト(4秒)より長く取り、あくまで「initAuth側の
    // タイムアウト処理すら動かなかった」場合だけの保険とする
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

  // Firebaseから実際の応答（confirmed）を受け取れていない場合は、ログアウトと
  // 確定しない（応答が遅いだけの正常なセッションを誤ってログイン画面に
  // 飛ばしてしまうと、画面更新のたびにログインが切れたように見えてしまうため）。
  // 確定後にログイン状態が反映されなければ、次の画面遷移で正しく振り分けられる
  if (!authStore.confirmed) return

  if (!authStore.isLoggedIn) {
    return navigateTo({ path: '/login', query: { redirect: to.fullPath } })
  }
})
