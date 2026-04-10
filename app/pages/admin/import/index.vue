<script setup lang="ts">
definePageMeta({ middleware: ['auth', 'admin'] })

// ダミーインポート履歴（Phase2でFirestoreから取得）
const importHistory = ref([
  {
    id: 'imp_001',
    filename: 'kintone_export_20260401.csv',
    totalRows: 27780,
    successRows: 27654,
    errorRows: 126,
    status: 'completed',
    statusLabel: '完了',
    operator: '管理者 太郎',
    createdAt: '2026/04/01 10:30',
  },
  {
    id: 'imp_002',
    filename: 'kintone_services_20260315.csv',
    totalRows: 5420,
    successRows: 5420,
    errorRows: 0,
    status: 'completed',
    statusLabel: '完了',
    operator: '管理者 太郎',
    createdAt: '2026/03/15 14:00',
  },
  {
    id: 'imp_003',
    filename: 'partial_update_20260310.csv',
    totalRows: 350,
    successRows: 0,
    errorRows: 350,
    status: 'failed',
    statusLabel: 'エラー',
    operator: '管理者 太郎',
    createdAt: '2026/03/10 09:15',
  },
])

const statusClass = (status: string) =>
  status === 'completed' ? 'bg-green-100 text-green-700' :
  status === 'failed' ? 'bg-red-100 text-red-600' :
  'bg-amber-100 text-amber-700'
</script>

<template>
  <div class="p-4 md:p-6 max-w-4xl mx-auto space-y-5">

    <div class="flex items-center gap-2 text-sm text-gray-400">
      <NuxtLink to="/admin">管理者設定</NuxtLink>
      <Icon name="heroicons:chevron-right" class="h-3 w-3" />
      <span class="text-gray-600">CSVインポート管理</span>
    </div>

    <div class="flex items-start justify-between gap-3">
      <div>
        <h1 class="text-xl font-bold text-gray-900">CSVインポート管理</h1>
        <p class="text-sm text-gray-500 mt-0.5">kintoneデータのバッチインポート・履歴</p>
      </div>
      <NuxtLink to="/customers/import" class="btn-primary text-sm flex items-center gap-1.5">
        <Icon name="heroicons:arrow-up-tray" class="h-4 w-4" />
        新規インポート
      </NuxtLink>
    </div>

    <!-- 統計 -->
    <div class="grid grid-cols-3 gap-4">
      <div class="card p-4 text-center">
        <p class="text-2xl font-bold text-gray-900">27,780</p>
        <p class="text-xs text-gray-500 mt-0.5">総顧客データ件数</p>
      </div>
      <div class="card p-4 text-center">
        <p class="text-2xl font-bold text-green-600">3</p>
        <p class="text-xs text-gray-500 mt-0.5">インポート実行回数</p>
      </div>
      <div class="card p-4 text-center">
        <p class="text-2xl font-bold text-amber-600">126</p>
        <p class="text-xs text-gray-500 mt-0.5">スキップ/エラー件数</p>
      </div>
    </div>

    <!-- インポート履歴 -->
    <div class="card overflow-hidden">
      <div class="px-5 py-3 border-b border-gray-100 bg-gray-50">
        <h2 class="font-semibold text-gray-900">インポート履歴</h2>
      </div>
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-gray-100">
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">ファイル名</th>
            <th class="px-4 py-3 text-center text-xs font-semibold text-gray-500">総数</th>
            <th class="px-4 py-3 text-center text-xs font-semibold text-gray-500">成功</th>
            <th class="px-4 py-3 text-center text-xs font-semibold text-gray-500">エラー</th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">状態</th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">実行日時</th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">担当者</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50">
          <tr v-for="h in importHistory" :key="h.id" class="hover:bg-gray-50">
            <td class="px-4 py-3 font-medium text-gray-800 text-xs max-w-[200px] truncate">{{ h.filename }}</td>
            <td class="px-4 py-3 text-center text-gray-600">{{ h.totalRows.toLocaleString() }}</td>
            <td class="px-4 py-3 text-center font-semibold text-green-700">{{ h.successRows.toLocaleString() }}</td>
            <td class="px-4 py-3 text-center font-semibold" :class="h.errorRows > 0 ? 'text-red-600' : 'text-gray-400'">{{ h.errorRows }}</td>
            <td class="px-4 py-3">
              <span class="badge text-xs" :class="statusClass(h.status)">{{ h.statusLabel }}</span>
            </td>
            <td class="px-4 py-3 text-gray-500 text-xs">{{ h.createdAt }}</td>
            <td class="px-4 py-3 text-gray-500 text-xs">{{ h.operator }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- データ移行ガイド -->
    <div class="card p-5">
      <h2 class="font-semibold text-gray-900 mb-3 flex items-center gap-2">
        <Icon name="heroicons:information-circle" class="h-5 w-5 text-blue-500" />
        kintone データ移行ガイド
      </h2>
      <ol class="space-y-2 text-sm text-gray-600">
        <li class="flex items-start gap-2">
          <span class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700 text-xs font-bold">1</span>
          kintoneから各アプリのデータをCSVエクスポート
        </li>
        <li class="flex items-start gap-2">
          <span class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700 text-xs font-bold">2</span>
          「新規インポート」からCSVをアップロードしフィールドマッピングを設定
        </li>
        <li class="flex items-start gap-2">
          <span class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700 text-xs font-bold">3</span>
          プレビューで内容を確認後、インポート実行
        </li>
        <li class="flex items-start gap-2">
          <span class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700 text-xs font-bold">4</span>
          大量データは分割実行を推奨（1回5,000件まで）
        </li>
      </ol>
    </div>

  </div>
</template>
