<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

const { user } = useCurrentUser()

const members = [
  { id: 1, name: '山田 太郎', role: 'マネージャー', status: 'meeting', avatar: 'Y' },
  { id: 2, name: '田中 一郎', role: '一般', status: 'online', avatar: 'T' },
  { id: 3, name: '佐藤 花子', role: '一般', status: 'away', avatar: 'S' },
  { id: 4, name: '鈴木 健太', role: '一般', status: 'online', avatar: 'K' },
  { id: 5, name: '高橋 まり', role: '一般', status: 'offline', avatar: 'M' },
]

const stats = [
  { label: 'グループ目標達成率', value: '82%', trend: 'up', color: 'text-green-600' },
  { label: '今週の相談数', value: '45', trend: 'down', color: 'text-red-600' },
  { label: '平均成約単価', value: '¥1.2M', trend: 'up', color: 'text-green-600' },
]

const groupName = computed(() => {
  switch (user.value?.groupId) {
    case 'reterace': return 'Reterace グループ'
    case 'miraito':  return 'Miraito グループ'
    case 'asset':    return 'Asset グループ'
    default:         return '担当グループ'
  }
})
</script>

<template>
  <div class="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
    <h1 class="text-xl font-bold flex items-center gap-2 mb-6">
      <Icon name="heroicons:chart-bar" class="text-primary-600" />
      チーム
    </h1>

    <div class="flex flex-col md:flex-row gap-6">
      <!-- メインエリア -->
      <div class="flex-1 space-y-6">
        <!-- グループ情報ヘッダー -->
        <div class="card p-6 bg-gradient-to-br from-primary-600 to-primary-700 text-white border-none shadow-xl">
          <div class="flex items-center justify-between mb-8">
            <div>
              <p class="text-primary-100 text-xs font-bold uppercase tracking-widest mb-1">{{ groupName }}</p>
              <h2 class="text-3xl font-black">Team Overview</h2>
            </div>
            <div class="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
              <Icon name="heroicons:user-group" class="h-8 w-8 text-white" />
            </div>
          </div>
          
          <div class="grid grid-cols-3 gap-4">
            <div v-for="stat in stats" :key="stat.label" class="bg-white/10 backdrop-blur-sm p-3 rounded-xl border border-white/10">
              <p class="text-[10px] text-primary-100 font-medium mb-1">{{ stat.label }}</p>
              <div class="flex items-baseline gap-1">
                <span class="text-lg font-bold">{{ stat.value }}</span>
                <Icon 
                  :name="stat.trend === 'up' ? 'heroicons:arrow-trending-up' : 'heroicons:arrow-trending-down'" 
                  class="h-3 w-3"
                  :class="stat.trend === 'up' ? 'text-green-300' : 'text-red-300'"
                />
              </div>
            </div>
          </div>
        </div>

        <div class="card p-5">
          <div class="flex items-center justify-between mb-6">
            <h2 class="font-bold text-gray-900">メンバー一覧</h2>
            <div class="flex gap-2">
              <span class="flex items-center gap-1.5 text-xs text-gray-500">
                <span class="h-2 w-2 rounded-full bg-green-500"></span>
                オンライン: 2
              </span>
            </div>
          </div>

          <div class="grid sm:grid-cols-2 gap-3">
            <div 
              v-for="member in members" 
              :key="member.id"
              class="flex items-center gap-4 p-3 rounded-xl border border-gray-100 hover:border-primary-200 hover:bg-primary-50 transition cursor-pointer group"
            >
              <div class="relative">
                <div class="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-600 group-hover:bg-primary-200 group-hover:text-primary-700 transition">
                  {{ member.avatar }}
                </div>
                <div 
                  class="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white"
                  :class="{
                    'bg-green-500': member.status === 'online',
                    'bg-amber-500': member.status === 'away' || member.status === 'meeting',
                    'bg-gray-400': member.status === 'offline' || member.status === 'meeting'
                  }"
                ></div>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-bold text-gray-900 truncate">{{ member.name }}</p>
                <p class="text-[10px] text-gray-500">{{ member.role }}</p>
              </div>
              <Icon name="heroicons:chat-bubble-left" class="h-4 w-4 text-gray-300 group-hover:text-primary-600" />
            </div>
          </div>
        </div>
      </div>

      <!-- 右サイド -->
      <div class="w-full md:w-80 space-y-6">
        <div class="card p-5">
          <h2 class="font-bold text-gray-900 mb-4">チームのアクティビティ</h2>
          <div class="space-y-4">
            <div v-for="n in 5" :key="n" class="flex gap-3">
              <div class="h-8 w-8 shrink-0 rounded-lg bg-gray-100 flex items-center justify-center">
                <Icon name="heroicons:document-plus" class="h-4 w-4 text-gray-400" />
              </div>
              <div>
                <p class="text-xs text-gray-700"><span class="font-bold">田中 一郎</span> が新しい活動を報告しました</p>
                <p class="text-[10px] text-gray-400">10分前</p>
              </div>
            </div>
          </div>
          <button class="w-full py-2 text-xs text-primary-600 font-bold border-t border-gray-100 mt-4 hover:bg-gray-50 transition">
            すべて見る
          </button>
        </div>

        <div class="card p-5 bg-amber-50 border-amber-100">
           <h2 class="font-bold text-amber-900 text-sm mb-2 flex items-center gap-2">
             <Icon name="heroicons:gift" class="h-4 w-4" />
             今月のMVP
           </h2>
           <p class="text-xs text-amber-800 leading-relaxed mb-4">
             今月最も多くの紹介を獲得したのは <span class="font-bold">山田 太郎</span> さんです！おめでとうございます！
           </p>
           <div class="flex justify-center py-2">
             <div class="h-16 w-16 rounded-full bg-amber-200 border-4 border-white flex items-center justify-center text-xl">🏆</div>
           </div>
        </div>
      </div>
    </div>
  </div>
</template>
