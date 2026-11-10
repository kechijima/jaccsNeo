/**
 * 掲示板（スペース・投稿）のグローバル共有ストア
 * Firestore（spaces / spaces/{id}/posts / .../comments）を app/composables/useSpaces.ts 経由で読み書きする
 */
import type { Space, Post, Comment as SpaceComment } from '~/types/portal'
import { useSpaces } from '~/composables/useSpaces'
import { useEvents } from '~/composables/useEvents'
import { useUsers } from '~/composables/useUsers'
import { useAuthStore } from '~/stores/auth'
import { meetsMinTitle } from '~/types/user'

const stripHtml = (html: string) => html.replace(/<[^>]*>/g, '').trim()

const spaceColorMap: Record<string, string> = {
  report:  'bg-green-100 text-green-700',
  board:   'bg-rose-100 text-rose-700',
  kumiai:  'bg-purple-100 text-purple-700',
  event:   'bg-sky-100 text-sky-700',
  group:   'bg-indigo-100 text-indigo-700',
  meeting: 'bg-amber-100 text-amber-700',
  other:   'bg-gray-100 text-gray-600',
}

export interface CommentView {
  id: string
  authorId: string
  authorName: string
  authorInitial: string
  authorAvatarUrl?: string
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
  authorAvatarUrl?: string
  content: string
  reactions: Record<string, number>
  myReactions: string[]
  commentCount: number
  comments: CommentView[]
  showComments: boolean
  isPinned: boolean
  status: 'draft' | 'published'
  postedAt: string
  createdAt: Date
  eventStartAt?: Date
  eventEndAt?: Date
  linkedEventId?: string
}

const toDate = (val: any): Date => val?.toDate?.() ?? (val instanceof Date ? val : new Date())

const toCommentView = (c: SpaceComment, avatarMap: Record<string, string>): CommentView => ({
  id:              c.id,
  authorId:        c.authorUid,
  authorName:      c.authorName,
  authorInitial:   (c.authorName ?? '?').charAt(0),
  authorAvatarUrl: avatarMap[c.authorUid] || undefined,
  content:         c.content,
  postedAt:        toDate(c.createdAt).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' }),
})

const buildPostView = (space: Space | undefined, p: Post, comments: CommentView[], avatarMap: Record<string, string>): PostView => ({
  id:            p.id,
  spaceId:       p.spaceId,
  spaceName:     space?.name ?? '',
  spaceColor:    spaceColorMap[space?.type ?? ''] ?? 'bg-indigo-100 text-indigo-700',
  authorId:      p.authorUid ?? '',
  authorName:    p.authorName ?? '',
  authorInitial: (p.authorName ?? '?').charAt(0),
  authorAvatarUrl: avatarMap[p.authorUid ?? ''] || undefined,
  content:       p.content,
  reactions:     { ...(p.reactionCounts ?? {}) },
  myReactions:   [],
  commentCount:  p.commentCount ?? comments.length,
  comments,
  showComments:  false,
  isPinned:      p.isPinned ?? false,
  status:        p.status ?? 'published',
  postedAt:      toDate(p.createdAt).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
  createdAt:     toDate(p.createdAt),
  eventStartAt:  p.eventStartAt ? toDate(p.eventStartAt) : undefined,
  eventEndAt:    p.eventEndAt ? toDate(p.eventEndAt) : undefined,
  linkedEventId: p.linkedEventId,
})

