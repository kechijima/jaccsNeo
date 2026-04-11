import { useAuthStore } from '~/stores/auth'

export default defineNuxtRouteMiddleware((to) => {
  const authStore = useAuthStore()

  // 認証初期化が完了していない場合は通過させる（app.vue で await initAuth() 済みのため通常到達しない）
  if (!authStore.initialized) return

  if (!authStore.isLoggedIn) {
    return navigateTo({ path: '/login', query: { redirect: to.fullPath } })
  }
})
