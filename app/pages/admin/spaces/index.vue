<script setup lang="ts">
import type { Space } from '~/types/portal'
import { useSpaces } from '~/composables/useSpaces'
import { useGroups } from '~/composables/useGroups'

definePageMeta({ middleware: ['auth', 'admin'] })

const { fetchAllSpaces, createSpace, archiveSpace } = useSpaces()
const { fetchGroups } = useGroups()

const typeLabelMap: Record<string, string> = {
  report:  '報告・連絡',
  board:   '理事会',
  kumiai:  '組合',
  event:   'イベント',
  group:   'グループ',
  meeting: '数字会議',
  other:   'その他',
}

const typeColors: Record<string, string> = {
  report:  'bg-green-100 text-green-700',
  board:   'bg-purple-100 text-purple-700',
  kumiai:  'bg-sky-100 text-sky-700',
  event:   'bg-amber-100 text-amber-700',
  group:   'bg-indigo-100 text-indigo-700',
  meeting: 'bg-rose-100 text-rose-700',
  other:   'bg-gray-100 text-gray-500',
}

const allSpaces = ref<Space[]>([])
const loading = ref(true)
const loadError = ref('')

onMounted(async () => {
  try {
    allSpaces.value = await fetchAllSpaces()
  } catch (e: any) {
    loadError.value = e.message ?? 'スペース一覧の取得に失敗しました'
  } finally {
    loading.value = false
  }
})

// ── フィルター ────────────────────────────────────────────────────────
const showArchived  = ref(false)
const filterType    = ref('')
const searchQuery   = ref('')

const TYPES = Object.keys(typeLabelMap)

const spaces = computed(() => {
  let list = allSpaces.value

  if (!showArchived.value) list = list.filter(s => !s.isArchived)

  if (filterType.value) list = list.filter(s => s.type === filterType.value)

  const q = searchQuery.value.trim()
  if (q) list = list.filter(s => s.name?.includes(q) || s.description?.includes(q))

  return list
})

const activeCount    = computed(() => allSpaces.value.filter(s => !s.isArchived).length)
const archivedCount  = computed(() => allSpaces.value.filter(s => s.isArchived).length)

// ── アーカイブ切り替え ────────────────────────────────────────────────
const togglingId = ref<string | null>(null)
const toggleArchive = async (id: string) => {
  const s = allSpaces.value.find(sp => sp.id === id)
  if (!s) return
  togglingId.value = id
  try {
    await archiveSpace(id, !s.isArchived)
    s.isArchived = !s.isArchived
  } finally {
    togglingId.value = null
  }
}

// ── 固定スペース（掲示板サイドバーの「参加スペース」に表示する7つ）の一括確認・作成 ──
// 掲示板（portal/index.vue）のFIXED_SIDEBAR_SPACE_NAMESと同じ名前で一致させて
// 表示する仕組みのため、ここで作る名前はそちらと必ず揃える。既に存在する名前は
// 何度実行してもスキップされ、上書きされない（安全に再実行できる）
const FIXED_REPORT_SPACES: { name: string; type: 'board'; groupName?: string }[] = [
  { name: 'Reteraceグループ理事会報告', type: 'board', groupName: 'Reterace' },
  { name: 'Miraitoグループ理事会報告',  type: 'board', groupName: 'Miraito' },
  { name: 'Assetグループ理事会報告',    type: 'board', groupName: 'Asset' },
  { name: '中央理事会報告',             type: 'board' },
]
const creatingFixedSpaces = ref(false)
const fixedSpacesResult = ref<{ created: string[]; skipped: string[] } | null>(null)
const fixedSpacesError = ref('')

