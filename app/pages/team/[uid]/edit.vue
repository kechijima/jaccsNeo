<script setup lang="ts">
import { useUsers } from '~/composables/useUsers'
import { useStorage } from '~/composables/useStorage'
import { useAuthStore } from '~/stores/auth'
import { useGroups } from '~/composables/useGroups'
import type { AppUser } from '~/types/user'
import type { Group } from '~/types/group'

// システム管理者がチームメンバーのプロフィール（マイページと同じ項目）を編集する画面
definePageMeta({ middleware: ['auth', 'admin'] })

const route = useRoute()
const router = useRouter()
const uid = computed(() => route.params.uid as string)

const authStore = useAuthStore()
const { fetchUser, updateUserProfile } = useUsers()
const { uploadFile } = useStorage()
const { fetchGroups } = useGroups()

const groups = ref<Group[]>([])
const target = ref<AppUser | null>(null)
const loading = ref(true)
const loadError = ref('')

// ── フォームデータ ─────────────────────────────────────────────────────────
const form = reactive({
  lastName: '',
  firstName: '',
  lastNameKana: '',
  firstNameKana: '',
  mobile: '',
  groupId: '',
  employeeId: '',
  joinDate: '',
  birthday: '',
  kumiaiJoinDate: '',
  localArea: '',
  hobbies: '',
  selfIntro: '',
  businessContent: '',
  salaryContent: '',
  supportPerson: '',
  resonaAccount: '',
  sbiAccount: '',
  otherBankName: '',
  otherBankBranch: '',
  otherBankAccount: '',
  yuuchoInfo: '',
  corporateName: '',
  corporateAccount: '',
  corporateSbiAccount: '',
  invoiceNumber: '',
  dreamGoal: '',
  snsUrl: '',
})

const DATE_FIELDS = new Set(['joinDate', 'birthday', 'kumiaiJoinDate'])

const loadForm = (u: AppUser) => {
  form.lastName = u.lastName ?? ''
  form.firstName = u.firstName ?? ''
  form.lastNameKana = u.lastNameKana ?? ''
  form.firstNameKana = u.firstNameKana ?? ''
  form.mobile = u.mobile ?? ''
  form.groupId = u.groupId ?? ''
  form.employeeId = u.employeeId ?? ''
  form.joinDate = u.joinDate ?? ''
  form.birthday = u.birthday ?? ''
  form.kumiaiJoinDate = (u.kumiaiJoinDate ?? '').slice(0, 7)
  form.localArea = u.localArea ?? ''
  form.hobbies = u.hobbies ?? ''
  form.selfIntro = u.selfIntro ?? ''
  form.businessContent = u.businessContent ?? ''
  form.salaryContent = u.salaryContent ?? ''
  form.supportPerson = u.supportPerson ?? ''
  form.resonaAccount = u.resonaAccount ?? ''
  form.sbiAccount = u.sbiAccount ?? ''
  form.otherBankName = u.otherBankName ?? ''
  form.otherBankBranch = u.otherBankBranch ?? ''
  form.otherBankAccount = u.otherBankAccount ?? ''
  form.yuuchoInfo = u.yuuchoInfo ?? ''
  form.corporateName = u.corporateName ?? ''
  form.corporateAccount = u.corporateAccount ?? ''
  form.corporateSbiAccount = u.corporateSbiAccount ?? ''
  form.invoiceNumber = u.invoiceNumber ?? ''
  form.dreamGoal = u.dreamGoal ?? ''
  form.snsUrl = u.snsUrl ?? ''
}

onMounted(async () => {
  loading.value = true
  try {
    const [u, fetchedGroups] = await Promise.all([fetchUser(uid.value), fetchGroups().catch(() => [])])
    groups.value = fetchedGroups
    if (!u) {
      loadError.value = 'ユーザーが見つかりませんでした'
    } else {
      target.value = u
      loadForm(u)
    }
  } catch (e: any) {
    loadError.value = e.message ?? 'ユーザー情報の取得に失敗しました'
  } finally {
    loading.value = false
  }
})

// ── タブ ─────────────────────────────────────────────────────────────────
const activeTab = ref<'basic' | 'business' | 'bank' | 'corporate' | 'goal'>('basic')

const tabs = [
  { key: 'basic',     label: '基本情報',   icon: 'heroicons:user' },
  { key: 'business',  label: 'ビジネス',   icon: 'heroicons:briefcase' },
  { key: 'bank',      label: '口座情報',   icon: 'heroicons:building-library' },
  { key: 'corporate', label: '法人情報',   icon: 'heroicons:building-office-2' },
  { key: 'goal',      label: '夢・目標',   icon: 'heroicons:star' },
] as const

