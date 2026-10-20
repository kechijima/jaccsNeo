/**
 * 業務ツールアプリ: ファイル管理
 * files コレクション（メタデータ）+ Firebase Storage（実体）
 */
import {
  collection, doc, addDoc, deleteDoc, getDocs, query, orderBy,
  serverTimestamp, type DocumentData,
} from 'firebase/firestore'
import type { ManagedFile, ManagedFileForm } from '~/types/tools'
import { useStorage } from '~/composables/useStorage'

const toManagedFile = (id: string, data: DocumentData): ManagedFile => ({
  id,
  title:          data.title ?? data.name ?? '',
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
  const { uploadFile } = useStorage()

  const filesCol = () => collection($db, 'files')

  const fetchFiles = async (): Promise<ManagedFile[]> => {
    const snap = await getDocs(query(filesCol(), orderBy('createdAt', 'desc')))
    return snap.docs.map(d => toManagedFile(d.id, d.data()))
  }

  // 作成者（creatorUid/creatorName）はアップロード操作者本人とは限らない
  // （代理登録を想定し、フォームで任意のユーザーを選択できるようにしている）
  const uploadManagedFile = async (file: File, form: ManagedFileForm): Promise<string> => {
    const path = `tools/files/${Date.now()}_${file.name}`
    const url = await uploadFile(path, file)
    const ref = await addDoc(filesCol(), {
      title:          form.title,
      name:           file.name,
      url,
      size:           file.size,
      contentType:    file.type,
      uploadedByUid:  form.creatorUid,
      uploadedByName: form.creatorName,
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
