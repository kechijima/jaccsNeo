<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

const route = useRoute()
const eventId = computed(() => route.params.eventId as string)

// フォーム初期値（Phase4でFirestoreから読み込み）
const form = ref({
  title: 'りらくす組合 数字会議',
  startDate: '2026-04-15',
  startTime: '20:00',
  endDate: '2026-04-15',
  endTime: '21:30',
  location: 'オンライン（Zoom）',
  targetScope: 'kumiai',
  description: '4月の活動報告と今後の目標確認を行います。',
  notifyEmail: true,
  notifyApp: true,
})

const submitting = ref(false)

const handleSubmit = async () => {
  submitting.value = true
  await new Promise(r => setTimeout(r, 800))
  submitting.value = false
  await navigateTo(`/events/${eventId.value}`)
}

const handleDelete = async () => {
  if (!confirm('このイベントを削除しますか？')) return
  await navigateTo('/events')
}
</script>

<template>
  <div class="p-4 md:p-6 max-w-2xl mx-auto space-y-5">

    <div class="flex items-center gap-2 text-sm text-gray-400">
      <NuxtLink to="/events">イベント</NuxtLink>
      <Icon name="heroicons:chevron-right" class="h-3 w-3" />
      <NuxtLink :to="`/events/${eventId}`">イベント詳細</NuxtLink>
      <Icon name="heroicons:chevron-right" class="h-3 w-3" />
      <span class="text-gray-600">編集</span>
    </div>

    <h1 class="text-xl font-bold text-gray-900">イベント編集</h1>

    <form class="card p-6 space-y-5" @submit.prevent="handleSubmit">

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1.5">タイトル <span class="text-red-500">*</span></label>
        <input v-model="form.title" type="text" class="input-field" required />
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">開始日</label>
          <input v-model="form.startDate" type="date" class="input-field" />
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
        <input v-model="form.location" type="text" class="input-field" />
      </div>

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
        <textarea v-model="form.description" rows="4" class="input-field" />
      </div>

      <div class="flex justify-between pt-2">
        <button type="button" class="btn-danger text-sm" @click="handleDelete">
          <Icon name="heroicons:trash" class="h-4 w-4 mr-1" />
          削除
        </button>
        <div class="flex items-center gap-2">
          <NuxtLink :to="`/events/${eventId}`" class="btn-secondary">キャンセル</NuxtLink>
          <button type="submit" class="btn-primary" :disabled="submitting">
            <Icon v-if="submitting" name="heroicons:arrow-path" class="h-4 w-4 animate-spin mr-1" />
            {{ submitting ? '保存中...' : '変更を保存する' }}
          </button>
        </div>
      </div>

    </form>
  </div>
</template>
