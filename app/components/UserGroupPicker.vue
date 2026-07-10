<script setup lang="ts">
import { useUsers } from '~/composables/useUsers'
import type { AppUser, GroupId, UserRole } from '~/types/user'

export interface AudienceSelection {
  uids: string[]
  groupIds: GroupId[]
  roles: UserRole[]
}

const props = defineProps<{
  open: boolean
  modelValue: AudienceSelection
}>()

const emit = defineEmits<{
  'update:open': [boolean]
  'update:modelValue': [AudienceSelection]
}>()

const { fetchUsers } = useUsers()

const ROLE_LABELS: Record<UserRole, string> = {
  system_admin: 'システム管理者',
  board:        '理事会',
  em2_above:    'EM2以上',
  general:      '一般',
}
const GROUP_LABELS: Record<GroupId, string> = {
  reterace: 'Reteraceグループ',
  miraito:  'Miraitoグループ',
  asset:    'Assetグループ',
}

type GroupOption = { key: string; label: string; kind: 'role' | 'group'; value: UserRole | GroupId }
const GROUP_OPTIONS: GroupOption[] = [
  ...(Object.keys(ROLE_LABELS) as UserRole[]).map(v => ({ key: `role:${v}`, label: ROLE_LABELS[v], kind: 'role' as const, value: v })),
  ...(Object.keys(GROUP_LABELS) as GroupId[]).map(v => ({ key: `group:${v}`, label: GROUP_LABELS[v], kind: 'group' as const, value: v })),
]

const activeTab = ref<'org' | 'group'>('org')
const searchQuery = ref('')
const users = ref<AppUser[]>([])
const loadingUsers = ref(false)

// ステージング用のローカル選択状態（「追加」を押すまで確定しない）
const staged = ref<AudienceSelection>({ uids: [], groupIds: [], roles: [] })

watch(() => props.open, async (isOpen) => {
  if (!isOpen) return
  staged.value = {
    uids:     [...props.modelValue.uids],
    groupIds: [...props.modelValue.groupIds],
    roles:    [...props.modelValue.roles],
  }
  activeTab.value = 'org'
  searchQuery.value = ''
  if (users.value.length === 0) {
    loadingUsers.value = true
    try {
      users.value = await fetchUsers()
    } finally {
      loadingUsers.value = false
    }
  }
})

const filteredUsers = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return users.value
  return users.value.filter(u => u.displayName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
})

const isUserChecked = (uid: string) => staged.value.uids.includes(uid)
const toggleUser = (uid: string) => {
  staged.value.uids = isUserChecked(uid)
    ? staged.value.uids.filter(id => id !== uid)
    : [...staged.value.uids, uid]
}

const isGroupOptionChecked = (opt: GroupOption) =>
  opt.kind === 'role' ? staged.value.roles.includes(opt.value as UserRole) : staged.value.groupIds.includes(opt.value as GroupId)

const toggleGroupOption = (opt: GroupOption) => {
  if (opt.kind === 'role') {
    staged.value.roles = isGroupOptionChecked(opt)
      ? staged.value.roles.filter(v => v !== opt.value)
      : [...staged.value.roles, opt.value as UserRole]
  } else {
    staged.value.groupIds = isGroupOptionChecked(opt)
      ? staged.value.groupIds.filter(v => v !== opt.value)
      : [...staged.value.groupIds, opt.value as GroupId]
  }
}

const allSelectedInTab = computed(() => {
  if (activeTab.value === 'org') {
    return filteredUsers.value.length > 0 && filteredUsers.value.every(u => isUserChecked(u.uid))
  }
  return GROUP_OPTIONS.every(o => isGroupOptionChecked(o))
})

const toggleSelectAll = () => {
  if (activeTab.value === 'org') {
    if (allSelectedInTab.value) {
      const ids = new Set(filteredUsers.value.map(u => u.uid))
      staged.value.uids = staged.value.uids.filter(id => !ids.has(id))
    } else {
      const merged = new Set([...staged.value.uids, ...filteredUsers.value.map(u => u.uid)])
      staged.value.uids = [...merged]
    }
  } else {
    if (allSelectedInTab.value) {
      staged.value.roles = []
      staged.value.groupIds = []
    } else {
      staged.value.roles = GROUP_OPTIONS.filter(o => o.kind === 'role').map(o => o.value as UserRole)
      staged.value.groupIds = GROUP_OPTIONS.filter(o => o.kind === 'group').map(o => o.value as GroupId)
    }
  }
}

// 右側パネルに表示する選択済みチップ一覧（ユーザー・グループ/権限をまとめて表示）
const stagedChips = computed(() => {
  const userChips = staged.value.uids.map(uid => ({
    key:   `uid:${uid}`,
    label: users.value.find(u => u.uid === uid)?.displayName ?? uid,
    remove: () => toggleUser(uid),
  }))
  const groupChips = GROUP_OPTIONS
    .filter(o => isGroupOptionChecked(o))
    .map(o => ({ key: o.key, label: o.label, remove: () => toggleGroupOption(o) }))
  return [...groupChips, ...userChips]
})

