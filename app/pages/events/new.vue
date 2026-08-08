<script setup lang="ts">
import type { EventForm, EventCategory, RecurrenceFrequency } from '~/types/event'
import { EVENT_CATEGORY_LABELS } from '~/types/event'
import type { Group } from '~/types/group'
import { useGroups } from '~/composables/useGroups'

definePageMeta({ middleware: ['auth'] })

const { createEvent } = useEvents()
const { fetchGroups } = useGroups()
const route = useRoute()

const groups = ref<Group[]>([])
onMounted(async () => { groups.value = await fetchGroups().catch(() => []) })

// 所属グループとは独立して「特定の組合」を選べるよう、全グループの組合をまとめて検索対象にする
// （解体済みの組合は選択肢から除外する）
const allKumiai = computed(() =>
  groups.value.flatMap(g => g.kumiai.filter(k => !k.isDissolved).map(k => ({ ...k, groupName: g.name }))),
)
const kumiaiOptions = computed(() =>
  allKumiai.value.map(k => ({ id: k.id, label: k.name, sublabel: `${k.groupName}グループ` })),
)

// カレンダー画面で日付をクリックして遷移してきた場合、その日付を開始日に初期設定する
const initialDate = typeof route.query.date === 'string' ? route.query.date : ''

const form = ref({
  title: '',
  startDate: initialDate,
  startTime: '',
  endDate: '',
  endTime: '',
  location: '',
  targetScope: 'all',
  targetKumiaiId: '',
  targetSpaceId: '',
  category: 'event' as EventCategory,
  description: '',
  notifyEmail: true,
  notifyApp: true,
})

// ── 繰り返し設定（種別が「会議」の場合のみ設定可能。Googleカレンダー風） ──
const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土']
const recurrenceEnabled   = ref(false)
const recurrenceFrequency = ref<RecurrenceFrequency>('weekly')
const recurrenceInterval  = ref(1)
const recurrenceWeekdays  = ref<number[]>([])
const recurrenceEndDate   = ref('')

// 種別を「会議」以外に変えたら繰り返し設定は解除する
watch(() => form.value.category, (cat) => {
  if (cat !== 'meeting') recurrenceEnabled.value = false
})

// 開始日を設定した際、曜日が未選択なら開始日の曜日を初期選択しておく
watch(() => form.value.startDate, (d) => {
  if (!d || recurrenceWeekdays.value.length > 0) return
  recurrenceWeekdays.value = [new Date(`${d}T00:00`).getDay()]
})

const toggleWeekday = (day: number) => {
  recurrenceWeekdays.value = recurrenceWeekdays.value.includes(day)
    ? recurrenceWeekdays.value.filter(d => d !== day)
    : [...recurrenceWeekdays.value, day].sort()
}

const submitting = ref(false)
const error = ref('')

