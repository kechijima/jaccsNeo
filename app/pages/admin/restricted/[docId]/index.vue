<script setup lang="ts">
import type { RestrictedDoc, RestrictedAccessLog } from '~/types/group'

definePageMeta({ middleware: ['auth', 'admin'] })

const route = useRoute()
const docId = computed(() => route.params.docId as string)

const { fetchDoc, fetchAccessLogs } = useRestricted()

const loading = ref(false)
const error = ref('')

const doc = ref<(RestrictedDoc & { createdAtLabel: string; accessLog: { user: string; accessedAt: string }[] }) | null>(null)

onMounted(async () => {
  loading.value = true
  try {
    const [fetchedDoc, logs] = await Promise.all([
      fetchDoc(docId.value),
      fetchAccessLogs(docId.value),
    ])
    if (fetchedDoc) {
      doc.value = {
        ...fetchedDoc,
        createdAtLabel: fetchedDoc.createdAt.toDate().toLocaleDateString('ja-JP'),
        accessLog: logs.map(l => ({
          user:       l.displayName,
          accessedAt: l.accessedAt.toDate().toLocaleString('ja-JP'),
        })),
      }
    }
  } catch (e: any) {
    error.value = e.message ?? 'データの取得に失敗しました'
  } finally {
    loading.value = false
  }
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
        <p class="text-xs text-gray-400 mt-0.5">作成: {{ doc.createdAtLabel }} · {{ doc.createdByName }}</p>
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
