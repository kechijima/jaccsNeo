<script setup lang="ts">
import type { QueryDocumentSnapshot } from 'firebase/firestore'
import { SERVICE_LABELS, STATUS_LABELS } from '~/types/service'
import type { ServiceCase, ServiceStatus } from '~/types/service'
import type { Customer } from '~/types/customer'
import { useServices } from '~/composables/useServices'
import { useCustomerStore } from '~/composables/useCustomerStore'
import { useLifeInsuranceCases } from '~/composables/useLifeInsuranceCases'
import { useFavorites } from '~/composables/useFavorites'
import { useAppDefs } from '~/composables/useAppDefs'
import { useUsers } from '~/composables/useUsers'
import { useAuthStore } from '~/stores/auth'
import { useToast } from '~/composables/useToast'

definePageMeta({ middleware: ['auth'] })

const route = useRoute()
const serviceType = computed(() => route.params.serviceType as string)
const isLifeInsurance = computed(() => serviceType.value === 'lifeInsurance')
const authStore = useAuthStore()
const { show: showToast } = useToast()

// アプリ管理（フォームビルダー）でこのserviceTypeに連携されたAppDefがあれば、
// その表示名を優先する（アプリ管理はデータ保存先の連携設定だが、表示名を
// 変更したい場合はそちらの設定を「プロダクトアプリ」「アプリ連携」画面の
// 表示名に反映する）。連携が無い場合はSERVICE_LABELSの固定名にフォールバックする
const { appDefs, fetchAll: fetchAppDefs } = useAppDefs()
await fetchAppDefs()
const currentAppDef = computed(() => appDefs.value.find(a => a.sourceServiceType === serviceType.value))
const serviceLabel = computed(() =>
  currentAppDef.value?.name
  ?? SERVICE_LABELS[serviceType.value]
  ?? serviceType.value,
)

// 案件データの削除は、このアプリの責任者（アプリ管理で設定）またはシステム
// 管理者のみ許可する（担当者個人ではなく、アプリ全体を管理する立場の操作のため）
const canDeleteCases = computed(() =>
  authStore.isSystemAdmin || !!currentAppDef.value?.ownerUids?.includes(authStore.user?.uid ?? ''),
)

const { isFavoriteApp, toggleFavoriteApp, ensureLoaded: ensureFavoritesLoaded } = useFavorites()
ensureFavoritesLoaded()

// ── 生命保険：専用案件データ（Firestore連動） ──────────
const { cases: liCases, loading: liLoading, fetchAll: fetchLiCases, remove: removeLiCase } = useLifeInsuranceCases()
if (isLifeInsurance.value) await fetchLiCases()

// ── その他サービス：customers/{id}/services/{type}/cases を全顧客横断で取得 ──
interface JoinedCase extends ServiceCase {
  customerName: string
  customerNameKana: string
}

const { fetchAllCasesForType, fetchCasesPageForType, fetchCasesPageForTypeFiltered, deleteCase } = useServices()
const { customers: allCustomers, fetchCustomersByIds, ensureLoaded: ensureCustomersLoaded } = useCustomerStore()
const { fetchUsers } = useUsers()
const genericCasesLoading = ref(!isLifeInsurance.value)
const rawGenericCases = ref<ServiceCase[]>([])
const genericCustomersById = ref<Map<string, Customer>>(new Map())

// ── 詳細条件（ステータス・担当者・担当未来設計士。自由に組み合わせて同時指定可） ──
// 3条件のいずれの組み合わせでもFirestore側で絞り込めるよう、firestore.indexes.jsonに
// 単独3種・2つの組み合わせ3種・3つ全ての組み合わせ1種、計7種の複合インデックスを用意済み
const assigneeUsers = ref<{ uid: string; displayName: string }[]>([])
const plannerUsers = ref<{ uid: string; displayName: string }[]>([])
const statusFilter = ref('')
const assigneeFilter = ref('')
const plannerFilter = ref('')
const hasDetailFilter = computed(() => !!(statusFilter.value || assigneeFilter.value || plannerFilter.value))
const clearDetailFilters = () => { statusFilter.value = ''; assigneeFilter.value = ''; plannerFilter.value = '' }
const currentDetailFilters = () => ({
  status: statusFilter.value || undefined,
  assigneeUid: assigneeFilter.value || undefined,
  plannerUid: plannerFilter.value || undefined,
})

