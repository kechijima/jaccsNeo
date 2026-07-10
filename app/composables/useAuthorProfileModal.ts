// 投稿カードのアイコンをクリックした際に「マイページを見る」確認モーダルを出すための共有状態
interface AuthorProfileModalState {
  open: boolean
  uid: string
  name: string
}

export const useAuthorProfileModal = () => {
  const state = useState<AuthorProfileModalState>('authorProfileModal', () => ({
    open: false,
    uid:  '',
    name: '',
  }))

  const openAuthorProfile = (uid: string, name: string) => {
    if (!uid) return
    state.value = { open: true, uid, name }
  }

  const closeAuthorProfile = () => {
    state.value = { ...state.value, open: false }
  }

  return { authorProfileModal: state, openAuthorProfile, closeAuthorProfile }
}
