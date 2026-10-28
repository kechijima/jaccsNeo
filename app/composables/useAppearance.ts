import { useAuthStore } from '~/stores/auth'
import { useUsers } from '~/composables/useUsers'
import type { AppUser } from '~/types/user'

// 画面表示モード（ライト/ダーク）。<html>のdarkクラスを切り替えることで、
// app/assets/css/main.cssで定義した一括上書きスタイルに反映される。
// ユーザーごとにFirestoreへ保存し、次回ログイン時も保持する
// （以前あった配色設定「青系/黄色系」は廃止し、このダークモード切り替えに置き換えた）
export const useColorMode = () => {
  const authStore = useAuthStore()
  const { updateMyProfile } = useUsers()

  const colorMode = useState<'light' | 'dark'>('colorMode:current', () => 'light')

  const applyMode = (mode: 'light' | 'dark') => {
    if (typeof document === 'undefined') return
    document.documentElement.classList.toggle('dark', mode === 'dark')
  }

  const ensureLoaded = () => {
    const mode = authStore.user?.colorMode ?? 'light'
    colorMode.value = mode
    applyMode(mode)
  }

  const setColorMode = async (mode: 'light' | 'dark') => {
    colorMode.value = mode
    applyMode(mode)
    await updateMyProfile({ colorMode: mode })
    if (authStore.user) authStore.setUser({ ...authStore.user, colorMode: mode } as AppUser)
  }

  return { colorMode, ensureLoaded, setColorMode }
}