const ensureFixedReportSpaces = async () => {
  creatingFixedSpaces.value = true
  fixedSpacesError.value = ''
  fixedSpacesResult.value = null
  try {
    const groups = await fetchGroups()
    const existingNames = new Set(allSpaces.value.map(s => s.name))
    const created: string[] = []
    const skipped: string[] = []
    for (const target of FIXED_REPORT_SPACES) {
      if (existingNames.has(target.name)) {
        skipped.push(target.name)
        continue
      }
      const groupId = target.groupName ? groups.find(g => g.name === target.groupName)?.id : undefined
      await createSpace({ name: target.name, type: target.type, groupId })
      created.push(target.name)
    }
    fixedSpacesResult.value = { created, skipped }
    if (created.length > 0) allSpaces.value = await fetchAllSpaces()
  } catch (e: any) {
    fixedSpacesError.value = e.message ?? '固定スペースの作成に失敗しました'
  } finally {
    creatingFixedSpaces.value = false
  }
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

    <!-- 固定スペース（掲示板サイドバーの「参加スペース」）一括確認・作成 -->
    <div class="card p-4 space-y-2.5">
      <div class="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p class="text-sm font-semibold text-gray-900">活動報告・理事会報告の固定スペース</p>
          <p class="text-xs text-gray-400 mt-0.5">
            掲示板サイドバーの「参加スペース」に表示される7つ（各グループの活動報告・理事会報告＋中央理事会報告）が
            揃っているか確認し、不足分のみ作成します。既にあるスペースは上書きされないため、何度でも安全に実行できます。
          </p>
        </div>
        <button type="button" class="btn-secondary text-sm shrink-0" :disabled="creatingFixedSpaces" @click="ensureFixedReportSpaces">
          <Icon v-if="creatingFixedSpaces" name="heroicons:arrow-path" class="h-4 w-4 animate-spin mr-1" />
          {{ creatingFixedSpaces ? '確認中...' : '確認・作成する' }}
        </button>
      </div>
      <p v-if="fixedSpacesError" class="text-xs text-red-500">{{ fixedSpacesError }}</p>
      <div v-if="fixedSpacesResult" class="text-xs text-gray-600 space-y-0.5">
        <p v-if="fixedSpacesResult.created.length > 0" class="text-green-700">作成しました: {{ fixedSpacesResult.created.join('、') }}</p>
        <p v-if="fixedSpacesResult.skipped.length > 0" class="text-gray-400">既に存在していたためスキップ: {{ fixedSpacesResult.skipped.join('、') }}</p>
      </div>
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

    <!-- 読み込み中 -->
    <div v-if="loading" class="card p-12 text-center">
      <Icon name="heroicons:arrow-path" class="h-8 w-8 text-gray-300 mx-auto mb-2 animate-spin" />
      <p class="text-sm text-gray-400">読み込み中...</p>
    </div>

    <!-- エラー -->
    <div v-else-if="loadError" class="card p-12 text-center">
      <Icon name="heroicons:exclamation-circle" class="h-8 w-8 text-red-300 mx-auto mb-2" />
      <p class="text-sm text-red-500">{{ loadError }}</p>
    </div>

    <!-- テーブル -->
    <div v-else class="card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-100 bg-gray-50">
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">スペース名</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">種別</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">説明</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">状態</th>
              <th class="px-4 py-3" />
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            <tr v-if="spaces.length === 0">
              <td colspan="5" class="py-12 text-center text-gray-400">
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
              <td class="px-4 py-3 whitespace-nowrap">
                <div class="font-medium text-gray-900 flex items-center gap-1.5">
                  <img v-if="space.headerImage" :src="space.headerImage" alt="" class="h-6 w-6 rounded object-cover shrink-0" />
                  <Icon v-if="space.isPinned" name="heroicons:bookmark-solid" class="h-3.5 w-3.5 text-primary-400 shrink-0" />
                  {{ space.name }}
                </div>
              </td>
              <td class="px-4 py-3 whitespace-nowrap">
                <span class="badge text-xs" :class="typeColors[space.type] ?? 'bg-gray-100 text-gray-500'">
                  {{ typeLabelMap[space.type] ?? space.type }}
                </span>
              </td>
              <td class="px-4 py-3 text-gray-500 text-xs max-w-[220px] truncate">{{ space.description || '—' }}</td>
              <td class="px-4 py-3 whitespace-nowrap">
                <span class="badge text-xs" :class="space.isArchived ? 'bg-gray-100 text-gray-500' : 'bg-green-100 text-green-700'">
                  {{ space.isArchived ? 'アーカイブ' : 'アクティブ' }}
                </span>
              </td>
              <td class="px-4 py-3 text-right whitespace-nowrap">
                <div class="flex items-center justify-end gap-3">
                  <NuxtLink :to="`/portal/spaces/${space.id}/settings`" class="text-xs text-primary-600 hover:underline">設定</NuxtLink>
                  <button
                    class="text-xs hover:underline disabled:opacity-40"
                    :disabled="togglingId === space.id"
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

  </div>
</template>
