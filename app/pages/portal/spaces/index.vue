<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

// ダミーデータ（Phase4でFirestoreから取得）
const spaceGroups = ref([
  {
    label: '全体スペース',
    spaces: [
      { id: 'all_001', name: '全体連絡・お知らせ', memberCount: 387, unread: 2, description: '全FP向けの重要連絡・お知らせ', isPinned: true },
      { id: 'all_002', name: 'イベント告知', memberCount: 387, unread: 0, description: 'セミナー・勉強会などのイベント告知', isPinned: false },
      { id: 'all_003', name: '中央理事会', memberCount: 15, unread: 0, description: '理事会メンバー専用', isPinned: false },
    ],
  },
  {
    label: 'Reterace グループ',
    color: 'bg-indigo-50',
    spaces: [
      { id: 'ret_001', name: 'Reterace グループ活動報告', memberCount: 245, unread: 1, description: 'Reteraceグループ全体の活動報告', isPinned: false },
      { id: 'ret_002', name: 'Reterace グループ理事会', memberCount: 18, unread: 0, description: 'グループ管理者以上', isPinned: false },
      { id: 'ret_003', name: 'りらくす組合', memberCount: 119, unread: 3, description: 'りらくす組合のスペース', isPinned: true },
      { id: 'ret_004', name: 'ラジカル組合', memberCount: 63, unread: 0, description: '', isPinned: false },
      { id: 'ret_005', name: '都華-ichika-組合', memberCount: 48, unread: 0, description: '', isPinned: false },
    ],
  },
  {
    label: 'Miraito グループ',
    color: 'bg-sky-50',
    spaces: [
      { id: 'mir_001', name: 'Miraito グループ活動報告', memberCount: 198, unread: 0, description: '', isPinned: false },
      { id: 'mir_002', name: 'ミライト組合', memberCount: 87, unread: 1, description: '', isPinned: false },
      { id: 'mir_003', name: 'リアン組合', memberCount: 54, unread: 0, description: '', isPinned: false },
    ],
  },
  {
    label: 'Asset グループ',
    color: 'bg-amber-50',
    spaces: [
      { id: 'ast_001', name: 'Asset グループ活動報告', memberCount: 212, unread: 0, description: '', isPinned: false },
      { id: 'ast_002', name: 'アセット組合', memberCount: 76, unread: 2, description: '', isPinned: false },
      { id: 'ast_003', name: 'テゴリス組合', memberCount: 68, unread: 0, description: '', isPinned: false },
    ],
  },
  {
    label: '専門チーム',
    spaces: [
      { id: 'sp_001', name: '未来設計ハウジング（不動産チーム）', memberCount: 32, unread: 1, description: '不動産専門チームスペース', isPinned: false },
      { id: 'sp_002', name: '損保チーム', memberCount: 28, unread: 0, description: '損保専門チームスペース', isPinned: false },
    ],
  },
])

const searchQuery = ref('')
const activeGroup = ref('all')

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
        <div class="px-5 py-3 border-b border-gray-100" :class="group.color ?? 'bg-gray-50'">
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
                <p class="text-xs text-gray-400">{{ space.memberCount }}名 {{ space.description ? '· ' + space.description : '' }}</p>
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
