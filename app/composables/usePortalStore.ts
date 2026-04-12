/**
 * ポータル投稿のグローバル共有ストア
 * モックデータを元にリアクション・コメント・編集を管理する
 */
import { MOCK_POSTS, MOCK_SPACES } from '~/data/mock'

const spaceColorMap: Record<string, string> = {
  all:     'bg-green-100 text-green-700',
  group:   'bg-indigo-100 text-indigo-700',
  kumiai:  'bg-purple-100 text-purple-700',
  special: 'bg-amber-100 text-amber-700',
}

export interface CommentView {
  id: string
  authorId: string
  authorName: string
  authorInitial: string
  content: string
  postedAt: string
}

export interface PostView {
  id: string
  spaceId: string
  spaceName: string
  spaceColor: string
  authorId: string
  authorName: string
  authorInitial: string
  content: string
  reactions: Record<string, number>
  myReactions: string[]
  commentCount: number
  comments: CommentView[]
  showComments: boolean
  isPinned: boolean
  postedAt: string
  createdAt: Date
}

// モジュールレベル（SPA: ssr: false のため安全）
let initialized = false
const posts = ref<PostView[]>([])

const buildPost = (p: any, space: any): PostView => ({
  id:            p.id,
  spaceId:       space.id,
  spaceName:     space.name,
  spaceColor:    spaceColorMap[space.type] ?? 'bg-indigo-100 text-indigo-700',
  authorId:      p.authorId ?? '',
  authorName:    p.authorName,
  authorInitial: p.authorName.charAt(0),
  content:       p.content,
  reactions:     { ...(p.reactions ?? {}) },
  myReactions:   [],
  commentCount:  p.commentCount ?? 0,
  comments:      [],
  showComments:  false,
  isPinned:      p.isPinned ?? false,
  postedAt:      p.createdAt.toDate().toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
  createdAt:     p.createdAt.toDate(),
})

export const usePortalStore = () => {
  if (!initialized) {
    const raw: PostView[] = []
    for (const space of MOCK_SPACES) {
      for (const p of (MOCK_POSTS[space.id] ?? [])) {
        raw.push(buildPost(p, space))
      }
    }
    raw.sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1
      return b.createdAt.getTime() - a.createdAt.getTime()
    })
    posts.value = raw
    initialized = true
  }

  const getPostsBySpace = (spaceId: string) =>
    computed(() => posts.value.filter(p => p.spaceId === spaceId))

  const addPost = (spaceId: string, content: string, authorName: string, authorId: string) => {
    const space = MOCK_SPACES.find(s => s.id === spaceId)
    if (!space) return null
    const now = new Date()
    const newPost: PostView = {
      id:            `local-${Date.now()}`,
      spaceId,
      spaceName:     space.name,
      spaceColor:    spaceColorMap[space.type] ?? 'bg-indigo-100 text-indigo-700',
      authorId,
      authorName,
      authorInitial: authorName.charAt(0),
      content,
      reactions:     {},
      myReactions:   [],
      commentCount:  0,
      comments:      [],
      showComments:  false,
      isPinned:      false,
      postedAt:      now.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      createdAt:     now,
    }
    posts.value.unshift(newPost)
    return newPost.id
  }

  const toggleReaction = (postId: string, emoji: string) => {
    const post = posts.value.find(p => p.id === postId)
    if (!post) return
    const idx = post.myReactions.indexOf(emoji)
    if (idx >= 0) {
      post.myReactions.splice(idx, 1)
      post.reactions[emoji] = Math.max(0, (post.reactions[emoji] ?? 1) - 1)
      if (post.reactions[emoji] === 0) delete post.reactions[emoji]
    } else {
      post.myReactions.push(emoji)
      post.reactions[emoji] = (post.reactions[emoji] ?? 0) + 1
    }
  }

  const addComment = (postId: string, content: string, authorName: string, authorId: string) => {
    const post = posts.value.find(p => p.id === postId)
    if (!post) return
    const now = new Date()
    post.comments.push({
      id:            `c-${Date.now()}`,
      authorId,
      authorName,
      authorInitial: authorName.charAt(0),
      content,
      postedAt:      now.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' }),
    })
    post.commentCount = post.comments.length
    post.showComments = true
  }

  const editPost = (postId: string, newContent: string) => {
    const post = posts.value.find(p => p.id === postId)
    if (post) post.content = newContent
  }

  const deletePost = (postId: string) => {
    const idx = posts.value.findIndex(p => p.id === postId)
    if (idx >= 0) posts.value.splice(idx, 1)
  }

  const getPost = (postId: string) =>
    computed(() => posts.value.find(p => p.id === postId) ?? null)

  return { posts, getPostsBySpace, getPost, addPost, toggleReaction, addComment, editPost, deletePost }
}
