<script setup lang="ts">
import type { AppUser } from '~/types/user'

definePageMeta({ middleware: ['auth', 'admin'] })

const { fetchUsers } = useUsers()

const loading = ref(false)
const error = ref('')
const users = ref<AppUser[]>([])

onMounted(async () => {
  loading.value = true
  try {
    users.value = await fetchUsers()
  } catch (e: any) {
    error.value = e.message ?? 'ユーザー一覧の取得に失敗しました'
  } finally {
    loading.value = false
  }
})

const roleLabels: Record<string, string> = {
  system_admin: 'システム管理者',
  board:        '理事会メンバー',
  em2_above:    'EM2以上',
  general:      '一般',
}

const roleColors: Record<string, string> = {
  system_admin: 'bg-red-100 text-red-700',
  board:        'bg-purple-100 text-purple-700',
  em2_above:    'bg-indigo-100 text-indigo-700',
  general:      'bg-gray-100 text-gray-600',
}

const groupLabel: Record<string, string> = { reterace: 'Reterace', miraito: 'Miraito', asset: 'Asset' }

const searchQuery = ref('')
const filteredUsers = computed(() => {
  if (!searchQuery.value) return users.value
  return users.value.filter(u =>
    u.displayName.includes(searchQuery.value) || u.email.includes(searchQuery.value),
  )
})
</script>

<template>
  <div class="p-4 md:p-6 max-w-5xl mx-auto space-y-5">

    <div class="flex items-center gap-2 text-sm text-gray-400">
      <NuxtLink to="/admin">管理者設定</NuxtLink>
      <Icon name="heroicons:chevron-right" class="h-3 w-3" />
      <span class="text-gray-600">ユーザー管理</span>
    </div>

    <div class="flex items-start justify-between gap-3">
      <div>
        <h1 class="text-xl font-bold text-gray-900">ユーザー管理</h1>
        <p class="text-sm text-gray-500 mt-0.5">{{ users.length }}名のユーザー</p>
      </div>
      <NuxtLink to="/admin/users/new" class="btn-primary text-sm flex items-center gap-1.5">
        <Icon name="heroicons:user-plus" class="h-4 w-4" />
        ユーザー追加
      </NuxtLink>
    </div>

    <!-- 検索 -->
    <div class="relative">
      <Icon name="heroicons:magnifying-glass" class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
      <input v-model="searchQuery" type="search" placeholder="名前・メールで検索..." class="input-field pl-9" />
    </div>

    <!-- PC テーブル -->
    <div class="hidden md:block card overflow-hidden">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-gray-100 bg-gray-50">
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">名前</th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">メールアドレス</th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">ロール</th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">グループ / 組合</th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">役職</th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">状態</th>
            <th class="px-4 py-3" />
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50">
          <tr v-for="u in filteredUsers" :key="u.uid" class="hover:bg-gray-50">
            <td class="px-4 py-3 font-medium text-gray-900">{{ u.displayName }}</td>
            <td class="px-4 py-3 text-gray-500 text-xs">{{ u.email }}</td>
            <td class="px-4 py-3">
              <span class="badge text-xs" :class="roleColors[u.role]">{{ roleLabels[u.role] }}</span>
            </td>
            <td class="px-4 py-3 text-gray-600 text-xs">
              {{ groupLabel[u.groupId] || '—' }}
              <span v-if="u.kumiaiName" class="text-gray-400"> / {{ u.kumiaiName }}</span>
            </td>
            <td class="px-4 py-3 text-gray-600 text-xs">{{ u.position || '—' }}</td>
            <td class="px-4 py-3">
              <span class="badge text-xs" :class="u.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'">
                {{ u.isActive ? '有効' : '無効' }}
              </span>
            </td>
            <td class="px-4 py-3">
              <NuxtLink :to="`/admin/users/${u.uid}/edit`" class="text-xs text-primary-600 hover:underline">編集</NuxtLink>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- SP カードリスト -->
    <div class="md:hidden space-y-2">
      <div v-for="u in filteredUsers" :key="u.uid" class="card p-4">
        <div class="flex items-center justify-between gap-2">
          <div>
            <p class="font-semibold text-gray-900">{{ u.displayName }}</p>
            <p class="text-xs text-gray-400 mt-0.5">{{ u.email }}</p>
          </div>
          <span class="badge text-xs" :class="roleColors[u.role]">{{ roleLabels[u.role] }}</span>
        </div>
        <div class="mt-2 flex items-center justify-between text-xs text-gray-400">
          <span>{{ groupLabel[u.groupId] || '' }}{{ u.kumiaiName ? ' / ' + u.kumiaiName : '' }}</span>
          <NuxtLink :to="`/admin/users/${u.uid}/edit`" class="text-primary-600">編集</NuxtLink>
        </div>
      </div>
    </div>

  </div>
</template>
