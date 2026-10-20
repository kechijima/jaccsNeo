/**
 * 業務ツールアプリ: 動画配信
 * videos コレクションを利用する簡易CRUD
 */
import {
  collection, doc, addDoc, updateDoc, deleteDoc, getDocs, query, orderBy,
  serverTimestamp, type DocumentData,
} from 'firebase/firestore'
import type { ManagedVideo, ManagedVideoForm } from '~/types/tools'
import type { AppUser } from '~/types/user'
import { meetsScopeVisibility } from '~/types/user'
import { useAuthStore } from '~/stores/auth'

const toVideo = (id: string, data: DocumentData): ManagedVideo => ({
  id,
  title:           data.title ?? '',
  description:     data.description,
  url:             data.url ?? '',
  genre:           data.genre,
  visibleGroupIds: data.visibleGroupIds,
  minTitleLevel:   data.minTitleLevel,
  createdByUid:    data.createdByUid ?? '',
  createdByName:   data.createdByName ?? '',
  createdAt:       data.createdAt,
})

// 動画の公開範囲（グループ・専門チーム・最低タイトル）を満たしているかどうかを判定する。
// visibleGroupIdsが未設定・空の場合は制限なし（全員に公開）。システム管理者は
// 管理目的で常に全件を把握できるよう、呼び出し側でこのチェック自体をスキップする
export const canViewVideo = (video: ManagedVideo, user: AppUser | null | undefined): boolean =>
  meetsScopeVisibility(user, video.visibleGroupIds, video.minTitleLevel)

export const useVideos = () => {
  const { $db } = useNuxtApp()
  const authStore = useAuthStore()

  const videosCol = () => collection($db, 'videos')

  const fetchVideos = async (): Promise<ManagedVideo[]> => {
    const snap = await getDocs(query(videosCol(), orderBy('createdAt', 'desc')))
    const all = snap.docs.map(d => toVideo(d.id, d.data()))
    if (authStore.isSystemAdmin) return all
    return all.filter(v => canViewVideo(v, authStore.user))
  }

  // 追加・編集・削除はシステム管理者のみ（公開範囲等の「権限」設定も含め、
  // 一般ユーザーが変更できてしまわないようクライアント側でも明示的にガードする）
  const createVideo = async (form: ManagedVideoForm): Promise<string> => {
    if (!authStore.isSystemAdmin) throw new Error('権限がありません')
    const ref = await addDoc(videosCol(), {
      title:           form.title,
      description:     form.description ?? '',
      url:             form.url,
      genre:           form.genre ?? '',
      visibleGroupIds: form.visibleGroupIds ?? [],
      minTitleLevel:   form.minTitleLevel ?? '',
      createdByUid:    authStore.user?.uid ?? '',
      createdByName:   authStore.user?.displayName ?? '',
      createdAt:       serverTimestamp(),
    })
    return ref.id
  }

  const updateVideo = async (id: string, form: ManagedVideoForm): Promise<void> => {
    if (!authStore.isSystemAdmin) throw new Error('権限がありません')
    await updateDoc(doc($db, 'videos', id), {
      title:           form.title,
      description:     form.description ?? '',
      url:             form.url,
      genre:           form.genre ?? '',
      visibleGroupIds: form.visibleGroupIds ?? [],
      minTitleLevel:   form.minTitleLevel ?? '',
    })
  }

  const deleteVideo = async (id: string): Promise<void> => {
    if (!authStore.isSystemAdmin) throw new Error('権限がありません')
    await deleteDoc(doc($db, 'videos', id))
  }

  return { fetchVideos, createVideo, updateVideo, deleteVideo }
}