onMounted(async () => {
  const users = await fetchUsers()
  plannerUsers.value = users.map(u => ({ uid: u.uid, displayName: u.displayName }))
  assigneeUsers.value = plannerUsers.value
})

// ── ページネーション（既定では上位25件のみ取得し、「もっと見る」で追加取得） ──
// 検索・リマインダー順ソートは読み込み済みの範囲でしか機能しないため、実際に
// 使われた時点でこのserviceTypeの全件（+関連顧客）を読み込む形に切り替える
const CASES_PAGE_SIZE = 25
const casesCursor = ref<QueryDocumentSnapshot | null>(null)
const hasMoreCases = ref(false)
const loadingMoreCases = ref(false)
const genericFullyLoaded = ref(false)
const loadingAllGenericCases = ref(false)
const genericCasesError = ref('')

const loadCustomersFor = async (cases: ServiceCase[]) => {
  const missingIds = [...new Set(cases.map(c => c.customerId))].filter(id => !genericCustomersById.value.has(id))
  if (missingIds.length === 0) return
  const fetched = await fetchCustomersByIds(missingIds)
  const next = new Map(genericCustomersById.value)
  for (const c of fetched) next.set(c.id, c)
  genericCustomersById.value = next
}

// Firestoreのインデックス未反映時などにエラーメッセージを画面に出す
// （以前は失敗時に0件のまま黙って表示されてしまい、原因が分かりにくかった）
const describeLoadError = (e: unknown): string => {
  const msg = e instanceof Error ? e.message : String(e)
  if (msg.includes('requires an index')) {
    return '一覧の取得に必要なデータベースの設定（インデックス）がまだ反映されていない可能性があります。時間をおいて再度お試しいただくか、管理者にご確認ください。'
  }
  return '案件一覧の取得に失敗しました。時間をおいて再度お試しください。'
}

// ページ単位取得（詳細条件が1つでも指定されていればFirestore側で絞り込み、
// 未指定なら従来通りserviceTypeのみで取得する）
const fetchGenericPage = (cursor?: QueryDocumentSnapshot) =>
  hasDetailFilter.value
    ? fetchCasesPageForTypeFiltered(serviceType.value as any, currentDetailFilters(), cursor)
    : fetchCasesPageForType(serviceType.value as any, cursor)

const loadFirstGenericPage = async () => {
  if (isLifeInsurance.value || genericFullyLoaded.value) return
  genericCasesLoading.value = true
  genericCasesError.value = ''
  try {
    const { cases, lastDoc, hasMore } = await fetchGenericPage()
    rawGenericCases.value = cases
    casesCursor.value = lastDoc
    hasMoreCases.value = hasMore
    await loadCustomersFor(cases)
  } catch (e) {
    genericCasesError.value = describeLoadError(e)
  } finally {
    genericCasesLoading.value = false
  }
}

const loadMoreGenericCases = async () => {
  if (!hasMoreCases.value || loadingMoreCases.value || genericFullyLoaded.value) return
  loadingMoreCases.value = true
  try {
    const { cases, lastDoc, hasMore } = await fetchGenericPage(casesCursor.value ?? undefined)
    rawGenericCases.value = [...rawGenericCases.value, ...cases]
    casesCursor.value = lastDoc
    hasMoreCases.value = hasMore
    await loadCustomersFor(cases)
  } catch (e) {
    genericCasesError.value = describeLoadError(e)
  } finally {
    loadingMoreCases.value = false
  }
}

