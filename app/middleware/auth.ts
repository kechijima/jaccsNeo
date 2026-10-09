import { useAuthStore } from '~/stores/auth'
import { waitForAuthInit } from '~/utils/waitForAuthInit'

export default defineNuxtRouteMiddleware(async (to) => {
  const authStore = useAuthStore()

  await waitForAuthInit(authStore)

  // Firebaseから実際の応答（confirmed）を受け取れていない場合は、ログアウトと
  // 確定しない（応答が遅いだけの正常なセッションを誤ってログイン画面に
  // 飛ばしてしまうと、画面更新のたびにログインが切れたように見えてしまうため）。
  // 確定後にログイン状態が反映されなければ、次の画面遷移で正しく振り分けられる
  if (!authStore.confirmed) return

  if (!authStore.isLoggedIn) {
    console.info('[authDiag] authミドルウェア: 未ログインと判定しログイン画面へ', { to: to.fullPath, confirmed: authStore.confirmed, initialized: authStore.initialized })
    return navigateTo({ path: '/login', query: { redirect: to.fullPath } })
  }
})
