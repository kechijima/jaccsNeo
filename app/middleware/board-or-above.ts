import { useAuthStore } from '~/stores/auth'

export default defineNuxtRouteMiddleware(() => {
  if (import.meta.server) return

  const authStore = useAuthStore()

  if (!authStore.isLoggedIn) {
    return navigateTo('/login')
  }

  if (!authStore.isBoard) {
    return navigateTo('/dashboard')
  }
})
