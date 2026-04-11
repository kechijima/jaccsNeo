<script setup lang="ts">
import type { AppUser } from '~/types/user'
import type { MeetingForm } from '~/types/meeting'

definePageMeta({ middleware: ['auth'] })

const { fetchUsers } = useUsers()
const { createMeeting } = useMeetings()

interface ParticipantRow {
  uid: string
  name: string
  newClients: number | null
  contracts: number | null
  activities: number | null
  notes: string
}

const participants = ref<ParticipantRow[]>([])

const form = ref({
  date: new Date().toISOString().split('T')[0],
  spaceId: '',
  memo: '',
})

const totals = computed(() => ({
  newClients: participants.value.reduce((sum, p) => sum + (p.newClients ?? 0), 0),
  contracts: participants.value.reduce((sum, p) => sum + (p.contracts ?? 0), 0),
  activities: participants.value.reduce((sum, p) => sum + (p.activities ?? 0), 0),
}))

const submitting = ref(false)
const loading = ref(false)
const error = ref('')

onMounted(async () => {
  loading.value = true
  error.value = ''
  try {
    const users: AppUser[] = await fetchUsers()
    participants.value = users.map((u) => ({
      uid: u.uid,
      name: u.displayName,
      newClients: null,
      contracts: null,
      activities: null,
      notes: '',
    }))
  }
  catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'メンバーの読み込みに失敗しました'
  }
  finally {
    loading.value = false
  }
})

const handleSubmit = async () => {
  submitting.value = true
  error.value = ''
  try {
    const meetingForm: MeetingForm = {
      date: form.value.date,
      spaceId: form.value.spaceId || undefined,
      memo: form.value.memo || undefined,
      reports: participants.value.map((p) => ({
        uid: p.uid,
        displayName: p.name,
        newClients: p.newClients,
        contracts: p.contracts,
        activities: p.activities,
        notes: p.notes || undefined,
      })),
    }
    await createMeeting(meetingForm)
    await navigateTo('/team/meetings')
  }
  catch (e: unknown) {
    error.value = e instanceof Error ? e.message : '保存に失敗しました'
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="p-4 md:p-6 max-w-4xl mx-auto space-y-5">

    <div class="flex items-center gap-2 text-sm text-gray-400">
      <NuxtLink to="/team">チーム</NuxtLink>
      <Icon name="heroicons:chevron-right" class="h-3 w-3" />
      <NuxtLink to="/team/meetings">数字会議</NuxtLink>
      <Icon name="heroicons:chevron-right" class="h-3 w-3" />
      <span class="text-gray-600">新規入力</span>
    </div>

    <h1 class="text-xl font-bold text-gray-900">数字会議 入力</h1>

    <form class="space-y-5" @submit.prevent="handleSubmit">

      <!-- 基本情報 -->
      <div class="card p-5">
        <h2 class="font-semibold text-gray-900 mb-4">会議情報</h2>
        <div class="grid sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">開催日 <span class="text-red-500">*</span></label>
            <input v-model="form.date" type="date" class="input-field" required />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">スペース</label>
            <select v-model="form.spaceId" class="input-field">
              <option value="">選択してください</option>
              <option value="space_001">りらくす組合 数字会議</option>
              <option value="space_002">ラジカル組合 数字会議</option>
            </select>
          </div>
        </div>
      </div>

      <!-- 個人別入力テーブル -->
      <div class="card overflow-hidden">
        <div class="px-5 py-3 border-b border-gray-100 bg-gray-50">
          <h2 class="font-semibold text-gray-900">担当者別 実績入力</h2>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-gray-100 bg-gray-50">
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">担当者</th>
                <th class="px-4 py-3 text-center text-xs font-semibold text-gray-500">新規顧客数</th>
                <th class="px-4 py-3 text-center text-xs font-semibold text-gray-500">成約件数</th>
                <th class="px-4 py-3 text-center text-xs font-semibold text-gray-500">活動件数</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">メモ</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-50">
              <tr v-for="p in participants" :key="p.uid">
                <td class="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{{ p.name }}</td>
                <td class="px-4 py-3">
                  <input
                    v-model.number="p.newClients"
                    type="number"
                    min="0"
                    class="input-field text-center py-1.5 w-20"
                    placeholder="0"
                  />
                </td>
                <td class="px-4 py-3">
                  <input
                    v-model.number="p.contracts"
                    type="number"
                    min="0"
                    class="input-field text-center py-1.5 w-20"
                    placeholder="0"
                  />
                </td>
                <td class="px-4 py-3">
                  <input
                    v-model.number="p.activities"
                    type="number"
                    min="0"
                    class="input-field text-center py-1.5 w-20"
                    placeholder="0"
                  />
                </td>
                <td class="px-4 py-3">
                  <input
                    v-model="p.notes"
                    type="text"
                    class="input-field py-1.5"
                    placeholder="特記事項..."
                  />
                </td>
              </tr>
            </tbody>
            <!-- 合計行 -->
            <tfoot>
              <tr class="bg-gray-50 border-t-2 border-gray-200">
                <td class="px-4 py-3 font-bold text-gray-900">合計</td>
                <td class="px-4 py-3 text-center font-bold text-gray-900">{{ totals.newClients }}</td>
                <td class="px-4 py-3 text-center font-bold text-green-700">{{ totals.contracts }}</td>
                <td class="px-4 py-3 text-center font-bold text-blue-700">{{ totals.activities }}</td>
                <td class="px-4 py-3" />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <!-- メモ -->
      <div class="card p-5">
        <label class="block text-sm font-medium text-gray-700 mb-1.5">会議メモ・議事録</label>
        <textarea v-model="form.memo" rows="4" placeholder="会議の内容・決定事項など..." class="input-field" />
      </div>

      <div class="flex justify-between">
        <NuxtLink to="/team/meetings" class="btn-secondary">キャンセル</NuxtLink>
        <button type="submit" class="btn-primary" :disabled="submitting">
          <Icon v-if="submitting" name="heroicons:arrow-path" class="h-4 w-4 animate-spin mr-1" />
          {{ submitting ? '保存中...' : '会議記録を保存する' }}
        </button>
      </div>

    </form>
  </div>
</template>
