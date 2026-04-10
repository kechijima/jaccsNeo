<script setup lang="ts">
definePageMeta({ middleware: ['auth', 'admin'] })

const form = ref({
  name: '',
  description: '',
  type: 'kumiai',
  groupId: '',
  kumiaiId: '',
  isPrivate: false,
})

const submitting = ref(false)

const handleSubmit = async () => {
  submitting.value = true
  await new Promise(r => setTimeout(r, 800))
  submitting.value = false
  await navigateTo('/admin/spaces')
}
</script>

<template>
  <div class="p-4 md:p-6 max-w-2xl mx-auto space-y-5">

    <div class="flex items-center gap-2 text-sm text-gray-400">
      <NuxtLink to="/admin">管理者設定</NuxtLink>
      <Icon name="heroicons:chevron-right" class="h-3 w-3" />
      <NuxtLink to="/admin/spaces">スペース管理</NuxtLink>
      <Icon name="heroicons:chevron-right" class="h-3 w-3" />
      <span class="text-gray-600">スペース作成</span>
    </div>

    <h1 class="text-xl font-bold text-gray-900">スペース作成</h1>

    <form class="card p-6 space-y-5" @submit.prevent="handleSubmit">

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1.5">スペース名 <span class="text-red-500">*</span></label>
        <input v-model="form.name" type="text" placeholder="例: りらくす組合" class="input-field" required />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1.5">説明</label>
        <textarea v-model="form.description" rows="2" placeholder="このスペースの用途を入力..." class="input-field" />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1.5">スペース種別 <span class="text-red-500">*</span></label>
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

      <div v-if="form.type === 'group' || form.type === 'kumiai' || form.type === 'board'" class="grid sm:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">関連グループ</label>
          <select v-model="form.groupId" class="input-field">
            <option value="">（なし）</option>
            <option value="reterace">Reterace</option>
            <option value="miraito">Miraito</option>
            <option value="asset">Asset</option>
          </select>
        </div>
        <div v-if="form.type === 'kumiai'">
          <label class="block text-sm font-medium text-gray-700 mb-1.5">関連組合ID</label>
          <input v-model="form.kumiaiId" type="text" placeholder="組合ID" class="input-field" />
        </div>
      </div>

      <div class="flex justify-between pt-2">
        <NuxtLink to="/admin/spaces" class="btn-secondary">キャンセル</NuxtLink>
        <button type="submit" class="btn-primary" :disabled="submitting">
          <Icon v-if="submitting" name="heroicons:arrow-path" class="h-4 w-4 animate-spin mr-1" />
          {{ submitting ? '作成中...' : 'スペースを作成する' }}
        </button>
      </div>

    </form>
  </div>
</template>
