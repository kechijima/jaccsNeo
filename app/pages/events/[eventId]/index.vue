<script setup lang="ts">
import { MOCK_EVENTS } from '~/data/mock'

definePageMeta({ middleware: ['auth'] })

const route = useRoute()
const eventId = computed(() => route.params.eventId as string)

const event = computed(() => MOCK_EVENTS.find(e => e.id === eventId.value) ?? null)

const attending = ref(['ev001', 'ev003', 'ev005'].includes(eventId.value))

const scopeLabel: Record<string, string> = {
  all:    '全体',
  group:  'グループ',
  kumiai: '組合',
  space:  'スペース',
}
const scopeColor: Record<string, string> = {
  all:    'bg-green-100 text-green-700',
  group:  'bg-indigo-100 text-indigo-700',
  kumiai: 'bg-purple-100 text-purple-700',
  space:  'bg-amber-100 text-amber-700',
}

const formatDate = (ts: any) =>
  ts.toDate().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })

const formatTime = (ts: any) =>
  ts.toDate().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })

// モック参加者（イベントごとに固定）
const mockAttendees = computed(() => {
  if (!event.value) return []
  const base = [
    { name: 'テストユーザー', status: attending.value ? 'attending' : 'pending' },
    { name: '山田 太郎',     status: 'attending' },
    { name: '田中 花子',     status: 'attending' },
    { name: '西島 伸樹',     status: 'attending' },
  ]
  const extras: Record<string, { name: string; status: string }[]> = {
    ev003: [
      { name: '松田 健一',  status: 'attending' },
      { name: '川口 誠',   status: 'attending' },
      { name: '林 美穂',   status: 'attending' },
      { name: '大西 亮',   status: 'not_attending' },
    ],
    ev005: [
      { name: '中村 浩',   status: 'attending' },
      { name: '高橋 誠司', status: 'pending' },
    ],
  }
  return [...base, ...(extras[eventId.value] ?? [])]
})

const attendingCount = computed(() =>
  mockAttendees.value.filter(a => a.status === 'attending').length,
)

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

    <!-- イベントが見つからない場合 -->
    <div v-if="!event" class="card p-10 text-center">
      <Icon name="heroicons:exclamation-circle" class="h-10 w-10 text-gray-300 mx-auto mb-2" />
      <p class="text-gray-400">イベントが見つかりませんでした</p>
      <NuxtLink to="/events" class="mt-3 inline-block text-sm text-primary-600 hover:underline">← イベント一覧へ</NuxtLink>
    </div>

    <template v-else>
      <!-- ヘッダー -->
      <div class="flex items-start justify-between gap-3">
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-2 flex-wrap">
            <span class="badge text-xs" :class="scopeColor[event.scope] ?? 'bg-gray-100 text-gray-500'">
              {{ scopeLabel[event.scope] ?? event.scope }}
            </span>
            <span v-if="attending" class="badge bg-green-100 text-green-700 text-xs">参加予定</span>
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
            class="flex-1 flex items-center justify-center gap-2 rounded-xl border-2 py-3 text-sm font-semibold transition"
            :class="attending
              ? 'border-green-400 bg-green-50 text-green-700'
              : 'border-gray-200 text-gray-400 hover:border-green-300 hover:text-green-600'"
            @click="attending = true"
          >
            <Icon name="heroicons:check-circle" class="h-5 w-5" />
            参加する
          </button>
          <button
            class="flex-1 flex items-center justify-center gap-2 rounded-xl border-2 py-3 text-sm font-semibold transition"
            :class="!attending
              ? 'border-red-300 bg-red-50 text-red-600'
              : 'border-gray-200 text-gray-400 hover:border-red-200 hover:text-red-500'"
            @click="attending = false"
          >
            <Icon name="heroicons:x-circle" class="h-5 w-5" />
            不参加
          </button>
        </div>

        <!-- 参加者リスト -->
        <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">参加者状況</h3>
        <div class="space-y-2">
          <div
            v-for="a in mockAttendees"
            :key="a.name"
            class="flex items-center justify-between py-1"
          >
            <div class="flex items-center gap-2.5">
              <div class="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-600 text-xs font-semibold shrink-0">
                {{ a.name.charAt(0) }}
              </div>
              <span class="text-sm text-gray-700">{{ a.name }}</span>
            </div>
            <span class="badge text-xs" :class="statusBadge(a.status)">{{ statusLabel(a.status) }}</span>
          </div>
        </div>
      </div>

    </template>
  </div>
</template>
