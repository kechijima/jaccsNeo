<script setup lang="ts">
import type { AppUser } from '~/types/user'
import { useDirectorIndex } from '~/composables/useDirectorIndex'
import { DIRECTOR_ROLE_LABELS } from '~/types/directorIndex'

definePageMeta({ middleware: ['auth'] })

const { fetchUsers } = useUsers()
const { user } = useCurrentUser()
const viewMode = ref<'list' | 'lookup'>('list')

// 一般ロールは「チーム」メニュー自体を表示していない
// （/teamの個人ダッシュボードはまだダミーの実績値のため）。
// パンくずリストから遷移できてしまわないよう、一般ロールではリンクにしない
const canViewTeamDashboard = computed(() => user.value?.role !== 'general')

// ── ディレクター逆引き検索（添付Excelの検索インデックスを取り込んだデータ） ──
const {
  directorNames, loading: lookupLoading, fetchAll: fetchDirectorIndex, searchByDirector,
} = useDirectorIndex()
const lookupQuery = ref('')
const lookupOptions = computed(() => directorNames.value.map(n => ({ id: n, label: n })))
const lookupResults = computed(() => searchByDirector(lookupQuery.value))

// Color palette cycled per unique groupId
const GROUP_COLORS: { color: string; bgColor: string }[] = [
  { color: 'bg-indigo-500', bgColor: 'bg-indigo-50' },
  { color: 'bg-sky-500', bgColor: 'bg-sky-50' },
  { color: 'bg-amber-500', bgColor: 'bg-amber-50' },
  { color: 'bg-emerald-500', bgColor: 'bg-emerald-50' },
  { color: 'bg-rose-500', bgColor: 'bg-rose-50' },
]

interface MemberRow {
  uid: string
  name: string
  position: string
  contracts: number
  newClients: number
}

interface KumaiRow {
  name: string
  members: MemberRow[]
}

interface GroupRow {
  id: string
  label: string
  color: string
  bgColor: string
  kumiais: KumaiRow[]
}

const groups = ref<GroupRow[]>([])
const loading = ref(false)
const error = ref('')

const searchQuery = ref('')
const expandedGroups = ref<string[]>([])

const toggleGroup = (id: string) => {
  if (expandedGroups.value.includes(id)) {
    expandedGroups.value = expandedGroups.value.filter(g => g !== id)
  }
  else {
    expandedGroups.value.push(id)
  }
}

