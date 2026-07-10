/**
 * 掲示板（スペース・投稿）のグローバル共有ストア
 * Firestore（spaces / spaces/{id}/posts / .../comments）を app/composables/useSpaces.ts 経由で読み書きする
 */
import type { Space, Post, Comment as SpaceComment } from '~/types/portal'
import { useSpaces } from '~/composables/useSpaces'

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

const toDate = (val: any): Date => val?.toDate?.() ?? (val instanceof Date ? val : new Date())

const toCommentView = (c: SpaceComment): CommentView => ({
  id:            c.id,
  authorId:      c.authorUid,
  authorName:    c.authorName,
  authorInitial: (c.authorName ?? '?').charAt(0),
  content:       c.content,
  postedAt:      toDate(c.createdAt).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' }),
})

const buildPostView = (space: Space | undefined, p: Post, comments: CommentView[]): PostView => ({
  id:            p.id,
  spaceId:       p.spaceId,
  spaceName:     space?.name ?? '',
  spaceColor:    spaceColorMap[space?.type ?? ''] ?? 'bg-indigo-100 text-indigo-700',
  authorId:      p.authorUid ?? '',
  authorName:    p.authorName ?? '',
  authorInitial: (p.authorName ?? '?').charAt(0),
  content:       p.content,
  reactions:     { ...(p.reactionCounts ?? {}) },
  myReactions:   [],
  commentCount:  p.commentCount ?? comments.length,
  comments,
  showComments:  false,
  isPinned:      p.isPinned ?? false,
  postedAt:      toDate(p.createdAt).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
  createdAt:     toDate(p.createdAt),
})

export const usePortalStore = () => {
  const spacesApi = useSpaces()

  const spaces        = useState<Space[]>('portal:spaces', () => [])
  const spacesLoaded   = useState<boolean>('portal:spacesLoaded', () => false)
  const posts          = useState<PostView[]>('portal:posts', () => [])
  const loadedSpaceIds = useState<string[]>('portal:loadedSpaceIds', () => [])

  // ── スペース一覧（アーカイブ済みを除く） ────────────────────────────
  const fetchSpaces = async (force = false) => {
    if (spacesLoaded.value && !force) return
    spaces.value = (await spacesApi.fetchAllSpaces()).filter(s => !s.isArchived)
    spacesLoaded.value = true
  }

  // ── 投稿一覧（スペースごとに取得しキャッシュへマージ） ───────────────
  const fetchPostsForSpace = async (spaceId: string, force = false) => {
    if (loadedSpaceIds.value.includes(spaceId) && !force) return
    await fetchSpaces()
    const space = spaces.value.find(s => s.id === spaceId)
    const rawPosts = await spacesApi.fetchPosts(spaceId)

    const views = await Promise.all(rawPosts.map(async (p) => {
      const comments = await spacesApi.fetchComments(spaceId, p.id).catch(() => [] as SpaceComment[])
      return buildPostView(space, p, comments.map(toCommentView))
    }))

    posts.value = [...posts.value.filter(p => p.spaceId !== spaceId), ...views].sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1
      return b.createdAt.getTime() - a.createdAt.getTime()
    })
    if (!loadedSpaceIds.value.includes(spaceId)) loadedSpaceIds.value = [...loadedSpaceIds.value, spaceId]
  }

  // ── 全スペースの投稿をまとめて取得（掲示板トップ・ダッシュボード用） ──
  const fetchAllPosts = async (force = false) => {
    await fetchSpaces(force)
    await Promise.all(spaces.value.map(s => fetchPostsForSpace(s.id, force)))
  }

  const getPostsBySpace = (spaceId: Ref<string> | string) =>
    computed(() => posts.value.filter(p => p.spaceId === unref(spaceId)))

  const getPost = (postId: Ref<string> | string) =>
    computed(() => posts.value.find(p => p.id === unref(postId)) ?? null)

  const addPost = async (spaceId: string, content: string): Promise<string | null> => {
    const postId = await spacesApi.createPost(spaceId, { content })
    await fetchPostsForSpace(spaceId, true)
    return postId
  }

  // サーバー側の状態を正として反応の追加/解除を行い、結果をローカルへ反映する
  const toggleReaction = async (postId: string, emoji: string): Promise<void> => {
    const post = posts.value.find(p => p.id === postId)
    if (!post) return
    const nowReacted = await spacesApi.toggleReaction(post.spaceId, postId, emoji)
    const idx = post.myReactions.indexOf(emoji)
    if (nowReacted && idx < 0) {
      post.myReactions.push(emoji)
      post.reactions[emoji] = (post.reactions[emoji] ?? 0) + 1
    } else if (!nowReacted && idx >= 0) {
      post.myReactions.splice(idx, 1)
      post.reactions[emoji] = Math.max(0, (post.reactions[emoji] ?? 1) - 1)
      if (post.reactions[emoji] === 0) delete post.reactions[emoji]
    }
  }

  const addComment = async (postId: string, content: string): Promise<void> => {
    const post = posts.value.find(p => p.id === postId)
    if (!post) return
    await spacesApi.createComment(post.spaceId, postId, content)
    const comments = await spacesApi.fetchComments(post.spaceId, postId)
    post.comments = comments.map(toCommentView)
    post.commentCount = post.comments.length
    post.showComments = true
  }

  const editPost = async (postId: string, newContent: string): Promise<void> => {
    const post = posts.value.find(p => p.id === postId)
    if (!post) return
    await spacesApi.updatePost(post.spaceId, postId, newContent)
    post.content = newContent
  }

  const deletePost = async (postId: string): Promise<void> => {
    const post = posts.value.find(p => p.id === postId)
    if (!post) return
    await spacesApi.deletePost(post.spaceId, postId)
    posts.value = posts.value.filter(p => p.id !== postId)
  }

  return {
    spaces, spacesLoaded, posts,
    fetchSpaces, fetchPostsForSpace, fetchAllPosts,
    getPostsBySpace, getPost,
    addPost, toggleReaction, addComment, editPost, deletePost,
  }
}
