<script setup lang="ts">
import { useEvents } from '~/composables/useEvents'
import { useEventScope } from '~/composables/useEventScope'
import type { Event, EventAttendee, AttendanceStatus } from '~/types/event'

definePageMeta({ middleware: ['auth'] })

const route = useRoute()
const eventId = computed(() => route.params.eventId as string)

const { fetchEvent, fetchAttendees, fetchMyAttendance, updateAttendance } = useEvents()
const { scopeLabel, scopeBadgeClass, ensureLoaded: ensureEventScopeLoaded } = useEventScope()

const loading = ref(true)
const loadError = ref('')
const event = ref<Event | null>(null)
const attendees = ref<EventAttendee[]>([])
const myStatus = ref<AttendanceStatus | null>(null)
const updatingStatus = ref(false)

onMounted(async () => {
  loading.value = true
  try {
    const [ev, list, mine] = await Promise.all([
      fetchEvent(eventId.value),
      fetchAttendees(eventId.value),
      fetchMyAttendance(eventId.value),
      ensureEventScopeLoaded(),
    ])
    event.value = ev
    attendees.value = list
    myStatus.value = mine
    if (!ev) loadError.value = 'イベントが見つかりませんでした'
  } catch (e: any) {
    loadError.value = e.message ?? 'イベントの取得に失敗しました'
  } finally {
    loading.value = false
  }
})

const formatDate = (ts: any) =>
  ts.toDate().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })

const formatTime = (ts: any) =>
  ts.toDate().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })

const attendingCount = computed(() =>
  attendees.value.filter(a => a.status === 'attending').length,
)

const handleAttendance = async (status: AttendanceStatus) => {
  if (updatingStatus.value) return
  updatingStatus.value = true
  try {
    await updateAttendance(eventId.value, status)
    myStatus.value = status
    attendees.value = await fetchAttendees(eventId.value)
    if (event.value) {
      event.value.attendeeCount = attendees.value.filter(a => a.status === 'attending').length
    }
  } catch (e: any) {
    loadError.value = e.message ?? '出欠の更新に失敗しました'
  } finally {
    updatingStatus.value = false
  }
}

const statusBadge = (status: string) => {
  if (status === 'attending')     return 'bg-green-100 text-green-700'
  if (status === 'not_attending') return 'bg-red-100 text-red-600'
  return 'bg-gray-100 text-gray-500'
}
const statusLabel = (status: string) => {
  if (status === 'attending')     return '参加'
  if (status === 'not_attending') return '不参加'
  return '未回答'
}
</script>

