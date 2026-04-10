import { useAuthStore } from '~/stores/auth'

export const useCurrentUser = () => {
  const authStore = useAuthStore()

  const user        = computed(() => authStore.user)
  const isLoggedIn  = computed(() => authStore.isLoggedIn)
  const initialized = computed(() => authStore.initialized)
  const loading     = computed(() => authStore.loading)

  const displayName = computed(() => user.value?.displayName ?? '')
  const role        = computed(() => user.value?.role ?? 'general')
  const groupId     = computed(() => user.value?.groupId)
  const kumiaiId    = computed(() => user.value?.kumiaiId)
  const specialTeams = computed(() => user.value?.specialTeams ?? [])

  return {
    user,
    isLoggedIn,
    initialized,
    loading,
    displayName,
    role,
    groupId,
    kumiaiId,
    specialTeams,
  }
}
