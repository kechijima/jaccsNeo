<script setup lang="ts">
import { MOCK_ADMIN_USERS } from '~/data/mock'
import { useUsers } from '~/composables/useUsers'
import { useStorage } from '~/composables/useStorage'
import { useAuthStore } from '~/stores/auth'
import { useGroups } from '~/composables/useGroups'
import { useThemeColor } from '~/composables/useThemeColor'
import { useDisplayName } from '~/composables/useDisplayName'
import { useRequests } from '~/composables/useRequests'
import { getAnimalFortune } from '~/utils/animalFortune'
import type { AppUser } from '~/types/user'
import type { Group } from '~/types/group'

definePageMeta({ middleware: ['auth'] })

const { user } = useCurrentUser()
const authStore = useAuthStore()
const { updateMyProfile, fetchUsers } = useUsers()
const { uploadImage } = useStorage()
const { fetchGroups } = useGroups()
const { format: formatDisplayName } = useDisplayName()
const { themeColor, ensureLoaded: ensureThemeColorLoaded, setThemeColor } = useThemeColor()
ensureThemeColorLoaded()

// 氏名欄は、空欄のまま保存すると「なし」が入ってしまう不具合の再発防止も兼ね、
// システム管理者以外は変更できないようにする（登録時に設定された氏名を維持する）
const canEditName = computed(() => authStore.isSystemAdmin)

const groups = ref<Group[]>([])
onMounted(async () => { groups.value = await fetchGroups().catch(() => []) })

// サポート者（メイン・サブ）の選択肢
const allUsers = ref<AppUser[]>([])
onMounted(async () => {
  allUsers.value = (await fetchUsers().catch(() => [])).filter(u => !u.isWithdrawn)
})

// ── サポート者（メイン・サブ）の変更申請 ──────────────────────────────────
// mainSupporterUid/subSupporterUidは組織図・EMタイトル自動計算・データ閲覧範囲に
// 影響する重要な項目のため、他の項目のように即時保存はせず、理事会承認を要する
// 「サポート者変更」申請（requests/new.vueと同じ仕組み）として送信する
const { submit: submitRequest } = useRequests()
const mainSupporterUid = ref('')
const subSupporterUid = ref('')
watch(() => user.value?.uid, () => {
  mainSupporterUid.value = user.value?.mainSupporterUid ?? ''
  subSupporterUid.value = user.value?.subSupporterUid ?? ''
}, { immediate: true })

const supporterChanged = computed(() =>
  mainSupporterUid.value !== (user.value?.mainSupporterUid ?? '') ||
  subSupporterUid.value !== (user.value?.subSupporterUid ?? ''),
)
const supporterSubmitting = ref(false)
const supporterSubmitted = ref(false)
const supporterError = ref('')

const submitSupporterChange = async () => {
  if (!user.value?.uid || !supporterChanged.value) return
  supporterSubmitting.value = true
  supporterError.value = ''
  try {
    await submitRequest({
      type: 'supporter_change',
      payload: {
        targetUid:         user.value.uid,
        targetName:        user.value.displayName,
        mainSupporterUid:  mainSupporterUid.value || undefined,
        mainSupporterName: allUsers.value.find(u => u.uid === mainSupporterUid.value)?.displayName,
        subSupporterUid:   subSupporterUid.value || undefined,
        subSupporterName:  allUsers.value.find(u => u.uid === subSupporterUid.value)?.displayName,
      },
    })
    supporterSubmitted.value = true
    setTimeout(() => { supporterSubmitted.value = false }, 4000)
  } catch (e: any) {
    supporterError.value = e.message ?? '申請の送信に失敗しました'
  } finally {
    supporterSubmitting.value = false
  }
}

// ログイン中の実ユーザーを優先し、未取得時のみモックデータにフォールバックする
const mockUser = computed(() =>
  user.value ?? MOCK_ADMIN_USERS.find(u => u.uid === 'mock-user-123')!
)

// ── フォームデータ ─────────────────────────────────────────────────────────
const form = reactive({
  // 基本情報
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
  // ビジネス情報
  businessContent: '',
  salaryContent: '',
  // 銀行情報（個人）
  resonaAccount: '',
  sbiAccount: '',
  otherBankName: '',
  otherBankBranch: '',
  otherBankAccount: '',
  yuuchoInfo: '',
  // 法人情報
  corporateName: '',
  corporateAccount: '',
  corporateSbiAccount: '',
  invoiceNumber: '',
  // 夢・目標
  dreamGoal: '',
  // SNS
  snsUrl: '',
})

