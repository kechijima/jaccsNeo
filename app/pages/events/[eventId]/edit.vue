<script setup lang="ts">
import type { EventForm, EventCategory, RecurrenceFrequency } from '~/types/event'
import { EVENT_CATEGORY_LABELS } from '~/types/event'
import type { Group } from '~/types/group'
import { useGroups } from '~/composables/useGroups'

definePageMeta({ middleware: ['auth'] })

const route = useRoute()
const eventId = computed(() => route.params.eventId as string)

const { fetchEvent, updateEvent, deleteEvent } = useEvents()
const { fetchGroups } = useGroups()

const groups = ref<Group[]>([])
const allKumiai = computed(() =>
  groups.value.flatMap(g => g.kumiai.map(k => ({ ...k, groupName: g.name }))),
)
const kumiaiOptions = computed(() =>
  allKumiai.value.map(k => ({ id: k.id, label: k.name, sublabel: `${k.groupName}グループ` })),
)

const loading = ref(false)
const error = ref('')
const submitting = ref(false)

const form = ref({
  title: '',
  startDate: '',
  startTime: '',
  endDate: '',
  endTime: '',
  location: '',
  targetScope: 'all',
  targetKumiaiId: '',
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

watch(() => form.value.category, (cat) => {
  if (cat !== 'meeting') recurrenceEnabled.value = false
})

const toggleWeekday = (day: number) => {
  recurrenceWeekdays.value = recurrenceWeekdays.value.includes(day)
    ? recurrenceWeekdays.value.filter(d => d !== day)
    : [...recurrenceWeekdays.value, day].sort()
}

onMounted(async () => {
  loading.value = true
  try {
    const [ev] = await Promise.all([
      fetchEvent(eventId.value),
      fetchGroups().then(g => { groups.value = g }).catch(() => {}),
    ])
    if (ev) {
      const start = ev.startAt.toDate()
      const end   = ev.endAt?.toDate()
      form.value = {
        title:       ev.title,
        startDate:   start.toISOString().split('T')[0],
        startTime:   start.toTimeString().slice(0, 5),
        endDate:     end ? end.toISOString().split('T')[0] : '',
        endTime:     end ? end.toTimeString().slice(0, 5) : '',
        location:    ev.location ?? '',
        // scope:'group'+groupIdの新形式・scopeに直接グループIDが入る旧形式のどちらでも復元できるようにする
        targetScope: ev.scope === 'group' && ev.groupId ? ev.groupId : ev.scope,
        targetKumiaiId: ev.kumiaiId ?? '',
        category:    ev.category ?? 'event',
        description: ev.description ?? '',
        notifyEmail: true,
        notifyApp:   true,
      }
      if (ev.recurrence) {
        recurrenceEnabled.value   = true
        recurrenceFrequency.value = ev.recurrence.frequency
        recurrenceInterval.value  = ev.recurrence.interval
        recurrenceWeekdays.value  = ev.recurrence.byWeekdays ?? []
        recurrenceEndDate.value   = ev.recurrence.endDate ?? ''
      }
    }
  } catch (e: any) {
    error.value = e.message ?? 'イベントの取得に失敗しました'
  } finally {
    loading.value = false
  }
})

const handleSubmit = async () => {
  submitting.value = true
  error.value = ''
  try {
    const startAt = form.value.startDate + (form.value.startTime ? 'T' + form.value.startTime : 'T00:00')
    const endAt   = form.value.endDate ? form.value.endDate + (form.value.endTime ? 'T' + form.value.endTime : 'T00:00') : undefined
    const isGroupSelection = groups.value.some(g => g.id === form.value.targetScope)
    const isKumiaiSelection = form.value.targetScope === 'kumiai'
    await updateEvent(eventId.value, {
      title:       form.value.title,
      startAt,
      endAt,
      location:    form.value.location || undefined,
      scope:       (isGroupSelection ? 'group' : form.value.targetScope) as EventForm['scope'],
      groupId:     isGroupSelection ? form.value.targetScope : undefined,
      kumiaiId:    isKumiaiSelection ? (form.value.targetKumiaiId || undefined) : undefined,
      category:    form.value.category,
      description: form.value.description || undefined,
      recurrence: (form.value.category === 'meeting' && recurrenceEnabled.value)
        ? {
            frequency: recurrenceFrequency.value,
            interval: Math.max(1, Number(recurrenceInterval.value) || 1),
            byWeekdays: recurrenceFrequency.value === 'weekly'
              ? (recurrenceWeekdays.value.length > 0 ? recurrenceWeekdays.value : [new Date(`${form.value.startDate}T00:00`).getDay()])
              : undefined,
            endDate: recurrenceEndDate.value || undefined,
          }
        : null,
    } as any)
    await navigateTo(`/events/${eventId.value}`)
  } catch (e: any) {
    error.value = e.message ?? '保存に失敗しました'
    submitting.value = false
  }
}

const handleDelete = async () => {
  if (!confirm('このイベントを削除しますか？')) return
  try {
    await deleteEvent(eventId.value)
    await navigateTo('/events')
  } catch (e: any) {
    error.value = e.message ?? '削除に失敗しました'
  }
}
</script>

<template>
  <div class="p-4 md:p-6 max-w-2xl mx-auto space-y-5">

    <div class="flex items-center gap-2 text-sm text-gray-400">
      <NuxtLink to="/events">カレンダー</NuxtLink>
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

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1.5">種別</label>
        <select v-model="form.category" class="input-field">
          <option v-for="(label, key) in EVENT_CATEGORY_LABELS" :key="key" :value="key">{{ label }}</option>
        </select>
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

      <!-- 繰り返し設定（会議のみ） -->
      <div v-if="form.category === 'meeting'" class="rounded-lg bg-sky-50 border border-sky-100 p-3 space-y-3">
        <label class="flex items-center gap-2 cursor-pointer">
          <input v-model="recurrenceEnabled" type="checkbox" class="h-4 w-4 rounded text-primary-600" />
          <span class="text-sm font-medium text-gray-700">繰り返しを行う</span>
        </label>

        <div v-if="recurrenceEnabled" class="space-y-3 pl-6">
          <div class="flex items-center gap-2 flex-wrap text-sm text-gray-600">
            <span>毎</span>
            <input v-model.number="recurrenceInterval" type="number" min="1" class="input-field w-16 py-1 text-sm text-center" />
            <select v-model="recurrenceFrequency" class="input-field w-auto py-1 text-sm">
              <option value="weekly">週間ごと</option>
              <option value="monthly">ヶ月ごと</option>
            </select>
          </div>

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

          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">繰り返しの終了日（任意）</label>
            <input v-model="recurrenceEndDate" type="date" class="input-field text-sm py-1.5 w-auto" />
          </div>
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
          <option v-for="g in groups" :key="g.id" :value="g.id">{{ g.name }} グループ</option>
          <option value="kumiai">特定の組合</option>
        </select>
      </div>

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
