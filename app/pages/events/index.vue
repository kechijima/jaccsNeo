<script setup lang="ts">
import { MOCK_EVENTS } from '~/data/mock'

definePageMeta({ middleware: ['auth'] })

const viewMode = ref<'list' | 'calendar'>('calendar')
const currentMonth = ref(new Date(new Date().getFullYear(), new Date().getMonth(), 1))

interface EventRow {
  id: string
  title: string
  startAt: Date
  endAt: Date | undefined
  location: string | undefined
  targetScope: string
  attendeeCount: number
  isAttending: boolean
}

const events = computed<EventRow[]>(() =>
  MOCK_EVENTS.map(e => ({
    id:            e.id,
    title:         e.title,
    startAt:       e.startAt.toDate(),
    endAt:         e.endAt?.toDate(),
    location:      e.location,
    targetScope:   e.scope,
    attendeeCount: e.attendeeCount,
    isAttending:   ['ev001', 'ev003', 'ev005'].includes(e.id),
  }))
)

const formatDate = (d: Date) => d.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })
const formatTime = (d?: Date) => d ? d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) : ''

const upcomingEvents = computed(() =>
  events.value.filter(e => e.startAt >= new Date()).sort((a, b) => a.startAt.getTime() - b.startAt.getTime())
)
const pastEvents = computed(() =>
  events.value.filter(e => e.startAt < new Date()).sort((a, b) => b.startAt.getTime() - a.startAt.getTime())
)

const monthName = computed(() =>
  currentMonth.value.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' })
)

// ===== カレンダーロジック =====
const calendarDays = computed(() => {
  const year = currentMonth.value.getFullYear()
  const month = currentMonth.value.getMonth()

  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)

  // 月の最初の週の日曜日から開始
  const startDate = new Date(firstDay)
  startDate.setDate(startDate.getDate() - startDate.getDay())

  // 月の最終週の土曜日まで
  const endDate = new Date(lastDay)
  endDate.setDate(endDate.getDate() + (6 - endDate.getDay()))

  const todayStr = new Date().toDateString()
  const days: Array<{
    date: Date
    day: number
    isCurrentMonth: boolean
    isToday: boolean
    events: EventRow[]
  }> = []

  const curr = new Date(startDate)
  while (curr <= endDate) {
    const currCopy = new Date(curr)
    const currDateStr = currCopy.toDateString()
    const dayEvents = events.value.filter(e => e.startAt.toDateString() === currDateStr)

    days.push({
      date: currCopy,
      day: currCopy.getDate(),
      isCurrentMonth: currCopy.getMonth() === month,
      isToday: currDateStr === todayStr,
      events: dayEvents,
    })

    curr.setDate(curr.getDate() + 1)
  }

  return days
})

const eventsInCurrentMonth = computed(() =>
  events.value.filter(e =>
    e.startAt.getFullYear() === currentMonth.value.getFullYear() &&
    e.startAt.getMonth() === currentMonth.value.getMonth()
  )
)

const prevMonth = () => {
  currentMonth.value = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth() - 1, 1)
}
const nextMonth = () => {
  currentMonth.value = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth() + 1, 1)
}

const pillColor = (scope: string) => {
  const map: Record<string, string> = {
    all:    'bg-green-100 text-green-700',
    group:  'bg-indigo-100 text-indigo-700',
    kumiai: 'bg-indigo-100 text-indigo-700',
    space:  'bg-amber-100 text-amber-700',
  }
  return map[scope] ?? 'bg-gray-100 text-gray-600'
}

