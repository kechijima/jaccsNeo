import {
  collection, doc, getDocs, addDoc, updateDoc,
  serverTimestamp, writeBatch, type DocumentData,
} from 'firebase/firestore'
import { LIFE_INSURANCE_CASES } from '~/data/lifeInsuranceData'
import type { LifeInsuranceCase, LifeInsuranceCaseInput } from '~/types/lifeInsurance'
import { useAppDefs } from '~/composables/useAppDefs'
import { useNotifications } from '~/composables/useNotifications'
import { useAuthStore } from '~/stores/auth'

const COLLECTION = 'lifeInsuranceCases'

const toDate = (val: any): Date =>
  val?.toDate?.() ?? (val instanceof Date ? val : new Date())

const toCase = (id: string, data: DocumentData): LifeInsuranceCase => ({
  id,
  ...data,
  createdAt: toDate(data.createdAt),
  updatedAt: toDate(data.updatedAt),
}) as LifeInsuranceCase

// Firestoreはフィールド値にundefinedを許可せずエラーになるため、送信前に取り除く
const stripUndefined = <T extends Record<string, any>>(obj: T): T => {
  const result = {} as T
  for (const key of Object.keys(obj) as (keyof T)[]) {
    if (obj[key] !== undefined) result[key] = obj[key]
  }
  return result
}

// 連携アプリのアプリ責任者へ、案件の登録・編集を通知する
const notifyAppOwner = async (action: '登録' | '編集', caseName: string, caseId: string) => {
  try {
    const { appDefs, fetchAll: fetchAppDefs } = useAppDefs()
    await fetchAppDefs()
    const app = appDefs.value.find(a => a.sourceServiceType === 'lifeInsurance' && a.ownerUid)
    if (!app?.ownerUid) return
    const authStore = useAuthStore()
    if (app.ownerUid === authStore.user?.uid) return // 自分自身の操作には通知しない
    await useNotifications().sendNotification(app.ownerUid, {
      type: 'system',
      title: `生命保険案件が${action}されました`,
      body: `${authStore.user?.displayName ?? '担当者'} さんが「${caseName}」の案件を${action}しました。`,
      linkUrl: `/services/lifeInsurance/${caseId}`,
      relatedId: caseId,
    })
  } catch (e) {
    console.error('アプリ責任者への通知に失敗しました', e)
  }
}

export const useLifeInsuranceCases = () => {
  const { $db } = useNuxtApp()

  const cases   = useState<LifeInsuranceCase[]>('lifeInsuranceCases:list', () => [])
  const loaded  = useState<boolean>('lifeInsuranceCases:loaded', () => false)
  const loading = useState<boolean>('lifeInsuranceCases:loading', () => false)

  // Firestoreから案件一覧を取得（一度取得すればSPAセッション内はキャッシュを使う）
  const fetchAll = async (force = false) => {
    if (loaded.value && !force) return
    loading.value = true
    try {
      const snap = await getDocs(collection($db, COLLECTION))
      cases.value = snap.docs.map(d => toCase(d.id, d.data()))
      loaded.value = true
    } finally {
      loading.value = false
    }
  }

  const getByCustomerId = (customerId: Ref<string> | string) =>
    computed(() => cases.value.filter(c => c.customerId === unref(customerId)))

  const getById = (id: Ref<string> | string) =>
    computed(() => cases.value.find(c => c.id === unref(id)) ?? null)

  const create = async (input: LifeInsuranceCaseInput): Promise<string> => {
    const payload = stripUndefined(input)
    const ref = await addDoc(collection($db, COLLECTION), {
      ...payload,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    const now = new Date()
    cases.value = [{ id: ref.id, ...payload, createdAt: now, updatedAt: now } as LifeInsuranceCase, ...cases.value]
    notifyAppOwner('登録', payload.name ?? '', ref.id)
    return ref.id
  }

  const update = async (id: string, patch: Partial<LifeInsuranceCaseInput>): Promise<void> => {
    const payload = stripUndefined(patch)
    await updateDoc(doc($db, COLLECTION, id), { ...payload, updatedAt: serverTimestamp() })
    const idx = cases.value.findIndex(c => c.id === id)
    if (idx >= 0) cases.value[idx] = { ...cases.value[idx], ...payload, updatedAt: new Date() }
    notifyAppOwner('編集', cases.value[idx]?.name ?? payload.name ?? '', id)
  }

  // kintone CSVから取り込んだ既存61件をFirestoreへ一括投入する初回移行処理（管理者操作）
  const seedFromStatic = async (): Promise<number> => {
    const chunkSize = 400 // Firestoreの1バッチ上限（500件）未満に収める
    let count = 0
    for (let i = 0; i < LIFE_INSURANCE_CASES.length; i += chunkSize) {
      const batch = writeBatch($db)
      const chunk = LIFE_INSURANCE_CASES.slice(i, i + chunkSize)
      for (const c of chunk) {
        const { id, ...rest } = c
        batch.set(doc($db, COLLECTION, id), stripUndefined(rest))
        count++
      }
      await batch.commit()
    }
    await fetchAll(true)
    return count
  }

  return { cases, loading, loaded, fetchAll, getByCustomerId, getById, create, update, seedFromStatic }
}
