/**
 * 業務ツールアプリ: ファイル管理
 * files コレクション（メタデータ）+ Firebase Storage（実体）
 */
import {
  collection, doc, addDoc, updateDoc, deleteDoc, getDocs, query, orderBy,
  serverTimestamp, type DocumentData,
} from 'firebase/firestore'
import type { ManagedFile, ManagedFileForm } from '~/types/tools'
import { meetsScopeVisibility } from '~/types/user'
import { useStorage } from '~/composables/useStorage'
import { useAuthStore } from '~/stores/auth'

const toManagedFile = (id: string, data: DocumentData): ManagedFile => ({
  id,
  title:           data.title ?? data.name ?? '',
  name:            data.name ?? '',
  url:             data.url ?? '',
  size:            data.size ?? 0,
  contentType:     data.contentType,
  visibleGroupIds: data.visibleGroupIds,
  minTitleLevel:   data.minTitleLevel,
  uploadedByUid:   data.uploadedByUid ?? '',
  uploadedByName:  data.uploadedByName ?? '',
  createdAt:       data.createdAt,
})

// ファイルの公開範囲（グループ・専門チーム・最低タイトル）を満たしているかどうかを判定する
export const canViewManagedFile = (file: ManagedFile, user: Parameters<typeof meetsScopeVisibility>[0]): boolean =>
  meetsScopeVisibility(user, file.visibleGroupIds, file.minTitleLevel)

export const useManagedFiles = () => {
  const { $db } = useNuxtApp()
  const authStore = useAuthStore()
  const { uploadFile } = useStorage()

  const filesCol = () => collection($db, 'files')

  const fetchFiles = async (): Promise<ManagedFile[]> => {
    const snap = await getDocs(query(filesCol(), orderBy('createdAt', 'desc')))
    const all = snap.docs.map(d => toManagedFile(d.id, d.data()))
    if (authStore.isSystemAdmin) return all
    return all.filter(f => canViewManagedFile(f, authStore.user))
  }

  // 登録・編集・削除はシステム管理者のみ（公開範囲等の「権限」設定も含め、
  // 一般ユーザーが変更できてしまわないようクライアント側でも明示的にガードする）。
  // 作成者（creatorUid/creatorName）はアップロード操作者本人とは限らない
  // （代理登録を想定し、フォームで任意のユーザーを選択できるようにしている）
  const uploadManagedFile = async (file: File, form: ManagedFileForm): Promise<string> => {
    if (!authStore.isSystemAdmin) throw new Error('権限がありません')
    const path = `tools/files/${Date.now()}_${file.name}`
    const url = await uploadFile(path, file)
    const ref = await addDoc(filesCol(), {
      title:           form.title,
      name:            file.name,
      url,
      size:            file.size,
      contentType:     file.type,
      visibleGroupIds: form.visibleGroupIds ?? [],
      minTitleLevel:   form.minTitleLevel ?? '',
      uploadedByUid:   form.creatorUid,
      uploadedByName:  form.creatorName,
      createdAt:       serverTimestamp(),
    })
    return ref.id
  }

  // ファイル本体（Storage側の実体）は差し替えず、タイトル・作成者・公開範囲のみ更新する
  const updateManagedFile = async (id: string, form: ManagedFileForm): Promise<void> => {
    if (!authStore.isSystemAdmin) throw new Error('権限がありません')
    await updateDoc(doc($db, 'files', id), {
      title:           form.title,
      uploadedByUid:   form.creatorUid,
      uploadedByName:  form.creatorName,
      visibleGroupIds: form.visibleGroupIds ?? [],
      minTitleLevel:   form.minTitleLevel ?? '',
    })
  }

  // Storage側の実体は削除せず、一覧からのみ除外する（簡易実装のための割り切り）
  const deleteManagedFile = async (id: string): Promise<void> => {
    if (!authStore.isSystemAdmin) throw new Error('権限がありません')
    await deleteDoc(doc($db, 'files', id))
  }

  return { fetchFiles, uploadManagedFile, updateManagedFile, deleteManagedFile }
}
