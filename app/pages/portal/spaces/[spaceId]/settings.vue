<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

const route = useRoute()
const spaceId = computed(() => route.params.spaceId as string)

const { fetchSpace, updateSpace, archiveSpace } = useSpaces()

const loading = ref(false)
const error = ref('')
const saving = ref(false)

const form = ref({
  name: '',
  description: '',
  type: 'kumiai',
  isArchived: false,
})

onMounted(async () => {
  loading.value = true
  try {
    const space = await fetchSpace(spaceId.value)
    if (space) {
      form.value = {
        name:        space.name,
        description: space.description ?? '',
        type:        space.type,
        isArchived:  space.isArchived,
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
  try {
    await updateSpace(spaceId.value, {
      name:        form.value.name,
      description: form.value.description || undefined,
      type:        form.value.type as any,
    })
  } catch (e: any) {
    error.value = e.message ?? '保存に失敗しました'
  } finally {
    saving.value = false
  }
}

const handleArchive = async () => {
  if (!confirm('このスペースをアーカイブしますか？')) return
  try {
    await archiveSpace(spaceId.value, true)
    await navigateTo('/portal/spaces')
  } catch (e: any) {
    error.value = e.message ?? 'アーカイブに失敗しました'
  }
}
</script>

<template>
  <div class="p-4 md:p-6 max-w-2xl mx-auto space-y-5">

    <!-- パンくず -->
    <div class="flex items-center gap-2 text-sm text-gray-400">
      <NuxtLink to="/portal">ポータル</NuxtLink>
      <Icon name="heroicons:chevron-right" class="h-3 w-3" />
      <NuxtLink :to="`/portal/spaces/${spaceId}`">{{ form.name }}</NuxtLink>
      <Icon name="heroicons:chevron-right" class="h-3 w-3" />
      <span class="text-gray-600">設定</span>
    </div>

    <h1 class="text-xl font-bold text-gray-900">スペース設定</h1>

    <!-- 基本設定 -->
    <form class="card p-6 space-y-5" @submit.prevent="handleSave">
      <h2 class="font-semibold text-gray-900">基本情報</h2>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1.5">スペース名 <span class="text-red-500">*</span></label>
        <input v-model="form.name" type="text" class="input-field" required />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1.5">説明</label>
        <textarea v-model="form.description" rows="3" class="input-field" />
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

      <div class="flex justify-end">
        <button type="submit" class="btn-primary" :disabled="saving">
          <Icon v-if="saving" name="heroicons:arrow-path" class="h-4 w-4 animate-spin mr-1" />
          {{ saving ? '保存中...' : '変更を保存する' }}
        </button>
      </div>
    </form>

    <!-- 危険な操作 -->
    <div class="card p-5 border border-red-200">
      <h2 class="font-semibold text-red-700 mb-3 flex items-center gap-2">
        <Icon name="heroicons:exclamation-triangle" class="h-5 w-5" />
        危険な操作
      </h2>
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-gray-800">スペースをアーカイブ</p>
          <p class="text-xs text-gray-500 mt-0.5">アーカイブ後は新しい投稿ができなくなります</p>
        </div>
        <button class="btn-danger text-sm" @click="handleArchive">アーカイブ</button>
      </div>
    </div>

  </div>
</template>
