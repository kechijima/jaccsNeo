import type { SavedSearch, SavedSearchInput } from '~/types/savedSearch'

const STORAGE_KEY = 'jaccsneo:saved-searches'

const loadFromStorage = (): SavedSearch[] => {
  if (!import.meta.client) return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

// ログインユーザーごとの検索条件をlocalStorageに永続化するストア
export const useSavedSearchStore = () => {
  const all = useState<SavedSearch[]>('savedSearches:list', () => loadFromStorage())

  const persist = () => {
    if (import.meta.client) localStorage.setItem(STORAGE_KEY, JSON.stringify(all.value))
  }

  const getForUser = (uid: Ref<string | undefined> | string | undefined) =>
    computed(() =>
      all.value
        .filter(s => s.uid === unref(uid))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    )

  const save = (input: SavedSearchInput): string => {
    const id = `ss-${Date.now()}`
    all.value = [{ id, ...input, createdAt: new Date().toISOString() }, ...all.value]
    persist()
    return id
  }

  const remove = (id: string): void => {
    all.value = all.value.filter(s => s.id !== id)
    persist()
  }

  return { all, getForUser, save, remove }
}
