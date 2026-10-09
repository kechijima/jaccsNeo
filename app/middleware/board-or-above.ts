import { useAuthStore } from '~/stores/auth'
import { waitForAuthInit } from '~/utils/waitForAuthInit'

// authミドルウェアと同じく認証確認の完了を待つ（詳細はem2-or-above.tsのコメント参照）
export default defineNuxtRouteMiddleware(async () => {
  if (import.meta.server) return

  const authStore = useAuthStore()

  await waitForAuthInit(authStore)
  if (!authStore.confirmed) return

  if (!authStore.isLoggedIn) {
    return navigateTo('/login')
  }

  if (!authStore.isBoard) {
    return navigateTo('/dashboard')
  }
})