// ── 保存 ─────────────────────────────────────────────────────────────────
const saving = ref(false)
const saved = ref(false)
const saveError = ref('')

const saveProfile = async () => {
  saving.value = true
  saveError.value = ''
  try {
    const payload: Record<string, string> = {}
    for (const [key, value] of Object.entries(form)) {
      const trimmed = (value ?? '').toString().trim()
      payload[key] = trimmed === '' && !DATE_FIELDS.has(key) ? 'なし' : trimmed
    }

    await updateUserProfile(uid.value, payload)

    Object.assign(form, payload)
    if (target.value) target.value = { ...target.value, ...payload } as AppUser

    saved.value = true
    setTimeout(() => { saved.value = false }, 2500)
  } catch (e: any) {
    saveError.value = e.message ?? '保存に失敗しました'
  } finally {
    saving.value = false
  }
}

// ── 写真アップロード ─────────────────────────────────────────────────────
const photoInputRef = ref<HTMLInputElement>()
const uploadingPhoto = ref(false)
const photoError = ref('')

const handlePhotoSelect = async (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return

  uploadingPhoto.value = true
  photoError.value = ''
  try {
    const path = `avatars/${uid.value}/${Date.now()}-${file.name}`
    const url = await uploadFile(path, file)
    await updateUserProfile(uid.value, { avatarUrl: url })
    if (target.value) target.value = { ...target.value, avatarUrl: url }
  } catch (e: any) {
    photoError.value = e.message ?? '写真のアップロードに失敗しました'
  } finally {
    uploadingPhoto.value = false
    if (photoInputRef.value) photoInputRef.value.value = ''
  }
}

const groupLabel = computed(() => groups.value.find(g => g.id === form.groupId)?.name ?? form.groupId)
</script>