// 検索・リマインダー順ソートが使われたら、一度だけこのserviceTypeの全件に
// 読み込み直す（以後はキャッシュされ、再度の全件取得は行わない）。ステータス・
// 担当者・担当未来設計士はケース本体のフィールドのため、全件読み込み後も
// filteredGenericCases側でクライアント処理により引き続き正しく絞り込まれる
const loadAllGenericCases = async () => {
  if (isLifeInsurance.value || genericFullyLoaded.value || loadingAllGenericCases.value) return
  loadingAllGenericCases.value = true
  genericCasesLoading.value = true
  try {
    const [, cases] = await Promise.all([
      ensureCustomersLoaded(),
      fetchAllCasesForType(serviceType.value as any),
    ])
    rawGenericCases.value = cases
    genericCustomersById.value = new Map(allCustomers.value.map(c => [c.id, c]))
    genericFullyLoaded.value = true
    hasMoreCases.value = false
  } catch (e) {
    genericCasesError.value = describeLoadError(e)
  } finally {
    loadingAllGenericCases.value = false
    genericCasesLoading.value = false
  }
}

// トップレベルawaitにすると、顧客件数が多い環境ではページ全体の描画が
// 完了するまでローディング表示すら出せない（Suspenseが解決を待つ）ため、
// マウント後に非同期で取得し、その間はgenericCasesLoadingでスピナーを出す。
// 詳細条件（ステータス・担当者・担当未来設計士）が変更された時も、同じ
// 読み込み処理で先頭ページから取得し直す
if (!isLifeInsurance.value) {
  onMounted(loadFirstGenericPage)
  watch([statusFilter, assigneeFilter, plannerFilter], () => { if (!genericFullyLoaded.value) loadFirstGenericPage() })
}

// ── 削除（アプリ責任者・システム管理者のみ） ──────────────────────────
const deletingIds = ref<Set<string>>(new Set())
const handleDeleteGeneric = async (c: JoinedCase) => {
  if (!confirm(`「${c.customerName}」の案件を削除してよろしいですか？この操作は取り消せません。`)) return
  deletingIds.value = new Set(deletingIds.value).add(c.id)
  try {
    await deleteCase(c.customerId, serviceType.value as any, c.id)
    rawGenericCases.value = rawGenericCases.value.filter(rc => rc.id !== c.id)
    showToast('案件を削除しました')
  } catch (e: any) {
    alert(e.message ?? '削除に失敗しました')
  } finally {
    const next = new Set(deletingIds.value)
    next.delete(c.id)
    deletingIds.value = next
  }
}
const handleDeleteLi = async (id: string, name: string) => {
  if (!confirm(`「${name}」の案件を削除してよろしいですか？この操作は取り消せません。`)) return
  deletingIds.value = new Set(deletingIds.value).add(id)
  try {
    await removeLiCase(id)
    showToast('案件を削除しました')
  } catch (e: any) {
    alert(e.message ?? '削除に失敗しました')
  } finally {
    const next = new Set(deletingIds.value)
    next.delete(id)
    deletingIds.value = next
  }
}

const genericCases = computed<JoinedCase[]>(() => rawGenericCases.value.map((c) => {
  const customer = genericCustomersById.value.get(c.customerId)
  return {
    ...c,
    customerName: customer?.name ?? '（顧客不明）',
    customerNameKana: customer?.nameKana ?? '',
  }
}))

const totalCount = computed(() => isLifeInsurance.value ? liCases.value.length : genericCases.value.length)

// ── 検索・並び替え ────────────────────────────────────────────────────
const searchQuery = ref('')
const sortBy = ref<'updated' | 'reminder'>('updated')

// 検索文字列の入力・リマインダー順ソートの選択は、ページ単位で読み込んだ
// 範囲内だけでは正しく機能しないため、使われた時点で全件読み込みへ切り替える
if (!isLifeInsurance.value) {
  watch(searchQuery, (val) => { if (val.trim()) loadAllGenericCases() })
  watch(sortBy, (val) => { if (val === 'reminder') loadAllGenericCases() })
}

const toDate = (val: any): Date | null => {
  if (!val) return null
  const d = val?.toDate?.() ?? (val instanceof Date ? val : new Date(val))
  return Number.isNaN(d.getTime?.() ?? NaN) ? null : d
}

