import { useAuthStore } from '~/stores/auth'
import { useUsers } from '~/composables/useUsers'
import { generatePrimaryScale } from '~/utils/colorScale'
import type { AppUser } from '~/types/user'

export const DEFAULT_PRIMARY_COLOR = '#00AFCC'

// 表示設定（ライト/ダーク、メインカラー）。ユーザーごとにFirestoreへ保存し、
// 次回ログイン時も保持する（以前あった配色設定「青系/黄色系」は廃止し、
// ダークモード＋メインカラーの個別選択に置き換えた）
export const useAppearance = () => {
  const authStore = useAuthStore()
  const { updateMyProfile } = useUsers()

  const colorMode = useState<'light' | 'dark'>('appearance:colorMode', () => 'light')
  const primaryColor = useState<string>('appearance:primaryColor', () => DEFAULT_PRIMARY_COLOR)

  // <html>のdarkクラスを切り替えることで、main.cssで定義した一括上書き
  // スタイルに反映される
  const applyColorMode = (mode: 'light' | 'dark') => {
    if (typeof document === 'undefined') return
    document.documentElement.classList.toggle('dark', mode === 'dark')
  }

  // --color-primary-*（main.cssの:rootで既定値を定義）をインラインスタイルで
  // 上書きすることで、既存のbg-primary-600等のクラスをそのままに、ユーザー
  // ごとのメインカラーを反映する
  const applyPrimaryColor = (hex: string) => {
    if (typeof document === 'undefined') return
    const scale = generatePrimaryScale(hex)
    if (!scale) return
    const style = document.documentElement.style
    for (const [stop, rgb] of Object.entries(scale)) {
      style.setProperty(`--color-primary-${stop}`, rgb)
    }
  }

  const ensureLoaded = () => {
    const mode = authStore.user?.colorMode ?? 'light'
    const color = authStore.user?.primaryColor ?? DEFAULT_PRIMARY_COLOR
    colorMode.value = mode
    primaryColor.value = color
    applyColorMode(mode)
    applyPrimaryColor(color)
  }

  const setColorMode = async (mode: 'light' | 'dark') => {
    colorMode.value = mode
    applyColorMode(mode)
    await updateMyProfile({ colorMode: mode })
    if (authStore.user) authStore.setUser({ ...authStore.user, colorMode: mode } as AppUser)
  }

  const setPrimaryColor = async (hex: string) => {
    primaryColor.value = hex
    applyPrimaryColor(hex)
    await updateMyProfile({ primaryColor: hex })
    if (authStore.user) authStore.setUser({ ...authStore.user, primaryColor: hex } as AppUser)
  }

  return { colorMode, primaryColor, ensureLoaded, setColorMode, setPrimaryColor }
}
