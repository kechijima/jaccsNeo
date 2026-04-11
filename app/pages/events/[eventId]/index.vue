<script setup lang="ts">
import type { AttendanceStatus } from '~/types/event'

definePageMeta({ middleware: ['auth'] })

const route = useRoute()
const eventId = computed(() => route.params.eventId as string)
const { canEditCustomer } = usePermission()

const { fetchEvent, fetchAttendees, fetchMyAttendance, updateAttendance } = useEvents()

const loading = ref(false)
const error = ref('')

interface AttendeeRow {
  name: string
  status: string
}

interface EventRow {
  id: string
  title: string
  startAt: string
  endAt: string
  location: string | undefined
  targetScope: string
  description: string | undefined
  createdBy: string
  attendeeCount: number
  isAttending: boolean
  attendees: AttendeeRow[]
}

const event = ref<EventRow | null>(null)
const attending = ref(false)

const formatDateTime = (ts: { toDate(): Date }) =>
  ts.toDate().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' }) +
  ' ' +
  ts.toDate().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })

const formatTime = (ts: { toDate(): Date } | undefined) =>
  ts ? ts.toDate().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) : ''

const statusBadge = (status: string) => {
  if (status === 'attending') return 'bg-green-100 text-green-700'
  if (status === 'not_attending') return 'bg-red-100 text-red-600'
  return 'bg-gray-100 text-gray-500'
}
const statusLabel = (status: string) => {
  if (status === 'attending') return '参加'
  if (status === 'not_attending') return '不参加'
  return '未回答'
}

const toggleAttend = async () => {
  try {
    const newStatus: AttendanceStatus = attending.value ? 'attending' : 'not_attending'
    await updateAttendance(eventId.value, newStatus)
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : '出欠の更新に失敗しました'
  }
}

onMounted(async () => {
  loading.value = true
  error.value = ''
  try {
    const [e, attendeeList, myStatus] = await Promise.all([
      fetchEvent(eventId.value),
      fetchAttendees(eventId.value),
      fetchMyAttendance(eventId.value),
    ])

    if (!e) {
      error.value = 'イベントが見つかりませんでした'
      return
    }

    attending.value = myStatus === 'attending'

    event.value = {
      id: e.id,
      title: e.title,
      startAt: formatDateTime(e.startAt),
      endAt: formatTime(e.endAt),
      location: e.location,
      targetScope: e.scope,
      description: e.description,
      createdBy: e.createdByName,
      attendeeCount: e.attendeeCount,
      isAttending: myStatus === 'attending',
      attendees: attendeeList.map(a => ({ name: a.displayName, status: a.status })),
    }
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'イベントの取得に失敗しました'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="p-4 md:p-6 max-w-3xl mx-auto space-y-5">

    <div class="flex items-center gap-2 text-sm text-gray-400">
      <NuxtLink to="/events">イベント</NuxtLink>
      <Icon name="heroicons:chevron-right" class="h-3 w-3" />
      <span class="text-gray-600">イベント詳細</span>
    </div>

    <!-- ヘッダー -->
    <div class="flex items-start justify-between gap-3">
      <div>
        <h1 class="text-xl font-bold text-gray-900">{{ event.title }}</h1>
        <p class="text-sm text-gray-500 mt-1">{{ event.targetScope }} · 作成者: {{ event.createdBy }}</p>
      </div>
      <NuxtLink :to="`/events/${eventId}/edit`" class="btn-secondary text-sm flex items-center gap-1.5 shrink-0">
        <Icon name="heroicons:pencil" class="h-4 w-4" />
        編集
      </NuxtLink>
    </div>

    <!-- 基本情報 -->
    <div class="card p-5 space-y-3">
      <div class="flex items-center gap-3 text-sm">
        <Icon name="heroicons:calendar-days" class="h-5 w-5 text-primary-600 shrink-0" />
        <span class="text-gray-900 font-medium">{{ event.startAt }} 〜 {{ event.endAt }}</span>
      </div>
      <div class="flex items-center gap-3 text-sm">
        <Icon name="heroicons:map-pin" class="h-5 w-5 text-primary-600 shrink-0" />
        <span class="text-gray-900">{{ event.location }}</span>
      </div>
      <div class="flex items-center gap-3 text-sm">
        <Icon name="heroicons:user-group" class="h-5 w-5 text-primary-600 shrink-0" />
        <span class="text-gray-900">{{ event.attendeeCount }}名参加予定</span>
      </div>
      <div v-if="event.description" class="border-t border-gray-100 pt-3">
        <p class="text-sm text-gray-700 whitespace-pre-line">{{ event.description }}</p>
      </div>
    </div>

    <!-- 出欠確認 -->
    <div class="card p-5">
      <h2 class="font-semibold text-gray-900 mb-4">出欠確認</h2>
      <div class="flex gap-3 mb-4">
        <button
          class="flex-1 flex items-center justify-center gap-2 rounded-xl border-2 py-3 text-sm font-semibold transition"
          :class="attending ? 'border-green-400 bg-green-50 text-green-700' : 'border-gray-200 text-gray-500 hover:border-green-300'"
          @click="attending = true"
        >
          <Icon name="heroicons:check-circle" class="h-5 w-5" />
          参加する
        </button>
        <button
          class="flex-1 flex items-center justify-center gap-2 rounded-xl border-2 py-3 text-sm font-semibold transition"
          :class="!attending ? 'border-red-300 bg-red-50 text-red-600' : 'border-gray-200 text-gray-500 hover:border-red-200'"
          @click="attending = false"
        >
          <Icon name="heroicons:x-circle" class="h-5 w-5" />
          不参加
        </button>
      </div>

      <!-- 参加者リスト -->
      <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">参加者状況</h3>
      <div class="space-y-2">
        <div v-for="a in event.attendees" :key="a.name" class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div class="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-gray-600 text-xs font-semibold">
              {{ a.name.charAt(0) }}
            </div>
            <span class="text-sm text-gray-700">{{ a.name }}</span>
          </div>
          <span class="badge text-xs" :class="statusBadge(a.status)">{{ statusLabel(a.status) }}</span>
        </div>
      </div>
    </div>

  </div>
</template>
