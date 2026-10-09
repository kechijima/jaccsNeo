import { useAuthStore } from '~/stores/auth'
import { waitForAuthInit } from '~/utils/waitForAuthInit'

// authミドルウェアと同じく認証確認の完了を待つ。これをせず即座にisLoggedIn等を
// 判定すると、F5等でのリロード直後（Firebaseからの応答待ちで認証確認が
// まだ終わっていない一瞬）は常にisLoggedInがfalseになり、実際にはログイン済み
// にもかかわらずログイン画面に飛ばされてしまう（authミドルウェアだけ対策して
// いても、この権限チェック用ミドルウェアが別途即座に判定してしまうため、
// 併用しているページ（チーム画面等）ではF5で時々ログアウトしたように見える
// 不具合の原因になっていた）
export default defineNuxtRouteMiddleware(async () => {
  const authStore = useAuthStore()

  await waitForAuthInit(authStore)
  if (!authStore.confirmed) return

  if (!authStore.isLoggedIn) {
    return navigateTo('/login')
  }

  if (!authStore.isEm2Above) {
    return navigateTo('/dashboard')
  }
})
