<script setup lang="ts">
import { useRequestApprovers } from '~/composables/useRequestApprovers'
import { useUsers } from '~/composables/useUsers'
import { REQUEST_TYPE_LABELS } from '~/types/request'
import type { RequestType } from '~/types/request'
import type { AppUser } from '~/types/user'

definePageMeta({ middleware: ['auth', 'admin'] })

const { approverMap, fetchAll, setApprovers } = useRequestApprovers()
const { fetchUsers } = useUsers()

const users = ref<AppUser[]>([])
const loading = ref(true)
const loadError = ref('')

onMounted(async () => {
  try {
    const [, u] = await Promise.all([fetchAll(), fetchUsers()])
    users.value = u.filter(x => !x.isWithdrawn)
  } catch (e: any) {
    loadError.value = e.message ?? '読み込みに失敗しました'
  } finally {
    loading.value = false
  }
})

const userOptions = computed(() => users.value.map(u => ({ uid: u.uid, displayName: u.displayName })))
const nameOf = (uid: string) => users.value.find(u => u.uid === uid)?.displayName ?? uid

// 種別ごとの「追加する担当者」選択用（独立したv-modelを持たせるため種別をキーにする）
const pickerUid = reactive<Record<string, string>>({})
const savingType = ref<string | null>(null)
const saveError = ref('')

const approversOf = (type: string): string[] => approverMap.value[type] ?? []

const addApprover = async (type: RequestType) => {
  const uid = pickerUid[type]
  if (!uid) return
  const current = approversOf(type)
  if (current.includes(uid)) { pickerUid[type] = ''; return }
  savingType.value = type
  saveError.value = ''
  try {
    await setApprovers(type, [...current, uid])
    pickerUid[type] = ''
  } catch (e: any) {
    saveError.value = e.message ?? '保存に失敗しました'
  } finally {
    savingType.value = null
  }
}

const removeApprover = async (type: RequestType, uid: string) => {
  savingType.value = type
  saveError.value = ''
  try {
    await setApprovers(type, approversOf(type).filter(u => u !== uid))
  } catch (e: any) {
    saveError.value = e.message ?? '保存に失敗しました'
  } finally {
    savingType.value = null
  }
}
</script>

<template>
  <div class="p-4 md:p-6 max-w-3xl mx-auto space-y-5">

    <div class="flex items-center gap-2 text-sm text-gray-400">
      <NuxtLink to="/admin">管理者設定</NuxtLink>
      <Icon name="heroicons:chevron-right" class="h-3 w-3" />
      <span class="text-gray-600">申請承認権限の設定</span>
    </div>

    <div>
      <h1 class="text-xl font-bold text-gray-900 flex items-center gap-2">
        <Icon name="heroicons:key" class="h-6 w-6 text-primary-600" />
        申請承認権限の設定
      </h1>
      <p class="text-sm text-gray-500 mt-0.5">
        申請種別ごとに、承認できる担当者を指定します。担当者を1人も設定していない種別は、従来通り理事会メンバー以上であれば誰でも承認できます。
        システム管理者は、設定の有無に関わらず常にすべての申請を承認できます。
      </p>
    </div>

    <div v-if="saveError" class="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
      <Icon name="heroicons:exclamation-circle" class="mt-0.5 h-4 w-4 shrink-0" />
      {{ saveError }}
    </div>

    <div v-if="loading" class="card p-12 text-center">
      <Icon name="heroicons:arrow-path" class="h-8 w-8 text-gray-300 mx-auto mb-2 animate-spin" />
      <p class="text-sm text-gray-400">読み込み中...</p>
    </div>

    <div v-else-if="loadError" class="card p-12 text-center">
      <p class="text-sm text-red-500">{{ loadError }}</p>
    </div>

    <div v-else class="space-y-3">
      <div v-for="(label, type) in REQUEST_TYPE_LABELS" :key="type" class="card p-4 space-y-3">
        <div class="flex items-center justify-between gap-2 flex-wrap">
          <h2 class="font-semibold text-gray-900 text-sm">{{ label }}</h2>
          <span
            class="badge text-xs"
            :class="approversOf(type).length > 0 ? 'bg-rose-50 text-rose-700' : 'bg-gray-100 text-gray-500'"
          >
            {{ approversOf(type).length > 0 ? '個別設定あり' : '既定（理事会メンバー以上）' }}
          </span>
        </div>

        <div class="flex flex-wrap gap-1.5">
          <span
            v-for="uid in approversOf(type)"
            :key="uid"
            class="inline-flex items-center gap-1 rounded-full bg-primary-50 text-primary-700 pl-2.5 pr-1 py-1 text-xs font-medium"
          >
            {{ nameOf(uid) }}
            <button
              type="button"
              class="rounded-full p-0.5 hover:bg-primary-100 transition"
              :disabled="savingType === type"
              @click="removeApprover(type, uid)"
            >
              <Icon name="heroicons:x-mark" class="h-3 w-3" />
            </button>
          </span>
          <span v-if="approversOf(type).length === 0" class="text-xs text-gray-400">担当者は未設定です</span>
        </div>

        <div class="flex items-center gap-2">
          <div class="flex-1 max-w-xs">
            <SearchableUserSelect v-model="pickerUid[type]" :users="userOptions" placeholder="追加する担当者を選択..." />
          </div>
          <button
            type="button"
            class="btn-secondary text-xs shrink-0"
            :disabled="!pickerUid[type] || savingType === type"
            @click="addApprover(type as RequestType)"
          >
            <Icon v-if="savingType === type" name="heroicons:arrow-path" class="h-3.5 w-3.5 animate-spin mr-1" />
            追加
          </button>
        </div>
      </div>
    </div>

  </div>
</template>
