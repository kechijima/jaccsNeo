import { useAuthStore } from '~/stores/auth'
import { waitForAuthInit } from '~/utils/waitForAuthInit'

// authミドルウェアと同じく認証確認の完了を待つ（詳細はem2-or-above.tsのコメント参照）。
// 管理者設定（/admin以下）は併用頻度が高いページのため、これを怠るとF5更新時に
// 時々ログアウトしたように見える不具合が特に目立ちやすかった
export default defineNuxtRouteMiddleware(async () => {
  const authStore = useAuthStore()

  await waitForAuthInit(authStore)
  if (!authStore.confirmed) return

  if (!authStore.isLoggedIn) {
    return navigateTo('/login')
  }

  if (!authStore.isSystemAdmin) {
    return navigateTo('/dashboard')
  }
})
