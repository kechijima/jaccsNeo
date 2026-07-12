<script setup lang="ts">
import { useGroups } from '~/composables/useGroups'
import type { Group, Kumiai } from '~/types/group'
import type { GroupId } from '~/types/user'

definePageMeta({ middleware: ['auth', 'admin'] })

const { fetchGroups, updateGroup, createKumiai, updateKumiai, deleteKumiai: removeKumiai } = useGroups()

const groups = ref<Group[]>([])
const loading = ref(true)
const loadError = ref('')

const loadGroups = async () => {
  loading.value = true
  loadError.value = ''
  try {
    groups.value = await fetchGroups()
  } catch (e: any) {
    loadError.value = e.message ?? 'グループ情報の取得に失敗しました'
  } finally {
    loading.value = false
  }
}

onMounted(loadGroups)

const colorMap: Record<string, string> = {
  reterace: 'bg-indigo-500',
  miraito:  'bg-sky-500',
  asset:    'bg-amber-500',
}
const getColor = (id: string) => colorMap[id] ?? 'bg-gray-500'

// ── グループ編集モーダル ───────────────────────────────────────────────
const editGroupTarget = ref<Group | null>(null)
const editGroupForm   = ref({ name: '', memberCount: 0 })
const editGroupSaving = ref(false)

const openEditGroup = (g: Group) => {
  editGroupTarget.value = g
  editGroupForm.value = { name: g.name, memberCount: g.memberCount }
}

const submitEditGroup = async () => {
  if (!editGroupTarget.value || !editGroupForm.value.name.trim()) return
  editGroupSaving.value = true
  try {
    await updateGroup(editGroupTarget.value.id, {
      name: editGroupForm.value.name.trim(),
      memberCount: editGroupForm.value.memberCount,
    })
    editGroupTarget.value.name = editGroupForm.value.name.trim()
    editGroupTarget.value.memberCount = editGroupForm.value.memberCount
    editGroupTarget.value = null
  } finally {
    editGroupSaving.value = false
  }
}

// ── 組合追加モーダル ──────────────────────────────────────────────────
const addKumiaiGroup = ref<Group | null>(null)
const newKumiai      = ref({ name: '', adminName: '', memberCount: 0 })
const addKumiaiError = ref('')
const addKumiaiSaving = ref(false)

const openAddKumiai = (g: Group) => {
  addKumiaiGroup.value = g
  newKumiai.value = { name: '', adminName: '', memberCount: 0 }
  addKumiaiError.value = ''
}

const submitAddKumiai = async () => {
  if (!newKumiai.value.name.trim()) { addKumiaiError.value = '組合名を入力してください'; return }
  if (!addKumiaiGroup.value) return
  addKumiaiSaving.value = true
  try {
    const id = await createKumiai(addKumiaiGroup.value.id as GroupId, {
      name: newKumiai.value.name.trim(),
      adminName: newKumiai.value.adminName.trim(),
      memberCount: newKumiai.value.memberCount,
    }, addKumiaiGroup.value.kumiai.length)
    addKumiaiGroup.value.kumiai.push({
      id,
      groupId: addKumiaiGroup.value.id as GroupId,
      name: newKumiai.value.name.trim(),
      adminName: newKumiai.value.adminName.trim(),
      memberCount: newKumiai.value.memberCount,
      displayOrder: addKumiaiGroup.value.kumiai.length,
    } as Kumiai)
    addKumiaiGroup.value = null
  } catch (e: any) {
    addKumiaiError.value = e.message ?? '追加に失敗しました'
  } finally {
    addKumiaiSaving.value = false
  }
}

// ── 組合編集モーダル ──────────────────────────────────────────────────
const editKumiaiGroup  = ref<Group | null>(null)
const editKumiaiTarget = ref<Kumiai | null>(null)
const editKumiaiForm   = ref({ name: '', adminName: '', memberCount: 0 })
const editKumiaiSaving = ref(false)

const openEditKumiai = (g: Group, k: Kumiai) => {
  editKumiaiGroup.value  = g
  editKumiaiTarget.value = k
  editKumiaiForm.value   = { name: k.name, adminName: k.adminName ?? '', memberCount: k.memberCount }
}

