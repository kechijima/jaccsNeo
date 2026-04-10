import { defineStore } from 'pinia'
import type { AppUser, AuthState } from '~/types/user'

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    user:        null,
    initialized: false,
    loading:     false,
  }),

  getters: {
    isLoggedIn:     (state) => !!state.user,
    isSystemAdmin:  (state) => state.user?.role === 'system_admin',
    isBoard:        (state) => ['system_admin', 'board'].includes(state.user?.role ?? ''),
    isEm2Above:     (state) => ['system_admin', 'board', 'em2_above'].includes(state.user?.role ?? ''),
    isSpecialistRealEstate: (state) => state.user?.specialTeams.includes('real_estate') ?? false,
    isSpecialistNonLife:    (state) => state.user?.specialTeams.includes('non_life_insurance') ?? false,
  },

  actions: {
    setUser(user: AppUser | null) {
      this.user = user
    },
    setInitialized(val: boolean) {
      this.initialized = val
    },
    setLoading(val: boolean) {
      this.loading = val
    },
  },
})
