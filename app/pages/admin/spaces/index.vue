<script setup lang="ts">
import { MOCK_SPACES } from '~/data/mock'

definePageMeta({ middleware: ['auth', 'admin'] })

const typeLabelMap: Record<string, string> = {
  all:     '全体',
  group:   'グループ',
  board:   '理事会',
  kumiai:  '組合',
  meeting: '数字会議',
  special: '専門チーム',
}

const typeColors: Record<string, string> = {
  all:     'bg-green-100 text-green-700',
  group:   'bg-indigo-100 text-indigo-700',
  board:   'bg-purple-100 text-purple-700',
  kumiai:  'bg-sky-100 text-sky-700',
  meeting: 'bg-amber-100 text-amber-700',
  special: 'bg-rose-100 text-rose-700',
}

// ── フィルター ────────────────────────────────────────────────────────
const showArchived  = ref(false)
const filterType    = ref('')
const searchQuery   = ref('')

const TYPES = Object.keys(typeLabelMap)

const spaces = computed(() => {
  let list = MOCK_SPACES

  if (!showArchived.value) list = list.filter(s => !s.isArchived)

  if (filterType.value) list = list.filter(s => s.type === filterType.value)

  const q = searchQuery.value.trim()
  if (q) list = list.filter(s => s.name?.includes(q) || s.description?.includes(q))

  return list
})

const activeCount    = computed(() => MOCK_SPACES.filter(s => !s.isArchived).length)
const archivedCount  = computed(() => MOCK_SPACES.filter(s => s.isArchived).length)

// ── アーカイブ切り替え（モック用ローカル状態） ─────────────────────────
const toggleArchive = (id: string) => {
  const s = MOCK_SPACES.find(s => s.id === id)
  if (s) s.isArchived = !s.isArchived
}
</script>

<template>
  <div class="p-4 md:p-6 max-w-4xl mx-auto space-y-5">

    <!-- パンくず -->
    <div class="flex items-center gap-2 text-sm text-gray-400">
      <NuxtLink to="/admin">管理者設定</NuxtLink>
      <Icon name="heroicons:chevron-right" class="h-3 w-3" />
      <span class="text-gray-600">スペース管理</span>
    </div>

    <!-- ヘッダー -->
    <div class="flex items-start justify-between gap-3">
      <div>
        <h1 class="text-xl font-bold text-gray-900">スペース管理</h1>
        <p class="text-sm text-gray-500 mt-0.5">
          アクティブ {{ activeCount }}件
          <span v-if="archivedCount > 0" class="text-gray-400">・アーカイブ {{ archivedCount }}件</span>
        </p>
      </div>
      <NuxtLink to="/admin/spaces/new" class="btn-primary text-sm flex items-center gap-1.5">
        <Icon name="heroicons:plus" class="h-4 w-4" />
        スペース作成
      </NuxtLink>
    </div>

    <!-- 検索 + フィルター -->
    <div class="flex flex-wrap items-center gap-2">
      <div class="relative flex-1 min-w-[200px]">
        <Icon name="heroicons:magnifying-glass" class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          v-model="searchQuery"
          type="search"
          placeholder="スペース名で検索..."
          class="input-field pl-9"
        />
      </div>
      <select v-model="filterType" class="input-field text-sm py-2 w-auto">
        <option value="">種別: すべて</option>
        <option v-for="t in TYPES" :key="t" :value="t">{{ typeLabelMap[t] }}</option>
      </select>
      <label class="flex items-center gap-2 cursor-pointer text-sm text-gray-600">
        <input v-model="showArchived" type="checkbox" class="h-4 w-4 rounded text-primary-600" />
        アーカイブも表示
      </label>
    </div>

    <!-- テーブル -->
    <div class="card overflow-hidden">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-gray-100 bg-gray-50">
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">スペース名</th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">種別</th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">説明</th>
            <th class="px-4 py-3 text-center text-xs font-semibold text-gray-500">メンバー</th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">状態</th>
            <th class="px-4 py-3" />
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50">
          <tr v-if="spaces.length === 0">
            <td colspan="6" class="py-12 text-center text-gray-400">
              <Icon name="heroicons:chat-bubble-left-right" class="h-10 w-10 mx-auto mb-2 text-gray-200" />
              条件に一致するスペースがありません
            </td>
          </tr>
          <tr
            v-for="space in spaces"
            :key="space.id"
            class="hover:bg-gray-50 transition"
            :class="space.isArchived ? 'opacity-50' : ''"
          >
            <td class="px-4 py-3">
              <div class="font-medium text-gray-900 flex items-center gap-1.5">
                <Icon v-if="space.isPinned" name="heroicons:bookmark-solid" class="h-3.5 w-3.5 text-primary-400 shrink-0" />
                {{ space.name }}
              </div>
            </td>
            <td class="px-4 py-3">
              <span class="badge text-xs" :class="typeColors[space.type] ?? 'bg-gray-100 text-gray-500'">
                {{ typeLabelMap[space.type] ?? space.type }}
              </span>
            </td>
            <td class="px-4 py-3 text-gray-500 text-xs max-w-[220px] truncate">{{ space.description || '—' }}</td>
            <td class="px-4 py-3 text-center text-gray-600">{{ space.memberCount }}名</td>
            <td class="px-4 py-3">
              <span class="badge text-xs" :class="space.isArchived ? 'bg-gray-100 text-gray-500' : 'bg-green-100 text-green-700'">
                {{ space.isArchived ? 'アーカイブ' : 'アクティブ' }}
              </span>
            </td>
            <td class="px-4 py-3 text-right">
              <div class="flex items-center justify-end gap-3">
                <NuxtLink :to="`/portal/spaces/${space.id}/settings`" class="text-xs text-primary-600 hover:underline">設定</NuxtLink>
                <button
                  class="text-xs hover:underline"
                  :class="space.isArchived ? 'text-green-600' : 'text-gray-400'"
                  @click="toggleArchive(space.id)"
                >
                  {{ space.isArchived ? '復元' : 'アーカイブ' }}
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

  </div>
</template>