const applySortByReminder = <T extends { reminderDate?: string; updatedAt: any }>(list: T[]): T[] => {
  if (sortBy.value !== 'reminder') return list
  return list.slice().sort((a, b) => {
    const da = toDate(a.reminderDate)
    const db = toDate(b.reminderDate)
    if (da && db) return da.getTime() - db.getTime()
    if (da) return -1
    if (db) return 1
    return 0
  })
}

const filteredGenericCases = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  let list = genericCases.value
  // ステータス・担当者・担当未来設計士での絞り込み。既定の取得時点でFirestore側で
  // 絞り込まれている場合もあるが、検索等により全件読み込みへ切り替わった後も
  // 正しく絞り込めるよう、ここでも同じ条件を適用する（冪等なので二重適用でも問題ない）
  if (statusFilter.value) list = list.filter(c => c.status === statusFilter.value)
  if (assigneeFilter.value) list = list.filter(c => c.assigneeUid === assigneeFilter.value)
  if (plannerFilter.value) list = list.filter(c => c.plannerUid === plannerFilter.value)
  if (q) {
    list = list.filter(c =>
      c.customerName.toLowerCase().includes(q) ||
      c.customerNameKana.toLowerCase().includes(q) ||
      (c.company ?? '').toLowerCase().includes(q) ||
      (c.notes ?? '').toLowerCase().includes(q),
    )
  }
  return applySortByReminder(list)
})

const filteredLiCases = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  let list = liCases.value
  if (q) {
    list = list.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.nameKana ?? '').toLowerCase().includes(q) ||
      (c.progressStatus ?? '').toLowerCase().includes(q) ||
      (c.assignedFpName ?? '').toLowerCase().includes(q),
    )
  }
  return applySortByReminder(list)
})

// ── ステータスの色 ──────────────────────────────────────────────────
const statusClass = (status: string) => {
  if (/成約|○|済/.test(status) && !/未成約/.test(status)) return 'bg-green-100 text-green-700'
  if (/未成約|不成立|見送/.test(status)) return 'bg-red-100 text-red-600'
  if (/検討/.test(status))       return 'bg-amber-100 text-amber-700'
  if (/相談|確認/.test(status))  return 'bg-sky-100 text-sky-700'
  return 'bg-gray-100 text-gray-600'
}
</script>

