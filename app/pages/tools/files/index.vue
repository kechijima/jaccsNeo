<script setup lang="ts">
import { useManagedFiles } from '~/composables/useManagedFiles'
import { useUsers } from '~/composables/useUsers'
import { useVisibilityScope } from '~/composables/useVisibilityScope'
import type { ManagedFile } from '~/types/tools'
import type { AppUser } from '~/types/user'
import { TITLE_OPTIONS } from '~/types/user'

definePageMeta({ middleware: ['auth'] })

const { fetchFiles, uploadManagedFile, updateManagedFile, deleteManagedFile } = useManagedFiles()
const { fetchUsers } = useUsers()
const { groups, specialTeams, ensureLoaded: ensureScopeOptionsLoaded, groupLabel } = useVisibilityScope()
const { isSystemAdmin } = usePermission()
const { user: currentUser } = useCurrentUser()

const loading = ref(true)
const loadError = ref('')
const files = ref<ManagedFile[]>([])

const load = async () => {
  loading.value = true
  try {
    files.value = await fetchFiles()
  } catch (e: any) {
    loadError.value = e.message ?? 'ファイルの取得に失敗しました'
  } finally {
    loading.value = false
  }
}
onMounted(() => {
  load()
  // 管理者は一覧にも公開範囲のラベルを表示するため、フォームを開く前から読み込んでおく
  if (isSystemAdmin.value) ensureScopeOptionsLoaded()
})

// ── ファイルの登録・編集（管理者のみ。編集では公開範囲等の「権限」設定も変更できる） ──
const allUsers = ref<AppUser[]>([])
const showForm = ref(false)
const editingId = ref('')
const formTitle = ref('')
const formFile = ref<File | null>(null)
const formCreatorUid = ref('')
const formVisibleGroupIds = ref<string[]>([])
const formMinTitleLevel = ref('')
const uploading = ref(false)
const uploadError = ref('')

const ensureUsersLoaded = async () => {
  if (allUsers.value.length === 0) {
    allUsers.value = await fetchUsers().catch(() => [])
  }
}

const openForm = async () => {
  await Promise.all([ensureUsersLoaded(), ensureScopeOptionsLoaded()])
  editingId.value = ''
  formTitle.value = ''
  formFile.value = null
  formCreatorUid.value = currentUser.value?.uid ?? ''
  formVisibleGroupIds.value = []
  formMinTitleLevel.value = ''
  uploadError.value = ''
  showForm.value = true
}

const openEditForm = async (f: ManagedFile) => {
  await Promise.all([ensureUsersLoaded(), ensureScopeOptionsLoaded()])
  editingId.value = f.id
  formTitle.value = f.title
  formFile.value = null
  formCreatorUid.value = f.uploadedByUid
  formVisibleGroupIds.value = [...(f.visibleGroupIds ?? [])]
  formMinTitleLevel.value = f.minTitleLevel ?? ''
  uploadError.value = ''
  showForm.value = true
}

const toggleVisibleGroup = (id: string) => {
  formVisibleGroupIds.value = formVisibleGroupIds.value.includes(id)
    ? formVisibleGroupIds.value.filter(g => g !== id)
    : [...formVisibleGroupIds.value, id]
}

const handleFileChange = (e: Event) => {
  const input = e.target as HTMLInputElement
  formFile.value = input.files?.[0] ?? null
}

const submitFile = async () => {
  const creator = allUsers.value.find(u => u.uid === formCreatorUid.value)
  if (!formTitle.value.trim() || !creator || uploading.value) return
  if (!editingId.value && !formFile.value) return
  uploading.value = true
  uploadError.value = ''
  try {
    const form = {
      title: formTitle.value.trim(),
      creatorUid: creator.uid,
      creatorName: creator.displayName,
      visibleGroupIds: formVisibleGroupIds.value,
      minTitleLevel: formMinTitleLevel.value || undefined,
    }
    if (editingId.value) {
      await updateManagedFile(editingId.value, form)
    } else {
      await uploadManagedFile(formFile.value as File, form)
    }
    showForm.value = false
    await load()
  } catch (err: any) {
    uploadError.value = err.message ?? '保存に失敗しました'
  } finally {
    uploading.value = false
  }
}