<template>
  <div class="p-4 md:p-6 max-w-4xl mx-auto space-y-5">

    <!-- パンくず -->
    <div class="flex items-center gap-2 text-sm text-gray-400">
      <NuxtLink to="/team/members">チームメンバー</NuxtLink>
      <Icon name="heroicons:chevron-right" class="h-3 w-3" />
      <NuxtLink :to="`/team/${uid}`">プロフィール</NuxtLink>
      <Icon name="heroicons:chevron-right" class="h-3 w-3" />
      <span class="text-gray-600">編集（管理者）</span>
    </div>

    <!-- 読み込み中 -->
    <div v-if="loading" class="card p-12 text-center">
      <Icon name="heroicons:arrow-path" class="h-8 w-8 text-gray-300 mx-auto mb-2 animate-spin" />
      <p class="text-sm text-gray-400">読み込み中...</p>
    </div>

    <!-- エラー -->
    <div v-else-if="loadError || !target" class="card p-12 text-center">
      <Icon name="heroicons:exclamation-circle" class="h-8 w-8 text-red-300 mx-auto mb-2" />
      <p class="text-sm text-red-500">{{ loadError }}</p>
    </div>

    <template v-else>
      <!-- ページヘッダー -->
      <div class="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 class="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Icon name="heroicons:pencil-square" class="h-6 w-6 text-primary-600" />
            {{ target.displayName }} さんのプロフィール編集
          </h1>
          <p class="mt-1 text-sm text-gray-500 flex items-center gap-1">
            <Icon name="heroicons:shield-check" class="h-3.5 w-3.5 text-amber-500" />
            管理者権限で編集しています
          </p>
        </div>
        <div class="flex flex-col items-end gap-1">
          <button
            class="btn-primary text-sm flex items-center gap-1.5"
            :disabled="saving"
            @click="saveProfile"
          >
            <Icon v-if="saving" name="heroicons:arrow-path" class="h-4 w-4 animate-spin" />
            <Icon v-else-if="saved" name="heroicons:check" class="h-4 w-4" />
            <Icon v-else name="heroicons:cloud-arrow-up" class="h-4 w-4" />
            {{ saving ? '保存中...' : saved ? '保存しました' : '保存する' }}
          </button>
          <p v-if="saveError" class="text-xs text-red-500">{{ saveError }}</p>
        </div>
      </div>

      <!-- プロフィールカード -->
      <div class="card p-5 flex items-center gap-4">
        <div class="relative shrink-0">
          <img
            v-if="target.avatarUrl"
            :src="target.avatarUrl"
            alt=""
            class="h-16 w-16 rounded-full object-cover"
          />
          <div v-else class="flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 text-primary-700 text-2xl font-bold">
            {{ target.displayName.charAt(0) }}
          </div>
          <div v-if="uploadingPhoto" class="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
            <Icon name="heroicons:arrow-path" class="h-5 w-5 text-white animate-spin" />
          </div>
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-lg font-bold text-gray-900">{{ target.displayName }}</p>
          <div class="flex items-center gap-2 flex-wrap mt-1">
            <span class="badge bg-primary-50 text-primary-700 text-xs">{{ target.position || 'なし' }}</span>
            <span class="badge bg-gray-100 text-gray-600 text-xs">{{ groupLabel || 'なし' }}</span>
            <span class="text-xs text-gray-400">{{ target.email }}</span>
          </div>
          <p v-if="photoError" class="text-xs text-red-500 mt-1">{{ photoError }}</p>
        </div>
        <div class="shrink-0">
          <button class="btn-secondary text-xs flex items-center gap-1" :disabled="uploadingPhoto" @click="photoInputRef?.click()">
            <Icon name="heroicons:camera" class="h-3.5 w-3.5" />
            写真変更
          </button>
          <input ref="photoInputRef" type="file" accept="image/*" class="hidden" @change="handlePhotoSelect" />
        </div>
      </div>

      <!-- タブ -->
      <div class="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-hide">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors shrink-0"
          :class="activeTab === tab.key
            ? 'bg-primary-600 text-white shadow-sm'
            : 'text-gray-500 hover:bg-gray-100'"
          @click="activeTab = tab.key"
        >
          <Icon :name="tab.icon" class="h-4 w-4" />
          {{ tab.label }}
        </button>
      </div>

      <!-- タブコンテンツ -->
      <div class="card p-5 space-y-5">

        <!-- 基本情報 -->
        <template v-if="activeTab === 'basic'">
          <h2 class="font-semibold text-gray-900 border-b border-gray-100 pb-2">基本情報</h2>
          <p class="text-xs text-gray-400 -mt-3">該当がない項目は空欄のまま保存すると「なし」として登録されます</p>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">姓（氏名）</label>
              <input v-model="form.lastName" type="text" class="input-field text-sm" placeholder="山田" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">名（氏名）</label>
              <input v-model="form.firstName" type="text" class="input-field text-sm" placeholder="太郎" />
            </div>

            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">姓（よみがな）</label>
              <input v-model="form.lastNameKana" type="text" class="input-field text-sm" placeholder="ヤマダ" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">名（よみがな）</label>
              <input v-model="form.firstNameKana" type="text" class="input-field text-sm" placeholder="タロウ" />
            </div>

            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">メールアドレス</label>
              <input :value="target.email" type="email" class="input-field text-sm bg-gray-50" disabled />
              <p class="mt-1 text-xs text-gray-400">メールアドレスはFirebase Authから変更してください</p>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">携帯電話</label>
              <input v-model="form.mobile" type="tel" class="input-field text-sm" placeholder="090-0000-0000" />
            </div>

            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">組織 / グループ</label>
              <select v-model="form.groupId" class="input-field text-sm">
                <option value="">選択してください</option>
                <option v-for="g in groups" :key="g.id" :value="g.id">{{ g.name }}</option>
              </select>
              <p class="mt-1 text-xs text-gray-400">所属組合・タイトル・サポート者はユーザー管理から変更してください</p>
            </div>

            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">未来設計ID</label>
              <input v-model="form.employeeId" type="text" class="input-field text-sm" placeholder="MS-0001" />
            </div>

            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">入社日</label>
              <input v-model="form.joinDate" type="date" class="input-field text-sm" />
            </div>

            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">誕生日</label>
              <input v-model="form.birthday" type="date" class="input-field text-sm" />
            </div>

            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">組合加入年月</label>
              <input v-model="form.kumiaiJoinDate" type="month" class="input-field text-sm" />
            </div>

            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">地元エリア</label>
              <input v-model="form.localArea" type="text" class="input-field text-sm" placeholder="福岡県福岡市" />
            </div>

            <div class="sm:col-span-2">
              <label class="block text-xs font-medium text-gray-500 mb-1">SNS / HP URL</label>
              <input v-model="form.snsUrl" type="text" class="input-field text-sm" placeholder="https://..." />
            </div>

            <div class="sm:col-span-2">
              <label class="block text-xs font-medium text-gray-500 mb-1">趣味・特技</label>
              <input v-model="form.hobbies" type="text" class="input-field text-sm" placeholder="読書、ゴルフ など" />
            </div>

            <div class="sm:col-span-2">
              <label class="block text-xs font-medium text-gray-500 mb-1">自己紹介</label>
              <textarea
                v-model="form.selfIntro"
                rows="4"
                class="input-field text-sm resize-none"
                placeholder="自己紹介を入力してください..."
              />
            </div>
          </div>
        </template>

        <!-- ビジネス情報 -->
        <template v-if="activeTab === 'business'">
          <h2 class="font-semibold text-gray-900 border-b border-gray-100 pb-2">ビジネス情報</h2>

          <div class="grid grid-cols-1 gap-4">
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">サポート者</label>
              <input v-model="form.supportPerson" type="text" class="input-field text-sm" placeholder="上司・サポート担当者名" />
            </div>

            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">ビジネス内容</label>
              <textarea
                v-model="form.businessContent"
                rows="5"
                class="input-field text-sm resize-none"
                placeholder="担当業務・専門分野・得意なこと など..."
              />
            </div>

            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">サラリーの内容</label>
              <textarea
                v-model="form.salaryContent"
                rows="3"
                class="input-field text-sm resize-none"
                placeholder="報酬体系・給与形態 など..."
              />
            </div>
          </div>
        </template>

        <!-- 口座情報 -->
        <template v-if="activeTab === 'bank'">
          <h2 class="font-semibold text-gray-900 border-b border-gray-100 pb-2">個人口座情報</h2>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="sm:col-span-2">
              <label class="block text-xs font-medium text-gray-500 mb-1">りそな口座</label>
              <input v-model="form.resonaAccount" type="text" class="input-field text-sm" placeholder="支店名・口座番号" />
            </div>

            <div class="sm:col-span-2">
              <label class="block text-xs font-medium text-gray-500 mb-1">SBI口座</label>
              <input v-model="form.sbiAccount" type="text" class="input-field text-sm" placeholder="口座番号" />
            </div>

            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">上記以外の銀行名</label>
              <input v-model="form.otherBankName" type="text" class="input-field text-sm" placeholder="銀行名" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">支店名</label>
              <input v-model="form.otherBankBranch" type="text" class="input-field text-sm" placeholder="支店名" />
            </div>
            <div class="sm:col-span-2">
              <label class="block text-xs font-medium text-gray-500 mb-1">口座番号</label>
              <input v-model="form.otherBankAccount" type="text" class="input-field text-sm" placeholder="口座番号" />
            </div>

            <div class="sm:col-span-2">
              <label class="block text-xs font-medium text-gray-500 mb-1">ゆうちょ加入情報</label>
              <textarea
                v-model="form.yuuchoInfo"
                rows="2"
                class="input-field text-sm resize-none"
                placeholder="記号・番号 など"
              />
            </div>
          </div>
        </template>

        <!-- 法人情報 -->
        <template v-if="activeTab === 'corporate'">
          <h2 class="font-semibold text-gray-900 border-b border-gray-100 pb-2">法人情報</h2>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="sm:col-span-2">
              <label class="block text-xs font-medium text-gray-500 mb-1">法人名</label>
              <input v-model="form.corporateName" type="text" class="input-field text-sm" placeholder="株式会社〇〇" />
            </div>

            <div class="sm:col-span-2">
              <label class="block text-xs font-medium text-gray-500 mb-1">法人口座（メイン）</label>
              <input v-model="form.corporateAccount" type="text" class="input-field text-sm" placeholder="銀行名・支店名・口座番号" />
            </div>

            <div class="sm:col-span-2">
              <label class="block text-xs font-medium text-gray-500 mb-1">法人SBI口座</label>
              <input v-model="form.corporateSbiAccount" type="text" class="input-field text-sm" placeholder="口座番号" />
            </div>

            <div class="sm:col-span-2">
              <label class="block text-xs font-medium text-gray-500 mb-1">インボイス番号</label>
              <input v-model="form.invoiceNumber" type="text" class="input-field text-sm" placeholder="T0000000000000" />
            </div>
          </div>
        </template>

        <!-- 夢・目標 -->
        <template v-if="activeTab === 'goal'">
          <h2 class="font-semibold text-gray-900 border-b border-gray-100 pb-2">夢・目標</h2>

          <div class="space-y-4">
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">夢・目標（自由記述）</label>
              <textarea
                v-model="form.dreamGoal"
                rows="10"
                class="input-field text-sm resize-none"
                placeholder="自由に記入してください..."
              />
            </div>
          </div>
        </template>

      </div>
    </template>

  </div>
</template>
