import { useAuthStore } from '~/stores/auth'
import { useUsers } from '~/composables/useUsers'
import type { AppUser } from '~/types/user'

// 配色設定（青系/黄色系）。<html>のdata-theme属性を切り替えることで
// CSS変数経由のprimaryカラーをアプリ全体で一括変更する
export const useThemeColor = () => {
  const authStore = useAuthStore()
  const { updateMyProfile } = useUsers()

  const themeColor = useState<'blue' | 'yellow'>('themeColor:current', () => 'blue')

  const applyTheme = (color: 'blue' | 'yellow') => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', color)
    }
  }

  const ensureLoaded = () => {
    const color = authStore.user?.themeColor ?? 'blue'
    themeColor.value = color
    applyTheme(color)
  }

  const setThemeColor = async (color: 'blue' | 'yellow') => {
    themeColor.value = color
    applyTheme(color)
    await updateMyProfile({ themeColor: color })
    if (authStore.user) authStore.setUser({ ...authStore.user, themeColor: color } as AppUser)
  }

  return { themeColor, ensureLoaded, setThemeColor }
}