const dotColor = (scope: string) => {
  const map: Record<string, string> = {
    all:    'bg-green-500',
    group:  'bg-indigo-500',
    kumiai: 'bg-indigo-400',
    space:  'bg-amber-500',
  }
  return map[scope] ?? 'bg-gray-400'
}

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
                <p v-if="evt.location" class="flex items-center gap-1">
                  <Icon name="heroicons:map-pin" class="h-3.5 w-3.5" />
                  {{ evt.location }}
                </p>
                <p class="flex items-center gap-1">
                  <Icon name="heroicons:user-group" class="h-3.5 w-3.5" />
                  {{ evt.attendeeCount }}名参加
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
              <p class="text-xs text-gray-400 mt-0.5">{{ formatDate(evt.startAt) }}</p>
            </div>
          </NuxtLink>
        </div>
      </div>

    </template>

    <!-- カレンダービュー -->
    <div v-else class="card overflow-hidden">

      <!-- 月ナビゲーション -->
      <div class="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <button class="p-1.5 rounded-lg hover:bg-gray-100 transition" @click="prevMonth">
          <Icon name="heroicons:chevron-left" class="h-5 w-5 text-gray-600" />
        </button>
        <div class="text-center">
          <h2 class="font-bold text-gray-900">{{ monthName }}</h2>
          <p class="text-xs text-gray-400 mt-0.5">
            {{ eventsInCurrentMonth.length > 0 ? `${eventsInCurrentMonth.length}件のイベント` : 'イベントなし' }}
          </p>
        </div>
        <button class="p-1.5 rounded-lg hover:bg-gray-100 transition" @click="nextMonth">
          <Icon name="heroicons:chevron-right" class="h-5 w-5 text-gray-600" />
        </button>
      </div>

      <!-- 曜日ヘッダー -->
      <div class="grid grid-cols-7 bg-gray-50 border-b border-gray-100">
        <div
          v-for="(d, i) in ['日','月','火','水','木','金','土']"
          :key="d"
          class="py-2 text-center text-xs font-semibold"
          :class="i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-500'"
        >{{ d }}</div>
      </div>

      <!-- カレンダーグリッド -->
      <div class="grid grid-cols-7 border-t border-l border-gray-100">
        <div
          v-for="day in calendarDays"
          :key="day.date.toISOString()"
          class="border-b border-r border-gray-100 min-h-[64px] md:min-h-[96px] p-1"
          :class="!day.isCurrentMonth ? 'bg-gray-50/60' : ''"
        >
          <!-- 日付 -->
          <div class="mb-0.5 md:mb-1">
            <span
              class="text-xs font-medium inline-flex items-center justify-center w-5 h-5 rounded-full leading-none"
              :class="[
                day.isToday
                  ? 'bg-primary-600 text-white font-bold'
                  : !day.isCurrentMonth
                    ? 'text-gray-300'
                    : day.date.getDay() === 0
                      ? 'text-red-500'
                      : day.date.getDay() === 6
                        ? 'text-blue-500'
                        : 'text-gray-700',
              ]"
            >{{ day.day }}</span>
          </div>

          <!-- モバイル: カラードット -->
          <div class="flex flex-wrap gap-0.5 md:hidden">
            <span
              v-for="evt in day.events.slice(0, 3)"
              :key="evt.id"
              class="w-1.5 h-1.5 rounded-full shrink-0"
              :class="dotColor(evt.targetScope)"
              :title="evt.title"
            />
            <span v-if="day.events.length > 3" class="text-[8px] text-gray-400 leading-none self-end">+{{ day.events.length - 3 }}</span>
          </div>

          <!-- デスクトップ: イベントピル -->
          <div class="hidden md:block space-y-0.5">
            <NuxtLink
              v-for="evt in day.events.slice(0, 2)"
              :key="evt.id"
              :to="`/events/${evt.id}`"
              class="flex items-center gap-1 w-full truncate text-xs rounded px-1 py-0.5 hover:opacity-80 transition cursor-pointer"
              :class="pillColor(evt.targetScope)"
            >
              <span class="shrink-0 text-[10px] opacity-70 tabular-nums">{{ formatTime(evt.startAt) }}</span>
              <span class="truncate flex-1">{{ evt.title }}</span>
            </NuxtLink>
            <p v-if="day.events.length > 2" class="text-[10px] text-gray-400 px-1 leading-tight">
              他{{ day.events.length - 2 }}件
            </p>
          </div>
        </div>
      </div>

    </div>

  </div>
</template>
