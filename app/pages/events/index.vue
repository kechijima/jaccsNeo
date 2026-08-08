<script setup lang="ts">
import { useEvents } from '~/composables/useEvents'
import { useEventScope } from '~/composables/useEventScope'
import { useGroups } from '~/composables/useGroups'
import { EVENT_CATEGORY_LABELS } from '~/types/event'
import type { EventSummary, EventRecurrence } from '~/types/event'
import type { Group } from '~/types/group'

definePageMeta({ middleware: ['auth'] })

const { fetchEvents, fetchMyAttendance } = useEvents()
const { scopeLabel, scopeBadgeClass, scopeDotClass, categoryLabel, categoryBadgeClass, ensureLoaded: ensureEventScopeLoaded } = useEventScope()
const { fetchGroups } = useGroups()

const groups = ref<Group[]>([])
const filterGroupId = ref('')   // '' = すべて
const filterCategory = ref('')  // '' = すべて

const viewMode = ref<'list' | 'calendar'>('calendar')
const currentMonth = ref(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
const loading = ref(true)
const loadError = ref('')

interface EventRow {
  id: string
  title: string
  startAt: Date
  endAt: Date | undefined
  location: string | undefined
  scope: string
  groupId?: string
  category: string
  recurrence?: EventRecurrence
  attendeeCount: number
  isAttending: boolean
}

const rawEvents = ref<EventSummary[]>([])
const attendingIds = ref<Set<string>>(new Set())

onMounted(async () => {
  loading.value = true
  try {
    const [list, , fetchedGroups] = await Promise.all([fetchEvents(), ensureEventScopeLoaded(), fetchGroups().catch(() => [])])
    rawEvents.value = list
    groups.value = fetchedGroups ?? []
    const statuses = await Promise.all(list.map(e => fetchMyAttendance(e.id).catch(() => null)))
    attendingIds.value = new Set(list.filter((_, i) => statuses[i] === 'attending').map(e => e.id))
  } catch (e: any) {
    loadError.value = e.message ?? 'イベントの取得に失敗しました'
  } finally {
    loading.value = false
  }
})

const events = computed<EventRow[]>(() =>
  rawEvents.value.map(e => ({
    id:            e.id,
    title:         e.title,
    startAt:       e.startAt.toDate(),
    endAt:         e.endAt?.toDate(),
    location:      e.location,
    scope:         e.scope,
    groupId:       e.groupId,
    category:      e.category,
    recurrence:    e.recurrence,
    attendeeCount: e.attendeeCount,
    isAttending:   attendingIds.value.has(e.id),
  }))
)

const formatDate = (d: Date) => d.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })
const formatTime = (d?: Date) => d ? d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) : ''

// グループ・種別（会議/イベント/その他）で絞り込んだイベント。以降の一覧・カレンダーはすべてこれを参照する
const filteredEvents = computed(() => {
  let list = events.value
  if (filterGroupId.value) list = list.filter(e => e.scope === 'group' && e.groupId === filterGroupId.value)
  if (filterCategory.value) list = list.filter(e => e.category === filterCategory.value)
  return list
})

const upcomingEvents = computed(() =>
  filteredEvents.value.filter(e => e.startAt >= new Date()).sort((a, b) => a.startAt.getTime() - b.startAt.getTime())
)
const pastEvents = computed(() =>
  filteredEvents.value.filter(e => e.startAt < new Date()).sort((a, b) => b.startAt.getTime() - a.startAt.getTime())
)

const monthName = computed(() =>
  currentMonth.value.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' })
)

// 時刻を無視して日付だけを比較するためのヘルパー（複数日にまたがるイベントの判定用）
const toDateOnly = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
const isDateInRange = (day: Date, start: Date, end: Date) => {
  const d = toDateOnly(day)
  return d >= toDateOnly(start) && d <= toDateOnly(end)
}
const startOfWeek = (d: Date) => { const r = new Date(d); r.setDate(r.getDate() - r.getDay()); return r }