<template>
  <div class="p-4 md:p-6 max-w-7xl mx-auto space-y-5">

    <!-- ===== パンくず ===== -->
    <div class="flex items-center gap-2 text-sm text-gray-400 flex-wrap">
      <NuxtLink to="/services" class="hover:text-primary-600 transition-colors">プロダクトアプリ</NuxtLink>
      <Icon name="heroicons:chevron-right" class="h-3 w-3" />
      <span class="text-gray-600 font-medium">{{ serviceLabel }}</span>
    </div>

    <!-- ===== ページヘッダー ===== -->
    <div class="flex items-start justify-between gap-3 flex-wrap">
      <div>
        <h1 class="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Icon name="heroicons:table-cells" class="h-6 w-6 text-primary-600" />
          {{ serviceLabel }}
          <button
            type="button"
            class="flex items-center justify-center h-7 w-7 rounded-full transition shrink-0"
            :class="isFavoriteApp(serviceType)
              ? 'bg-amber-100 text-amber-500 hover:bg-amber-200'
              : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-amber-400'"
            :aria-label="isFavoriteApp(serviceType) ? 'お気に入りから外す' : 'お気に入りに追加'"
            :title="isFavoriteApp(serviceType) ? 'お気に入り登録中' : 'お気に入りに追加'"
            @click="toggleFavoriteApp(serviceType)"
          >
            <Icon :name="isFavoriteApp(serviceType) ? 'heroicons:star-solid' : 'heroicons:star'" class="h-4 w-4" />
          </button>
        </h1>
        <p class="mt-1 text-sm text-gray-500">{{ totalCount }} 件の案件</p>
      </div>
      <NuxtLink to="/personal-data" class="btn-secondary text-sm flex items-center gap-1.5">
        <Icon name="heroicons:identification" class="h-4 w-4" />
        顧客情報へ
      </NuxtLink>
    </div>

    <!-- ===== 検索・並び替え ===== -->
    <div class="flex flex-wrap items-center gap-2">
      <div class="relative flex-1 min-w-[220px] max-w-md">
        <Icon name="heroicons:magnifying-glass" class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          v-model="searchQuery"
          type="text"
          :placeholder="isLifeInsurance ? '氏名・フリガナ・担当者・進行状況で検索...' : '顧客名・フリガナ・会社名・備考で検索...'"
          class="input-field pl-9 text-sm"
        />
      </div>
      <select v-model="sortBy" class="input-field text-sm py-1.5 w-auto shrink-0">
        <option value="updated">更新日順</option>
        <option value="reminder">リマインダー順</option>
      </select>
    </div>

    <!-- ===== 詳細条件（ステータス・担当者・担当未来設計士。組み合わせて指定可） ===== -->
    <div v-if="!isLifeInsurance" class="flex flex-wrap items-center gap-2">
      <span class="text-xs text-gray-400 shrink-0">詳細条件</span>
      <select v-model="statusFilter" class="input-field text-sm py-1.5 w-auto">
        <option value="">ステータスで絞り込み</option>
        <option v-for="(label, key) in STATUS_LABELS" :key="key" :value="key">{{ label }}</option>
      </select>
      <select v-model="assigneeFilter" class="input-field text-sm py-1.5 w-auto">
        <option value="">担当者で絞り込み</option>
        <option v-for="u in assigneeUsers" :key="u.uid" :value="u.uid">{{ u.displayName }}</option>
      </select>
      <select v-model="plannerFilter" class="input-field text-sm py-1.5 w-auto">
        <option value="">担当未来設計士で絞り込み</option>
        <option v-for="u in plannerUsers" :key="u.uid" :value="u.uid">{{ u.displayName }}</option>
      </select>
      <button
        v-if="hasDetailFilter"
        type="button"
        class="text-xs text-gray-400 hover:text-gray-600 hover:underline"
        @click="clearDetailFilters"
      >条件をクリア</button>
    </div>

    <!-- ========================================================= -->
    <!-- 生命保険：専用の詳細案件テーブル                             -->
    <!-- ========================================================= -->
    <template v-if="isLifeInsurance">

      <div v-if="liLoading" class="card p-12 text-center">
        <Icon name="heroicons:arrow-path" class="h-8 w-8 text-gray-300 mx-auto mb-2 animate-spin" />
        <p class="text-gray-400 text-sm">読み込み中...</p>
      </div>

      <div v-else-if="filteredLiCases.length === 0" class="card p-12 text-center">
        <Icon name="heroicons:document-magnifying-glass" class="h-12 w-12 text-gray-200 mx-auto mb-3" />
        <p class="text-gray-400 font-medium">該当する案件がありません</p>
      </div>

      <!-- テーブル（PC） -->
      <div v-if="filteredLiCases.length > 0" class="hidden md:block card overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-gray-100 bg-gray-50">
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">氏名</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">新規/乗換</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[160px]">契約・プランニング内容</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">進行状況</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">ワン/ツー/フォロー</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">担当</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap sticky right-0 bg-gray-50 shadow-[-4px_0_4px_-2px_rgba(0,0,0,0.06)]">詳細</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-50">
              <tr v-for="c in filteredLiCases" :key="c.id" class="group hover:bg-gray-50 transition-colors">
                <td class="px-4 py-3">
                  <NuxtLink
                    v-if="c.customerId"
                    :to="`/customers/${c.customerId}`"
                    class="font-medium text-primary-700 hover:underline whitespace-nowrap"
                  >{{ c.name }}</NuxtLink>
                  <span v-else class="font-medium text-gray-900 whitespace-nowrap">{{ c.name }}</span>
                  <p class="text-xs text-gray-400 mt-0.5">{{ c.nameKana }}</p>
                </td>
                <td class="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">{{ c.newOrSwitch || '—' }}</td>
                <td class="px-4 py-3 text-gray-600 text-xs max-w-[200px]">
                  <span class="line-clamp-2 whitespace-pre-line">{{ c.contractContent || c.planningContent || '—' }}</span>
                </td>
                <td class="px-4 py-3 whitespace-nowrap">
                  <span v-if="c.progressStatus" class="badge text-xs" :class="statusClass(c.progressStatus)">{{ c.progressStatus }}</span>
                  <span v-else class="text-xs text-gray-300">—</span>
                </td>
                <td class="px-4 py-3 text-gray-500 text-xs max-w-[140px]">
                  <span class="line-clamp-2 whitespace-pre-line">{{ [c.oneStatus, c.twoStatus, c.followStatus].filter(Boolean).join(' / ') || '—' }}</span>
                </td>
                <td class="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{{ c.assignedFpName || '—' }}</td>
                <td class="px-4 py-3 whitespace-nowrap sticky right-0 bg-white group-hover:bg-gray-50 shadow-[-4px_0_4px_-2px_rgba(0,0,0,0.06)]">
                  <div class="flex items-center gap-2">
                    <NuxtLink
                      :to="`/services/${serviceType}/${c.id}`"
                      class="inline-flex items-center gap-0.5 text-xs text-primary-600 hover:underline"
                    >
                      詳細
                      <Icon name="heroicons:arrow-top-right-on-square" class="h-3 w-3" />
                    </NuxtLink>
                    <button
                      v-if="canDeleteCases"
                      type="button"
                      class="text-gray-300 hover:text-red-500 transition disabled:opacity-40"
                      :disabled="deletingIds.has(c.id)"
                      title="削除"
                      @click="handleDeleteLi(c.id, c.name)"
                    >
                      <Icon :name="deletingIds.has(c.id) ? 'heroicons:arrow-path' : 'heroicons:trash'" class="h-3.5 w-3.5" :class="{ 'animate-spin': deletingIds.has(c.id) }" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- カード一覧（SP） -->
      <div v-if="filteredLiCases.length > 0" class="md:hidden space-y-3">
        <div v-for="c in filteredLiCases" :key="c.id" class="card p-4 space-y-3">
          <div class="flex items-start justify-between gap-3">
            <div>
              <NuxtLink v-if="c.customerId" :to="`/customers/${c.customerId}`" class="font-semibold text-primary-700 hover:underline">{{ c.name }}</NuxtLink>
              <span v-else class="font-semibold text-gray-900">{{ c.name }}</span>
              <p class="text-xs text-gray-400 mt-0.5">{{ c.nameKana }}</p>
            </div>
            <span v-if="c.progressStatus" class="badge text-xs shrink-0" :class="statusClass(c.progressStatus)">{{ c.progressStatus }}</span>
          </div>
          <div class="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-gray-600">
            <div v-if="c.newOrSwitch">
              <span class="text-gray-400">新規/乗換</span>
              <p class="font-medium mt-0.5">{{ c.newOrSwitch }}</p>
            </div>
            <div v-if="c.assignedFpName">
              <span class="text-gray-400">担当</span>
              <p class="font-medium mt-0.5">{{ c.assignedFpName }}</p>
            </div>
          </div>
          <p v-if="c.contractContent || c.planningContent" class="text-xs text-gray-500 line-clamp-2 whitespace-pre-line border-t border-gray-50 pt-2">
            {{ c.contractContent || c.planningContent }}
          </p>
          <div class="flex items-center justify-between pt-1 border-t border-gray-50">
            <button
              v-if="canDeleteCases"
              type="button"
              class="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition disabled:opacity-40"
              :disabled="deletingIds.has(c.id)"
              @click="handleDeleteLi(c.id, c.name)"
            >
              <Icon :name="deletingIds.has(c.id) ? 'heroicons:arrow-path' : 'heroicons:trash'" class="h-3.5 w-3.5" :class="{ 'animate-spin': deletingIds.has(c.id) }" />
              削除
            </button>
            <span v-else />
            <NuxtLink
              :to="`/services/${serviceType}/${c.id}`"
              class="inline-flex items-center gap-1 text-xs text-primary-600 font-medium hover:underline"
            >
              案件詳細を見る
              <Icon name="heroicons:arrow-right" class="h-3.5 w-3.5" />
            </NuxtLink>
          </div>
        </div>
      </div>

      <p class="text-xs text-gray-400 text-right">{{ filteredLiCases.length }} / {{ liCases.length }} 件表示中</p>

    </template>

    <!-- ========================================================= -->
    <!-- その他アプリ：Firestore連動の案件一覧                        -->
    <!-- ========================================================= -->
    <template v-else>

      <div v-if="genericCasesLoading" class="card p-12 text-center">
        <Icon name="heroicons:arrow-path" class="h-8 w-8 text-gray-300 mx-auto mb-2 animate-spin" />
        <p class="text-gray-400 text-sm">読み込み中...</p>
      </div>

      <div v-else-if="genericCasesError" class="card p-12 text-center">
        <Icon name="heroicons:exclamation-triangle" class="h-10 w-10 text-amber-300 mx-auto mb-3" />
        <p class="text-gray-500 text-sm">{{ genericCasesError }}</p>
      </div>

      <div v-else-if="filteredGenericCases.length === 0" class="card p-12 text-center">
        <Icon name="heroicons:document-magnifying-glass" class="h-12 w-12 text-gray-200 mx-auto mb-3" />
        <p class="text-gray-400 font-medium">該当する案件がありません</p>
      </div>

      <!-- テーブル（PC） -->
      <div v-if="!genericCasesLoading && filteredGenericCases.length > 0" class="hidden md:block card overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-gray-100 bg-gray-50">
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">顧客名</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">ステータス</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[160px]">会社名・備考</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">リマインダー</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap sticky right-0 bg-gray-50 shadow-[-4px_0_4px_-2px_rgba(0,0,0,0.06)]">詳細</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-50">
              <tr
                v-for="c in filteredGenericCases"
                :key="c.id"
                class="group hover:bg-gray-50 transition-colors"
              >
                <td class="px-4 py-3">
                  <NuxtLink
                    :to="`/customers/${c.customerId}`"
                    class="font-medium text-primary-700 hover:underline whitespace-nowrap"
                  >
                    {{ c.customerName }}
                  </NuxtLink>
                  <p class="text-xs text-gray-400 mt-0.5">{{ c.customerNameKana }}</p>
                </td>
                <td class="px-4 py-3 whitespace-nowrap">
                  <span class="badge text-xs" :class="statusClass(STATUS_LABELS[c.status] ?? c.status)">
                    {{ STATUS_LABELS[c.status] ?? c.status }}
                  </span>
                </td>
                <td class="px-4 py-3 text-gray-600 text-xs max-w-[200px]">
                  <p v-if="c.company" class="font-medium text-gray-800">{{ c.company }}</p>
                  <span v-if="c.notes" class="line-clamp-2 whitespace-pre-line">{{ c.notes }}</span>
                  <span v-if="!c.company && !c.notes" class="text-gray-300">—</span>
                </td>
                <td class="px-4 py-3 whitespace-nowrap">
                  <span v-if="c.reminderDate" class="badge text-xs bg-rose-50 text-rose-600 flex items-center gap-1 w-fit">
                    <Icon name="heroicons:bell-alert" class="h-3 w-3" />
                    {{ c.reminderDate.replace(/-/g, '/') }}
                  </span>
                  <span v-else class="text-xs text-gray-300">—</span>
                </td>
                <td class="px-4 py-3 whitespace-nowrap sticky right-0 bg-white group-hover:bg-gray-50 shadow-[-4px_0_4px_-2px_rgba(0,0,0,0.06)]">
                  <div class="flex items-center gap-2">
                    <NuxtLink
                      :to="`/customers/${c.customerId}/services/${serviceType}/${c.id}`"
                      class="inline-flex items-center gap-0.5 text-xs text-primary-600 hover:underline"
                    >
                      詳細
                      <Icon name="heroicons:arrow-top-right-on-square" class="h-3 w-3" />
                    </NuxtLink>
                    <button
                      v-if="canDeleteCases"
                      type="button"
                      class="text-gray-300 hover:text-red-500 transition disabled:opacity-40"
                      :disabled="deletingIds.has(c.id)"
                      title="削除"
                      @click="handleDeleteGeneric(c)"
                    >
                      <Icon :name="deletingIds.has(c.id) ? 'heroicons:arrow-path' : 'heroicons:trash'" class="h-3.5 w-3.5" :class="{ 'animate-spin': deletingIds.has(c.id) }" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- カード一覧（SP） -->
      <div v-if="!genericCasesLoading && filteredGenericCases.length > 0" class="md:hidden space-y-3">
        <div
          v-for="c in filteredGenericCases"
          :key="c.id"
          class="card p-4 space-y-3"
        >
          <div class="flex items-start justify-between gap-3">
            <div>
              <NuxtLink
                :to="`/customers/${c.customerId}`"
                class="font-semibold text-primary-700 hover:underline"
              >
                {{ c.customerName }}
              </NuxtLink>
              <p class="text-xs text-gray-400 mt-0.5">{{ c.customerNameKana }}</p>
            </div>
            <span class="badge text-xs shrink-0" :class="statusClass(STATUS_LABELS[c.status] ?? c.status)">
              {{ STATUS_LABELS[c.status] ?? c.status }}
            </span>
          </div>

          <p v-if="c.company || c.notes" class="text-xs text-gray-500 line-clamp-2 whitespace-pre-line border-t border-gray-50 pt-2">
            <span v-if="c.company" class="font-medium text-gray-800">{{ c.company }}</span>
            <span v-if="c.notes">{{ c.notes }}</span>
          </p>

          <div class="flex items-center justify-between pt-1 border-t border-gray-50">
            <span v-if="c.reminderDate" class="badge text-xs bg-rose-50 text-rose-600 flex items-center gap-1">
              <Icon name="heroicons:bell-alert" class="h-3 w-3" />
              {{ c.reminderDate.replace(/-/g, '/') }}
            </span>
            <span v-else class="text-xs text-gray-400">—</span>
            <div class="flex items-center gap-3">
              <button
                v-if="canDeleteCases"
                type="button"
                class="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition disabled:opacity-40"
                :disabled="deletingIds.has(c.id)"
                @click="handleDeleteGeneric(c)"
              >
                <Icon :name="deletingIds.has(c.id) ? 'heroicons:arrow-path' : 'heroicons:trash'" class="h-3.5 w-3.5" :class="{ 'animate-spin': deletingIds.has(c.id) }" />
                削除
              </button>
              <NuxtLink
                :to="`/customers/${c.customerId}/services/${serviceType}/${c.id}`"
                class="inline-flex items-center gap-1 text-xs text-primary-600 font-medium hover:underline"
              >
                案件詳細を見る
                <Icon name="heroicons:arrow-right" class="h-3.5 w-3.5" />
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>

      <div v-if="hasMoreCases && !genericFullyLoaded" class="flex justify-center">
        <button
          type="button"
          class="btn-secondary text-sm flex items-center gap-1.5"
          :disabled="loadingMoreCases"
          @click="loadMoreGenericCases"
        >
          <Icon :name="loadingMoreCases ? 'heroicons:arrow-path' : 'heroicons:chevron-down'" class="h-4 w-4" :class="{ 'animate-spin': loadingMoreCases }" />
          もっと見る
        </button>
      </div>

      <p v-if="!genericCasesLoading" class="text-xs text-gray-400 text-right">
        {{ filteredGenericCases.length }} / {{ genericCases.length }} 件表示中
      </p>

    </template>

  </div>
</template>
