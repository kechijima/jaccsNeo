<script setup lang="ts">
definePageMeta({ middleware: ['auth', 'admin'] })

const form = ref({
  title: '',
  category: 'JACCS',
  content: '',
  files: [] as File[],
})

const submitting = ref(false)

const handleSubmit = async () => {
  submitting.value = true
  await new Promise(r => setTimeout(r, 800))
  submitting.value = false
  await navigateTo('/admin/restricted')
}
</script>

<template>
  <div class="p-4 md:p-6 max-w-2xl mx-auto space-y-5">

    <div class="flex items-center gap-2 text-sm text-gray-400">
      <NuxtLink to="/admin">管理者設定</NuxtLink>
      <Icon name="heroicons:chevron-right" class="h-3 w-3" />
      <NuxtLink to="/admin/restricted">制限コンテンツ</NuxtLink>
      <Icon name="heroicons:chevron-right" class="h-3 w-3" />
      <span class="text-gray-600">追加</span>
    </div>

    <h1 class="text-xl font-bold text-gray-900 flex items-center gap-2">
      <Icon name="heroicons:lock-closed" class="h-5 w-5 text-red-500" />
      制限コンテンツ追加
    </h1>

    <form class="card p-6 space-y-5" @submit.prevent="handleSubmit">

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1.5">タイトル <span class="text-red-500">*</span></label>
        <input v-model="form.title" type="text" placeholder="例: JACCS 提携プログラム 2026年度版" class="input-field" required />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1.5">カテゴリ</label>
        <select v-model="form.category" class="input-field">
          <option value="JACCS">JACCS</option>
          <option value="経営資料">経営資料</option>
          <option value="その他">その他</option>
        </select>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1.5">内容</label>
        <textarea v-model="form.content" rows="6" placeholder="コンテンツの内容・説明を入力..." class="input-field" />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1.5">添付ファイル</label>
        <div class="flex items-center justify-center rounded-lg border-2 border-dashed border-gray-200 p-6 text-center">
          <div>
            <Icon name="heroicons:paper-clip" class="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p class="text-sm text-gray-400">ファイルをドラッグ&ドロップ</p>
            <p class="text-xs text-gray-300 mt-1">Phase 6 で実装予定</p>
          </div>
        </div>
      </div>

      <div class="flex justify-between pt-2">
        <NuxtLink to="/admin/restricted" class="btn-secondary">キャンセル</NuxtLink>
        <button type="submit" class="btn-primary" :disabled="submitting">
          <Icon v-if="submitting" name="heroicons:arrow-path" class="h-4 w-4 animate-spin mr-1" />
          {{ submitting ? '保存中...' : 'コンテンツを追加する' }}
        </button>
      </div>

    </form>
  </div>
</template>
