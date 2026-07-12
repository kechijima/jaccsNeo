<script setup lang="ts">
import type { SpaceForm } from '~/types/portal'
import type { AppUser } from '~/types/user'
import { useSpaces, resolveSpaceMembers } from '~/composables/useSpaces'
import { useUsers } from '~/composables/useUsers'
import { useStorage } from '~/composables/useStorage'
import { useGroupLabels } from '~/composables/useGroupLabels'
import type { AudienceSelection } from '~/components/UserGroupPicker.vue'

definePageMeta({ middleware: ['auth'] })

const route = useRoute()
const spaceId = computed(() => route.params.spaceId as string)
const { fetchSpace, updateSpace, fetchPost, createPost, updatePost, pinPost } = useSpaces()
const { fetchUsers } = useUsers()
const { uploadFile } = useStorage()
const { getGroupLabel, ensureLoaded: ensureGroupLabelsLoaded } = useGroupLabels()

const loading = ref(true)
const error = ref('')
const saving = ref(false)
const saved = ref(false)

const form = ref({
  name:        '',
  description: '',
  type:        'kumiai',
  headerImage: '',
})

const audience = ref<AudienceSelection>({ uids: [], groupIds: [], roles: [] })
const allUsers = ref<AppUser[]>([])
const showPicker = ref(false)

const ROLE_LABELS: Record<string, string> = {
  system_admin: 'システム管理者',
  board:        '理事会',
  em2_above:    'EM2以上',
  general:      '一般',
}
const audienceChips = computed(() => [
  ...audience.value.roles.map(r => ({ key: `role:${r}`, label: ROLE_LABELS[r] ?? r, remove: () => { audience.value.roles = audience.value.roles.filter(v => v !== r) } })),
  ...audience.value.groupIds.map(g => ({ key: `group:${g}`, label: `${getGroupLabel(g)}グループ`, remove: () => { audience.value.groupIds = audience.value.groupIds.filter(v => v !== g) } })),
  ...audience.value.uids.map(uid => ({ key: `uid:${uid}`, label: allUsers.value.find(u => u.uid === uid)?.displayName ?? uid, remove: () => { audience.value.uids = audience.value.uids.filter(v => v !== uid) } })),
])

const resolvedMemberCount = computed(() => resolveSpaceMembers({
  memberUids:     audience.value.uids,
  targetGroupIds: audience.value.groupIds,
  targetRoles:    audience.value.roles,
} as any, allUsers.value).length)

// ── 画像アップロード（ヘッダー画像 = アイコン画像として使用） ──────────
const imageInputRef = ref<HTMLInputElement>()
const uploadingImage = ref(false)
const imageError = ref('')

const handleImageSelect = async (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  uploadingImage.value = true
  imageError.value = ''
  try {
    const path = `spaces/${spaceId.value}/${Date.now()}-${file.name}`
    form.value.headerImage = await uploadFile(path, file)
  } catch (e: any) {
    imageError.value = e.message ?? '画像のアップロードに失敗しました'
  } finally {
    uploadingImage.value = false
    if (imageInputRef.value) imageInputRef.value.value = ''
  }
}
const removeImage = () => { form.value.headerImage = '' }

// ── サムネイル（ピン留め投稿） ──────────────────────────────────────────
const pinnedPostId = ref('')
const thumbnailContent = ref('')
const thumbnailSaving = ref(false)
const thumbnailSaved = ref(false)
const thumbnailError = ref('')

const handleSaveThumbnail = async () => {
  if (!thumbnailContent.value.trim()) return
  thumbnailSaving.value = true
  thumbnailError.value = ''
  try {
    if (pinnedPostId.value) {
      await updatePost(spaceId.value, pinnedPostId.value, thumbnailContent.value)
    } else {
      const newId = await createPost(spaceId.value, { content: thumbnailContent.value })
      await pinPost(spaceId.value, newId)
      pinnedPostId.value = newId
    }
    thumbnailSaved.value = true
    setTimeout(() => { thumbnailSaved.value = false }, 3000)
  } catch (e: any) {
    thumbnailError.value = e.message ?? 'サムネイルの保存に失敗しました'
  } finally {
    thumbnailSaving.value = false
  }
}

