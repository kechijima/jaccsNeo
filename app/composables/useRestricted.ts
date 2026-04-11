import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  orderBy,
  serverTimestamp,
  type DocumentData,
} from 'firebase/firestore'
import type { RestrictedDoc, RestrictedAccessLog, RestrictedDocForm } from '~/types/group'
import { useAuthStore } from '~/stores/auth'

const toDoc = (id: string, data: DocumentData): RestrictedDoc => ({ id, ...data }) as RestrictedDoc

export const useRestricted = () => {
  const { $db } = useNuxtApp()
  const authStore = useAuthStore()

  const restrictedCol = () => collection($db, 'restricted')
  const accessLogCol  = (docId: string) => collection($db, 'restricted', docId, 'accessLogs')

  // ===== 一覧取得 =====
  const fetchDocs = async (): Promise<RestrictedDoc[]> => {
    const q = query(restrictedCol(), orderBy('createdAt', 'desc'))
    const snap = await getDocs(q)
    return snap.docs.map(d => toDoc(d.id, d.data()))
  }

  // ===== 1件取得（アクセスログも記録） =====
  const fetchDoc = async (docId: string): Promise<RestrictedDoc | null> => {
    const snap = await getDoc(doc($db, 'restricted', docId))
    if (!snap.exists()) return null

    // アクセスログを記録
    await addDoc(accessLogCol(docId), {
      uid:         authStore.user?.uid,
      displayName: authStore.user?.displayName,
      accessedAt:  serverTimestamp(),
    })

    return toDoc(snap.id, snap.data())
  }

  // ===== アクセスログ取得 =====
  const fetchAccessLogs = async (docId: string): Promise<RestrictedAccessLog[]> => {
    const q = query(accessLogCol(docId), orderBy('accessedAt', 'desc'))
    const snap = await getDocs(q)
    return snap.docs.map(d => ({ uid: d.id, ...d.data() }) as RestrictedAccessLog)
  }

  // ===== 作成 =====
  const createDoc = async (form: RestrictedDocForm): Promise<string> => {
    if (!authStore.isSystemAdmin) throw new Error('権限がありません')
    const ref = await addDoc(restrictedCol(), {
      ...form,
      attachments:   [],
      createdBy:     authStore.user?.uid,
      createdByName: authStore.user?.displayName,
      createdAt:     serverTimestamp(),
      updatedAt:     serverTimestamp(),
    })
    return ref.id
  }

  // ===== 更新 =====
  const updateDoc_ = async (docId: string, form: Partial<RestrictedDocForm>): Promise<void> => {
    if (!authStore.isSystemAdmin) throw new Error('権限がありません')
    await updateDoc(doc($db, 'restricted', docId), {
      ...form,
      updatedAt: serverTimestamp(),
    })
  }

  return {
    fetchDocs,
    fetchDoc,
    fetchAccessLogs,
    createDoc,
    updateDoc: updateDoc_,
  }
}
