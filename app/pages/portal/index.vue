<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

const announcements = [
  { id: 1, date: '2024.04.10', category: '重要', title: '【重要】システムメンテナンスのお知らせ（4/15）', important: true },
  { id: 2, date: '2024.04.08', category: '業務', title: '新商品「ライフケア保険」の販売開始について', important: false },
  { id: 3, date: '2024.04.05', category: '報告', title: '3月度成約ランキングが公開されました', important: false },
  { id: 4, date: '2024.04.01', category: '組織', title: '2024年度 上半期グループ編成の決定', important: false },
]

const usefulLinks = [
  { label: 'JACCS', url: '#', icon: 'heroicons:building-library', description: '基幹システムへのアクセス' },
  { label: '電子マニュアル', url: '#', icon: 'heroicons:book-open', description: '各商品・業務のマニュアル' },
  { label: '雛形ダウンロード', url: '#', icon: 'heroicons:document-duplicate', description: '各種契約書・申込書の原本' },
  { label: '福利厚生ポータル', url: '#', icon: 'heroicons:heart', description: '従業員向け福利厚生サービス' },
]
</script>

<template>
  <div class="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
    <h1 class="text-xl font-bold flex items-center gap-2 mb-6">
      <Icon name="heroicons:chat-bubble-left-right" class="text-primary-600" />
      ポータル
    </h1>

    <div class="grid lg:grid-cols-3 gap-6">
      <!-- 業務連絡 / お知らせ -->
      <div class="lg:col-span-2 space-y-4">
        <div class="card p-5">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-lg font-bold text-gray-900">業務連絡・お知らせ</h2>
            <button class="text-sm text-primary-600 hover:underline">過去の一覧を見る</button>
          </div>

          <div class="divide-y divide-gray-100">
            <div
              v-for="item in announcements"
              :key="item.id"
              class="py-4 first:pt-0 last:pb-0 hover:bg-gray-50 transition -mx-2 px-2 rounded-lg cursor-pointer"
            >
              <div class="flex items-center gap-3 mb-1">
                <span class="text-xs text-gray-400 font-medium">{{ item.date }}</span>
                <span 
                  class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
                  :class="item.important ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'"
                >
                  {{ item.category }}
                </span>
              </div>
              <h3 
                class="text-sm font-semibold truncate"
                :class="item.important ? 'text-red-700' : 'text-gray-900'"
              >
                {{ item.title }}
              </h3>
            </div>
          </div>
        </div>

        <!-- 部署別掲示板イメージ -->
        <div class="grid sm:grid-cols-2 gap-4">
          <div class="card p-5 border-l-4 border-reterace">
            <h3 class="font-bold text-gray-900 mb-2">Reterace 掲示板</h3>
            <p class="text-xs text-gray-500 mb-4">グループ内の周知事項はこちらを確認してください。</p>
            <button class="btn-primary w-full text-xs py-2">ページを開く</button>
          </div>
          <div class="card p-5 border-l-4 border-miraito">
            <h3 class="font-bold text-gray-900 mb-2">Miraito 掲示板</h3>
            <p class="text-xs text-gray-500 mb-4">進捗報告やツール共有用スペースです。</p>
            <button class="btn-primary w-full text-xs py-2">ページを開く</button>
          </div>
        </div>
      </div>

      <!-- 右サイド / 便利リンク -->
      <div class="space-y-6">
        <div class="card p-5 bg-primary-900 text-white overflow-hidden relative">
          <div class="relative z-10">
            <h2 class="text-lg font-bold mb-2">活動報告の提出</h2>
            <p class="text-xs text-primary-200 mb-4 leading-relaxed">
              本日分の活動報告が未提出です。<br>速やかな報告をお願いします。
            </p>
            <button class="bg-white text-primary-900 px-4 py-2 rounded-lg text-xs font-bold hover:bg-primary-50 transition">
              報告を作成する
            </button>
          </div>
          <Icon name="heroicons:pencil-square" class="absolute -bottom-4 -right-4 h-24 w-24 text-white/10" />
        </div>

        <div class="card p-5">
          <h2 class="font-bold text-gray-900 mb-4">便利ツール・リンク集</h2>
          <div class="space-y-3">
            <a
              v-for="link in usefulLinks"
              :key="link.label"
              href="#"
              class="flex items-start gap-3 p-3 rounded-lg border border-gray-100 hover:border-primary-300 hover:bg-primary-50 transition group"
            >
              <div class="h-8 w-8 rounded-lg bg-gray-50 flex items-center justify-center group-hover:bg-white shrink-0">
                <Icon :name="link.icon" class="h-4 w-4 text-gray-400 group-hover:text-primary-600" />
              </div>
              <div>
                <p class="text-xs font-bold text-gray-900">{{ link.label }}</p>
                <p class="text-[10px] text-gray-500">{{ link.description }}</p>
              </div>
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
