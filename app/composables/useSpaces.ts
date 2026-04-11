import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  onSnapshot,
  arrayUnion,
  arrayRemove,
  increment,
  runTransaction,
  type DocumentData,
  type Unsubscribe,
} from 'firebase/firestore'
import type { Space, SpaceSummary, Post, Comment, SpaceForm, PostForm } from '~/types/portal'
import { useAuthStore } from '~/stores/auth'

const toSpace = (id: string, data: DocumentData): Space => ({ id, ...data }) as Space
const toPost  = (id: string, data: DocumentData): Post  => ({ id, ...data }) as Post
const toComment = (id: string, data: DocumentData): Comment => ({ id, ...data }) as Comment

export const useSpaces = () => {
  const { $db } = useNuxtApp()
  const authStore = useAuthStore()

  const spacesCol = () => collection($db, 'spaces')
  const postsCol  = (spaceId: string) => collection($db, 'spaces', spaceId, 'posts')
  const commentsCol = (spaceId: string, postId: string) =>
    collection($db, 'spaces', spaceId, 'posts', postId, 'comments')

  // ===== スペース一覧 =====
  const fetchSpaces = async (): Promise<SpaceSummary[]> => {
    const constraints: any[] = [where('isArchived', '==', false), orderBy('updatedAt', 'desc')]

    // 一般ユーザーは自分が参加しているスペースのみ
    if (!authStore.isSystemAdmin && !authStore.isBoard) {
      constraints.unshift(where('memberUids', 'array-contains', authStore.user?.uid ?? ''))
    }

    const q = query(spacesCol(), ...constraints)
    const snap = await getDocs(q)
    return snap.docs.map(d => {
      const data = d.data()
      return {
        id: d.id,
        name: data.name,
        type: data.type,
        groupId: data.groupId,
        memberCount: data.memberUids?.length ?? 0,
        isArchived: data.isArchived ?? false,
        lastPostAt: data.lastPostAt,
      } as SpaceSummary
    })
  }

  // ===== スペース取得 =====
  const fetchSpace = async (spaceId: string): Promise<Space | null> => {
    const snap = await getDoc(doc($db, 'spaces', spaceId))
    if (!snap.exists()) return null
    return toSpace(snap.id, snap.data())
  }

  // ===== 全スペース（管理者用） =====
  const fetchAllSpaces = async (): Promise<Space[]> => {
    const snap = await getDocs(query(spacesCol(), orderBy('createdAt', 'desc')))
    return snap.docs.map(d => toSpace(d.id, d.data()))
  }

  // ===== スペース作成 =====
  const createSpace = async (form: SpaceForm): Promise<string> => {
    const ref = await addDoc(spacesCol(), {
      ...form,
      memberUids: [authStore.user?.uid],
      adminUids:  [authStore.user?.uid],
      isArchived: false,
      createdBy:  authStore.user?.uid,
      createdAt:  serverTimestamp(),
      updatedAt:  serverTimestamp(),
    })
    return ref.id
  }

  // ===== スペース更新 =====
  const updateSpace = async (spaceId: string, form: Partial<SpaceForm>): Promise<void> => {
    await updateDoc(doc($db, 'spaces', spaceId), {
      ...form,
      updatedAt: serverTimestamp(),
    })
  }

  // ===== スペースアーカイブ =====
  const archiveSpace = async (spaceId: string, archive: boolean): Promise<void> => {
    await updateDoc(doc($db, 'spaces', spaceId), {
      isArchived: archive,
      updatedAt:  serverTimestamp(),
    })
  }

  // ===== メンバー追加/削除 =====
  const addMember = async (spaceId: string, uid: string): Promise<void> => {
    await updateDoc(doc($db, 'spaces', spaceId), {
      memberUids: arrayUnion(uid),
      updatedAt:  serverTimestamp(),
    })
  }

  const removeMember = async (spaceId: string, uid: string): Promise<void> => {
    await updateDoc(doc($db, 'spaces', spaceId), {
      memberUids: arrayRemove(uid),
      adminUids:  arrayRemove(uid),
      updatedAt:  serverTimestamp(),
    })
  }

  const toggleAdmin = async (spaceId: string, uid: string, isAdmin: boolean): Promise<void> => {
    await updateDoc(doc($db, 'spaces', spaceId), {
      adminUids: isAdmin ? arrayUnion(uid) : arrayRemove(uid),
      updatedAt: serverTimestamp(),
    })
  }

  // ===== 投稿一覧（リアルタイム） =====
  const subscribePosts = (spaceId: string, callback: (posts: Post[]) => void): Unsubscribe => {
    const q = query(postsCol(spaceId), orderBy('createdAt', 'desc'), limit(30))
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map(d => toPost(d.id, d.data())))
    })
  }

  // ===== 投稿取得 =====
  const fetchPosts = async (spaceId: string): Promise<Post[]> => {
    const q = query(postsCol(spaceId), orderBy('createdAt', 'desc'), limit(30))
    const snap = await getDocs(q)
    return snap.docs.map(d => toPost(d.id, d.data()))
  }

  // ===== 投稿作成 =====
  const createPost = async (spaceId: string, form: PostForm): Promise<string> => {
    const ref = await addDoc(postsCol(spaceId), {
      spaceId,
      ...form,
      authorUid:      authStore.user?.uid,
      authorName:     authStore.user?.displayName,
      reactionCounts: {},
      commentCount:   0,
      isPinned:       false,
      createdAt:      serverTimestamp(),
      updatedAt:      serverTimestamp(),
    })

    // スペースの最終投稿日時を更新
    await updateDoc(doc($db, 'spaces', spaceId), {
      lastPostAt: serverTimestamp(),
      updatedAt:  serverTimestamp(),
    })

    return ref.id
  }

  // ===== 投稿削除 =====
  const deletePost = async (spaceId: string, postId: string): Promise<void> => {
    await deleteDoc(doc($db, 'spaces', spaceId, 'posts', postId))
  }

  // ===== ピン留め =====
  const pinPost = async (spaceId: string, postId: string): Promise<void> => {
    await runTransaction($db, async (tx) => {
      // 既存のピン留め解除
      const spaceRef = doc($db, 'spaces', spaceId)
      const spaceSnap = await tx.get(spaceRef)
      const prevPinnedId = spaceSnap.data()?.pinnedPostId
      if (prevPinnedId && prevPinnedId !== postId) {
        tx.update(doc($db, 'spaces', spaceId, 'posts', prevPinnedId), { isPinned: false })
      }
      tx.update(doc($db, 'spaces', spaceId, 'posts', postId), { isPinned: true })
      tx.update(spaceRef, { pinnedPostId: postId })
    })
  }

  // ===== リアクション =====
  const toggleReaction = async (spaceId: string, postId: string, emoji: string): Promise<void> => {
    const reactionRef = doc($db, 'spaces', spaceId, 'posts', postId, 'reactions', `${authStore.user?.uid}_${emoji}`)
    const reactionSnap = await getDoc(reactionRef)
    const postRef = doc($db, 'spaces', spaceId, 'posts', postId)

    if (reactionSnap.exists()) {
      await deleteDoc(reactionRef)
      await updateDoc(postRef, { [`reactionCounts.${emoji}`]: increment(-1) })
    } else {
      await updateDoc(reactionRef as any, {
        emoji,
        uid: authStore.user?.uid,
        createdAt: serverTimestamp(),
      })
      await updateDoc(postRef, { [`reactionCounts.${emoji}`]: increment(1) })
    }
  }

  // ===== コメント取得 =====
  const fetchComments = async (spaceId: string, postId: string): Promise<Comment[]> => {
    const q = query(commentsCol(spaceId, postId), orderBy('createdAt', 'asc'))
    const snap = await getDocs(q)
    return snap.docs.map(d => toComment(d.id, d.data()))
  }

  // ===== コメント作成 =====
  const createComment = async (spaceId: string, postId: string, content: string): Promise<void> => {
    await addDoc(commentsCol(spaceId, postId), {
      postId,
      spaceId,
      content,
      authorUid:  authStore.user?.uid,
      authorName: authStore.user?.displayName,
      createdAt:  serverTimestamp(),
    })
    await updateDoc(doc($db, 'spaces', spaceId, 'posts', postId), {
      commentCount: increment(1),
      updatedAt:    serverTimestamp(),
    })
  }

  return {
    fetchSpaces,
    fetchSpace,
    fetchAllSpaces,
    createSpace,
    updateSpace,
    archiveSpace,
    addMember,
    removeMember,
    toggleAdmin,
    subscribePosts,
    fetchPosts,
    createPost,
    deletePost,
    pinPost,
    toggleReaction,
    fetchComments,
    createComment,
  }
}