// 日付系（ネイティブの日付ピッカーを使うため「なし」を代入できない項目）
const DATE_FIELDS = new Set(['joinDate', 'birthday', 'kumiaiJoinDate'])

// 動物占い（パーソナルデータと同じロジックを共用し、誕生日欄の入力に応じて即時反映する）
const animalFortune = computed(() => getAnimalFortune(form.birthday))

// 初期化
const loadForm = () => {
  const u = mockUser.value
  form.lastName = u.lastName ?? ''
  form.firstName = u.firstName ?? ''
  form.lastNameKana = u.lastNameKana ?? ''
  form.firstNameKana = u.firstNameKana ?? ''
  form.mobile = u.mobile ?? ''
  form.groupId = u.groupId ?? ''
  form.employeeId = u.employeeId ?? ''
  form.joinDate = u.joinDate ?? ''
  form.birthday = u.birthday ?? ''
  // type="month" の input は YYYY-MM 形式のみ受け付けるため切り詰める
  form.kumiaiJoinDate = (u.kumiaiJoinDate ?? '').slice(0, 7)
  form.localArea = u.localArea ?? ''
  form.hobbies = u.hobbies ?? ''
  form.selfIntro = u.selfIntro ?? ''
  form.businessContent = u.businessContent ?? ''
  form.salaryContent = u.salaryContent ?? ''
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

onMounted(loadForm)
watch(() => user.value?.uid, loadForm)

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
    // 未入力の項目は「なし」を明示的に登録する（日付系は形式上「なし」を入れられないため対象外）
    const payload: Record<string, string> = {}
    for (const [key, value] of Object.entries(form)) {
      const trimmed = (value ?? '').toString().trim()
      payload[key] = trimmed === '' && !DATE_FIELDS.has(key) ? 'なし' : trimmed
    }

    await updateMyProfile(payload)

    // フォームにも反映（画面上の表示を「なし」埋め後の状態に揃える）
    Object.assign(form, payload)
    if (authStore.user) {
      authStore.setUser({ ...authStore.user, ...payload } as AppUser)
    }

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
    const uid = user.value?.uid ?? 'unknown'
    const path = `avatars/${uid}/${Date.now()}-${file.name}`
    const url = await uploadImage(path, file)
    await updateMyProfile({ avatarUrl: url })
    if (authStore.user) {
      authStore.setUser({ ...authStore.user, avatarUrl: url })
    }
  } catch (e: any) {
    photoError.value = e.message ?? '写真のアップロードに失敗しました'
  } finally {
    uploadingPhoto.value = false
    if (photoInputRef.value) photoInputRef.value.value = ''
  }
}

// ── グループ表示 ──────────────────────────────────────────────────────────
const groupLabel = computed(() => groups.value.find(g => g.id === form.groupId)?.name ?? form.groupId)
</script>

