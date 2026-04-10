<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

const route = useRoute()
const spaceId = computed(() => route.params.spaceId as string)

const spaceName = ref('りらくす組合')

// ダミーデータ（Phase4でFirestoreから取得）
const members = ref([
  { uid: 'u001', name: '西島 伸樹', role: 'admin', position: 'PM', kumiaiName: 'りらくす組合', joinedAt: '2024/01/01' },
  { uid: 'u002', name: '池田 健太郎', role: 'member', position: '一般FP', kumiaiName: 'りらくす組合', joinedAt: '2024/01/01' },
  { uid: 'u003', name: '田中 洋子', role: 'member', position: '一般FP', kumiaiName: 'りらくす組合', joinedAt: '2024/01/15' },
  { uid: 'u004', name: '山田 健太', role: 'member', position: '一般FP', kumiaiName: 'りらくす組合', joinedAt: '2024/02/01' },
  { uid: 'u005', name: '鈴木 真理子', role: 'member', position: '一般FP', kumiaiName: 'りらくす組合', joinedAt: '2024/02/15' },
])

const searchQuery = ref('')
const filteredMembers = computed(() => {
  if (!searchQuery.value) return members.value
  return members.value.filter(m => m.name.includes(searchQuery.value))
})

const handleRemove = (uid: string) => {
  if (!confirm('このメンバーをスペースから削除しますか？')) return
  members.value = members.value.filter(m => m.uid !== uid)
}
</script>

<template>
  <div class="p-4 md:p-6 max-w-3xl mx-auto space-y-5">

    <!-- パンくず -->
    <div class="flex items-center gap-2 text-sm text-gray-400">
      <NuxtLink to="/portal">ポータル</NuxtLink>
      <Icon name="heroicons:chevron-right" class="h-3 w-3" />
      <NuxtLink :to="`/portal/spaces/${spaceId}`">{{ spaceName }}</NuxtLink>
      <Icon name="heroicons:chevron-right" class="h-3 w-3" />
      <span class="text-gray-600">メンバー管理</span>
    </div>

    <div class="flex items-start justify-between gap-3">
      <div>
        <h1 class="text-xl font-bold text-gray-900">メンバー管理</h1>
        <p class="text-sm text-gray-500 mt-0.5">{{ spaceName }} · {{ members.length }}名</p>
      </div>
      <button class="btn-primary text-sm flex items-center gap-1.5">
        <Icon name="heroicons:user-plus" class="h-4 w-4" />
        メンバー追加
      </button>
    </div>

    <!-- 検索 -->
    <div class="relative">
      <Icon name="heroicons:magnifying-glass" class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
      <input v-model="searchQuery" type="search" placeholder="名前で検索..." class="input-field pl-9" />
    </div>

    <!-- メンバーリスト -->
    <div class="card overflow-hidden">
      <div class="divide-y divide-gray-50">
        <div
          v-for="m in filteredMembers"
          :key="m.uid"
          class="flex items-center justify-between px-5 py-4"
        >
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-semibold text-sm">
              {{ m.name.charAt(0) }}
            </div>
            <div>
              <div class="flex items-center gap-2">
                <p class="text-sm font-semibold text-gray-900">{{ m.name }}</p>
                <span v-if="m.role === 'admin'" class="badge bg-primary-100 text-primary-700 text-xs">管理者</span>
              </div>
              <p class="text-xs text-gray-400">{{ m.position }} · {{ m.kumiaiName }} · 参加: {{ m.joinedAt }}</p>
            </div>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <button
              v-if="m.role !== 'admin'"
              class="text-xs text-primary-600 hover:underline"
              @click="() => {}"
            >
              管理者に設定
            </button>
            <button
              class="text-xs text-red-500 hover:text-red-700"
              @click="handleRemove(m.uid)"
            >
              削除
            </button>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>