onMounted(async () => {
  fetchDirectorIndex()

  loading.value = true
  error.value = ''
  try {
    // 脱退済みの組合員はメンバー一覧に表示しない
    const users: AppUser[] = (await fetchUsers()).filter(u => !u.isWithdrawn)

    // Group users by groupId; users without a groupId go into a fallback group
    const groupMap = new Map<string, AppUser[]>()
    for (const u of users) {
      const key = u.groupId ?? '__ungrouped__'
      if (!groupMap.has(key)) groupMap.set(key, [])
      groupMap.get(key)!.push(u)
    }

    let colorIndex = 0
    const built: GroupRow[] = []
    for (const [groupId, members] of groupMap.entries()) {
      const palette = GROUP_COLORS[colorIndex % GROUP_COLORS.length]
      colorIndex++

      // Each groupId forms one kumiai; the kumiai name is the groupId itself
      const kumiai: KumaiRow = {
        name: groupId === '__ungrouped__' ? '未所属' : groupId,
        members: members.map((u) => ({
          uid: u.uid,
          name: u.displayName,
          position: u.role,
          // Phase 5 — aggregate contract/newClient stats from meetings
          contracts: 0,
          newClients: 0,
        })),
      }

      built.push({
        id: groupId,
        label: groupId === '__ungrouped__' ? '未所属' : groupId,
        color: palette.color,
        bgColor: palette.bgColor,
        kumiais: [kumiai],
      })
    }

    groups.value = built

    // Auto-expand the first group
    if (built.length > 0) {
      expandedGroups.value = [built[0].id]
    }
  }
  catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'メンバーの読み込みに失敗しました'
  }
  finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="p-4 md:p-6 max-w-5xl mx-auto space-y-5">

    <div class="flex items-center gap-2 text-sm text-gray-400">
      <NuxtLink v-if="canViewTeamDashboard" to="/team">チーム</NuxtLink>
      <span v-else>チーム</span>
      <Icon name="heroicons:chevron-right" class="h-3 w-3" />
      <span class="text-gray-600">メンバー一覧</span>
    </div>

    <div class="flex items-center justify-between gap-3 flex-wrap">
      <h1 class="text-xl font-bold text-gray-900">メンバー一覧</h1>
      <div class="flex rounded-lg border border-gray-200 overflow-hidden text-sm shrink-0">
        <button
          type="button"
          class="px-4 py-1.5 font-medium transition flex items-center gap-1.5"
          :class="viewMode === 'list' ? 'bg-primary-600 text-white' : 'text-gray-500 hover:bg-gray-50'"
          @click="viewMode = 'list'"
        >
          <Icon name="heroicons:bars-3" class="h-3.5 w-3.5" />一覧
        </button>
        <button
          type="button"
          class="px-4 py-1.5 font-medium transition flex items-center gap-1.5"
          :class="viewMode === 'lookup' ? 'bg-primary-600 text-white' : 'text-gray-500 hover:bg-gray-50'"
          @click="viewMode = 'lookup'"
        >
          <Icon name="heroicons:magnifying-glass" class="h-3.5 w-3.5" />ディレクター逆引き
        </button>
      </div>
    </div>

    <!-- ディレクター逆引き検索 -->
    <div v-if="viewMode === 'lookup'" class="space-y-4">
      <div class="card p-4">
        <label class="block text-sm font-medium text-gray-700 mb-1.5">ディレクター名で検索</label>
        <SearchableSelect
          v-model="lookupQuery"
          :items="lookupOptions"
          placeholder="ディレクターを選択..."
          search-placeholder="ディレクター名で検索..."
        />
        <p class="mt-1.5 text-xs text-gray-400">組合員一覧（{{ directorNames.length }}名のディレクター）から、担当している組合・役割・メンバーを逆引きできます</p>
      </div>

      <div v-if="lookupLoading" class="card p-12 text-center">
        <Icon name="heroicons:arrow-path" class="h-8 w-8 text-gray-300 mx-auto mb-2 animate-spin" />
        <p class="text-sm text-gray-400">読み込み中...</p>
      </div>

      <div v-else-if="!lookupQuery" class="card p-12 text-center">
        <Icon name="heroicons:magnifying-glass" class="h-10 w-10 text-gray-200 mx-auto mb-2" />
        <p class="text-sm text-gray-400">ディレクターを選択すると担当組合・メンバーが表示されます</p>
      </div>

      <div v-else-if="lookupResults.length === 0" class="card p-12 text-center">
        <Icon name="heroicons:exclamation-circle" class="h-10 w-10 text-gray-200 mx-auto mb-2" />
        <p class="text-sm text-gray-400">該当するデータが見つかりませんでした</p>
      </div>

      <div v-else class="card overflow-hidden">
        <div class="divide-y divide-gray-50">
          <div v-for="r in lookupResults" :key="r.id" class="px-5 py-4">
            <div class="flex items-center gap-2 flex-wrap mb-1.5">
              <span class="font-semibold text-gray-900 text-sm">{{ r.kumiaiName }}</span>
              <span
                class="badge text-xs"
                :class="r.role === 'main' ? 'bg-primary-100 text-primary-700' : 'bg-amber-100 text-amber-700'"
              >{{ DIRECTOR_ROLE_LABELS[r.role] }}</span>
              <span class="text-xs text-gray-400">{{ r.memberNames.length }}名</span>
            </div>
            <p class="text-sm text-gray-600">{{ r.memberNames.join('、') }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 一覧 -->
    <template v-if="viewMode === 'list'">
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
            <NuxtLink
              v-for="m in kumiai.members"
              :key="m.uid"
              :to="`/team/${m.uid}`"
              class="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
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
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>
    </template>

  </div>
</template>
