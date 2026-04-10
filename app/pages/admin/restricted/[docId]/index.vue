<script setup lang="ts">
definePageMeta({ middleware: ['auth', 'admin'] })

const route = useRoute()
const docId = computed(() => route.params.docId as string)

// ダミーデータ（Phase6でFirestoreから取得）
const doc = ref({
  title: 'JACCS 提携プログラム 2026年度版',
  category: 'JACCS',
  content: 'JACCS（ジャックス）との提携プログラムに関する内部資料です。\n\n1. 提携手数料体系\n   - 生命保険紹介: X%\n   - 損保紹介: Y%\n\n2. 対象商品リスト\n   - 詳細は添付PDFをご参照ください\n\n3. 申請手順\n   - システムから申請書を提出後、JACCS担当者に連絡',
  attachments: [
    { name: 'JACCS_提携プログラム2026.pdf', size: '2.3 MB', uploadedAt: '2026/04/01' },
  ],
  createdAt: '2026/04/01',
  createdBy: '管理者 太郎',
  accessLog: [
    { user: '管理者 太郎', accessedAt: '2026/04/10 14:30' },
    { user: '管理者 太郎', accessedAt: '2026/04/08 09:15' },
    { user: '理事会 花子', accessedAt: '2026/04/05 16:20' },
  ],
})
</script>

<template>
  <div class="p-4 md:p-6 max-w-3xl mx-auto space-y-5">

    <div class="flex items-center gap-2 text-sm text-gray-400">
      <NuxtLink to="/admin">管理者設定</NuxtLink>
      <Icon name="heroicons:chevron-right" class="h-3 w-3" />
      <NuxtLink to="/admin/restricted">制限コンテンツ</NuxtLink>
      <Icon name="heroicons:chevron-right" class="h-3 w-3" />
      <span class="text-gray-600">詳細</span>
    </div>

    <!-- セキュリティバナー -->
    <div class="rounded-xl bg-red-50 border border-red-200 p-3 flex items-center gap-2 text-xs text-red-700">
      <Icon name="heroicons:lock-closed" class="h-4 w-4 shrink-0" />
      機密コンテンツ — このページへのアクセスは記録されています
    </div>

    <!-- ヘッダー -->
    <div class="flex items-start justify-between gap-3">
      <div>
        <div class="flex items-center gap-2 mb-1">
          <span class="badge bg-red-100 text-red-700 text-xs">{{ doc.category }}</span>
        </div>
        <h1 class="text-xl font-bold text-gray-900">{{ doc.title }}</h1>
        <p class="text-xs text-gray-400 mt-0.5">作成: {{ doc.createdAt }} · {{ doc.createdBy }}</p>
      </div>
      <button class="btn-secondary text-sm flex items-center gap-1.5 shrink-0">
        <Icon name="heroicons:pencil" class="h-4 w-4" />
        編集
      </button>
    </div>

    <!-- 内容 -->
    <div class="card p-5">
      <h2 class="font-semibold text-gray-900 mb-3">内容</h2>
      <p class="text-sm text-gray-700 whitespace-pre-line">{{ doc.content }}</p>
    </div>

    <!-- 添付ファイル -->
    <div v-if="doc.attachments.length > 0" class="card p-5">
      <h2 class="font-semibold text-gray-900 mb-3">添付ファイル</h2>
      <div class="space-y-2">
        <div
          v-for="file in doc.attachments"
          :key="file.name"
          class="flex items-center justify-between rounded-lg bg-gray-50 p-3"
        >
          <div class="flex items-center gap-2">
            <Icon name="heroicons:document" class="h-5 w-5 text-gray-400" />
            <div>
              <p class="text-sm font-medium text-gray-800">{{ file.name }}</p>
              <p class="text-xs text-gray-400">{{ file.size }} · {{ file.uploadedAt }}</p>
            </div>
          </div>
          <button class="text-xs text-primary-600 hover:underline">ダウンロード</button>
        </div>
      </div>
    </div>

    <!-- アクセスログ -->
    <div class="card p-5">
      <h2 class="font-semibold text-gray-900 mb-3 flex items-center gap-2">
        <Icon name="heroicons:eye" class="h-5 w-5 text-gray-400" />
        アクセスログ
      </h2>
      <div class="divide-y divide-gray-50">
        <div v-for="log in doc.accessLog" :key="log.accessedAt" class="flex items-center justify-between py-2.5 text-sm">
          <span class="text-gray-700">{{ log.user }}</span>
          <span class="text-xs text-gray-400">{{ log.accessedAt }}</span>
        </div>
      </div>
    </div>

  </div>
</template>
