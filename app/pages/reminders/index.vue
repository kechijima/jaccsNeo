<script setup lang="ts">
import { SERVICE_LABELS } from '~/types/service'
import { useCustomerStore } from '~/composables/useCustomerStore'
import { useLifeInsuranceCases } from '~/composables/useLifeInsuranceCases'
import { useServices } from '~/composables/useServices'
import type { ServiceCase } from '~/types/service'

definePageMeta({ middleware: ['auth'] })

interface ReminderItem {
  id: string
  date: Date
  label: string
  sourceLabel: string
  sourceIcon: string
  sourceColor: string
  subjectName: string
  link: string
}

const { customers, ensureLoaded: ensureCustomersLoaded } = useCustomerStore()
const { cases: liCases, fetchAll: fetchLiCases } = useLifeInsuranceCases()
const { fetchAllCases } = useServices()

const loading = ref(true)
const genericCases = ref<ServiceCase[]>([])

onMounted(async () => {
  loading.value = true
  try {
    await Promise.all([
      ensureCustomersLoaded(),
      fetchLiCases(),
      fetchAllCases().then((c) => { genericCases.value = c }),
    ])
  } finally {
    loading.value = false
  }
})

// リマインダー日時（"YYYY-MM-DD"／"YYYY-MM-DDTHH:mm"／CSV由来の"YYYY-MM-DD HH:mm"）を統一的にDateへ変換
const parseFlexibleDate = (s?: string): Date | null => {
  if (!s) return null
  const normalized = s.includes('T') ? s : s.replace(' ', 'T')
  const d = new Date(normalized)
  return Number.isNaN(d.getTime()) ? null : d
}

// パーソナルデータ・生命保険・その他各アプリの3種類のリマインダーを1つの一覧に集約する
const reminderItems = computed<ReminderItem[]>(() => {
  const items: ReminderItem[] = []

  for (const c of customers.value) {
    ;(c.reminders ?? []).forEach((r, i) => {
      const date = parseFlexibleDate(r.scheduledAt)
      if (!date) return
      items.push({
        id: `customer-${c.id}-${i}`,
        date,
        label: r.label || '（内容未設定）',
        sourceLabel: 'パーソナルデータ',
        sourceIcon: 'heroicons:identification',
        sourceColor: 'bg-blue-50 text-blue-700',
        subjectName: c.name,
        link: `/customers/${c.id}`,
      })
    })
  }

  for (const c of liCases.value) {
    const date = parseFlexibleDate(c.reminderDate)
    if (!date) continue
    items.push({
      id: `li-${c.id}`,
      date,
      label: c.reminder || '（内容未設定）',
      sourceLabel: '生命保険',
      sourceIcon: 'heroicons:shield-check',
      sourceColor: 'bg-sky-50 text-sky-700',
      subjectName: c.name,
      link: `/services/lifeInsurance/${c.id}`,
    })
  }

  const customerNameById = new Map(customers.value.map(c => [c.id, c.name]))
  for (const c of genericCases.value) {
    const date = parseFlexibleDate(c.reminderDate)
    if (!date) continue
    items.push({
      id: `service-${c.id}`,
      date,
      label: c.reminderNote || '（内容未設定）',
      sourceLabel: SERVICE_LABELS[c.serviceType] ?? c.serviceType,
      sourceIcon: 'heroicons:squares-2x2',
      sourceColor: 'bg-amber-50 text-amber-700',
      subjectName: customerNameById.get(c.customerId) ?? '（顧客不明）',
      link: `/customers/${c.customerId}/services/${c.serviceType}/${c.id}`,
    })
  }

  return items
})

// ── 検索・絞り込み ────────────────────────────────────────────────────
const searchQuery = ref('')
const onlyUpcoming = ref(true)

const todayStart = () => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

