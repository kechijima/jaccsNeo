<script setup lang="ts">
import type { EventSummary } from '~/types/event'

definePageMeta({ middleware: ['auth'] })

const { fetchEvents } = useEvents()

const viewMode = ref<'list' | 'calendar'>('list')
const currentMonth = ref(new Date(2026, 3, 1)) // 2026年4月

const loading = ref(false)
const error = ref('')

const scopeColorMap: Record<string, string> = {
  all: 'bg-green-100 text-green-700 border-green-200',
  group: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  kumiai: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  space: 'bg-amber-100 text-amber-700 border-amber-200',
}

interface EventRow {
  id: string
  title: string
  startAt: Date
  endAt: Date | undefined
  location: string | undefined
  targetScope: string
  attendeeCount: number
  isAttending: boolean
  color: string
}

const events = ref<EventRow[]>([])

const formatDate = (d: Date) => d.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })
const formatTime = (d: Date) => d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })

const upcomingEvents = computed(() =>
  events.value.filter(e => e.startAt >= new Date()).sort((a, b) => a.startAt.getTime() - b.startAt.getTime())
)
const pastEvents = computed(() =>
  events.value.filter(e => e.startAt < new Date()).sort((a, b) => b.startAt.getTime() - a.startAt.getTime())
)

const monthName = computed(() =>
  currentMonth.value.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' })
)

