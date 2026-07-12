import {
  collection, doc, getDocs, getDoc, addDoc, updateDoc,
  serverTimestamp, type DocumentData,
} from 'firebase/firestore'
import type { AppDef, AppDefInput, AppFieldDef } from '~/types/appDef'
import { useAuthStore } from '~/stores/auth'

const COLLECTION = 'appDefs'

const toDate = (val: any): Date => val?.toDate?.() ?? (val instanceof Date ? val : new Date())

const toAppDef = (id: string, data: DocumentData): AppDef => ({
  id,
  name: data.name ?? '',
  description: data.description,
  fields: data.fields ?? [],
  ownerUid: data.ownerUid,
  staffUids: data.staffUids ?? [],
  sourceServiceType: data.sourceServiceType,
  createdBy: data.createdBy ?? '',
  createdAt: toDate(data.createdAt),
  updatedAt: toDate(data.updatedAt),
}) as AppDef

const cloneFields = (fields: AppFieldDef[]): AppFieldDef[] =>
  fields.map(f => ({ ...f, id: `f-${Date.now()}-${Math.random().toString(36).slice(2)}`, options: [...f.options] }))

// アプリ管理（フォームビルダー）で作成するアプリ定義。Firestoreの appDefs コレクションで管理する
export const useAppDefs = () => {
  const { $db } = useNuxtApp()
  const authStore = useAuthStore()

  const appDefs = useState<AppDef[]>('appDefs:list', () => [])
  const loading = useState<boolean>('appDefs:loading', () => false)
  const loaded  = useState<boolean>('appDefs:loaded', () => false)

  const fetchAll = async (force = false) => {
    if (loaded.value && !force) return
    loading.value = true
    try {
      const snap = await getDocs(collection($db, COLLECTION))
      appDefs.value = snap.docs.map(d => toAppDef(d.id, d.data()))
      loaded.value = true
    } finally {
      loading.value = false
    }
  }

  const getById = (id: Ref<string> | string) =>
    computed(() => appDefs.value.find(a => a.id === unref(id)) ?? null)

  const fetchOne = async (id: string): Promise<AppDef | null> => {
    const snap = await getDoc(doc($db, COLLECTION, id))
    if (!snap.exists()) return null
    return toAppDef(snap.id, snap.data())
  }

  const create = async (input: AppDefInput): Promise<string> => {
    const ref = await addDoc(collection($db, COLLECTION), {
      ...input,
      createdBy: authStore.user?.uid ?? '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    await fetchAll(true)
    return ref.id
  }

  const update = async (id: string, patch: Partial<AppDefInput>): Promise<void> => {
    await updateDoc(doc($db, COLLECTION, id), { ...patch, updatedAt: serverTimestamp() })
    const idx = appDefs.value.findIndex(a => a.id === id)
    if (idx >= 0) appDefs.value[idx] = { ...appDefs.value[idx], ...patch, updatedAt: new Date() } as AppDef
  }

  // 既存アプリを複製して新しいアプリを作成する（フィールド構成のみコピー、責任者・担当者は未設定で開始）
  const duplicateFrom = async (sourceId: string, newName: string): Promise<string> => {
    const source = appDefs.value.find(a => a.id === sourceId) ?? await fetchOne(sourceId)
    if (!source) throw new Error('複製元のアプリが見つかりません')
    return create({
      name: newName,
      description: source.description,
      fields: cloneFields(source.fields),
      staffUids: [],
    })
  }

  return { appDefs, loading, loaded, fetchAll, getById, fetchOne, create, update, duplicateFrom }
}