const filteredItems = computed(() => {
  let list = reminderItems.value
  if (onlyUpcoming.value) {
    const today = todayStart()
    list = list.filter(i => i.date >= today)
  }
  const q = searchQuery.value.trim().toLowerCase()
  if (q) {
    list = list.filter(i =>
      i.label.toLowerCase().includes(q) ||
      i.subjectName.toLowerCase().includes(q) ||
      i.sourceLabel.toLowerCase().includes(q),
    )
  }
  return list.slice().sort((a, b) => a.date.getTime() - b.date.getTime())
})

const isOverdue = (date: Date) => date < todayStart()

const formatDateTime = (d: Date) =>
  d.toLocaleString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
</script>

<template>
  <div class="p-4 md:p-6 max-w-4xl mx-auto space-y-5">

    <div class="flex items-center gap-2 text-sm text-gray-400">
      <span class="text-gray-600">リマインダー一覧</span>
    </div>

    <div class="flex items-start justify-between gap-3 flex-wrap">
      <div>
        <h1 class="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Icon name="heroicons:bell-alert" class="h-6 w-6 text-primary-600" />
          リマインダー一覧
        </h1>
        <p class="mt-1 text-sm text-gray-500">パーソナルデータ・各アプリに登録されたリマインダーをまとめて表示します</p>
      </div>
    </div>

    <!-- 検索・絞り込み -->
    <div class="flex flex-wrap items-center gap-2">
      <div class="relative flex-1 min-w-[220px]">
        <Icon name="heroicons:magnifying-glass" class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="内容・対象名・種別で検索..."
          class="input-field pl-9 text-sm"
        />
      </div>
      <label class="flex items-center gap-2 cursor-pointer shrink-0 text-sm text-gray-600 rounded-lg border border-gray-200 bg-white px-3 py-1.5">
        <input v-model="onlyUpcoming" type="checkbox" class="h-4 w-4 rounded text-primary-600" />
        今後のみ表示
      </label>
    </div>

    <!-- 読み込み中 -->
    <div v-if="loading" class="card p-12 text-center">
      <Icon name="heroicons:arrow-path" class="h-8 w-8 text-gray-300 mx-auto mb-2 animate-spin" />
      <p class="text-sm text-gray-400">読み込み中...</p>
    </div>

    <!-- 0件 -->
    <div v-else-if="filteredItems.length === 0" class="card p-12 text-center">
      <Icon name="heroicons:bell-slash" class="h-10 w-10 text-gray-200 mx-auto mb-2" />
      <p class="text-sm text-gray-400">該当するリマインダーはありません</p>
    </div>

    <!-- 一覧 -->
    <div v-else class="card overflow-hidden">
      <div class="divide-y divide-gray-50">
        <NuxtLink
          v-for="item in filteredItems"
          :key="item.id"
          :to="item.link"
          class="flex items-start justify-between gap-3 px-5 py-4 hover:bg-gray-50 transition"
        >
          <div class="flex items-start gap-3 min-w-0">
            <div
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full mt-0.5"
              :class="isOverdue(item.date) ? 'bg-red-50 text-red-500' : 'bg-rose-50 text-rose-500'"
            >
              <Icon name="heroicons:bell-alert" class="h-4 w-4" />
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-2 flex-wrap mb-0.5">
                <span class="badge text-xs" :class="item.sourceColor">
                  <Icon :name="item.sourceIcon" class="h-3 w-3 mr-0.5" />
                  {{ item.sourceLabel }}
                </span>
                <span class="text-xs text-gray-400">{{ item.subjectName }}</span>
              </div>
              <p class="text-sm font-medium text-gray-900 truncate">{{ item.label }}</p>
            </div>
          </div>
          <div class="text-right shrink-0">
            <p class="text-sm font-semibold" :class="isOverdue(item.date) ? 'text-red-500' : 'text-gray-700'">
              {{ formatDateTime(item.date) }}
            </p>
            <p v-if="isOverdue(item.date)" class="text-xs text-red-400 mt-0.5">期限超過</p>
          </div>
        </NuxtLink>
      </div>
    </div>

    <p v-if="!loading" class="text-xs text-gray-400 text-right">{{ filteredItems.length }}件のリマインダー</p>

  </div>
</template>
