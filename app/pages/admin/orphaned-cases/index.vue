<script setup lang="ts">
// 紐づく顧客（customers/{id}）が既に削除済み等で存在しない「孤立案件」を
// 全サービスタイプ・生命保険横断で洗い出し、一覧から直接削除できるようにする
import { SERVICE_LABELS } from '~/types/service'
import type { ServiceCase } from '~/types/service'
import type { LifeInsuranceCase } from '~/types/lifeInsurance'
import { useServices } from '~/composables/useServices'
import { useLifeInsuranceCases } from '~/composables/useLifeInsuranceCases'
import { useCustomerStore } from '~/composables/useCustomerStore'
import { useAppDefs } from '~/composables/useAppDefs'
import { useToast } from '~/composables/useToast'

definePageMeta({ middleware: ['auth', 'admin'] })

const { show: showToast } = useToast()

interface OrphanedRow {
  key: string
  kind: 'generic' | 'lifeInsurance'
  id: string
  customerId: string
  serviceType: string
  serviceLabel: string
  summary: string
  updatedAt: any
  linkUrl: string
}

const { fetchAllCases, deleteCase } = useServices()
const { cases: liCasesState, fetchAll: fetchLiCases, remove: removeLiCase } = useLifeInsuranceCases()
const { customers, ensureLoaded: ensureCustomersLoaded } = useCustomerStore()
const { appDefs, fetchAll: fetchAppDefs } = useAppDefs()

const loading = ref(true)
const loadError = ref('')
const rows = ref<OrphanedRow[]>([])

const serviceLabelFor = (type: string) =>
  appDefs.value.find(a => a.sourceServiceType === type)?.name ?? SERVICE_LABELS[type] ?? type

const load = async () => {
  loading.value = true
  loadError.value = ''
  try {
    const [allCases] = await Promise.all([
      fetchAllCases(),
      fetchLiCases(),
      ensureCustomersLoaded(),
      fetchAppDefs(),
    ])
    const customerIds = new Set(customers.value.map(c => c.id))

    const genericRows: OrphanedRow[] = (allCases as ServiceCase[])
      .filter(c => c.customerId && !customerIds.has(c.customerId))
      .map(c => ({
        key: `generic-${c.id}`,
        kind: 'generic',
        id: c.id,
        customerId: c.customerId,
        serviceType: c.serviceType,
        serviceLabel: serviceLabelFor(c.serviceType),
        summary: c.company || c.notes || '（内容なし）',
        updatedAt: c.updatedAt,
        linkUrl: `/customers/${c.customerId}/services/${c.serviceType}/${c.id}`,
      }))

    const liRows: OrphanedRow[] = (liCasesState.value as LifeInsuranceCase[])
      .filter(c => c.customerId && !customerIds.has(c.customerId))
      .map(c => ({
        key: `li-${c.id}`,
        kind: 'lifeInsurance',
        id: c.id,
        customerId: c.customerId as string,
        serviceType: 'lifeInsurance',
        serviceLabel: serviceLabelFor('lifeInsurance'),
        summary: c.name || '（氏名未入力）',
        updatedAt: c.updatedAt,
        linkUrl: `/services/lifeInsurance/${c.id}`,
      }))

    rows.value = [...genericRows, ...liRows]
  } catch (e: any) {
    loadError.value = e.message ?? '読み込みに失敗しました'
  } finally {
    loading.value = false
  }
}
onMounted(load)

const fmt = (val: any): string => {
  const d = val?.toDate?.() ?? (val instanceof Date ? val : null)
  if (!d || Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('ja-JP', { year: 'numeric', month: 'numeric', day: 'numeric' })
}

const deletingKeys = ref<Set<string>>(new Set())
const handleDelete = async (row: OrphanedRow) => {
  if (!confirm(`この孤立案件（${row.serviceLabel} / ${row.summary}）を削除してよろしいですか？この操作は取り消せません。`)) return
  deletingKeys.value = new Set(deletingKeys.value).add(row.key)
  try {
    if (row.kind === 'lifeInsurance') {
      await removeLiCase(row.id)
    } else {
      await deleteCase(row.customerId, row.serviceType as any, row.id)
    }
    rows.value = rows.value.filter(r => r.key !== row.key)
    showToast('削除しました')
  } catch (e: any) {
    alert(e.message ?? '削除に失敗しました')
  } finally {
    const next = new Set(deletingKeys.value)
    next.delete(row.key)
    deletingKeys.value = next
  }
}
</script>

<template>
  <div class="p-4 md:p-6 max-w-5xl mx-auto space-y-5">

    <div class="flex items-center gap-2 text-sm text-gray-400">
      <NuxtLink to="/admin">管理者設定</NuxtLink>
      <Icon name="heroicons:chevron-right" class="h-3 w-3" />
      <span class="text-gray-600">孤立案件の確認</span>
    </div>

    <div class="flex items-start justify-between gap-3 flex-wrap">
      <div>
        <h1 class="text-xl font-bold text-gray-900">孤立案件の確認</h1>
        <p class="text-sm text-gray-500 mt-0.5">
          紐づく顧客データが既に削除されている等で「顧客不明」になっている案件データの一覧です
        </p>
      </div>
      <button class="text-xs text-gray-400 hover:text-primary-600 transition flex items-center gap-1" @click="load">
        <Icon name="heroicons:arrow-path" class="h-3.5 w-3.5" />更新
      </button>
    </div>

    <div v-if="loading" class="card p-12 text-center">
      <Icon name="heroicons:arrow-path" class="h-8 w-8 text-gray-300 mx-auto mb-2 animate-spin" />
      <p class="text-sm text-gray-400">読み込み中...</p>
    </div>

    <div v-else-if="loadError" class="card p-12 text-center">
      <p class="text-sm text-red-500">{{ loadError }}</p>
    </div>

    <div v-else-if="rows.length === 0" class="card p-12 text-center">
      <Icon name="heroicons:check-circle" class="h-10 w-10 text-green-300 mx-auto mb-2" />
      <p class="text-sm text-gray-400">孤立案件は見つかりませんでした</p>
    </div>

    <div v-else class="card overflow-hidden">
      <div class="divide-y divide-gray-50">
        <div v-for="row in rows" :key="row.key" class="flex items-start gap-3 px-5 py-3.5">
          <span class="badge text-xs shrink-0 mt-0.5 bg-gray-100 text-gray-600">{{ row.serviceLabel }}</span>
          <div class="flex-1 min-w-0">
            <p class="text-sm text-gray-900 truncate">{{ row.summary }}</p>
            <p class="text-xs text-gray-400 mt-0.5">
              顧客ID: {{ row.customerId }}<span v-if="fmt(row.updatedAt)"> ／ 更新日: {{ fmt(row.updatedAt) }}</span>
            </p>
          </div>
          <div class="flex items-center gap-3 shrink-0">
            <NuxtLink :to="row.linkUrl" class="text-xs text-primary-600 hover:underline">詳細</NuxtLink>
            <button
              type="button"
              class="text-xs text-red-500 hover:underline disabled:opacity-40 flex items-center gap-1"
              :disabled="deletingKeys.has(row.key)"
              @click="handleDelete(row)"
            >
              <Icon :name="deletingKeys.has(row.key) ? 'heroicons:arrow-path' : 'heroicons:trash'" class="h-3.5 w-3.5" :class="{ 'animate-spin': deletingKeys.has(row.key) }" />
              削除
            </button>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>