<template>
  <div class="p-4 md:p-6 max-w-3xl mx-auto space-y-5">

    <!-- パンくず -->
    <div class="flex items-center gap-2 text-sm text-gray-400">
      <NuxtLink to="/events">イベント</NuxtLink>
      <Icon name="heroicons:chevron-right" class="h-3 w-3" />
      <span class="text-gray-600">イベント詳細</span>
    </div>

    <!-- 読み込み中 -->
    <div v-if="loading" class="card p-12 text-center">
      <Icon name="heroicons:arrow-path" class="h-8 w-8 text-gray-300 mx-auto mb-2 animate-spin" />
      <p class="text-sm text-gray-400">読み込み中...</p>
    </div>

    <!-- イベントが見つからない場合 -->
    <div v-else-if="!event || loadError" class="card p-10 text-center">
      <Icon name="heroicons:exclamation-circle" class="h-10 w-10 text-gray-300 mx-auto mb-2" />
      <p class="text-gray-400">{{ loadError || 'イベントが見つかりませんでした' }}</p>
      <NuxtLink to="/events" class="mt-3 inline-block text-sm text-primary-600 hover:underline">← イベント一覧へ</NuxtLink>
    </div>

    <template v-else>
      <!-- ヘッダー -->
      <div class="flex items-start justify-between gap-3">
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-2 flex-wrap">
            <span class="badge text-xs" :class="scopeBadgeClass(event)">
              {{ scopeLabel(event) }}
            </span>
            <span v-if="myStatus === 'attending'" class="badge bg-green-100 text-green-700 text-xs">参加予定</span>
          </div>
          <h1 class="text-xl font-bold text-gray-900">{{ event.title }}</h1>
        </div>
        <NuxtLink :to="`/events/${eventId}/edit`" class="btn-secondary text-sm flex items-center gap-1.5 shrink-0">
          <Icon name="heroicons:pencil" class="h-4 w-4" />
          編集
        </NuxtLink>
      </div>

      <!-- 基本情報 -->
      <div class="card p-5 space-y-4">
        <div class="flex items-start gap-3 text-sm">
          <Icon name="heroicons:calendar-days" class="h-5 w-5 text-primary-600 shrink-0 mt-0.5" />
          <div>
            <p class="font-medium text-gray-900">{{ formatDate(event.startAt) }}</p>
            <p class="text-gray-500 mt-0.5">{{ formatTime(event.startAt) }} 〜 {{ event.endAt ? formatTime(event.endAt) : '' }}</p>
          </div>
        </div>
        <div v-if="event.location" class="flex items-center gap-3 text-sm">
          <Icon name="heroicons:map-pin" class="h-5 w-5 text-primary-600 shrink-0" />
          <span class="text-gray-900">{{ event.location }}</span>
        </div>
        <div class="flex items-center gap-3 text-sm">
          <Icon name="heroicons:user-group" class="h-5 w-5 text-primary-600 shrink-0" />
          <span class="text-gray-900">{{ attendingCount }}名参加予定</span>
        </div>
        <div v-if="event.description" class="border-t border-gray-100 pt-4">
          <p class="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{{ event.description }}</p>
        </div>
      </div>

      <!-- 出欠確認 -->
      <div class="card p-5">
        <h2 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Icon name="heroicons:clipboard-document-check" class="h-5 w-5 text-primary-600" />
          出欠確認
        </h2>
        <div class="flex gap-3 mb-5">
          <button
            type="button"
            class="flex-1 flex items-center justify-center gap-2 rounded-xl border-2 py-3 text-sm font-semibold transition disabled:opacity-50"
            :class="myStatus === 'attending'
              ? 'border-green-400 bg-green-50 text-green-700'
              : 'border-gray-200 text-gray-400 hover:border-green-300 hover:text-green-600'"
            :disabled="updatingStatus"
            @click="handleAttendance('attending')"
          >
            <Icon name="heroicons:check-circle" class="h-5 w-5" />
            参加する
          </button>
          <button
            type="button"
            class="flex-1 flex items-center justify-center gap-2 rounded-xl border-2 py-3 text-sm font-semibold transition disabled:opacity-50"
            :class="myStatus === 'not_attending'
              ? 'border-red-300 bg-red-50 text-red-600'
              : 'border-gray-200 text-gray-400 hover:border-red-200 hover:text-red-500'"
            :disabled="updatingStatus"
            @click="handleAttendance('not_attending')"
          >
            <Icon name="heroicons:x-circle" class="h-5 w-5" />
            不参加
          </button>
        </div>

        <!-- 参加者リスト -->
        <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">参加者状況</h3>
        <div v-if="attendees.length === 0" class="text-xs text-gray-400 text-center py-4">まだ回答がありません</div>
        <div v-else class="space-y-2">
          <div
            v-for="a in attendees"
            :key="a.uid"
            class="flex items-center justify-between py-1"
          >
            <div class="flex items-center gap-2.5">
              <div class="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-600 text-xs font-semibold shrink-0">
                {{ (a.displayName || '?').charAt(0) }}
              </div>
              <span class="text-sm text-gray-700">{{ a.displayName }}</span>
            </div>
            <span class="badge text-xs" :class="statusBadge(a.status)">{{ statusLabel(a.status) }}</span>
          </div>
        </div>
      </div>

    </template>
  </div>
</template>