// 指定した日にイベントが出現するか判定する（通常イベント：期間内かどうか／会議の繰り返し：曜日・間隔などのルールに一致するか）
const eventOccursOnDate = (e: EventRow, day: Date): boolean => {
  if (isDateInRange(day, e.startAt, e.endAt ?? e.startAt)) return true
  if (!e.recurrence) return false

  const d = toDateOnly(day)
  const start = toDateOnly(e.startAt)
  if (d < start) return false
  if (e.recurrence.endDate && d > toDateOnly(new Date(`${e.recurrence.endDate}T00:00`))) return false

  const interval = Math.max(1, e.recurrence.interval || 1)
  if (e.recurrence.frequency === 'weekly') {
    if (!(e.recurrence.byWeekdays ?? []).includes(d.getDay())) return false
    const weeksDiff = Math.round((startOfWeek(d).getTime() - startOfWeek(start).getTime()) / (7 * 86400000))
    return weeksDiff >= 0 && weeksDiff % interval === 0
  }
  if (e.recurrence.frequency === 'monthly') {
    if (d.getDate() !== start.getDate()) return false
    const monthsDiff = (d.getFullYear() - start.getFullYear()) * 12 + (d.getMonth() - start.getMonth())
    return monthsDiff >= 0 && monthsDiff % interval === 0
  }
  return false
}

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
    // 複数日にまたがるイベント（終了日が翌日以降）や、繰り返し会議の各回はすべて該当する日に表示する
    const dayEvents = filteredEvents.value.filter(e => eventOccursOnDate(e, currCopy))

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

const eventsInCurrentMonth = computed(() => {
  const year  = currentMonth.value.getFullYear()
  const month = currentMonth.value.getMonth()
  const monthStart = new Date(year, month, 1)
  const monthEnd   = new Date(year, month + 1, 0)
  // 表示中の月に1日でも重なっていれば「今月のイベント」として数える（複数日イベント・繰り返し会議に対応）
  return filteredEvents.value.filter((e) => {
    if (toDateOnly(e.startAt) <= monthEnd && toDateOnly(e.endAt ?? e.startAt) >= monthStart) return true
    if (!e.recurrence) return false
    for (const cur = new Date(monthStart); cur <= monthEnd; cur.setDate(cur.getDate() + 1)) {
      if (eventOccursOnDate(e, cur)) return true
    }
    return false
  })
})

const prevMonth = () => {
  currentMonth.value = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth() - 1, 1)
}
const nextMonth = () => {
  currentMonth.value = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth() + 1, 1)
}

// 日付セルをクリックした際の挙動:
// ・イベントが無い日 → その日を開始日にしてイベント作成画面を開く
// ・イベントがある日 → 詳細を見るか新規作成するかを選べるパネルを開く
//   （モバイルではカレンダー上にイベントへのリンクを表示していないため、
//   タップすると常に作成画面に飛んでしまい、詳細を確認する手段がなかった）
const dateParam = (d: Date) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
const goToNewEventOnDate = (d: Date) => navigateTo(`/events/new?date=${dateParam(d)}`)

const selectedDay = ref<{ date: Date; events: EventRow[] } | null>(null)

const handleDayClick = (day: { date: Date; events: EventRow[] }) => {
  if (day.events.length === 0) {
    goToNewEventOnDate(day.date)
  } else {
    selectedDay.value = day
  }
}

const selectedDayLabel = computed(() => {
  if (!selectedDay.value) return ''
  return selectedDay.value.date.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })
})

const createEventOnSelectedDay = () => {
  if (!selectedDay.value) return
  const date = selectedDay.value.date
  selectedDay.value = null
  goToNewEventOnDate(date)
}
</script>

