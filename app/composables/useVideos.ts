/**
 * 業務ツールアプリ: 動画配信
 * videos コレクションを利用する簡易CRUD
 */
import {
  collection, doc, addDoc, deleteDoc, getDocs, query, orderBy,
  serverTimestamp, type DocumentData,
} from 'firebase/firestore'
import type { ManagedVideo, ManagedVideoForm } from '~/types/tools'
import { useAuthStore } from '~/stores/auth'

const toVideo = (id: string, data: DocumentData): ManagedVideo => ({
  id,
  title:         data.title ?? '',
  description:   data.description,
  url:           data.url ?? '',
  createdByUid:  data.createdByUid ?? '',
  createdByName: data.createdByName ?? '',
  createdAt:     data.createdAt,
})

export const useVideos = () => {
  const { $db } = useNuxtApp()
  const authStore = useAuthStore()

  const videosCol = () => collection($db, 'videos')

  const fetchVideos = async (): Promise<ManagedVideo[]> => {
    const snap = await getDocs(query(videosCol(), orderBy('createdAt', 'desc')))
    return snap.docs.map(d => toVideo(d.id, d.data()))
  }

  const createVideo = async (form: ManagedVideoForm): Promise<string> => {
    const ref = await addDoc(videosCol(), {
      title:         form.title,
      description:   form.description ?? '',
      url:           form.url,
      createdByUid:  authStore.user?.uid ?? '',
      createdByName: authStore.user?.displayName ?? '',
      createdAt:     serverTimestamp(),
    })
    return ref.id
  }

  const deleteVideo = async (id: string): Promise<void> => {
    await deleteDoc(doc($db, 'videos', id))
  }

  return { fetchVideos, createVideo, deleteVideo }
}