const submitEditKumiai = async () => {
  if (!editKumiaiTarget.value || !editGroupTargetGroupId() || !editKumiaiForm.value.name.trim()) return
  editKumiaiSaving.value = true
  try {
    await updateKumiai(editGroupTargetGroupId()!, editKumiaiTarget.value.id, {
      name: editKumiaiForm.value.name.trim(),
      adminName: editKumiaiForm.value.adminName.trim(),
      memberCount: editKumiaiForm.value.memberCount,
    })
    editKumiaiTarget.value.name        = editKumiaiForm.value.name.trim()
    editKumiaiTarget.value.adminName   = editKumiaiForm.value.adminName.trim()
    editKumiaiTarget.value.memberCount = editKumiaiForm.value.memberCount
    editKumiaiTarget.value = null
    editKumiaiGroup.value  = null
  } finally {
    editKumiaiSaving.value = false
  }
}

const editGroupTargetGroupId = () => editKumiaiGroup.value?.id as GroupId | undefined

// ── 組合削除 ──────────────────────────────────────────────────────────
const deleteKumiai = async (g: Group, kumiaiId: string) => {
  if (!confirm(`「${g.kumiai.find(k => k.id === kumiaiId)?.name}」を削除してよろしいですか？`)) return
  await removeKumiai(g.id as GroupId, kumiaiId)
  g.kumiai = g.kumiai.filter(k => k.id !== kumiaiId)
}
</script>

