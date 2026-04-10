<script setup lang="ts">
definePageMeta({ middleware: ['auth', 'admin'] })

// ダミーデータ（Phase4でFirestoreから取得）
const spaces = ref([
  { id: 'all_001', name: '全体連絡・お知らせ', type: 'all', typeLabel: '全体', memberCount: 387, postCount: 124, isArchived: false },
  { id: 'ret_001', name: 'Reterace グループ活動報告', type: 'group', typeLabel: 'グループ', memberCount: 245, postCount: 89, isArchived: false },
  { id: 'ret_003', name: 'りらくす組合', type: 'kumiai', typeLabel: '組合', memberCount: 119, postCount: 312, isArchived: false },
  { id: 'sp_001', name: '未来設計ハウジング（不動産チーム）', type: 'specialist', typeLabel: '専門チーム', memberCount: 32, postCount: 56, isArchived: false },
  { id: 'old_001', name: '旧・東日本グループ（アーカイブ済み）', type: 'group', typeLabel: 'グループ', memberCount: 0, postCount: 45, isArchived: true },
])

const typeColors: Record<string, string> = {
  all: 'bg-green-100 text-green-700',
  group: 'bg-indigo-100 text-indigo-700',
  board: 'bg-purple-100 text-purple-700',
  kumiai: 'bg-sky-100 text-sky-700',
  meeting: 'bg-amber-100 text-amber-700',
  specialist: 'bg-rose-100 text-rose-700',
  position: 'bg-gray-100 text-gray-600',
}

const showArchived = ref(false)
const filteredSpaces = computed(() =>
  showArchived.value ? spaces.value : spaces.value.filter(s => !s.isArchived)
)
</script>

<template>
  <div class="p-4 md:p-6 max-w-4xl mx-auto space-y-5">

    <div class="flex items-center gap-2 text-sm text-gray-400">
      <NuxtLink to="/admin">管理者設定</NuxtLink>
      <Icon name="heroicons:chevron-right" class="h-3 w-3" />
      <span class="text-gray-600">スペース管理</span>
    </div>

    <div class="flex items-start justify-between gap-3">
      <div>
        <h1 class="text-xl font-bold text-gray-900">スペース管理</h1>
        <p class="text-sm text-gray-500 mt-0.5">{{ spaces.filter(s => !s.isArchived).length }}件のアクティブなスペース</p>
      </div>
      <NuxtLink to="/admin/spaces/new" class="btn-primary text-sm flex items-center gap-1.5">
        <Icon name="heroicons:plus" class="h-4 w-4" />
        スペース作成
      </NuxtLink>
    </div>

    <div class="flex items-center gap-2">
      <label class="flex items-center gap-2 cursor-pointer text-sm text-gray-600">
        <input v-model="showArchived" type="checkbox" class="h-4 w-4 rounded text-primary-600" />
        アーカイブ済みも表示
      </label>
    </div>

    <div class="card overflow-hidden">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-gray-100 bg-gray-50">
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">スペース名</th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">種別</th>
            <th class="px-4 py-3 text-center text-xs font-semibold text-gray-500">メンバー</th>
            <th class="px-4 py-3 text-center text-xs font-semibold text-gray-500">投稿数</th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">状態</th>
            <th class="px-4 py-3" />
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50">
          <tr
            v-for="space in filteredSpaces"
            :key="space.id"
            class="hover:bg-gray-50"
            :class="space.isArchived ? 'opacity-50' : ''"
          >
            <td class="px-4 py-3 font-medium text-gray-900">{{ space.name }}</td>
            <td class="px-4 py-3">
              <span class="badge text-xs" :class="typeColors[space.type] ?? 'bg-gray-100 text-gray-500'">{{ space.typeLabel }}</span>
            </td>
            <td class="px-4 py-3 text-center text-gray-600">{{ space.memberCount }}名</td>
            <td class="px-4 py-3 text-center text-gray-600">{{ space.postCount }}</td>
            <td class="px-4 py-3">
              <span class="badge text-xs" :class="space.isArchived ? 'bg-gray-100 text-gray-500' : 'bg-green-100 text-green-700'">
                {{ space.isArchived ? 'アーカイブ' : 'アクティブ' }}
              </span>
            </td>
            <td class="px-4 py-3">
              <NuxtLink :to="`/portal/spaces/${space.id}/settings`" class="text-xs text-primary-600 hover:underline">設定</NuxtLink>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

  </div>
</template>
