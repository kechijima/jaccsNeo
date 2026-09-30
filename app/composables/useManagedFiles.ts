/**
 * 業務ツールアプリ: ファイル管理
 * files コレクション（メタデータ）+ Firebase Storage（実体）
 */
import {
  collection, doc, addDoc, deleteDoc, getDocs, query, orderBy,
  serverTimestamp, type DocumentData,
} from 'firebase/firestore'
import type { ManagedFile } from '~/types/tools'
import { useAuthStore } from '~/stores/auth'
import { useStorage } from '~/composables/useStorage'

const toManagedFile = (id: string, data: DocumentData): ManagedFile => ({
  id,
  name:           data.name ?? '',
  url:            data.url ?? '',
  size:           data.size ?? 0,
  contentType:    data.contentType,
  uploadedByUid:  data.uploadedByUid ?? '',
  uploadedByName: data.uploadedByName ?? '',
  createdAt:      data.createdAt,
})

export const useManagedFiles = () => {
  const { $db } = useNuxtApp()
  const authStore = useAuthStore()
  const { uploadFile } = useStorage()

  const filesCol = () => collection($db, 'files')

  const fetchFiles = async (): Promise<ManagedFile[]> => {
    const snap = await getDocs(query(filesCol(), orderBy('createdAt', 'desc')))
    return snap.docs.map(d => toManagedFile(d.id, d.data()))
  }

  const uploadManagedFile = async (file: File): Promise<string> => {
    const path = `tools/files/${Date.now()}_${file.name}`
    const url = await uploadFile(path, file)
    const ref = await addDoc(filesCol(), {
      name:           file.name,
      url,
      size:           file.size,
      contentType:    file.type,
      uploadedByUid:  authStore.user?.uid ?? '',
      uploadedByName: authStore.user?.displayName ?? '',
      createdAt:      serverTimestamp(),
    })
    return ref.id
  }

  // Storage側の実体は削除せず、一覧からのみ除外する（簡易実装のための割り切り）
  const deleteManagedFile = async (id: string): Promise<void> => {
    await deleteDoc(doc($db, 'files', id))
  }

  return { fetchFiles, uploadManagedFile, deleteManagedFile }
}
