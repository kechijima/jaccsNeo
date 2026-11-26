import {
  collection,
  collectionGroup,
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
  startAfter,
  getCountFromServer,
  serverTimestamp,
  arrayUnion,
  Timestamp,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore'
import type { ServiceCase, ServiceCaseForm, ServiceType, ServiceStatus, ServiceProgressReport } from '~/types/service'
import { useAuthStore } from '~/stores/auth'

// lifeInsuranceは実データがこのサブコレクションではなく専用のlifeInsuranceCasesコレクションに
// 保存されているため（他のアプリとは異なる例外）、ここでの集計では常に0件になる。
// 呼び出し側（顧客のアプリ連携状況等）はuseLifeInsuranceCases側の件数と合算する必要がある
const ALL_SERVICE_TYPES: ServiceType[] = [
  'lifeInsurance', 'fireInsurance', 'autoInsurance',
  'realEstatePurchase', 'realEstateSale', 'realEstateRental',
  'homeLoan', 'jobChange', 'seniorPlanning',
  'communication', 'hikari', 'moving', 'renovation',
  'travel', 'bridal', 'legal', 'inheritance',
  'companySetup', 'waterServer',
]

const toCase = (id: string, data: DocumentData): ServiceCase => ({
  id,
  ...data,
}) as ServiceCase

// Firestoreはフィールド値にundefinedを許可せずエラーになるため、送信前に取り除く
const stripUndefined = <T extends Record<string, any>>(obj: T): T => {
  const result = {} as T
  for (const key of Object.keys(obj) as (keyof T)[]) {
    if (obj[key] !== undefined) result[key] = obj[key]
  }
  return result
}

export const useServices = () => {
  const { $db } = useNuxtApp()
  const authStore = useAuthStore()

  const casesRef = (customerId: string, serviceType: ServiceType) =>
    collection($db, 'customers', customerId, 'services', serviceType, 'cases')

  // ===== 案件一覧取得 =====
  const fetchCases = async (customerId: string, serviceType: ServiceType): Promise<ServiceCase[]> => {
    const q = query(casesRef(customerId, serviceType), orderBy('updatedAt', 'desc'))
    const snap = await getDocs(q)
    return snap.docs.map(d => toCase(d.id, d.data()))
  }

  // ===== 全顧客・全サービスタイプの案件を横断取得 =====
  // customers/{customerId}/services/{serviceType}/cases のサブコレクションは顧客ごとに
  // 分かれているため、collectionGroupクエリで「cases」という名前の全サブコレクションを
  // 横断取得する。where/orderByを付けるとコレクショングループ用の複合インデックスを
  // 別途Firestore側に作成する必要があり（このリポジトリのCIはFirestoreのインデックス・
  // ルールを自動デプロイしない）、絞り込み・並び替えなしの単純な取得にとどめ、
  // フィルタ・ソートは呼び出し側でクライアント処理する
  const fetchAllCases = async (): Promise<ServiceCase[]> => {
    const snap = await getDocs(collectionGroup($db, 'cases'))
    return snap.docs.map(d => toCase(d.id, d.data()))
  }

  // ===== 指定サービスタイプの案件を全顧客横断で取得 =====
  // 以前は全顧客・全サービスタイプ分（19アプリ分）を丸ごと取得してからクライアント側で
  // このserviceTypeだけに絞り込んでいたが、アプリ別の案件一覧を開くたびに他18アプリ分の
  // データまで毎回ダウンロードすることになり無駄が大きかった。where句（単一条件の等価
  // 比較のみ、並び替えは付けない）でFirestore側に絞り込みを任せる。単一条件のみなので
  // 複合インデックスは不要だが、collectionGroupクエリでこのフィールドを使うには
  // firestore.indexes.jsonのfieldOverridesでCOLLECTION_GROUPスコープを有効化する
  // 必要がある（デプロイ時に手動でfirestore:indexesの反映が必要）
  const fetchAllCasesForType = async (serviceType: ServiceType): Promise<ServiceCase[]> => {
    const snap = await getDocs(query(collectionGroup($db, 'cases'), where('serviceType', '==', serviceType)))
    return snap.docs.map(d => toCase(d.id, d.data()))
  }

  // ===== 指定サービスタイプの案件をページ単位で取得 =====
  // 一覧を開いた時点で全件（数百〜数千件）を丸ごと取得すると読み込みが重くなるため、
  // 既定では上位N件だけを取得し、「もっと見る」で続きを取得する。serviceTypeでの絞り込みに
  // 加えてupdatedAtで並び替える複合クエリになるため、firestore.indexes.jsonに
  // collectionGroupスコープの複合インデックスを追加し、手動でfirestore:indexesの
  // 反映が必要（fetchAllCasesForTypeの単一条件のみのクエリとは別に必要になる）
  const CASES_PAGE_SIZE = 25
  const fetchCasesPageForType = async (
    serviceType: ServiceType,
    cursor?: QueryDocumentSnapshot,
  ): Promise<{ cases: ServiceCase[]; lastDoc: QueryDocumentSnapshot | null; hasMore: boolean }> => {
    const constraints = [where('serviceType', '==', serviceType), orderBy('updatedAt', 'desc'), limit(CASES_PAGE_SIZE)]
    if (cursor) constraints.push(startAfter(cursor))
    const snap = await getDocs(query(collectionGroup($db, 'cases'), ...constraints))
    return {
      cases: snap.docs.map(d => toCase(d.id, d.data())),
      lastDoc: snap.docs[snap.docs.length - 1] ?? null,
      hasMore: snap.docs.length === CASES_PAGE_SIZE,
    }
  }

  // ===== 顧客1人分の、各サービスタイプごとの案件件数 =====
  // 以前はcustomers/[id]/services/index.vue（アプリ連携状況の一覧）が、全顧客・全19アプリ
  // 横断のcollectionGroupクエリでドキュメント本体を丸ごと取得してからこの顧客のcustomerIdで
  // クライアント側に絞り込んでいたが、ドキュメント本体ではなく件数だけをFirestore側で集計する
  // getCountFromServer()を使い、この顧客のサブコレクションだけを問い合わせるようにする
  // （lifeInsuranceは対象外。呼び出し側でuseLifeInsuranceCases().fetchCountForCustomer()と合算する）
  const fetchCaseCountsForCustomer = async (customerId: string): Promise<Record<string, number>> => {
    const results = await Promise.all(
      ALL_SERVICE_TYPES.filter(t => t !== 'lifeInsurance').map(async (type) => {
        const snap = await getCountFromServer(casesRef(customerId, type))
        return [type, snap.data().count] as const
      }),
    )
    return Object.fromEntries(results.filter(([, count]) => count > 0))
  }

  // ===== 全サービスタイプのサマリー =====
  const fetchAllServiceSummaries = async (customerId: string) => {
    const results = await Promise.all(
      ALL_SERVICE_TYPES.map(async (type) => {
        const q = query(casesRef(customerId, type), orderBy('updatedAt', 'desc'), limit(1))
        const snap = await getDocs(q)
        return {
          serviceType: type,
          caseCount: snap.size,
          latestStatus: snap.docs[0]?.data().status,
          latestUpdatedAt: snap.docs[0]?.data().updatedAt,
        }
      })
    )

    return results.filter(r => r.caseCount > 0)
  }

  // ===== 1件取得 =====
  const fetchCase = async (customerId: string, serviceType: ServiceType, caseId: string): Promise<ServiceCase | null> => {
    const ref = doc($db, 'customers', customerId, 'services', serviceType, 'cases', caseId)
    const snap = await getDoc(ref)
    if (!snap.exists()) return null
    return toCase(snap.id, snap.data())
  }

  // ===== 新規作成 =====
  // createdAt/updatedAtはCSVインポート（kintone移行）で過去の日時を引き継ぎたい場合のみ
  // formに指定する（通常の新規作成画面では指定されず、従来通りserverTimestamp()になる）
  const createCase = async (customerId: string, serviceType: ServiceType, form: ServiceCaseForm): Promise<string> => {
    const { createdAt, updatedAt, ...rest } = form
    const ref = await addDoc(casesRef(customerId, serviceType), {
      ...stripUndefined(rest),
      customerId,
      serviceType,
      createdBy: authStore.user?.uid,
      updatedBy: authStore.user?.uid,
      createdAt: createdAt ? Timestamp.fromDate(createdAt) : serverTimestamp(),
      updatedAt: updatedAt ? Timestamp.fromDate(updatedAt) : serverTimestamp(),
    })
    return ref.id
  }

  // ===== 更新 =====
  const updateCase = async (customerId: string, serviceType: ServiceType, caseId: string, form: Partial<ServiceCaseForm>): Promise<void> => {
    const ref = doc($db, 'customers', customerId, 'services', serviceType, 'cases', caseId)
    await updateDoc(ref, {
      ...stripUndefined(form),
      updatedBy: authStore.user?.uid,
      updatedAt: serverTimestamp(),
    })
  }

  // ===== 削除 =====
  const deleteCase = async (customerId: string, serviceType: ServiceType, caseId: string): Promise<void> => {
    await deleteDoc(doc($db, 'customers', customerId, 'services', serviceType, 'cases', caseId))
  }

  // ===== ステータス・進捗報告更新 =====
  const updateCaseStatus = async (customerId: string, serviceType: ServiceType, caseId: string, newStatus: ServiceStatus, oldStatus: ServiceStatus): Promise<void> => {
    const report: Partial<ServiceProgressReport> = {
      id:         `rep_${Date.now()}`,
      authorUid:  authStore.user?.uid,
      authorName: authStore.user?.displayName,
      content:    `ステータスを「${newStatus}」に変更しました。`,
      statusFrom: oldStatus,
      statusTo:   newStatus,
      createdAt:  serverTimestamp() as any,
    }

    try {
      const ref = doc($db, 'customers', customerId, 'services', serviceType, 'cases', caseId)
      await updateDoc(ref, {
        status:    newStatus,
        reports:   arrayUnion(report),
        updatedBy: authStore.user?.uid,
        updatedAt: serverTimestamp(),
      })
    } catch (e) {
      console.warn('Mock: Status updated to', newStatus)
    }
  }

  const addProgressReport = async (customerId: string, serviceType: ServiceType, caseId: string, content: string): Promise<void> => {
    const report: Partial<ServiceProgressReport> = {
      id:         `rep_${Date.now()}`,
      authorUid:  authStore.user?.uid,
      authorName: authStore.user?.displayName,
      content,
      createdAt:  serverTimestamp() as any,
    }

    try {
      const ref = doc($db, 'customers', customerId, 'services', serviceType, 'cases', caseId)
      await updateDoc(ref, {
        reports:   arrayUnion(report),
        updatedBy: authStore.user?.uid,
        updatedAt: serverTimestamp(),
      })
    } catch (e) {
      console.warn('Mock: Report added:', content)
    }
  }

  return {
    fetchCases,
    fetchAllCases,
    fetchAllCasesForType,
    fetchCasesPageForType,
    fetchCaseCountsForCustomer,
    fetchAllServiceSummaries,
    fetchCase,
    createCase,
    updateCase,
    deleteCase,
    updateCaseStatus,
    addProgressReport,
  }
}