const handleSubmit = async () => {
  submitting.value = true
  error.value = ''
  try {
    const startAt = form.value.startTime
      ? `${form.value.startDate}T${form.value.startTime}`
      : `${form.value.startDate}T00:00`

    const endAt = form.value.endDate
      ? form.value.endTime
        ? `${form.value.endDate}T${form.value.endTime}`
        : `${form.value.endDate}T00:00`
      : undefined

    // 対象スコープのセレクトは「全体」「各グループ」「特定の組合」を1つのセレクトで選ぶため、
    // グループが選ばれた場合はscope:'group'とgroupIdの両方に正しく分けて保存する
    const isGroupSelection = groups.value.some(g => g.id === form.value.targetScope)
    const isKumiaiSelection = form.value.targetScope === 'kumiai'

    const eventForm: EventForm = {
      title: form.value.title,
      description: form.value.description || undefined,
      startAt,
      endAt,
      location: form.value.location || undefined,
      scope: (isGroupSelection ? 'group' : form.value.targetScope) as EventForm['scope'],
      groupId: isGroupSelection ? form.value.targetScope : undefined,
      kumiaiId: isKumiaiSelection ? (form.value.targetKumiaiId || undefined) : undefined,
      category: form.value.category,
      recurrence: (form.value.category === 'meeting' && recurrenceEnabled.value)
        ? {
            frequency: recurrenceFrequency.value,
            interval: Math.max(1, Number(recurrenceInterval.value) || 1),
            byWeekdays: recurrenceFrequency.value === 'weekly'
              ? (recurrenceWeekdays.value.length > 0 ? recurrenceWeekdays.value : [new Date(`${form.value.startDate}T00:00`).getDay()])
              : undefined,
            endDate: recurrenceEndDate.value || undefined,
          }
        : undefined,
    }

    await createEvent(eventForm)
    await navigateTo('/events')
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'イベントの作成に失敗しました'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="p-4 md:p-6 max-w-2xl mx-auto space-y-5">

    <div class="flex items-center gap-2 text-sm text-gray-400">
      <NuxtLink to="/events">カレンダー</NuxtLink>
      <Icon name="heroicons:chevron-right" class="h-3 w-3" />
      <span class="text-gray-600">イベント作成</span>
    </div>

    <h1 class="text-xl font-bold text-gray-900">イベント作成</h1>

    <form class="card p-6 space-y-5" @submit.prevent="handleSubmit">

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1.5">タイトル <span class="text-red-500">*</span></label>
        <input v-model="form.title" type="text" placeholder="例: りらくす組合 数字会議" class="input-field" required />
      </div>

      <!-- 種別 -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1.5">種別</label>
        <select v-model="form.category" class="input-field">
          <option v-for="(label, key) in EVENT_CATEGORY_LABELS" :key="key" :value="key">{{ label }}</option>
        </select>
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

      <!-- 繰り返し設定（会議のみ） -->
      <div v-if="form.category === 'meeting'" class="rounded-lg bg-sky-50 border border-sky-100 p-3 space-y-3">
        <label class="flex items-center gap-2 cursor-pointer">
          <input v-model="recurrenceEnabled" type="checkbox" class="h-4 w-4 rounded text-primary-600" />
          <span class="text-sm font-medium text-gray-700">繰り返しを行う</span>
        </label>

        <div v-if="recurrenceEnabled" class="space-y-3 pl-6">
          <!-- 頻度・間隔 -->
          <div class="flex items-center gap-2 flex-wrap text-sm text-gray-600">
            <span>毎</span>
            <input v-model.number="recurrenceInterval" type="number" min="1" class="input-field w-16 py-1 text-sm text-center" />
            <select v-model="recurrenceFrequency" class="input-field w-auto py-1 text-sm">
              <option value="weekly">週間ごと</option>
              <option value="monthly">ヶ月ごと</option>
            </select>
          </div>

          <!-- 曜日選択（毎週の場合） -->
          <div v-if="recurrenceFrequency === 'weekly'" class="flex items-center gap-1.5 flex-wrap">
            <button
              v-for="(label, day) in WEEKDAY_LABELS"
              :key="day"
              type="button"
              class="h-8 w-8 rounded-full text-xs font-medium transition"
              :class="recurrenceWeekdays.includes(day)
                ? 'bg-primary-600 text-white'
                : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'"
              @click="toggleWeekday(day)"
            >{{ label }}</button>
          </div>
          <p v-else class="text-xs text-gray-500">開始日と同じ日付（毎月{{ form.startDate ? new Date(`${form.startDate}T00:00`).getDate() : '◯' }}日）に繰り返します</p>

          <!-- 終了日 -->
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">繰り返しの終了日（任意）</label>
            <input v-model="recurrenceEndDate" type="date" class="input-field text-sm py-1.5 w-auto" />
          </div>
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
          <option v-for="g in groups" :key="g.id" :value="g.id">{{ g.name }} グループ</option>
          <option value="kumiai">特定の組合</option>
        </select>
      </div>

      <!-- 組合選択（対象スコープが「特定の組合」の場合） -->
      <div v-if="form.targetScope === 'kumiai'">
        <label class="block text-sm font-medium text-gray-700 mb-1.5">対象組合 <span class="text-red-500">*</span></label>
        <SearchableSelect
          v-model="form.targetKumiaiId"
          :items="kumiaiOptions"
          placeholder="組合を選択..."
          search-placeholder="組合名で検索..."
        />
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
