<script setup lang="ts">
import { useEvents } from '~/composables/useEvents'
import { useEventScope } from '~/composables/useEventScope'
import { useSpaces } from '~/composables/useSpaces'
import { useEventMinutes } from '~/composables/useEventMinutes'
import type { Event, EventAttendee, AttendanceStatus } from '~/types/event'

definePageMeta({ middleware: ['auth'] })

const route = useRoute()
const eventId = computed(() => route.params.eventId as string)

const { fetchEvent, fetchAttendees, fetchMyAttendance, updateAttendance } = useEvents()
const { scopeLabel, scopeBadgeClass, categoryLabel, categoryBadgeClass, ensureLoaded: ensureEventScopeLoaded } = useEventScope()
const { fetchPost } = useSpaces()

// ── 議事録（種別「会議」のみ） ────────────────────────────────────────
const { user: currentUser } = useCurrentUser()
const { minutes, loading: minutesLoading, fetchMinutes, addMinutes, updateMinutes } = useEventMinutes(eventId.value)
const minutesDraft = ref('')
const minutesSubmitting = ref(false)

const submitMinutes = async () => {
  if (!minutesDraft.value.trim() || minutesSubmitting.value) return
  minutesSubmitting.value = true
  try {
    await addMinutes(minutesDraft.value)
    minutesDraft.value = ''
  } finally {
    minutesSubmitting.value = false
  }
}

const minutesFmt = (d: Date) => d.toLocaleString('ja-JP', { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })

// 投稿者本人のみ編集可能
const editingMinutesId = ref<string | null>(null)
const editingMinutesContent = ref('')
const editingMinutesSubmitting = ref(false)

const startEditMinutes = (m: { id: string; content: string }) => {
  editingMinutesId.value = m.id
  editingMinutesContent.value = m.content
}

const cancelEditMinutes = () => {
  editingMinutesId.value = null
  editingMinutesContent.value = ''
}

const saveEditMinutes = async () => {
  if (!editingMinutesId.value || !editingMinutesContent.value.trim() || editingMinutesSubmitting.value) return
  editingMinutesSubmitting.value = true
  try {
    await updateMinutes(editingMinutesId.value, editingMinutesContent.value)
    cancelEditMinutes()
  } finally {
    editingMinutesSubmitting.value = false
  }
}

const loading = ref(true)
const loadError = ref('')
const event = ref<Event | null>(null)
const attendees = ref<EventAttendee[]>([])
const myStatus = ref<AttendanceStatus | null>(null)
const updatingStatus = ref(false)
// 掲示板のイベントスペース投稿から連携作成されたイベントは、投稿項目に「詳細」が
// 無く、内容はリッチエディターで書かれた投稿本文そのものにあるため、そちらを表示する
const linkedPostContent = ref('')

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
    if (!ev) {
      loadError.value = 'イベントが見つかりませんでした'
    } else {
      if (ev.spaceId && ev.postId) {
        const post = await fetchPost(ev.spaceId, ev.postId).catch(() => null)
        if (post) linkedPostContent.value = post.content
      }
      if (ev.category === 'meeting') await fetchMinutes()
    }
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