onMounted(async () => {
  loading.value = true
  error.value = ''
  try {
    const summaries: EventSummary[] = await fetchEvents()
    events.value = summaries.map(data => ({
      id: data.id,
      title: data.title,
      startAt: data.startAt.toDate(),
      endAt: data.endAt?.toDate(),
      location: data.location,
      targetScope: data.scope,
      attendeeCount: data.attendeeCount,
      isAttending: false,
      color: scopeColorMap[data.scope] ?? 'bg-gray-100 text-gray-700 border-gray-200',
    }))
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'イベントの取得に失敗しました'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="p-4 md:p-6 max-w-5xl mx-auto space-y-5">

    <!-- ヘッダー -->
    <div class="flex items-start justify-between gap-3">
      <div>
        <h1 class="text-xl font-bold text-gray-900">イベント</h1>
        <p class="text-sm text-gray-500 mt-0.5">スケジュール・出欠管理</p>
      </div>
      <NuxtLink to="/events/new" class="btn-primary text-sm flex items-center gap-1.5">
        <Icon name="heroicons:calendar-plus" class="h-4 w-4" />
        イベント作成
      </NuxtLink>
    </div>

    <!-- ビュー切り替え -->
    <div class="flex gap-1 rounded-lg bg-gray-100 p-1 w-fit">
      <button
        class="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition"
        :class="viewMode === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'"
        @click="viewMode = 'list'"
      >
        <Icon name="heroicons:list-bullet" class="h-4 w-4" />
        リスト
      </button>
      <button
        class="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition"
        :class="viewMode === 'calendar' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'"
        @click="viewMode = 'calendar'"
      >
        <Icon name="heroicons:calendar-days" class="h-4 w-4" />
        カレンダー
      </button>
    </div>

    <!-- リストビュー -->
    <template v-if="viewMode === 'list'">

      <!-- 今後のイベント -->
      <div>
        <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">今後のイベント</h2>
        <div v-if="upcomingEvents.length === 0" class="card p-8 text-center">
          <Icon name="heroicons:calendar" class="h-10 w-10 text-gray-300 mx-auto mb-2" />
          <p class="text-sm text-gray-400">予定されているイベントはありません</p>
        </div>
        <div v-else class="space-y-3">
          <NuxtLink
            v-for="evt in upcomingEvents"
            :key="evt.id"
            :to="`/events/${evt.id}`"
            class="card p-4 flex items-start gap-4 hover:shadow-md transition block"
          >
            <div class="shrink-0 text-center bg-gray-50 rounded-xl px-3 py-2 min-w-[56px]">
              <p class="text-xs text-gray-500">{{ evt.startAt.getMonth() + 1 }}月</p>
              <p class="text-2xl font-bold text-gray-900 leading-none mt-0.5">{{ evt.startAt.getDate() }}</p>
              <p class="text-xs text-gray-400 mt-0.5">{{ ['日','月','火','水','木','金','土'][evt.startAt.getDay()] }}</p>
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between gap-2">
                <h3 class="font-semibold text-gray-900 text-sm">{{ evt.title }}</h3>
                <div class="flex items-center gap-1.5 shrink-0">
                  <span v-if="evt.isAttending" class="badge bg-green-100 text-green-700 text-xs">参加予定</span>
                  <span v-else class="badge bg-gray-100 text-gray-500 text-xs">未回答</span>
                </div>
              </div>
              <div class="mt-1.5 space-y-0.5 text-xs text-gray-500">
                <p class="flex items-center gap-1">
                  <Icon name="heroicons:clock" class="h-3.5 w-3.5" />
                  {{ formatTime(evt.startAt) }} 〜 {{ formatTime(evt.endAt) }}
                </p>
                <p class="flex items-center gap-1">
                  <Icon name="heroicons:map-pin" class="h-3.5 w-3.5" />
                  {{ evt.location }}
                </p>
                <p class="flex items-center gap-1">
                  <Icon name="heroicons:user-group" class="h-3.5 w-3.5" />
                  {{ evt.attendeeCount }}名参加 · {{ evt.targetScope }}
                </p>
              </div>
            </div>
          </NuxtLink>
        </div>
      </div>

      <!-- 過去のイベント -->
      <div v-if="pastEvents.length > 0">
        <h2 class="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">過去のイベント</h2>
        <div class="space-y-2">
          <NuxtLink
            v-for="evt in pastEvents"
            :key="evt.id"
            :to="`/events/${evt.id}`"
            class="card p-4 flex items-center gap-4 hover:shadow-md transition opacity-60 block"
          >
            <div class="shrink-0 text-center bg-gray-50 rounded-xl px-3 py-2 min-w-[56px]">
              <p class="text-xs text-gray-400">{{ evt.startAt.getMonth() + 1 }}月</p>
              <p class="text-xl font-bold text-gray-400 leading-none mt-0.5">{{ evt.startAt.getDate() }}</p>
            </div>
            <div class="flex-1">
              <p class="text-sm font-medium text-gray-600">{{ evt.title }}</p>
              <p class="text-xs text-gray-400 mt-0.5">{{ formatDate(evt.startAt) }} · {{ evt.targetScope }}</p>
            </div>
          </NuxtLink>
        </div>
      </div>

    </template>

    <!-- カレンダービュー（簡易） -->
    <div v-else class="card p-5">
      <div class="flex items-center justify-between mb-4">
        <button class="p-1 rounded-lg hover:bg-gray-100" @click="currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1)">
          <Icon name="heroicons:chevron-left" class="h-5 w-5 text-gray-600" />
        </button>
        <h2 class="font-semibold text-gray-900">{{ monthName }}</h2>
        <button class="p-1 rounded-lg hover:bg-gray-100" @click="currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1)">
          <Icon name="heroicons:chevron-right" class="h-5 w-5 text-gray-600" />
        </button>
      </div>

      <div class="grid grid-cols-7 gap-1 text-center mb-2">
        <div v-for="d in ['日','月','火','水','木','金','土']" :key="d" class="text-xs font-semibold text-gray-400 py-1">{{ d }}</div>
      </div>

      <div class="text-center py-12 text-gray-400">
        <Icon name="heroicons:calendar-days" class="h-10 w-10 mx-auto mb-2 text-gray-300" />
        <p class="text-sm">カレンダー表示はPhase 4で実装予定です</p>
      </div>
    </div>

  </div>
</template>
