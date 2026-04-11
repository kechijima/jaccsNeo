<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

const notifications = [
  {
    id: 1,
    type: 'alert',
    title: '顧客対応期限が近づいています',
    description: '鈴木 健太様のフォローアップ期限が明日までです。',
    time: '30分前',
    read: false,
    icon: 'heroicons:exclamation-triangle',
    color: 'bg-red-100 text-red-600'
  },
  {
    id: 2,
    type: 'portal',
    title: 'ポータルに新しい投稿がありました',
    description: '「システムメンテナンスのお知らせ（4/15）」が投稿されました。',
    time: '2時間前',
    read: false,
    icon: 'heroicons:chat-bubble-left-right',
    color: 'bg-primary-100 text-primary-600'
  },
  {
    id: 3,
    type: 'system',
    title: 'パスワード変更の推奨',
    description: 'セキュリティ保持のため、定期的なパスワードの変更をお願いします。',
    time: '1日前',
    read: true,
    icon: 'heroicons:shield-check',
    color: 'bg-gray-100 text-gray-600'
  },
  {
    id: 4,
    type: 'customer',
    title: '新規顧客が割り当てられました',
    description: '山田 太郎様（紹介）の担当者に指定されました。',
    time: '2日前',
    read: true,
    icon: 'heroicons:user-plus',
    color: 'bg-green-100 text-green-600'
  }
]
</script>

<template>
  <div class="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
    <h1 class="text-xl font-bold flex items-center gap-2 mb-6">
      <Icon name="heroicons:bell" class="text-primary-600" />
      通知
    </h1>

    <div class="flex items-center justify-between">
      <div class="flex gap-4">
        <button class="text-sm font-bold text-gray-900 border-b-2 border-primary-600 pb-1">すべて</button>
        <button class="text-sm font-medium text-gray-500 hover:text-gray-900 pb-1">未読のみ</button>
      </div>
      <button class="text-xs text-primary-600 hover:underline">すべて既読にする</button>
    </div>

    <div class="space-y-3">
      <div 
        v-for="item in notifications" 
        :key="item.id"
        class="card p-4 transition cursor-pointer relative"
        :class="item.read ? 'bg-white' : 'bg-primary-50/30 ring-1 ring-primary-100'"
      >
        <div v-if="!item.read" class="absolute top-4 right-4 h-2 w-2 rounded-full bg-primary-600"></div>
        
        <div class="flex gap-4">
          <div :class="['h-10 w-10 shrink-0 rounded-xl flex items-center justify-center', item.color]">
            <Icon :name="item.icon" class="h-6 w-6" />
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between mb-0.5">
              <h3 class="text-sm font-bold text-gray-900 truncate pr-6">{{ item.title }}</h3>
              <span class="text-[10px] text-gray-400 whitespace-nowrap">{{ item.time }}</span>
            </div>
            <p class="text-xs text-gray-600 leading-relaxed">{{ item.description }}</p>
          </div>
        </div>
      </div>
    </div>

    <div v-if="notifications.length === 0" class="card py-20 text-center">
      <Icon name="heroicons:bell-slash" class="h-16 w-16 text-gray-200 mx-auto mb-4" />
      <p class="text-gray-500 font-medium">通知はありません</p>
    </div>

    <div class="flex justify-center pt-4">
      <button class="text-xs font-bold text-gray-400 hover:text-gray-600 flex items-center gap-2">
        過去の通知を読み込む
        <Icon name="heroicons:chevron-down" class="h-4 w-4" />
      </button>
    </div>
  </div>
</template>