<template>
  <div class="p-4 md:p-6 max-w-5xl mx-auto space-y-5">

    <!-- ヘッダー -->
    <div class="flex items-start justify-between gap-3">
      <div>
        <h1 class="text-xl font-bold text-gray-900">カレンダー</h1>
        <p class="text-sm text-gray-500 mt-0.5">スケジュール・出欠管理</p>
      </div>
      <NuxtLink to="/events/new" class="btn-primary text-sm">
        <Icon name="heroicons:plus" class="h-4 w-4" />
        イベント作成
      </NuxtLink>
    </div>

    <!-- 読み込み中 -->
    <div v-if="loading" class="card p-12 text-center">
      <Icon name="heroicons:arrow-path" class="h-8 w-8 text-gray-300 mx-auto mb-2 animate-spin" />
      <p class="text-sm text-gray-400">読み込み中...</p>
    </div>

    <!-- エラー -->
    <div v-else-if="loadError" class="card p-12 text-center">
      <Icon name="heroicons:exclamation-circle" class="h-8 w-8 text-red-300 mx-auto mb-2" />
      <p class="text-sm text-red-500">{{ loadError }}</p>
    </div>

    <template v-else>
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

    <!-- 絞り込み（グループ・種別） -->
    <div class="flex items-center gap-2 flex-wrap">
      <select v-model="filterGroupId" class="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-primary-300">
        <option value="">すべてのグループ</option>
        <option v-for="g in groups" :key="g.id" :value="g.id">{{ g.name }}</option>
      </select>
      <select v-model="filterCategory" class="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-primary-300">
        <option value="">すべての種別</option>
        <option v-for="(label, key) in EVENT_CATEGORY_LABELS" :key="key" :value="key">{{ label }}</option>
      </select>
      <button
        v-if="filterGroupId || filterCategory"
        class="text-xs text-gray-400 hover:text-red-500 transition flex items-center gap-0.5"
        @click="filterGroupId = ''; filterCategory = ''"
      >
        <Icon name="heroicons:x-mark" class="h-3.5 w-3.5" />リセット
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
              <div class="mt-1.5 flex items-center gap-2 flex-wrap">
                <span class="badge text-xs" :class="categoryBadgeClass(evt)">{{ categoryLabel(evt) }}</span>
                <span class="badge text-xs" :class="scopeBadgeClass(evt)">{{ scopeLabel(evt) }}</span>
                <span v-if="evt.recurrence" class="badge text-xs bg-gray-100 text-gray-500 flex items-center gap-0.5">
                  <Icon name="heroicons:arrow-path" class="h-3 w-3" />繰り返し
                </span>
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
          class="group relative border-b border-r border-gray-100 min-h-[64px] md:min-h-[96px] p-1 cursor-pointer hover:bg-primary-50/40 transition"
          :class="!day.isCurrentMonth ? 'bg-gray-50/60' : ''"
          :title="day.events.length > 0 ? `${dateParam(day.date)} のイベントを見る` : `${dateParam(day.date)} のイベントを作成`"
          @click="handleDayClick(day)"
        >
          <!-- 日付 -->
          <div class="mb-0.5 md:mb-1 flex items-center justify-between">
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
            <Icon name="heroicons:plus" class="h-3.5 w-3.5 text-primary-400 opacity-0 group-hover:opacity-100 transition shrink-0" />
          </div>

          <!-- モバイル: カラードット -->
          <div class="flex flex-wrap gap-0.5 md:hidden">
            <span
              v-for="evt in day.events.slice(0, 3)"
              :key="evt.id"
              class="w-1.5 h-1.5 rounded-full shrink-0"
              :class="scopeDotClass(evt)"
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
              :class="scopeBadgeClass(evt)"
              @click.stop
            >
              <Icon v-if="evt.recurrence" name="heroicons:arrow-path" class="h-2.5 w-2.5 shrink-0 opacity-70" />
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
    </template>

    <!-- 日付選択パネル: 詳細を見るか新規作成するかを選ぶ -->
    <Teleport to="body">
      <div
        v-if="selectedDay"
        class="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40"
        @click.self="selectedDay = null"
      >
        <div class="bg-white w-full md:max-w-sm rounded-t-2xl md:rounded-2xl shadow-xl max-h-[80vh] overflow-y-auto">
          <div class="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
            <h3 class="font-bold text-gray-900">{{ selectedDayLabel }}</h3>
            <button type="button" class="text-gray-300 hover:text-gray-500 transition" @click="selectedDay = null">
              <Icon name="heroicons:x-mark" class="h-5 w-5" />
            </button>
          </div>

          <div class="divide-y divide-gray-50">
            <NuxtLink
              v-for="evt in selectedDay.events"
              :key="evt.id"
              :to="`/events/${evt.id}`"
              class="flex items-start gap-3 px-5 py-3 hover:bg-gray-50 transition"
              @click="selectedDay = null"
            >
              <div class="shrink-0 text-xs text-gray-400 tabular-nums pt-0.5 w-12">{{ formatTime(evt.startAt) }}</div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-900 truncate">{{ evt.title }}</p>
                <div class="mt-1 flex items-center gap-1.5 flex-wrap">
                  <span class="badge text-[10px]" :class="categoryBadgeClass(evt)">{{ categoryLabel(evt) }}</span>
                  <span class="badge text-[10px]" :class="scopeBadgeClass(evt)">{{ scopeLabel(evt) }}</span>
                </div>
              </div>
              <Icon name="heroicons:chevron-right" class="h-4 w-4 text-gray-300 shrink-0 mt-1" />
            </NuxtLink>
          </div>

          <div class="p-4 border-t border-gray-100">
            <button type="button" class="btn-secondary w-full text-sm flex items-center justify-center gap-1.5" @click="createEventOnSelectedDay">
              <Icon name="heroicons:plus" class="h-4 w-4" />
              この日にイベントを作成する
            </button>
          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>
