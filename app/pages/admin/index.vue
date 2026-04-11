<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

const { user } = useCurrentUser()
const authStore = useAuthStore()

// システム管理者以外はダッシュボードへ戻す
onMounted(() => {
  if (!authStore.isSystemAdmin) {
    navigateTo('/dashboard')
  }
})

const adminTabs = ['ユーザー管理', 'グループ設定', 'システムログ', '環境設定']
const activeTab = ref('ユーザー管理')

const users = [
  { id: 1, name: '山田 太郎', email: 'yamada@example.com', role: 'system_admin', group: 'reterace' },
  { id: 2, name: '田中 一郎', email: 'tanaka@example.com', role: 'general', group: 'miraito' },
  { id: 3, name: '佐藤 花子', email: 'sato@example.com', role: 'em2_above', group: 'asset' },
]

const systemConfigs = [
  { key: 'メンテナンスモード', value: 'OFF', description: 'システム全体を閲覧専用にします' },
  { key: '新規登録制限', value: 'ON', description: '管理者以外の新規ユーザー登録を制限します' },
  { key: '通知メール送信', value: 'ON', description: '重要なお知らせをメールで送信します' },
]
</script>

<template>
  <div v-if="authStore.isSystemAdmin" class="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
    <h1 class="text-xl font-bold flex items-center gap-2 text-red-600 mb-6">
      <Icon name="heroicons:cog-6-tooth" />
      管理者設定
    </h1>

    <div class="flex border-b border-gray-200 mb-6">
      <button
        v-for="tab in adminTabs"
        :key="tab"
        class="px-6 py-3 text-sm font-bold transition-all border-b-2 -mb-px"
        :class="activeTab === tab ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-400 hover:text-gray-600'"
        @click="activeTab = tab"
      >
        {{ tab }}
      </button>
    </div>

    <!-- ユーザー管理 -->
    <div v-if="activeTab === 'ユーザー管理'" class="space-y-4">
      <div class="flex justify-between items-center">
        <h2 class="text-lg font-bold text-gray-900">ユーザー一覧</h2>
        <button class="btn-primary text-xs py-2">新規ユーザー招待</button>
      </div>
      
      <div class="card overflow-hidden">
        <table class="w-full text-left text-sm">
          <thead class="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase text-[10px] font-bold tracking-wider">
            <tr>
              <th class="px-6 py-3">名前</th>
              <th class="px-6 py-3">メールアドレス</th>
              <th class="px-6 py-3">ロール</th>
              <th class="px-6 py-3">グループ</th>
              <th class="px-6 py-3 text-right">アクション</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-for="u in users" :key="u.id" class="hover:bg-gray-50 transition">
              <td class="px-6 py-4 font-bold text-gray-900">{{ u.name }}</td>
              <td class="px-6 py-4 text-gray-500">{{ u.email }}</td>
              <td class="px-6 py-4">
                <span class="px-2 py-1 rounded-full text-[10px] font-bold uppercase bg-gray-100 text-gray-600 border border-gray-200">
                  {{ u.role }}
                </span>
              </td>
              <td class="px-6 py-4 text-gray-500">{{ u.group }}</td>
              <td class="px-6 py-4 text-right">
                <button class="text-primary-600 hover:underline font-bold text-xs mr-3">編集</button>
                <button class="text-red-600 hover:underline font-bold text-xs">削除</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 環境設定 -->
    <div v-else-if="activeTab === '環境設定'" class="space-y-4 max-w-3xl">
      <div class="card divide-y divide-gray-100">
        <div v-for="conf in systemConfigs" :key="conf.key" class="p-5 flex items-center justify-between">
          <div>
            <h3 class="text-sm font-bold text-gray-900">{{ conf.key }}</h3>
            <p class="text-xs text-gray-500">{{ conf.description }}</p>
          </div>
          <div class="flex items-center gap-4">
            <span 
              class="px-3 py-1 rounded-full text-[10px] font-black"
              :class="conf.value === 'ON' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'"
            >
              {{ conf.value }}
            </span>
            <button class="h-6 w-10 bg-gray-200 rounded-full relative transition cursor-pointer">
              <div class="absolute top-1 left-1 bg-white h-4 w-4 rounded-full shadow-sm transition translate-x-4" v-if="conf.value === 'ON'"></div>
              <div class="absolute top-1 left-1 bg-white h-4 w-4 rounded-full shadow-sm transition" v-else></div>
            </button>
          </div>
        </div>
      </div>
      <div class="flex justify-end">
        <button class="btn-primary">設定を保存する</button>
      </div>
    </div>

    <div v-else class="card py-20 text-center">
      <Icon name="heroicons:circle-stack" class="h-16 w-16 text-gray-200 mx-auto mb-4" />
      <p class="text-gray-500 font-medium">{{ activeTab }} 画面は開発中です</p>
    </div>
  </div>
  <!-- 権限がない場合 -->
  <div v-else class="flex items-center justify-center min-h-[60vh]">
    <div class="text-center space-y-4">
      <div class="h-20 w-20 bg-red-50 rounded-full flex items-center justify-center mx-auto">
        <Icon name="heroicons:lock-closed" class="h-10 w-10 text-red-600" />
      </div>
      <h2 class="text-2xl font-bold text-gray-900">アクセス権限がありません</h2>
      <p class="text-gray-500 max-w-xs mx-auto">この画面にアクセスするには管理者権限が必要です。管理者にお問い合わせください。</p>
      <NuxtLink to="/dashboard" class="btn-primary inline-block">ダッシュボードへ戻る</NuxtLink>
    </div>
  </div>
</template>
