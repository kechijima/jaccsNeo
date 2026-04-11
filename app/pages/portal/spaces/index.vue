<script setup lang="ts">
import { MOCK_SPACES } from '~/data/mock'

definePageMeta({ middleware: ['auth'] })

const typeLabelMap: Record<string, string> = {
  all:     '全体スペース',
  group:   'グループ',
  kumiai:  '組合',
  special: '専門チーム',
}

const unreadMap: Record<string, number> = { s001: 1, s002: 2 }

const spaceGroups = computed(() => {
  const groupMap = new Map<string, any[]>()
  for (const s of MOCK_SPACES) {
    const key = s.type
    if (!groupMap.has(key)) groupMap.set(key, [])
    groupMap.get(key)!.push({
      id:          s.id,
      name:        s.name,
      memberCount: s.memberCount,
      description: s.description,
      isPinned:    s.isPinned,
      unread:      unreadMap[s.id] ?? 0,
    })
  }

  const typeOrder = ['all', 'group', 'kumiai', 'special']
  const groups: { label: string; spaces: any[] }[] = []
  for (const type of typeOrder) {
    if (groupMap.has(type)) {
      groups.push({ label: typeLabelMap[type] ?? type, spaces: groupMap.get(type)! })
    }
  }
  for (const [type, rows] of groupMap) {
    if (!typeOrder.includes(type)) groups.push({ label: type, spaces: rows })
  }
  return groups
})

const searchQuery = ref('')
const allSpaces = computed(() => spaceGroups.value.flatMap(g => g.spaces))
const filteredSpaces = computed(() => {
  if (!searchQuery.value) return allSpaces.value
  const q = searchQuery.value.toLowerCase()
  return allSpaces.value.filter(s => s.name.toLowerCase().includes(q))
})
</script>

<template>
  <div class="p-4 md:p-6 max-w-4xl mx-auto space-y-5">

    <!-- ヘッダー -->
    <div class="flex items-start justify-between gap-3">
      <div>
        <div class="flex items-center gap-2 mb-1 text-sm text-gray-400">
          <NuxtLink to="/portal">ポータル</NuxtLink>
          <Icon name="heroicons:chevron-right" class="h-3 w-3" />
          <span class="text-gray-600">スペース一覧</span>
        </div>
        <h1 class="text-xl font-bold text-gray-900">スペース一覧</h1>
      </div>
    </div>

    <!-- 検索 -->
    <div class="relative">
      <Icon name="heroicons:magnifying-glass" class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
      <input
        v-model="searchQuery"
        type="search"
        placeholder="スペース名で検索..."
        class="input-field pl-9"
      />
    </div>

    <!-- 検索結果 -->
    <div v-if="searchQuery" class="card overflow-hidden">
      <div class="divide-y divide-gray-50">
        <NuxtLink
          v-for="space in filteredSpaces"
          :key="space.id"
          :to="`/portal/spaces/${space.id}`"
          class="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition"
        >
          <div class="flex items-center gap-3">
            <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-700 font-semibold text-sm">
              {{ space.name.charAt(0) }}
            </div>
            <div>
              <p class="text-sm font-medium text-gray-900">{{ space.name }}</p>
              <p class="text-xs text-gray-400">{{ space.memberCount }}名</p>
            </div>
          </div>
          <span v-if="space.unread > 0" class="badge bg-primary-500 text-white text-xs">{{ space.unread }}</span>
        </NuxtLink>
        <div v-if="filteredSpaces.length === 0" class="p-8 text-center text-sm text-gray-400">
          該当するスペースが見つかりません
        </div>
      </div>
    </div>

    <!-- グループ別スペース -->
    <template v-else>
      <div
        v-for="group in spaceGroups"
        :key="group.label"
        class="card overflow-hidden"
      >
        <div class="px-5 py-3 border-b border-gray-100 bg-gray-50">
          <h2 class="font-semibold text-gray-800 text-sm">{{ group.label }}</h2>
        </div>
        <div class="divide-y divide-gray-50">
          <NuxtLink
            v-for="space in group.spaces"
            :key="space.id"
            :to="`/portal/spaces/${space.id}`"
            class="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition"
          >
            <div class="flex items-center gap-3 min-w-0">
              <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-700 font-bold text-sm">
                {{ space.name.charAt(0) }}
              </div>
              <div class="min-w-0">
                <div class="flex items-center gap-1.5">
                  <p class="text-sm font-medium text-gray-900 truncate">{{ space.name }}</p>
                  <Icon v-if="space.isPinned" name="heroicons:bookmark-solid" class="h-3 w-3 text-primary-500 shrink-0" />
                </div>
                <p class="text-xs text-gray-400">{{ space.memberCount }}名 {{ space.description ? '· ' + space.description.slice(0, 30) + '…' : '' }}</p>
              </div>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <span v-if="space.unread > 0" class="flex h-5 w-5 items-center justify-center rounded-full bg-primary-500 text-[10px] font-bold text-white">
                {{ space.unread }}
              </span>
              <Icon name="heroicons:chevron-right" class="h-4 w-4 text-gray-300" />
            </div>
          </NuxtLink>
        </div>
      </div>
    </template>

  </div>
</template>