export const usePortalStore = () => {
  const spacesApi = useSpaces()

  const spaces        = useState<Space[]>('portal:spaces', () => [])
  const spacesLoaded   = useState<boolean>('portal:spacesLoaded', () => false)
  const posts          = useState<PostView[]>('portal:posts', () => [])
  const loadedSpaceIds = useState<string[]>('portal:loadedSpaceIds', () => [])

  // ── 投稿者・コメント者アイコン（マイページで設定したavatarUrl）解決用 ──
  // 投稿側にはアイコンを保存せず、都度ユーザー一覧から解決することで、マイページで
  // 写真を変更した際に過去の投稿表示にも即座に反映されるようにする
  const authorAvatars       = useState<Record<string, string>>('portal:authorAvatars', () => ({}))
  const authorAvatarsLoaded = useState<boolean>('portal:authorAvatarsLoaded', () => false)
  const ensureAuthorAvatarsLoaded = async (force = false) => {
    if (authorAvatarsLoaded.value && !force) return
    const { fetchUsers } = useUsers()
    const users = await fetchUsers().catch(() => [])
    authorAvatars.value = Object.fromEntries(
      users.filter(u => u.avatarUrl).map(u => [u.uid, u.avatarUrl as string]),
    )
    authorAvatarsLoaded.value = true
  }

  // ── スペース一覧（アーカイブ済み・閲覧タイトル条件を満たさないものを除く） ──
  // minTitleLevelはシステム管理者には適用しない（管理目的で全スペースを把握できる必要があるため）
  const fetchSpaces = async (force = false) => {
    if (spacesLoaded.value && !force) return
    const authStore = useAuthStore()
    const isSystemAdmin = authStore.isSystemAdmin
    spaces.value = (await spacesApi.fetchAllSpaces()).filter(s =>
      !s.isArchived && (isSystemAdmin || meetsMinTitle(authStore.user?.position, s.minTitleLevel)),
    )
    spacesLoaded.value = true

    // postCount導入前に作成されたスペースは実際の件数で自己修復する（非同期・非ブロッキング）
    for (const space of spaces.value) {
      if (space.postCount === undefined) {
        spacesApi.syncPostCount(space.id).then((count) => {
          const target = spaces.value.find(s => s.id === space.id)
          if (target) target.postCount = count
        }).catch(() => {})
      }
    }
  }

  // ── 投稿一覧（スペースごとに取得しキャッシュへマージ） ───────────────
  const fetchPostsForSpace = async (spaceId: string, force = false) => {
    if (loadedSpaceIds.value.includes(spaceId) && !force) return
    await fetchSpaces()
    const space = spaces.value.find(s => s.id === spaceId)
    // 閲覧条件（minTitleLevel）を満たさない・アーカイブ済み・存在しないスペースは
    // 投稿を取得しない（個別投稿ページ等、呼び出し元ごとにガードを実装しなくても
    // ここで一括して漏れを防ぐ）。万一キャッシュに残っていれば除去する
    if (!space) {
      posts.value = posts.value.filter(p => p.spaceId !== spaceId)
      return
    }
    const authStore = useAuthStore()
    const myUid = authStore.user?.uid
    await ensureAuthorAvatarsLoaded()
    // 下書きは投稿者本人にのみ見える（他のメンバーの一覧には出さない）
    const rawPosts = (await spacesApi.fetchPosts(spaceId))
      .filter(p => p.status !== 'draft' || p.authorUid === myUid)

    const views = await Promise.all(rawPosts.map(async (p) => {
      const comments = await spacesApi.fetchComments(spaceId, p.id).catch(() => [] as SpaceComment[])
      return buildPostView(space, p, comments.map(c => toCommentView(c, authorAvatars.value)), authorAvatars.value)
    }))

    posts.value = [...posts.value.filter(p => p.spaceId !== spaceId), ...views].sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1
      return b.createdAt.getTime() - a.createdAt.getTime()
    })
    if (!loadedSpaceIds.value.includes(spaceId)) loadedSpaceIds.value = [...loadedSpaceIds.value, spaceId]
  }

  // ── 全スペースの投稿をまとめて取得（掲示板トップ用） ──────────────────
  const fetchAllPosts = async (force = false) => {
    await fetchSpaces(force)
    await Promise.all(spaces.value.map(s => fetchPostsForSpace(s.id, force)))
  }

  // ── ダッシュボード向けの軽量プレビュー取得 ────────────────────────────
  // 「最新投稿」を数件表示するだけのために全スペース×全投稿のコメントまで
  // 毎回取得すると初回表示が非常に重くなるため、コメントは取得しない専用の取得経路を用意する
  const previewPosts  = useState<PostView[]>('portal:previewPosts', () => [])
  const previewLoaded = useState<boolean>('portal:previewLoaded', () => false)

  const fetchRecentPostsPreview = async (force = false) => {
    if (previewLoaded.value && !force) return
    await fetchSpaces(force)
    await ensureAuthorAvatarsLoaded()
    const perSpace = await Promise.all(spaces.value.map(async (s) => {
      const rawPosts = await spacesApi.fetchPosts(s.id).catch(() => [] as Post[])
      return rawPosts.filter(p => !p.isPinned && p.status !== 'draft').map(p => buildPostView(s, p, [], authorAvatars.value))
    }))
    previewPosts.value = perSpace.flat().sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    previewLoaded.value = true
  }

  const getPostsBySpace = (spaceId: Ref<string> | string) =>
    computed(() => posts.value.filter(p => p.spaceId === unref(spaceId)))

  const getPost = (postId: Ref<string> | string) =>
    computed(() => posts.value.find(p => p.id === unref(postId)) ?? null)

  const addPost = async (
    spaceId: string,
    content: string,
    eventOptions?: { startAt: Date; endAt?: Date; syncToCalendar: boolean },
    asDraft = false,
  ): Promise<string | null> => {
    const postId = await spacesApi.createPost(spaceId, {
      content,
      eventStartAt: eventOptions ? eventOptions.startAt.toISOString() : undefined,
      eventEndAt: eventOptions?.endAt ? eventOptions.endAt.toISOString() : undefined,
      syncToCalendar: eventOptions?.syncToCalendar,
      status: asDraft ? 'draft' : 'published',
    })

    // 下書き保存時はカレンダー連携・掲示板一覧への反映を行わない（公開時に初めて行う）
    // イベントスペースで「カレンダーに連携する」がONの場合、同じ日時・内容でカレンダーにも登録する
    // （イベント掲示板からの連携では入力項目を増やさないため、タイトルは投稿内容から自動生成する。
    //  投稿自体にタイトル項目がないため、どのスペースのイベントか分かるようスペース名を必ず含める）
    if (!asDraft && eventOptions?.syncToCalendar && eventOptions.startAt) {
      const space = spaces.value.find(s => s.id === spaceId)
      const { createEvent } = useEvents()
      const excerpt = stripHtml(content).slice(0, 40).trim()
      const title = space?.name
        ? (excerpt ? `【${space.name}】${excerpt}` : space.name)
        : (excerpt || 'イベント')

      // イベント掲示板への投稿では対象グループを入力する項目がなく、後から編集が
      // 必要になっていたため、投稿者（ログインユーザー）自身の所属グループを
      // 自動的に登録する（投稿者が未所属の場合のみスペース側のグループにフォールバック）
      const authStore = useAuthStore()
      const inferredGroupId = authStore.user?.groupId ?? space?.groupId

      const eventId = await createEvent({
        title,
        startAt: eventOptions.startAt.toISOString(),
        endAt: eventOptions.endAt?.toISOString(),
        scope: inferredGroupId ? 'group' : 'space',
        groupId: inferredGroupId,
        spaceId,
        postId: postId ?? undefined,
        category: 'event',
      })
      if (postId) await spacesApi.linkPostToEvent(spaceId, postId, eventId)
    }

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
    post.comments = comments.map(c => toCommentView(c, authorAvatars.value))
    post.commentCount = post.comments.length
    post.showComments = true
  }

  const editPost = async (postId: string, newContent: string): Promise<void> => {
    const post = posts.value.find(p => p.id === postId)
    if (!post) return
    await spacesApi.updatePost(post.spaceId, postId, newContent)
    post.content = newContent
  }

  // 下書きを公開する（この時点で掲示板一覧・最終投稿日時に反映される）
  const publishDraft = async (postId: string, newContent?: string): Promise<void> => {
    const post = posts.value.find(p => p.id === postId)
    if (!post) return
    await spacesApi.publishPost(post.spaceId, postId, newContent)
    post.status = 'published'
    if (newContent !== undefined) post.content = newContent
  }

  const deletePost = async (postId: string): Promise<void> => {
    const post = posts.value.find(p => p.id === postId)
    if (!post) return
    await spacesApi.deletePost(post.spaceId, postId)
    posts.value = posts.value.filter(p => p.id !== postId)
  }

  // 自分の下書き一覧（新しい順）
  const myDrafts = computed(() => {
    const authStore = useAuthStore()
    const myUid = authStore.user?.uid
    return posts.value
      .filter(p => p.status === 'draft' && p.authorId === myUid)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  })

  return {
    spaces, spacesLoaded, posts,
    previewPosts,
    fetchSpaces, fetchPostsForSpace, fetchAllPosts, fetchRecentPostsPreview,
    getPostsBySpace, getPost, myDrafts,
    addPost, toggleReaction, addComment, editPost, publishDraft, deletePost,
  }
}