onMounted(async () => {
  try {
    const [s, users] = await Promise.all([fetchSpace(spaceId.value), fetchUsers().catch(() => []), ensureGroupLabelsLoaded()])
    allUsers.value = users
    if (s) {
      form.value = {
        name:        s.name,
        description: s.description ?? '',
        type:        s.type,
        headerImage: s.headerImage ?? '',
      }
      audience.value = {
        uids:     s.memberUids ?? [],
        groupIds: s.targetGroupIds ?? [],
        roles:    s.targetRoles ?? [],
      }
      if (s.pinnedPostId) {
        pinnedPostId.value = s.pinnedPostId
        const post = await fetchPost(spaceId.value, s.pinnedPostId)
        if (post) thumbnailContent.value = post.content
      }
    }
  } catch (e: any) {
    error.value = e.message ?? 'スペース情報の取得に失敗しました'
  } finally {
    loading.value = false
  }
})

const handleSave = async () => {
  saving.value = true
  error.value = ''
  saved.value = false
  try {
    await updateSpace(spaceId.value, {
      name:           form.value.name,
      description:    form.value.description,
      type:           form.value.type as SpaceForm['type'],
      headerImage:    form.value.headerImage,
      memberUids:     audience.value.uids,
      targetGroupIds: audience.value.groupIds,
      targetRoles:    audience.value.roles,
    })
    saved.value = true
    setTimeout(() => { saved.value = false }, 3000)
  } catch (e: any) {
    error.value = e.message ?? '保存に失敗しました'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="p-4 md:p-6 max-w-2xl mx-auto space-y-5">

    <!-- パンくず -->
    <div class="flex items-center gap-2 text-sm text-gray-400">
      <NuxtLink to="/portal">掲示板</NuxtLink>
      <Icon name="heroicons:chevron-right" class="h-3 w-3" />
      <NuxtLink :to="`/portal/spaces/${spaceId}`">{{ form.name }}</NuxtLink>
      <Icon name="heroicons:chevron-right" class="h-3 w-3" />
      <span class="text-gray-600">設定</span>
    </div>

    <h1 class="text-xl font-bold text-gray-900">スペース管理</h1>

    <!-- 保存完了メッセージ -->
    <div v-if="saved" class="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700">
      <Icon name="heroicons:check-circle" class="h-4 w-4 shrink-0" />
      設定を保存しました
    </div>
    <div v-if="error" class="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
      <Icon name="heroicons:exclamation-circle" class="h-4 w-4 shrink-0" />
      {{ error }}
    </div>

    <!-- 読み込み中 -->
    <div v-if="loading" class="card p-12 text-center">
      <Icon name="heroicons:arrow-path" class="h-8 w-8 text-gray-300 mx-auto mb-2 animate-spin" />
      <p class="text-sm text-gray-400">読み込み中...</p>
    </div>

    <template v-else>
      <!-- 基本設定 -->
      <form class="card p-6 space-y-5" @submit.prevent="handleSave">
        <h2 class="font-semibold text-gray-900">基本情報</h2>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">スペース名 <span class="text-red-500">*</span></label>
          <input v-model="form.name" type="text" class="input-field" required />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">説明</label>
          <RichTextEditor v-model="form.description" placeholder="スペースの説明を入力してください（画像・リンクも配置できます）" class="min-h-[120px]" />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">スペース種別</label>
          <select v-model="form.type" class="input-field">
            <option value="all">全体スペース</option>
            <option value="group">グループスペース</option>
            <option value="board">理事会スペース</option>
            <option value="kumiai">組合スペース</option>
            <option value="meeting">数字会議スペース</option>
            <option value="specialist">専門チームスペース</option>
            <option value="position">役職スペース</option>
          </select>
        </div>

        <!-- ヘッダー画像（アイコン画像を兼ねる） -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">ヘッダー画像</label>
          <p class="text-xs text-gray-400 mb-2">スペースページ上部のカバー画像として表示され、一覧でのアイコン画像としても使用されます</p>
          <div v-if="form.headerImage" class="relative w-full h-28 rounded-lg overflow-hidden border border-gray-200">
            <img :src="form.headerImage" alt="ヘッダープレビュー" class="w-full h-full object-cover" />
            <button
              type="button"
              class="absolute top-1.5 right-1.5 rounded-full bg-black/50 p-1 text-white hover:bg-black/70 transition"
              @click="removeImage"
            >
              <Icon name="heroicons:x-mark" class="h-4 w-4" />
            </button>
          </div>
          <div v-else-if="uploadingImage" class="flex items-center justify-center rounded-lg border-2 border-dashed border-primary-200 bg-primary-50 p-6 text-sm text-primary-500">
            <Icon name="heroicons:arrow-path" class="h-4 w-4 animate-spin mr-1.5" />
            アップロード中...
          </div>
          <div v-else class="flex items-center justify-center rounded-lg border-2 border-dashed border-gray-200 p-6 text-sm text-gray-400 hover:border-primary-300 transition">
            <label class="cursor-pointer flex flex-col items-center gap-1 w-full">
              <Icon name="heroicons:photo" class="h-6 w-6" />
              画像を選択
              <input ref="imageInputRef" type="file" accept="image/*" class="hidden" @change="handleImageSelect" />
            </label>
          </div>
          <p v-if="imageError" class="text-xs text-red-500 mt-1">{{ imageError }}</p>
        </div>

        <div class="flex justify-end">
          <button type="submit" class="btn-primary" :disabled="saving">
            <Icon v-if="saving" name="heroicons:arrow-path" class="h-4 w-4 animate-spin mr-1" />
            {{ saving ? '保存中...' : '変更を保存する' }}
          </button>
        </div>
      </form>

      <!-- メンバー管理 -->
      <div class="card p-6 space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="font-semibold text-gray-900">メンバー管理</h2>
            <p class="text-xs text-gray-400 mt-0.5">
              権限やグループ、個別ユーザーで対象者を指定します（現在 {{ resolvedMemberCount }}名が対象）。
              メンバー自身によるフォロー解除はできません。
            </p>
          </div>
          <button type="button" class="btn-secondary text-sm flex items-center gap-1.5 shrink-0" @click="showPicker = true">
            <Icon name="heroicons:user-plus" class="h-4 w-4" />
            追加
          </button>
        </div>

        <div v-if="audienceChips.length === 0" class="text-sm text-gray-300 py-4 text-center border border-dashed border-gray-200 rounded-lg">
          対象者が設定されていません
        </div>
        <div v-else class="flex flex-wrap gap-1.5">
          <span
            v-for="chip in audienceChips"
            :key="chip.key"
            class="inline-flex items-center gap-1 rounded-full bg-primary-50 text-primary-700 text-xs font-medium px-2.5 py-1"
          >
            {{ chip.label }}
            <button type="button" class="hover:text-primary-900" @click="chip.remove">
              <Icon name="heroicons:x-mark" class="h-3 w-3" />
            </button>
          </span>
        </div>

        <div class="flex justify-end">
          <button type="button" class="btn-primary" :disabled="saving" @click="handleSave">
            <Icon v-if="saving" name="heroicons:arrow-path" class="h-4 w-4 animate-spin mr-1" />
            メンバー設定を保存する
          </button>
        </div>
      </div>

      <!-- サムネイル（ピン留め投稿） -->
      <div class="card p-6 space-y-4">
        <div>
          <h2 class="font-semibold text-gray-900">サムネイル（ピン留め投稿）</h2>
          <p class="text-xs text-gray-400 mt-0.5">スペースの先頭に固定表示される投稿です。画像やリンクも配置できます。</p>
        </div>

        <div v-if="thumbnailSaved" class="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700">
          <Icon name="heroicons:check-circle" class="h-4 w-4 shrink-0" />
          サムネイルを保存しました
        </div>
        <div v-if="thumbnailError" class="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          <Icon name="heroicons:exclamation-circle" class="h-4 w-4 shrink-0" />
          {{ thumbnailError }}
        </div>

        <RichTextEditor v-model="thumbnailContent" placeholder="ピン留めする内容を入力してください..." class="min-h-[140px]" />

        <div class="flex justify-end">
          <button
            type="button"
            class="btn-primary"
            :disabled="!thumbnailContent.trim() || thumbnailSaving"
            @click="handleSaveThumbnail"
          >
            <Icon v-if="thumbnailSaving" name="heroicons:arrow-path" class="h-4 w-4 animate-spin mr-1" />
            サムネイルを保存する
          </button>
        </div>
      </div>
    </template>

    <UserGroupPicker v-model:open="showPicker" v-model="audience" />

  </div>
</template>