const removeFile = async (id: string) => {
  if (!confirm('このファイルを一覧から削除しますか？')) return
  await deleteManagedFile(id)
  files.value = files.value.filter(f => f.id !== id)
}

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`
}

const fmt = (ts: any) => ts?.toDate?.().toLocaleDateString('ja-JP', { year: 'numeric', month: 'numeric', day: 'numeric' }) ?? ''
</script>

<template>
  <div class="p-4 md:p-6 max-w-4xl mx-auto space-y-5">

    <div class="flex items-center gap-2 text-sm text-gray-400">
      <NuxtLink to="/tools">業務ツールアプリ</NuxtLink>
      <Icon name="heroicons:chevron-right" class="h-3 w-3" />
      <span class="text-gray-600">ファイル管理</span>
    </div>

    <div class="flex items-start justify-between gap-3">
      <div>
        <h1 class="text-xl font-bold text-gray-900">ファイル管理</h1>
      </div>
      <button v-if="isSystemAdmin && !showForm" type="button" class="btn-primary text-sm" @click="openForm">
        <Icon name="heroicons:arrow-up-tray" class="h-4 w-4" />
        ファイルを登録する
      </button>
    </div>

    <!-- 新規登録フォーム -->
    <div v-if="showForm" class="card p-5 space-y-3">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">タイトル</label>
        <input v-model="formTitle" type="text" class="input-field" placeholder="タイトルを入力" />
      </div>
      <div v-if="!editingId">
        <label class="block text-sm font-medium text-gray-700 mb-1">ファイル</label>
        <input type="file" class="input-field" @change="handleFileChange" />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">作成者</label>
        <SearchableUserSelect v-model="formCreatorUid" :users="allUsers" placeholder="作成者を選択" />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">公開範囲（グループ・専門チーム）</label>
        <p class="text-xs text-gray-400 mb-2">未選択の場合は全員に公開されます</p>
        <div class="flex flex-wrap gap-2">
          <label
            v-for="g in groups"
            :key="g.id"
            class="flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-sm cursor-pointer transition"
            :class="formVisibleGroupIds.includes(g.id) ? 'border-primary-300 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'"
          >
            <input type="checkbox" class="hidden" :checked="formVisibleGroupIds.includes(g.id)" @change="toggleVisibleGroup(g.id)" />
            {{ g.name }}
          </label>
          <label
            v-for="t in specialTeams"
            :key="t.id"
            class="flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-sm cursor-pointer transition"
            :class="formVisibleGroupIds.includes(`team:${t.id}`) ? 'border-primary-300 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'"
          >
            <input type="checkbox" class="hidden" :checked="formVisibleGroupIds.includes(`team:${t.id}`)" @change="toggleVisibleGroup(`team:${t.id}`)" />
            {{ t.name }}
          </label>
        </div>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">閲覧に必要な最低タイトル（任意）</label>
        <select v-model="formMinTitleLevel" class="input-field">
          <option value="">制限なし</option>
          <option v-for="t in TITLE_OPTIONS" :key="t" :value="t">{{ t }}以上</option>
        </select>
      </div>
      <div v-if="uploadError" class="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
        <Icon name="heroicons:exclamation-circle" class="mt-0.5 h-4 w-4 shrink-0" />
        {{ uploadError }}
      </div>
      <div class="flex justify-end gap-2">
        <button type="button" class="btn-secondary text-sm" @click="showForm = false">キャンセル</button>
        <button
          type="button"
          class="btn-primary text-sm"
          :disabled="!formTitle.trim() || (!editingId && !formFile) || !formCreatorUid || uploading"
          @click="submitFile"
        >
          <Icon v-if="uploading" name="heroicons:arrow-path" class="h-3.5 w-3.5 animate-spin mr-1" />
          {{ editingId ? '更新する' : '登録する' }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="card p-12 text-center">
      <Icon name="heroicons:arrow-path" class="h-8 w-8 text-gray-300 mx-auto mb-2 animate-spin" />
      <p class="text-sm text-gray-400">読み込み中...</p>
    </div>

    <div v-else-if="loadError" class="card p-12 text-center">
      <p class="text-sm text-red-500">{{ loadError }}</p>
    </div>

    <div v-else-if="files.length === 0" class="card p-12 text-center">
      <Icon name="heroicons:folder" class="h-10 w-10 text-gray-200 mx-auto mb-2" />
      <p class="text-sm text-gray-400">ファイルはまだありません</p>
    </div>

    <div v-else class="card overflow-hidden">
      <div class="divide-y divide-gray-50">
        <div v-for="f in files" :key="f.id" class="flex items-center gap-3 p-4">
          <Icon name="heroicons:document" class="h-6 w-6 text-gray-400 shrink-0" />
          <div class="flex-1 min-w-0">
            <a :href="f.url" target="_blank" rel="noopener" class="text-sm font-medium text-primary-600 hover:underline truncate block">
              {{ f.title }}
            </a>
            <p class="text-xs text-gray-400 mt-0.5">
              {{ f.name }} ・ {{ formatSize(f.size) }} ・ {{ f.uploadedByName }} ・ {{ fmt(f.createdAt) }}
            </p>
            <p v-if="isSystemAdmin && ((f.visibleGroupIds?.length ?? 0) > 0 || f.minTitleLevel)" class="text-xs text-gray-400 mt-0.5">
              公開範囲:
              <span v-if="(f.visibleGroupIds?.length ?? 0) > 0">{{ f.visibleGroupIds!.map(groupLabel).join('・') }}</span>
              <span v-else>全体</span>
              <span v-if="f.minTitleLevel">（{{ f.minTitleLevel }}以上）</span>
            </p>
          </div>
          <a :href="f.url" target="_blank" rel="noopener" class="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition shrink-0">
            <Icon name="heroicons:arrow-down-tray" class="h-4 w-4" />
          </a>
          <template v-if="isSystemAdmin">
            <button type="button" class="rounded-lg p-1.5 text-gray-300 hover:bg-gray-100 hover:text-primary-600 transition shrink-0" @click="openEditForm(f)">
              <Icon name="heroicons:pencil-square" class="h-4 w-4" />
            </button>
            <button type="button" class="rounded-lg p-1.5 text-gray-300 hover:bg-gray-100 hover:text-red-500 transition shrink-0" @click="removeFile(f.id)">
              <Icon name="heroicons:trash" class="h-4 w-4" />
            </button>
          </template>
        </div>
      </div>
    </div>

  </div>
</template>
