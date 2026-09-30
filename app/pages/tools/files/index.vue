<script setup lang="ts">
import { useManagedFiles } from '~/composables/useManagedFiles'
import type { ManagedFile } from '~/types/tools'

definePageMeta({ middleware: ['auth'] })

const { fetchFiles, uploadManagedFile, deleteManagedFile } = useManagedFiles()
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
onMounted(load)

const fileInput = ref<HTMLInputElement | null>(null)
const uploading = ref(false)
const uploadError = ref('')

const triggerUpload = () => fileInput.value?.click()

const handleFileChange = async (e: Event) => {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  uploading.value = true
  uploadError.value = ''
  try {
    await uploadManagedFile(file)
    await load()
  } catch (err: any) {
    uploadError.value = err.message ?? 'アップロードに失敗しました'
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
      <template v-if="isSystemAdmin">
        <input ref="fileInput" type="file" class="hidden" @change="handleFileChange" />
        <button type="button" class="btn-primary text-sm" :disabled="uploading" @click="triggerUpload">
          <Icon v-if="uploading" name="heroicons:arrow-path" class="h-4 w-4 animate-spin" />
          <Icon v-else name="heroicons:arrow-up-tray" class="h-4 w-4" />
          ファイルをアップロード
        </button>
      </template>
    </div>

    <div v-if="uploadError" class="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
      <Icon name="heroicons:exclamation-circle" class="mt-0.5 h-4 w-4 shrink-0" />
      {{ uploadError }}
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
              {{ f.name }}
            </a>
            <p class="text-xs text-gray-400 mt-0.5">
              {{ formatSize(f.size) }} ・ {{ f.uploadedByName }} ・ {{ fmt(f.createdAt) }}
            </p>
          </div>
          <a :href="f.url" target="_blank" rel="noopener" class="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition shrink-0">
            <Icon name="heroicons:arrow-down-tray" class="h-4 w-4" />
          </a>
          <button
            v-if="isSystemAdmin || f.uploadedByUid === currentUser?.uid"
            type="button"
            class="rounded-lg p-1.5 text-gray-300 hover:bg-gray-100 hover:text-red-500 transition shrink-0"
            @click="removeFile(f.id)"
          >
            <Icon name="heroicons:trash" class="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>

  </div>
</template>
