import { useAuthStore } from '~/stores/auth'
import { useUsers } from '~/composables/useUsers'
import type { AppUser } from '~/types/user'

// アプリ・掲示板（スペース）のお気に入り登録。ログインユーザー自身のドキュメントに保存する
export const useFavorites = () => {
  const authStore = useAuthStore()
  const { updateMyProfile } = useUsers()

  const favoriteAppIds   = useState<string[]>('favorites:appIds', () => [])
  const favoriteSpaceIds = useState<string[]>('favorites:spaceIds', () => [])
  const loaded = useState<boolean>('favorites:loaded', () => false)

  const ensureLoaded = (force = false) => {
    if (loaded.value && !force) return
    // authStore.userがまだ埋まっていない場合はloadedをtrueにせず、
    // 次回呼び出し時に再取得できるようにする（お気に入りが消えて見える不具合を防ぐ）
    if (!authStore.user) return
    favoriteAppIds.value   = authStore.user.favoriteAppIds ?? []
    favoriteSpaceIds.value = authStore.user.favoriteSpaceIds ?? []
    loaded.value = true
  }

  const isFavoriteApp   = (id: string) => favoriteAppIds.value.includes(id)
  const isFavoriteSpace = (id: string) => favoriteSpaceIds.value.includes(id)

  const toggleFavoriteApp = async (id: string) => {
    favoriteAppIds.value = isFavoriteApp(id)
      ? favoriteAppIds.value.filter(x => x !== id)
      : [...favoriteAppIds.value, id]
    await updateMyProfile({ favoriteAppIds: favoriteAppIds.value })
    if (authStore.user) authStore.setUser({ ...authStore.user, favoriteAppIds: favoriteAppIds.value } as AppUser)
  }

  const toggleFavoriteSpace = async (id: string) => {
    favoriteSpaceIds.value = isFavoriteSpace(id)
      ? favoriteSpaceIds.value.filter(x => x !== id)
      : [...favoriteSpaceIds.value, id]
    await updateMyProfile({ favoriteSpaceIds: favoriteSpaceIds.value })
    if (authStore.user) authStore.setUser({ ...authStore.user, favoriteSpaceIds: favoriteSpaceIds.value } as AppUser)
  }

  return {
    favoriteAppIds, favoriteSpaceIds, ensureLoaded,
    isFavoriteApp, isFavoriteSpace, toggleFavoriteApp, toggleFavoriteSpace,
  }
}
