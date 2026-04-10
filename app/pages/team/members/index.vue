<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

// ダミーデータ（Phase5でFirestoreから取得）
const groups = ref([
  {
    id: 'reterace',
    label: 'Reterace',
    color: 'bg-indigo-500',
    bgColor: 'bg-indigo-50',
    kumiais: [
      {
        name: 'りらくす組合',
        members: [
          { uid: 'u001', name: '西島 伸樹', position: 'PM', contracts: 10, newClients: 4 },
          { uid: 'u002', name: '池田 健太郎', position: '一般FP', contracts: 5, newClients: 3 },
          { uid: 'u003', name: '田中 洋子', position: '一般FP', contracts: 4, newClients: 5 },
        ],
      },
      {
        name: 'ラジカル組合',
        members: [
          { uid: 'u006', name: '中村 大輔', position: 'PM', contracts: 8, newClients: 3 },
          { uid: 'u007', name: '小林 さゆり', position: '一般FP', contracts: 6, newClients: 2 },
        ],
      },
    ],
  },
  {
    id: 'miraito',
    label: 'Miraito',
    color: 'bg-sky-500',
    bgColor: 'bg-sky-50',
    kumiais: [
      {
        name: 'ミライト組合',
        members: [
          { uid: 'u010', name: '川崎 浩二', position: 'EM2', contracts: 12, newClients: 5 },
          { uid: 'u011', name: '木村 真一', position: 'PM', contracts: 9, newClients: 4 },
        ],
      },
    ],
  },
  {
    id: 'asset',
    label: 'Asset',
    color: 'bg-amber-500',
    bgColor: 'bg-amber-50',
    kumiais: [
      {
        name: 'アセット組合',
        members: [
          { uid: 'u020', name: '山田 太郎', position: 'PM', contracts: 12, newClients: 6 },
          { uid: 'u021', name: '鈴木 美咲', position: '一般FP', contracts: 7, newClients: 3 },
        ],
      },
    ],
  },
])

const searchQuery = ref('')
const expandedGroups = ref<string[]>(['reterace'])

const toggleGroup = (id: string) => {
  if (expandedGroups.value.includes(id)) {
    expandedGroups.value = expandedGroups.value.filter(g => g !== id)
  } else {
    expandedGroups.value.push(id)
  }
}
</script>

<template>
  <div class="p-4 md:p-6 max-w-5xl mx-auto space-y-5">

    <div class="flex items-center gap-2 text-sm text-gray-400">
      <NuxtLink to="/team">チーム</NuxtLink>
      <Icon name="heroicons:chevron-right" class="h-3 w-3" />
      <span class="text-gray-600">メンバー一覧</span>
    </div>

    <h1 class="text-xl font-bold text-gray-900">メンバー一覧</h1>

    <!-- 検索 -->
    <div class="relative">
      <Icon name="heroicons:magnifying-glass" class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
      <input v-model="searchQuery" type="search" placeholder="名前で検索..." class="input-field pl-9" />
    </div>

    <!-- グループ別メンバー -->
    <div v-for="group in groups" :key="group.id" class="card overflow-hidden">
      <button
        class="w-full flex items-center justify-between px-5 py-4 text-left"
        :class="group.bgColor"
        @click="toggleGroup(group.id)"
      >
        <div class="flex items-center gap-3">
          <div class="h-3 w-3 rounded-full" :class="group.color" />
          <h2 class="font-semibold text-gray-800">{{ group.label }}</h2>
          <span class="text-xs text-gray-500">
            {{ group.kumiais.reduce((sum, k) => sum + k.members.length, 0) }}名
          </span>
        </div>
        <Icon
          name="heroicons:chevron-down"
          class="h-5 w-5 text-gray-400 transition-transform"
          :class="expandedGroups.includes(group.id) ? 'rotate-180' : ''"
        />
      </button>

      <div v-if="expandedGroups.includes(group.id)">
        <div v-for="kumiai in group.kumiais" :key="kumiai.name">
          <div class="px-5 py-2 bg-gray-50 border-y border-gray-100">
            <p class="text-xs font-semibold text-gray-500">{{ kumiai.name }}</p>
          </div>
          <div class="divide-y divide-gray-50">
            <div
              v-for="m in kumiai.members"
              :key="m.uid"
              class="flex items-center justify-between px-5 py-3"
            >
              <div class="flex items-center gap-3">
                <div class="flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold" :class="group.bgColor" style="color: inherit">
                  {{ m.name.charAt(0) }}
                </div>
                <div>
                  <p class="text-sm font-medium text-gray-900">{{ m.name }}</p>
                  <p class="text-xs text-gray-400">{{ m.position }}</p>
                </div>
              </div>
              <div class="flex gap-4 text-center text-sm">
                <div>
                  <p class="font-semibold text-green-700">{{ m.contracts }}</p>
                  <p class="text-xs text-gray-400">成約</p>
                </div>
                <div>
                  <p class="font-semibold text-blue-700">{{ m.newClients }}</p>
                  <p class="text-xs text-gray-400">新規</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>