const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土']
const recurrenceText = computed(() => {
  const r = event.value?.recurrence
  if (!r) return ''
  const unit = r.frequency === 'weekly' ? '週間' : 'ヶ月'
  const prefix = r.interval > 1 ? `${r.interval}${unit}ごと` : (r.frequency === 'weekly' ? '毎週' : '毎月')
  const detail = r.frequency === 'weekly'
    ? (r.byWeekdays ?? []).map(d => WEEKDAY_LABELS[d]).join('・') + '曜日'
    : `${event.value?.startAt.toDate().getDate()}日`
  const until = r.endDate ? `（${r.endDate.replace(/-/g, '/')}まで）` : ''
  return `${prefix} ${detail}に繰り返し${until}`
})

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
      <NuxtLink to="/events">カレンダー</NuxtLink>
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
      <NuxtLink to="/events" class="mt-3 inline-block text-sm text-primary-600 hover:underline">← カレンダーへ</NuxtLink>
    </div>

    <template v-else>
      <!-- ヘッダー -->
      <div class="flex items-start justify-between gap-3">
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-2 flex-wrap">
            <span class="badge text-xs" :class="categoryBadgeClass(event)">
              {{ categoryLabel(event) }}
            </span>
            <span class="badge text-xs" :class="scopeBadgeClass(event)">
              {{ scopeLabel(event) }}
            </span>
            <span v-if="event.category !== 'meeting' && myStatus === 'attending'" class="badge bg-green-100 text-green-700 text-xs">参加予定</span>
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
            <p v-if="recurrenceText" class="mt-1 flex items-center gap-1 text-xs text-primary-600">
              <Icon name="heroicons:arrow-path" class="h-3.5 w-3.5" />{{ recurrenceText }}
            </p>
          </div>
        </div>
        <div v-if="event.location" class="flex items-center gap-3 text-sm">
          <Icon name="heroicons:map-pin" class="h-5 w-5 text-primary-600 shrink-0" />
          <span class="text-gray-900">{{ event.location }}</span>
        </div>
        <div v-if="event.category !== 'meeting'" class="flex items-center gap-3 text-sm">
          <Icon name="heroicons:user-group" class="h-5 w-5 text-primary-600 shrink-0" />
          <span class="text-gray-900">{{ attendingCount }}名参加予定</span>
        </div>
        <div v-if="event.description" class="border-t border-gray-100 pt-4">
          <p class="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{{ event.description }}</p>
        </div>
        <div v-if="linkedPostContent" class="border-t border-gray-100 pt-4">
          <div class="text-sm text-gray-700 leading-relaxed prose prose-sm max-w-none" v-html="linkedPostContent" />
          <NuxtLink
            v-if="event.spaceId && event.postId"
            :to="`/portal/spaces/${event.spaceId}/posts/${event.postId}`"
            class="mt-2 inline-flex items-center gap-1 text-xs text-primary-600 hover:underline"
          >
            掲示板で見る<Icon name="heroicons:arrow-top-right-on-square" class="h-3 w-3" />
          </NuxtLink>
        </div>
      </div>

      <!-- 出欠確認（種別「会議」は不要） -->
      <div v-if="event.category !== 'meeting'" class="card p-5">
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

      <!-- 議事録（種別「会議」のみ） -->
      <div v-if="event.category === 'meeting'" class="card p-5 space-y-4">
        <h2 class="font-semibold text-gray-900 flex items-center gap-2">
          <Icon name="heroicons:document-text" class="h-5 w-5 text-primary-600" />
          議事録
        </h2>

        <!-- 新規投稿 -->
        <div class="space-y-2">
          <RichTextEditor v-model="minutesDraft" placeholder="議事録を入力..." class="min-h-[120px]" />
          <div class="flex justify-end">
            <button
              type="button"
              class="btn-primary text-sm"
              :disabled="!minutesDraft.trim() || minutesSubmitting"
              @click="submitMinutes"
            >
              <Icon v-if="minutesSubmitting" name="heroicons:arrow-path" class="h-3.5 w-3.5 animate-spin mr-1" />
              議事録を保存
            </button>
          </div>
        </div>

        <!-- 一覧（新着順） -->
        <div v-if="minutesLoading" class="text-center text-xs text-gray-400 py-4">読み込み中...</div>
        <div v-else-if="minutes.length === 0" class="text-center text-xs text-gray-400 py-4">議事録はまだありません</div>
        <div v-else class="space-y-3 border-t border-gray-100 pt-4">
          <div v-for="m in minutes" :key="m.id" class="rounded-lg bg-gray-50 p-3">
            <div class="flex items-center justify-between mb-1.5">
              <p class="text-xs font-semibold text-gray-700">{{ m.authorName || '不明' }}</p>
              <div class="flex items-center gap-2">
                <p class="text-[10px] text-gray-400">{{ minutesFmt(m.createdAt) }}</p>
                <button
                  v-if="m.authorUid === currentUser?.uid && editingMinutesId !== m.id"
                  type="button"
                  class="text-[10px] text-primary-600 hover:underline"
                  @click="startEditMinutes(m)"
                >
                  編集
                </button>
              </div>
            </div>

            <template v-if="editingMinutesId === m.id">
              <RichTextEditor v-model="editingMinutesContent" class="min-h-[100px]" />
              <div class="flex justify-end gap-2 mt-2">
                <button type="button" class="btn-secondary text-xs" @click="cancelEditMinutes">キャンセル</button>
                <button
                  type="button"
                  class="btn-primary text-xs"
                  :disabled="!editingMinutesContent.trim() || editingMinutesSubmitting"
                  @click="saveEditMinutes"
                >
                  <Icon v-if="editingMinutesSubmitting" name="heroicons:arrow-path" class="h-3 w-3 animate-spin mr-1" />
                  保存する
                </button>
              </div>
            </template>
            <div v-else class="text-sm text-gray-700 leading-relaxed prose prose-sm max-w-none" v-html="m.content" />
          </div>
        </div>
      </div>

    </template>
  </div>
</template>
