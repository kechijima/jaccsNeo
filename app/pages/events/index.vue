<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

const viewMode = ref<'list' | 'calendar'>('list')
const currentMonth = ref(new Date(2026, 3, 1)) // 2026年4月

// ダミーデータ（Phase4でFirestoreから取得）
const events = ref([
  {
    id: 'evt_001',
    title: 'りらくす組合 数字会議',
    startAt: new Date(2026, 3, 15, 20, 0),
    endAt: new Date(2026, 3, 15, 21, 30),
    location: 'オンライン（Zoom）',
    targetScope: 'りらくす組合',
    attendeeCount: 12,
    isAttending: true,
    color: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  },
  {
    id: 'evt_002',
    title: 'FP勉強会（全体）',
    startAt: new Date(2026, 3, 20, 13, 0),
    endAt: new Date(2026, 3, 20, 16, 0),
    location: '大阪本社 会議室A',
    targetScope: '全体',
    attendeeCount: 38,
    isAttending: false,
    color: 'bg-green-100 text-green-700 border-green-200',
  },
  {
    id: 'evt_003',
    title: 'Reterace グループ会議',
    startAt: new Date(2026, 3, 22, 19, 0),
    endAt: new Date(2026, 3, 22, 20, 30),
    location: 'オンライン（Google Meet）',
    targetScope: 'Reterace グループ',
    attendeeCount: 24,
    isAttending: true,
    color: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  },
  {
    id: 'evt_004',
    title: '新人研修（4月）',
    startAt: new Date(2026, 3, 25, 10, 0),
    endAt: new Date(2026, 3, 25, 17, 0),
    location: '大阪本社 研修室',
    targetScope: '全体',
    attendeeCount: 8,
    isAttending: false,
    color: 'bg-amber-100 text-amber-700 border-amber-200',
  },
])

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