<template>
  <div class="p-4 md:p-6 max-w-4xl mx-auto space-y-5">

    <!-- ページヘッダー -->
    <div class="flex items-start justify-between gap-3 flex-wrap">
      <div>
        <h1 class="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Icon name="heroicons:user-circle" class="h-6 w-6 text-primary-600" />
          マイページ
        </h1>
        <p class="mt-1 text-sm text-gray-500">
          プロフィール・業務情報を管理します。
          <NuxtLink v-if="user" :to="`/team/${user.uid}`" class="text-primary-600 hover:underline">公開プロフィールを見る</NuxtLink>
        </p>
      </div>
      <div class="flex items-start gap-2">
        <NuxtLink to="/settings" class="btn-secondary text-sm flex items-center gap-1.5">
          <Icon name="heroicons:cog-6-tooth" class="h-4 w-4" />
          通知・パスワード設定
        </NuxtLink>
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
    </div>

    <!-- プロフィールカード -->
    <div class="card p-5 flex items-center gap-4">
      <div class="relative shrink-0">
        <UserAvatar
          :avatar-url="mockUser.avatarUrl"
          :display-name="mockUser.displayName"
          :group-id="mockUser.groupId"
          size="lg"
        />
        <div v-if="uploadingPhoto" class="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
          <Icon name="heroicons:arrow-path" class="h-5 w-5 text-white animate-spin" />
        </div>
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-lg font-bold text-gray-900">{{ formatDisplayName(mockUser) }}</p>
        <div class="flex items-center gap-2 flex-wrap mt-1">
          <span class="badge bg-primary-50 text-primary-700 text-xs">{{ mockUser.position }}</span>
          <span class="badge bg-gray-100 text-gray-600 text-xs">{{ groupLabel }}</span>
          <span class="text-xs text-gray-400">{{ mockUser.email }}</span>
        </div>
        <p v-if="photoError" class="text-xs text-red-500 mt-1">{{ photoError }}</p>
      </div>
      <div class="shrink-0">
        <button class="btn-secondary text-xs flex items-center gap-1" :disabled="uploadingPhoto" @click="photoInputRef?.click()">
          <Icon name="heroicons:camera" class="h-3.5 w-3.5" />
          写真変更
        </button>
        <input ref="photoInputRef" type="file" accept="image/jpeg,image/png" class="hidden" @change="handlePhotoSelect" />
      </div>
    </div>

    <!-- 表示設定（配色） -->
    <div class="card p-5 flex items-center justify-between gap-4 flex-wrap">
      <div>
        <h2 class="font-semibold text-gray-900">表示設定</h2>
        <p class="text-xs text-gray-400 mt-0.5">アプリ全体の配色を切り替えます</p>
      </div>
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="flex items-center gap-2 rounded-lg border-2 px-3 py-2 text-sm font-medium transition"
          :class="themeColor === 'blue' ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'"
          @click="setThemeColor('blue')"
        >
          <span class="h-4 w-4 rounded-full bg-blue-500 shrink-0" />
          青系
        </button>
        <button
          type="button"
          class="flex items-center gap-2 rounded-lg border-2 px-3 py-2 text-sm font-medium transition"
          :class="themeColor === 'yellow' ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'"
          @click="setThemeColor('yellow')"
        >
          <span class="h-4 w-4 rounded-full bg-amber-500 shrink-0" />
          黄色系
        </button>
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
        <p v-if="!canEditName" class="text-xs text-gray-400 -mt-3">氏名の変更が必要な場合はシステム管理者にご連絡ください</p>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <!-- 氏名 -->
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">姓（氏名）</label>
            <input v-model="form.lastName" type="text" class="input-field text-sm disabled:bg-gray-50 disabled:text-gray-400" placeholder="山田" :disabled="!canEditName" />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">名（氏名）</label>
            <input v-model="form.firstName" type="text" class="input-field text-sm disabled:bg-gray-50 disabled:text-gray-400" placeholder="太郎" :disabled="!canEditName" />
          </div>

          <!-- よみがな -->
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">姓（よみがな）</label>
            <input v-model="form.lastNameKana" type="text" class="input-field text-sm disabled:bg-gray-50 disabled:text-gray-400" placeholder="ヤマダ" :disabled="!canEditName" />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">名（よみがな）</label>
            <input v-model="form.firstNameKana" type="text" class="input-field text-sm disabled:bg-gray-50 disabled:text-gray-400" placeholder="タロウ" :disabled="!canEditName" />
          </div>

          <!-- 連絡先 -->
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">メールアドレス</label>
            <input :value="mockUser.email" type="email" class="input-field text-sm bg-gray-50" disabled />
            <p class="mt-1 text-xs text-gray-400">ログインメールアドレスは管理者にご相談ください</p>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">携帯電話</label>
            <input v-model="form.mobile" type="tel" class="input-field text-sm" placeholder="090-0000-0000" />
          </div>

          <!-- 所属 -->
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">組織 / グループ</label>
            <select v-model="form.groupId" class="input-field text-sm">
              <option value="">選択してください</option>
              <option v-for="g in groups" :key="g.id" :value="g.id">{{ g.name }}</option>
            </select>
          </div>

          <!-- 未来設計ID -->
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">未来設計ID</label>
            <input v-model="form.employeeId" type="text" class="input-field text-sm" placeholder="MS-0001" />
          </div>

          <!-- インボイス番号 -->
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">インボイス番号</label>
            <input v-model="form.invoiceNumber" type="text" class="input-field text-sm" placeholder="T0000000000000" />
          </div>

          <!-- 誕生日 -->
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">誕生日</label>
            <input v-model="form.birthday" type="date" class="input-field text-sm" />
            <p v-if="animalFortune" class="mt-1.5 text-xs text-gray-500 flex items-center gap-1">
              <span>{{ animalFortune.emoji }}</span>
              <span>動物占い: <span class="font-medium text-gray-700">{{ animalFortune.animal }}</span>（{{ animalFortune.trait }}）</span>
            </p>
          </div>

          <!-- 組合加入年月 -->
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">組合加入年月</label>
            <input v-model="form.kumiaiJoinDate" type="month" class="input-field text-sm" />
          </div>

          <!-- 地元エリア -->
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">地元エリア</label>
            <input v-model="form.localArea" type="text" class="input-field text-sm" placeholder="福岡県福岡市" />
          </div>

          <!-- SNS -->
          <div class="sm:col-span-2">
            <label class="block text-xs font-medium text-gray-500 mb-1">SNS / HP URL</label>
            <input v-model="form.snsUrl" type="text" class="input-field text-sm" placeholder="https://..." />
          </div>

          <!-- 趣味・特技 -->
          <div class="sm:col-span-2">
            <label class="block text-xs font-medium text-gray-500 mb-1">趣味・特技</label>
            <input v-model="form.hobbies" type="text" class="input-field text-sm" placeholder="読書、ゴルフ など" />
          </div>

          <!-- 自己紹介 -->
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

        <!-- サポート者（メイン・サブ）: 理事会承認が必要なため、変更は申請として送信する -->
        <div class="rounded-lg border border-gray-200 p-4 space-y-3">
          <p class="text-xs font-medium text-gray-500">サポート者</p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">メインサポート</label>
              <SearchableUserSelect v-model="mainSupporterUid" :users="allUsers" placeholder="選択してください" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">サブサポート（任意）</label>
              <SearchableUserSelect v-model="subSupporterUid" :users="allUsers" placeholder="選択してください" />
            </div>
          </div>
          <p v-if="supporterSubmitted" class="text-xs text-green-600 flex items-center gap-1">
            <Icon name="heroicons:check-circle" class="h-3.5 w-3.5" />
            変更を申請しました。理事会の承認後に反映されます
          </p>
          <p v-if="supporterError" class="text-xs text-red-500">{{ supporterError }}</p>
          <div class="flex justify-end">
            <button
              type="button"
              class="btn-secondary text-xs !py-1.5"
              :disabled="!supporterChanged || supporterSubmitting"
              @click="submitSupporterChange"
            >
              <Icon v-if="supporterSubmitting" name="heroicons:arrow-path" class="h-3.5 w-3.5 animate-spin mr-1" />
              変更を申請する
            </button>
          </div>
        </div>

        <div class="grid grid-cols-1 gap-4">
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
        </div>
      </template>

      <!-- 夢・目標 -->
      <template v-if="activeTab === 'goal'">
        <h2 class="font-semibold text-gray-900 border-b border-gray-100 pb-2">夢・目標</h2>

        <div class="space-y-4">
          <div class="rounded-xl bg-amber-50 border border-amber-100 p-4">
            <div class="flex items-center gap-2 mb-3">
              <Icon name="heroicons:star" class="h-5 w-5 text-amber-500" />
              <p class="font-semibold text-amber-800 text-sm">あなたの夢・目標を書きましょう</p>
            </div>
            <p class="text-xs text-amber-600 leading-relaxed">
              仕事・家族・プライベートどんなことでも。夢を言語化することで実現に近づきます。
            </p>
          </div>

          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">夢・目標（自由記述）</label>
            <textarea
              v-model="form.dreamGoal"
              rows="10"
              class="input-field text-sm resize-none"
              placeholder="例：
・長女の夢をサポートしたい
・〇〇までに独立したい
・年収〇〇万円を達成する
・家族で〇〇旅行に行く
・趣味の〇〇を極める

など、自由に書いてください..."
            />
          </div>
        </div>
      </template>

    </div>

  </div>
</template>
