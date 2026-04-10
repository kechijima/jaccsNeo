<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

const form = ref({
  title: '',
  startDate: '',
  startTime: '',
  endDate: '',
  endTime: '',
  location: '',
  targetScope: 'all',
  targetSpaceId: '',
  description: '',
  notifyEmail: true,
  notifyApp: true,
})

const submitting = ref(false)

const handleSubmit = async () => {
  submitting.value = true
  // Phase4でFirestoreへの保存処理に差し替え
  await new Promise(r => setTimeout(r, 800))
  submitting.value = false
  await navigateTo('/events')
}
</script>

<template>
  <div class="p-4 md:p-6 max-w-2xl mx-auto space-y-5">

    <div class="flex items-center gap-2 text-sm text-gray-400">
      <NuxtLink to="/events">イベント</NuxtLink>
      <Icon name="heroicons:chevron-right" class="h-3 w-3" />
      <span class="text-gray-600">イベント作成</span>
    </div>

    <h1 class="text-xl font-bold text-gray-900">イベント作成</h1>

    <form class="card p-6 space-y-5" @submit.prevent="handleSubmit">

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1.5">タイトル <span class="text-red-500">*</span></label>
        <input v-model="form.title" type="text" placeholder="例: りらくす組合 数字会議" class="input-field" required />
      </div>

      <!-- 日時 -->
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">開始日 <span class="text-red-500">*</span></label>
          <input v-model="form.startDate" type="date" class="input-field" required />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">開始時刻</label>
          <input v-model="form.startTime" type="time" class="input-field" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">終了日</label>
          <input v-model="form.endDate" type="date" class="input-field" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">終了時刻</label>
          <input v-model="form.endTime" type="time" class="input-field" />
        </div>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1.5">場所</label>
        <input v-model="form.location" type="text" placeholder="例: 大阪本社 会議室A、オンライン（Zoom）" class="input-field" />
      </div>

      <!-- 対象スペース -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1.5">対象スコープ</label>
        <select v-model="form.targetScope" class="input-field">
          <option value="all">全体</option>
          <option value="reterace">Reterace グループ</option>
          <option value="miraito">Miraito グループ</option>
          <option value="asset">Asset グループ</option>
          <option value="kumiai">特定の組合</option>
        </select>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1.5">詳細・説明</label>
        <textarea v-model="form.description" rows="4" placeholder="イベントの内容・注意事項を入力..." class="input-field" />
      </div>

      <!-- 通知設定 -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">通知設定</label>
        <div class="space-y-2">
          <label class="flex items-center gap-2 cursor-pointer">
            <input v-model="form.notifyApp" type="checkbox" class="h-4 w-4 rounded text-primary-600" />
            <span class="text-sm text-gray-700">アプリ内通知を送る</span>
          </label>
          <label class="flex items-center gap-2 cursor-pointer">
            <input v-model="form.notifyEmail" type="checkbox" class="h-4 w-4 rounded text-primary-600" />
            <span class="text-sm text-gray-700">メール通知を送る</span>
          </label>
        </div>
      </div>

      <div class="flex justify-between pt-2">
        <NuxtLink to="/events" class="btn-secondary">キャンセル</NuxtLink>
        <button type="submit" class="btn-primary" :disabled="submitting">
          <Icon v-if="submitting" name="heroicons:arrow-path" class="h-4 w-4 animate-spin mr-1" />
          {{ submitting ? '作成中...' : 'イベントを作成する' }}
        </button>
      </div>

    </form>
  </div>
</template>
