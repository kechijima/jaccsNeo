import { collection, doc, getDocs, setDoc, serverTimestamp, type DocumentData } from 'firebase/firestore'
import type { RequestType } from '~/types/request'
import { useAuthStore } from '~/stores/auth'

const COLLECTION = 'requestApprovers'

// 申請種別ごとの承認担当者（requestApprovers/{type} = { approverUids: string[] }）。
// 個別設定が無い種別は、従来通り理事会メンバー以上（isBoard）なら承認できる（後方互換）。
// システム管理者は、個別設定の有無に関わらず常に全種別を承認できる
export const useRequestApprovers = () => {
  const { $db } = useNuxtApp()
  const authStore = useAuthStore()

  const approverMap = useState<Record<string, string[]>>('requestApprovers:map', () => ({}))
  const loaded = useState<boolean>('requestApprovers:loaded', () => false)

  const col = () => collection($db, COLLECTION)

  const fetchAll = async (force = false): Promise<Record<string, string[]>> => {
    if (loaded.value && !force) return approverMap.value
    const snap = await getDocs(col())
    const map: Record<string, string[]> = {}
    snap.docs.forEach((d) => {
      const data = d.data() as DocumentData
      map[d.id] = data.approverUids ?? []
    })
    approverMap.value = map
    loaded.value = true
    return map
  }

  const setApprovers = async (type: RequestType, approverUids: string[]): Promise<void> => {
    if (!authStore.isSystemAdmin) throw new Error('権限がありません')
    await setDoc(doc($db, COLLECTION, type), {
      approverUids,
      updatedAt: serverTimestamp(),
    }, { merge: true })
    approverMap.value = { ...approverMap.value, [type]: approverUids }
  }

  // 指定した申請種別を、指定したユーザーが承認できるかどうか
  const canApprove = (type: RequestType, uid: string | undefined, isSystemAdmin: boolean, isBoard: boolean): boolean => {
    if (isSystemAdmin) return true
    if (!uid) return false
    const configured = approverMap.value[type]
    if (configured && configured.length > 0) return configured.includes(uid)
    return isBoard
  }

  // 1つでも承認できる種別を持っているか（申請一覧画面へのアクセス可否判定用）
  const canApproveAny = (uid: string | undefined, isSystemAdmin: boolean, isBoard: boolean): boolean => {
    if (isSystemAdmin || isBoard) return true
    if (!uid) return false
    return Object.values(approverMap.value).some(uids => uids.includes(uid))
  }

  return { approverMap, loaded, fetchAll, setApprovers, canApprove, canApproveAny }
}
