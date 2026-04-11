<script setup lang="ts">
import type { Group } from '~/types/group'

definePageMeta({ middleware: ['auth', 'admin'] })

const { fetchGroups } = useGroups()

const loading = ref(false)
const error = ref('')

const groups = ref<(Group & { color: string; managerName: string; kumiais: { id: string; name: string; adminName: string; memberCount: number }[] })[]>([])

const colorMap: Record<string, string> = {
  reterace: 'bg-indigo-500',
  miraito:  'bg-sky-500',
  asset:    'bg-amber-500',
}

onMounted(async () => {
  loading.value = true
  try {
    const fetchedGroups = await fetchGroups()
    groups.value = fetchedGroups.map(g => ({
      ...g,
      color:       colorMap[g.id] ?? 'bg-gray-500',
      managerName: '',
      kumiais:     g.kumiai.map(k => ({
        id:          k.id,
        name:        k.name,
        adminName:   '',
        memberCount: 0,
      })),
    }))
  } catch (e: any) {
    error.value = e.message ?? 'データの取得に失敗しました'
  } finally {
    loading.value = false
  }
})

const expandedGroups = ref<string[]>(['reterace', 'miraito', 'asset'])
const editingGroup = ref<string | null>(null)
</script>

<template>
  <div class="p-4 md:p-6 max-w-4xl mx-auto space-y-5">

    <div class="flex items-center gap-2 text-sm text-gray-400">
      <NuxtLink to="/admin">管理者設定</NuxtLink>
      <Icon name="heroicons:chevron-right" class="h-3 w-3" />
      <span class="text-gray-600">グループ・組合マスタ</span>
    </div>

    <div class="flex items-start justify-between gap-3">
      <h1 class="text-xl font-bold text-gray-900">グループ・組合マスタ</h1>
      <button class="btn-primary text-sm flex items-center gap-1.5">
        <Icon name="heroicons:plus" class="h-4 w-4" />
        組合を追加
      </button>
    </div>

    <!-- グループ別 -->
    <div v-for="group in groups" :key="group.id" class="card overflow-hidden">
      <div class="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div class="flex items-center gap-3">
          <div class="h-4 w-4 rounded-full" :class="group.color" />
          <h2 class="font-semibold text-gray-900">{{ group.name }}</h2>
          <span class="text-xs text-gray-400">管理者: {{ group.managerName }}</span>
        </div>
        <button class="text-xs text-primary-600 hover:underline">グループ編集</button>
      </div>

      <div class="divide-y divide-gray-50">
        <div
          v-for="kumiai in group.kumiais"
          :key="kumiai.id"
          class="flex items-center justify-between px-5 py-3.5"
        >
          <div>
            <p class="text-sm font-medium text-gray-900">{{ kumiai.name }}</p>
            <p class="text-xs text-gray-400">管理者: {{ kumiai.adminName }} · {{ kumiai.memberCount }}名</p>
          </div>
          <div class="flex items-center gap-2">
            <button class="text-xs text-primary-600 hover:underline">編集</button>
            <button class="text-xs text-gray-400 hover:text-red-500">削除</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 専門チーム -->
    <div class="card overflow-hidden">
      <div class="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50">
        <h2 class="font-semibold text-gray-900">横串専門チーム（グループ横断）</h2>
        <button class="text-xs text-primary-600 hover:underline">チームを追加</button>
      </div>
      <div class="divide-y divide-gray-50">
        <div class="flex items-center justify-between px-5 py-3.5">
          <div>
            <p class="text-sm font-medium text-gray-900">不動産チーム（未来設計ハウジング）</p>
            <p class="text-xs text-gray-400">グループ横断 · 32名</p>
          </div>
          <button class="text-xs text-primary-600 hover:underline">編集</button>
        </div>
        <div class="flex items-center justify-between px-5 py-3.5">
          <div>
            <p class="text-sm font-medium text-gray-900">損保チーム</p>
            <p class="text-xs text-gray-400">グループ横断 · 28名</p>
          </div>
          <button class="text-xs text-primary-600 hover:underline">編集</button>
        </div>
      </div>
    </div>

  </div>
</template>
