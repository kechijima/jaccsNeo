<script setup lang="ts">
import type { AppUser } from '~/types/user'

definePageMeta({ middleware: ['auth'] })

const route = useRoute()
const spaceId = computed(() => route.params.spaceId as string)

const { fetchSpace, addMember, removeMember, toggleAdmin } = useSpaces()
const { fetchUsers } = useUsers()

const loading = ref(false)
const error = ref('')
const spaceName = ref('')
let adminUids: string[] = []

type MemberView = { uid: string; name: string; role: 'admin' | 'member'; position: string; kumiaiName: string; joinedAt: string }
const members = ref<MemberView[]>([])

const loadData = async () => {
  loading.value = true
  error.value = ''
  try {
    const [space, allUsers] = await Promise.all([fetchSpace(spaceId.value), fetchUsers()])
    if (!space) return
    spaceName.value = space.name
    adminUids = space.adminUids ?? []
    members.value = allUsers
      .filter(u => space.memberUids.includes(u.uid))
      .map(u => ({
        uid:        u.uid,
        name:       u.displayName,
        role:       adminUids.includes(u.uid) ? 'admin' : 'member',
        position:   u.position ?? '',
        kumiaiName: u.kumiaiId ?? '',
        joinedAt:   '',
      }))
  } catch (e: any) {
    error.value = e.message ?? 'データの取得に失敗しました'
  } finally {
    loading.value = false
  }
}

onMounted(loadData)

const searchQuery = ref('')
const filteredMembers = computed(() => {
  if (!searchQuery.value) return members.value
  return members.value.filter(m => m.name.includes(searchQuery.value))
})

const handleRemove = async (uid: string) => {
  if (!confirm('このメンバーをスペースから削除しますか？')) return
  try {
    await removeMember(spaceId.value, uid)
    members.value = members.value.filter(m => m.uid !== uid)
  } catch (e: any) {
    error.value = e.message ?? '削除に失敗しました'
  }
}

const handleToggleAdmin = async (uid: string, currentRole: string) => {
  const makeAdmin = currentRole !== 'admin'
  try {
    await toggleAdmin(spaceId.value, uid, makeAdmin)
    const m = members.value.find(m => m.uid === uid)
    if (m) m.role = makeAdmin ? 'admin' : 'member'
  } catch (e: any) {
    error.value = e.message ?? '更新に失敗しました'
  }
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