const close = () => emit('update:open', false)
const confirm = () => {
  emit('update:modelValue', { ...staged.value })
  close()
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 p-0 md:p-4"
      @click.self="close"
    >
      <div class="bg-white w-full md:max-w-2xl md:rounded-2xl rounded-t-2xl shadow-xl flex flex-col max-h-[85vh]">

        <!-- ヘッダー -->
        <div class="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 class="font-bold text-gray-900">ユーザーを選択</h3>
          <div class="flex items-center gap-4">
            <div class="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
              <button
                type="button"
                class="px-4 py-1.5 font-medium transition"
                :class="activeTab === 'org' ? 'bg-primary-600 text-white' : 'text-gray-500 hover:bg-gray-50'"
                @click="activeTab = 'org'"
              >組織</button>
              <button
                type="button"
                class="px-4 py-1.5 font-medium transition"
                :class="activeTab === 'group' ? 'bg-primary-600 text-white' : 'text-gray-500 hover:bg-gray-50'"
                @click="activeTab = 'group'"
              >グループ</button>
            </div>
            <button type="button" class="p-1.5 rounded-lg hover:bg-gray-100 transition" @click="close">
              <Icon name="heroicons:x-mark" class="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </div>

        <!-- 本体：左リスト + 右選択済み -->
        <div class="flex-1 min-h-0 grid grid-cols-1 sm:grid-cols-2">
          <!-- 左：選択肢リスト -->
          <div class="border-b sm:border-b-0 sm:border-r border-gray-100 flex flex-col min-h-0">
            <div class="flex items-center justify-between px-4 py-2.5 border-b border-gray-50">
              <input
                v-if="activeTab === 'org'"
                v-model="searchQuery"
                type="search"
                placeholder="名前・メールで検索..."
                class="input-field text-sm py-1.5 flex-1 mr-3"
              />
              <span v-else class="text-xs text-gray-400">権限・グループから選択</span>
              <label class="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer shrink-0">
                <input type="checkbox" :checked="allSelectedInTab" class="h-3.5 w-3.5 rounded text-primary-600" @change="toggleSelectAll" />
                すべて選択
              </label>
            </div>

            <div class="flex-1 overflow-y-auto">
              <template v-if="activeTab === 'org'">
                <div v-if="loadingUsers" class="p-6 text-center text-sm text-gray-400">読み込み中...</div>
                <button
                  v-for="u in filteredUsers"
                  :key="u.uid"
                  type="button"
                  class="w-full flex items-center gap-2.5 px-4 py-2.5 text-left hover:bg-gray-50 transition"
                  @click="toggleUser(u.uid)"
                >
                  <input type="checkbox" :checked="isUserChecked(u.uid)" class="h-4 w-4 rounded text-primary-600 pointer-events-none" />
                  <div class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700 text-[10px] font-semibold">
                    {{ u.displayName.charAt(0) }}
                  </div>
                  <span class="text-sm text-gray-700 truncate">{{ u.displayName }}</span>
                </button>
                <div v-if="!loadingUsers && filteredUsers.length === 0" class="p-6 text-center text-sm text-gray-400">
                  該当するユーザーがいません
                </div>
              </template>
              <template v-else>
                <button
                  v-for="opt in GROUP_OPTIONS"
                  :key="opt.key"
                  type="button"
                  class="w-full flex items-center gap-2.5 px-4 py-2.5 text-left hover:bg-gray-50 transition"
                  @click="toggleGroupOption(opt)"
                >
                  <input type="checkbox" :checked="isGroupOptionChecked(opt)" class="h-4 w-4 rounded text-primary-600 pointer-events-none" />
                  <span class="text-sm text-gray-700">{{ opt.label }}</span>
                </button>
              </template>
            </div>
          </div>

          <!-- 右：選択済み -->
          <div class="flex flex-col min-h-0">
            <div class="px-4 py-2.5 border-b border-gray-50 text-xs text-gray-400">
              選択中（{{ stagedChips.length }}）
            </div>
            <div class="flex-1 overflow-y-auto p-3">
              <div v-if="stagedChips.length === 0" class="text-sm text-gray-300 text-center py-8">
                まだ選択されていません
              </div>
              <div v-else class="flex flex-wrap gap-1.5 content-start">
                <span
                  v-for="chip in stagedChips"
                  :key="chip.key"
                  class="inline-flex items-center gap-1 rounded-full bg-primary-50 text-primary-700 text-xs font-medium px-2.5 py-1"
                >
                  {{ chip.label }}
                  <button type="button" class="hover:text-primary-900" @click="chip.remove">
                    <Icon name="heroicons:x-mark" class="h-3 w-3" />
                  </button>
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- フッター -->
        <div class="flex justify-end gap-3 px-5 py-4 border-t border-gray-100">
          <button type="button" class="btn-secondary" @click="close">キャンセル</button>
          <button type="button" class="btn-primary" @click="confirm">追加</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
