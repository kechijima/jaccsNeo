<script setup lang="ts">
import type { RestrictedDoc } from '~/types/group'

definePageMeta({ middleware: ['auth', 'admin'] })

const { fetchDocs } = useRestricted()

const loading = ref(false)
const error = ref('')
const docs = ref<RestrictedDoc[]>([])

onMounted(async () => {
  loading.value = true
  try {
    docs.value = await fetchDocs()
  } catch (e: any) {
    error.value = e.message ?? 'データの取得に失敗しました'
  } finally {
    loading.value = false
  }
})

const categoryColors: Record<string, string> = {
  'JACCS':  'bg-red-100 text-red-700',
  '経営資料': 'bg-purple-100 text-purple-700',
}
</script>

<template>
  <div class="p-4 md:p-6 max-w-4xl mx-auto space-y-5">

    <div class="flex items-center gap-2 text-sm text-gray-400">
      <NuxtLink to="/admin">管理者設定</NuxtLink>
      <Icon name="heroicons:chevron-right" class="h-3 w-3" />
      <span class="text-gray-600">制限コンテンツ</span>
    </div>

    <div class="flex items-start justify-between gap-3">
      <div>
        <h1 class="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Icon name="heroicons:lock-closed" class="h-5 w-5 text-red-500" />
          制限コンテンツ（JACCS等）
        </h1>
        <p class="text-sm text-gray-500 mt-0.5">システム管理者のみアクセス可能</p>
      </div>
      <NuxtLink to="/admin/restricted/new" class="btn-primary text-sm flex items-center gap-1.5">
        <Icon name="heroicons:plus" class="h-4 w-4" />
        コンテンツ追加
      </NuxtLink>
    </div>

    <!-- セキュリティ注意書き -->
    <div class="rounded-xl bg-red-50 border border-red-200 p-4 flex items-start gap-3">
      <Icon name="heroicons:shield-exclamation" class="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
      <div class="text-sm text-red-800">
        <p class="font-semibold">機密コンテンツ管理エリア</p>
        <p class="mt-0.5">このエリアへのアクセスは記録されます。情報の外部漏洩は厳禁です。</p>
      </div>
    </div>

    <!-- コンテンツ一覧 -->
    <div class="card overflow-hidden">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-gray-100 bg-gray-50">
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">タイトル</th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">カテゴリ</th>
            <th class="px-4 py-3 text-center text-xs font-semibold text-gray-500">閲覧数</th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">作成日</th>
            <th class="px-4 py-3" />
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50">
          <tr v-for="doc in docs" :key="doc.id" class="hover:bg-gray-50">
            <td class="px-4 py-3 font-medium text-gray-900">{{ doc.title }}</td>
            <td class="px-4 py-3">
              <span class="badge text-xs" :class="categoryColors[doc.category] ?? 'bg-gray-100 text-gray-600'">{{ doc.category }}</span>
            </td>
            <td class="px-4 py-3 text-center text-gray-500">{{ doc.accessCount }}</td>
            <td class="px-4 py-3 text-gray-500 text-xs">{{ doc.createdAt }}</td>
            <td class="px-4 py-3 flex gap-2 justify-end">
              <NuxtLink :to="`/admin/restricted/${doc.id}`" class="text-xs text-primary-600 hover:underline">詳細</NuxtLink>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

  </div>
</template>