<template>
  <div class="p-4 md:p-6 max-w-4xl mx-auto space-y-5">

    <!-- パンくず -->
    <div class="flex items-center gap-2 text-sm text-gray-400">
      <NuxtLink to="/admin">管理者設定</NuxtLink>
      <Icon name="heroicons:chevron-right" class="h-3 w-3" />
      <span class="text-gray-600">グループ・組合マスタ</span>
    </div>

    <!-- ヘッダー -->
    <div class="flex items-start justify-between gap-3">
      <div>
        <h1 class="text-xl font-bold text-gray-900">グループ・組合マスタ</h1>
        <p class="text-sm text-gray-500 mt-0.5">Reterace / Miraito / Asset の3グループと、各グループの組合を管理します</p>
      </div>
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

    <!-- グループ別 -->
    <template v-else>
    <div v-for="group in groups" :key="group.id" class="card overflow-hidden">
      <div class="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div class="flex items-center gap-3">
          <div class="h-4 w-4 rounded-full" :class="getColor(group.id)" />
          <h2 class="font-semibold text-gray-900">{{ group.name }}</h2>
          <span class="text-xs text-gray-400">{{ group.memberCount }}名</span>
        </div>
        <div class="flex items-center gap-3">
          <button
            class="text-xs text-primary-600 hover:underline flex items-center gap-0.5"
            @click="openAddKumiai(group)"
          >
            <Icon name="heroicons:plus" class="h-3 w-3" />組合を追加
          </button>
          <button
            class="text-xs text-gray-500 hover:text-primary-600 flex items-center gap-0.5"
            @click="openEditGroup(group)"
          >
            <Icon name="heroicons:pencil-square" class="h-3 w-3" />グループ編集
          </button>
        </div>
      </div>

      <div class="divide-y divide-gray-50">
        <div v-if="group.kumiai.length === 0" class="px-5 py-4 text-sm text-gray-400">
          組合がまだ登録されていません
        </div>
        <div
          v-for="k in group.kumiai"
          :key="k.id"
          class="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition"
        >
          <div>
            <p class="text-sm font-medium text-gray-900">{{ k.name }}</p>
            <p class="text-xs text-gray-400 mt-0.5">
              <span v-if="k.adminName">管理者: {{ k.adminName }} · </span>
              {{ k.memberCount }}名
            </p>
          </div>
          <div class="flex items-center gap-3">
            <button class="text-xs text-primary-600 hover:underline" @click="openEditKumiai(group, k)">編集</button>
            <button class="text-xs text-red-400 hover:text-red-600 hover:underline" @click="deleteKumiai(group, k.id)">削除</button>
          </div>
        </div>
      </div>
    </div>
    </template>

    <!-- 専門チーム -->
    <div class="card overflow-hidden">
      <div class="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50">
        <h2 class="font-semibold text-gray-900">専門チーム（グループ横断）</h2>
        <button class="text-xs text-primary-600 hover:underline flex items-center gap-0.5">
          <Icon name="heroicons:plus" class="h-3 w-3" />チームを追加
        </button>
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

    <!-- ──────── モーダル群 ──────── -->
    <Teleport to="body">

      <!-- グループ編集 -->
      <div
        v-if="editGroupTarget"
        class="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40"
        @click.self="editGroupTarget = null"
      >
        <div class="bg-white w-full md:max-w-md rounded-t-2xl md:rounded-2xl p-6 space-y-4 shadow-xl max-h-[85vh] overflow-y-auto">
          <div class="flex items-center justify-between">
            <h3 class="font-bold text-gray-900">グループ編集</h3>
            <button class="p-1.5 hover:bg-gray-100 rounded-lg" @click="editGroupTarget = null">
              <Icon name="heroicons:x-mark" class="h-5 w-5 text-gray-500" />
            </button>
          </div>
          <div class="space-y-3">
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">グループ名</label>
              <input v-model="editGroupForm.name" type="text" class="input-field" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">メンバー数</label>
              <input v-model.number="editGroupForm.memberCount" type="number" min="0" class="input-field" />
            </div>
          </div>
          <div class="flex gap-3 pt-2">
            <button class="flex-1 btn-secondary" @click="editGroupTarget = null">キャンセル</button>
            <button class="flex-1 btn-primary" :disabled="editGroupSaving" @click="submitEditGroup">
              <Icon v-if="editGroupSaving" name="heroicons:arrow-path" class="h-4 w-4 animate-spin mr-1" />
              保存する
            </button>
          </div>
        </div>
      </div>

      <!-- 組合追加 -->
      <div
        v-if="addKumiaiGroup"
        class="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40"
        @click.self="addKumiaiGroup = null"
      >
        <div class="bg-white w-full md:max-w-md rounded-t-2xl md:rounded-2xl p-6 space-y-4 shadow-xl max-h-[85vh] overflow-y-auto">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="font-bold text-gray-900">組合を追加</h3>
              <p class="text-xs text-gray-400 mt-0.5">{{ addKumiaiGroup.name }}</p>
            </div>
            <button class="p-1.5 hover:bg-gray-100 rounded-lg" @click="addKumiaiGroup = null">
              <Icon name="heroicons:x-mark" class="h-5 w-5 text-gray-500" />
            </button>
          </div>
          <div class="space-y-3">
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">組合名 <span class="text-red-500">*</span></label>
              <input v-model="newKumiai.name" type="text" placeholder="例: ○○組合" class="input-field" />
              <p v-if="addKumiaiError" class="mt-1 text-xs text-red-500">{{ addKumiaiError }}</p>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">管理者名</label>
              <input v-model="newKumiai.adminName" type="text" placeholder="例: 山田 一郎" class="input-field" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">メンバー数</label>
              <input v-model.number="newKumiai.memberCount" type="number" min="0" class="input-field" />
            </div>
          </div>
          <div class="flex gap-3 pt-2">
            <button class="flex-1 btn-secondary" @click="addKumiaiGroup = null">キャンセル</button>
            <button class="flex-1 btn-primary" :disabled="addKumiaiSaving" @click="submitAddKumiai">
              <Icon v-if="addKumiaiSaving" name="heroicons:arrow-path" class="h-4 w-4 animate-spin mr-1" />
              追加する
            </button>
          </div>
        </div>
      </div>

      <!-- 組合編集 -->
      <div
        v-if="editKumiaiTarget"
        class="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40"
        @click.self="editKumiaiTarget = null; editKumiaiGroup = null"
      >
        <div class="bg-white w-full md:max-w-md rounded-t-2xl md:rounded-2xl p-6 space-y-4 shadow-xl max-h-[85vh] overflow-y-auto">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="font-bold text-gray-900">組合を編集</h3>
              <p class="text-xs text-gray-400 mt-0.5">{{ editKumiaiGroup?.name }}</p>
            </div>
            <button class="p-1.5 hover:bg-gray-100 rounded-lg" @click="editKumiaiTarget = null; editKumiaiGroup = null">
              <Icon name="heroicons:x-mark" class="h-5 w-5 text-gray-500" />
            </button>
          </div>
          <div class="space-y-3">
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">組合名</label>
              <input v-model="editKumiaiForm.name" type="text" class="input-field" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">管理者名</label>
              <input v-model="editKumiaiForm.adminName" type="text" class="input-field" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">メンバー数</label>
              <input v-model.number="editKumiaiForm.memberCount" type="number" min="0" class="input-field" />
            </div>
          </div>
          <div class="flex gap-3 pt-2">
            <button class="flex-1 btn-secondary" @click="editKumiaiTarget = null; editKumiaiGroup = null">キャンセル</button>
            <button class="flex-1 btn-primary" :disabled="editKumiaiSaving" @click="submitEditKumiai">
              <Icon v-if="editKumiaiSaving" name="heroicons:arrow-path" class="h-4 w-4 animate-spin mr-1" />
              保存する
            </button>
          </div>
        </div>
      </div>

    </Teleport>
  </div>
</template>
