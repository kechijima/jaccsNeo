<script setup lang="ts">
import type { Space } from '~/types/portal'

definePageMeta({ middleware: ['auth', 'admin'] })

const { fetchAllSpaces, archiveSpace } = useSpaces()

const loading = ref(false)
const error = ref('')
const spaces = ref<(Space & { typeLabel: string; postCount: number })[]>([])

const typeLabelMap: Record<string, string> = {
  all:     '全体',
  group:   'グループ',
  board:   '理事会',
  kumiai:  '組合',
  meeting: '数字会議',
  special: '専門チーム',
}

onMounted(async () => {
  loading.value = true
  try {
    const all = await fetchAllSpaces()
    spaces.value = all.map(s => ({
      ...s,
      typeLabel: typeLabelMap[s.type] ?? s.type,
      postCount: 0,
    }))
  } catch (e: any) {
    error.value = e.message ?? 'データの取得に失敗しました'
  } finally {
    loading.value = false
  }
})

const handleToggleArchive = async (id: string, current: boolean) => {
  try {
    await archiveSpace(id, !current)
    const s = spaces.value.find(s => s.id === id)
    if (s) s.isArchived = !current
  } catch (e: any) {
    error.value = e.message ?? '更新に失敗しました'
  }
}

const typeColors: Record<string, string> = {
  all:     'bg-green-100 text-green-700',
  group:   'bg-indigo-100 text-indigo-700',
  board:   'bg-purple-100 text-purple-700',
  kumiai:  'bg-sky-100 text-sky-700',
  meeting: 'bg-amber-100 text-amber-700',
  special: 'bg-rose-100 text-rose-700',
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
