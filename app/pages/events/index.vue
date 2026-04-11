<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

const tabs = ['タイムライン', 'カレンダー', '未完了']
const activeTab = ref('タイムライン')

const events = [
  { 
    id: 1, 
    title: 'A株式会社 定例会打合', 
    time: '10:00 - 11:30', 
    type: 'meeting', 
    location: '第2会議室',
    attendees: ['山田 太郎', '田中 一郎']
  },
  { 
    id: 2, 
    title: '鈴木様 ライフプラン相談', 
    time: '14:00 - 15:30', 
    type: 'consultation', 
    location: 'オンライン',
    attendees: ['自分']
  },
  { 
    id: 3, 
    title: '資産運用セミナー', 
    time: '16:00 - 17:30', 
    type: 'event', 
    location: '本社ホール',
    attendees: ['全体']
  },
]
</script>

<template>
  <div class="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
    <h1 class="text-xl font-bold flex items-center gap-2 mb-6">
      <Icon name="heroicons:calendar-days" class="text-primary-600" />
      イベント・スケジュール
    </h1>

    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div class="flex p-1 bg-gray-100 rounded-xl w-fit">
        <button
          v-for="tab in tabs"
          :key="tab"
          class="px-4 py-1.5 text-sm font-medium rounded-lg transition"
          :class="activeTab === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'"
          @click="activeTab = tab"
        >
          {{ tab }}
        </button>
      </div>
      <button class="btn-primary flex items-center gap-2 text-sm">
        <Icon name="heroicons:plus" class="h-4 w-4" />
        イベントを追加
      </button>
    </div>

    <!-- タイムラインビュー -->
    <div v-if="activeTab === 'タイムライン'" class="space-y-4">
      <div v-for="(day, i) in ['今日', '明日']" :key="day" class="space-y-3">
        <h3 class="text-sm font-bold text-gray-400 mt-4">{{ day }}</h3>
        <div 
          v-for="event in events" 
          :key="event.id"
          class="card p-4 hover:border-primary-300 transition cursor-pointer flex gap-4"
        >
          <div class="w-20 shrink-0 text-center py-1">
            <p class="text-xs font-bold text-gray-900">{{ event.time.split(' - ')[0] }}</p>
            <div class="h-8 w-px bg-gray-100 mx-auto my-1"></div>
            <p class="text-[10px] text-gray-400 font-medium">{{ event.time.split(' - ')[1] }}</p>
          </div>
          
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <span 
                class="px-2 py-0.5 rounded text-[9px] font-bold uppercase"
                :class="{
                  'bg-blue-100 text-blue-600': event.type === 'meeting',
                  'bg-amber-100 text-amber-600': event.type === 'consultation',
                  'bg-purple-100 text-purple-600': event.type === 'event'
                }"
              >
                {{ event.type }}
              </span>
              <span class="text-[10px] text-gray-400 flex items-center gap-1">
                <Icon name="heroicons:map-pin" class="h-3 w-3" />
                {{ event.location }}
              </span>
            </div>
            <h4 class="text-base font-bold text-gray-900 truncate">{{ event.title }}</h4>
            <div class="mt-2 flex -space-x-2">
              <div v-for="n in 3" :key="n" class="h-6 w-6 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center overflow-hidden">
                <Icon name="heroicons:user" class="h-3 w-3 text-gray-400" />
              </div>
              <div class="h-6 px-2 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-[10px] text-gray-500 font-bold">
                +{{ event.attendees.length }}
              </div>
            </div>
          </div>
          
          <div class="flex items-center">
            <button class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition">
              <Icon name="heroicons:chevron-right" class="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- カレンダービュー (モック) -->
    <div v-else-if="activeTab === 'カレンダー'" class="card p-4 overflow-hidden">
      <div class="text-center py-20">
        <Icon name="heroicons:calendar" class="h-16 w-16 text-gray-200 mx-auto mb-4" />
        <p class="text-gray-500 font-medium">カレンダービューは開発中です</p>
        <p class="text-xs text-gray-400 mt-1">タイムラインビューをご利用ください</p>
      </div>
    </div>

    <!-- 未完了タスク (モック) -->
    <div v-else class="text-center py-20">
       <Icon name="heroicons:check-badge" class="h-16 w-16 text-gray-200 mx-auto mb-4" />
       <p class="text-gray-500 font-medium">未完了のタスクはありません</p>
    </div>
  </div>
</template>
