<script setup lang="ts">
import { MOCK_ADMIN_USERS } from '~/data/mock'

definePageMeta({ middleware: ['auth'] })

const { user } = useCurrentUser()

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
  email: '',
  mobile: '',
  position: '',
  groupId: '',
  employeeId: '',
  joinDate: '',
  birthday: '',
  kumiaiJoinDate: '',
  nationality: '',
  localArea: '',
  hobbies: '',
  comment: '',
  selfIntro: '',
  // ビジネス情報
  businessContent: '',
  salaryContent: '',
  supportPerson: '',
  // 銀行情報（個人）
  risonaAccount: '',
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

// 初期化
onMounted(() => {
  const u = mockUser.value
  form.lastName = u.lastName ?? ''
  form.firstName = u.firstName ?? ''
  form.lastNameKana = u.lastNameKana ?? ''
  form.firstNameKana = u.firstNameKana ?? ''
  form.email = u.email ?? ''
  form.mobile = u.mobile ?? ''
  form.position = u.position ?? ''
  form.groupId = u.groupId ?? ''
  form.birthday = u.birthday ?? ''
  // type="month" の input は YYYY-MM 形式のみ受け付けるため切り詰める
  form.kumiaiJoinDate = (u.kumiaiJoinDate ?? '').slice(0, 7)
  form.selfIntro = u.selfIntro ?? ''
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

const saveProfile = async () => {
  saving.value = true
  await new Promise(r => setTimeout(r, 600))
  saving.value = false
  saved.value = true
  setTimeout(() => { saved.value = false }, 2500)
}

// ── グループ表示 ──────────────────────────────────────────────────────────
const groupLabel = computed(() => {
  const map: Record<string, string> = {
    reterace: 'Reterace',
    miraito:  'Miraito',
    asset:    'Asset',
  }
  return map[form.groupId] ?? form.groupId
})
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
        <p class="mt-1 text-sm text-gray-500">プロフィール・業務情報を管理します</p>
      </div>
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
    </div>

    <!-- プロフィールカード -->
    <div class="card p-5 flex items-center gap-4">
      <div class="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700 text-2xl font-bold">
        {{ mockUser.displayName.charAt(0) }}
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-lg font-bold text-gray-900">{{ mockUser.displayName }}</p>
        <div class="flex items-center gap-2 flex-wrap mt-1">
          <span class="badge bg-primary-50 text-primary-700 text-xs">{{ mockUser.position }}</span>
          <span class="badge bg-gray-100 text-gray-600 text-xs">{{ groupLabel }}</span>
          <span class="text-xs text-gray-400">{{ mockUser.email }}</span>
        </div>
      </div>
      <div class="shrink-0">
        <button class="btn-secondary text-xs flex items-center gap-1">
          <Icon name="heroicons:camera" class="h-3.5 w-3.5" />
          写真変更
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

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <!-- 氏名 -->
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">姓（氏名）</label>
            <input v-model="form.lastName" type="text" class="input-field text-sm" placeholder="山田" />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">名（氏名）</label>
            <input v-model="form.firstName" type="text" class="input-field text-sm" placeholder="太郎" />
          </div>

          <!-- よみがな -->
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">姓（よみがな）</label>
            <input v-model="form.lastNameKana" type="text" class="input-field text-sm" placeholder="ヤマダ" />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">名（よみがな）</label>
            <input v-model="form.firstNameKana" type="text" class="input-field text-sm" placeholder="タロウ" />
          </div>

          <!-- 連絡先 -->
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">メールアドレス</label>
            <input v-model="form.email" type="email" class="input-field text-sm" placeholder="example@email.com" />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">携帯電話</label>
            <input v-model="form.mobile" type="tel" class="input-field text-sm" placeholder="090-0000-0000" />
          </div>

          <!-- 所属・役職 -->
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">組織 / グループ</label>
            <select v-model="form.groupId" class="input-field text-sm">
              <option value="">選択してください</option>
              <option value="reterace">Reterace</option>
              <option value="miraito">Miraito</option>
              <option value="asset">Asset</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">役職</label>
            <input v-model="form.position" type="text" class="input-field text-sm" placeholder="FP / 部長 など" />
          </div>

          <!-- 従業員ID -->
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">従業員ID</label>
            <input v-model="form.employeeId" type="text" class="input-field text-sm" placeholder="EMP-0001" />
          </div>

          <!-- 入社日 -->
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">入社日</label>
            <input v-model="form.joinDate" type="date" class="input-field text-sm" />
          </div>

          <!-- 誕生日 -->
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">誕生日</label>
            <input v-model="form.birthday" type="date" class="input-field text-sm" />
          </div>

          <!-- 組合加入年月 -->
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">組合加入年月</label>
            <input v-model="form.kumiaiJoinDate" type="month" class="input-field text-sm" />
          </div>

          <!-- 国籍 -->
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">国籍</label>
            <input v-model="form.nationality" type="text" class="input-field text-sm" placeholder="日本" />
          </div>

          <!-- 地元エリア -->
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">地元エリア</label>
            <input v-model="form.localArea" type="text" class="input-field text-sm" placeholder="福岡県福岡市" />
          </div>

          <!-- SNS -->
          <div class="sm:col-span-2">
            <label class="block text-xs font-medium text-gray-500 mb-1">SNS / HP URL</label>
            <input v-model="form.snsUrl" type="url" class="input-field text-sm" placeholder="https://..." />
          </div>

          <!-- 趣味・特技 -->
          <div class="sm:col-span-2">
            <label class="block text-xs font-medium text-gray-500 mb-1">趣味・特技</label>
            <input v-model="form.hobbies" type="text" class="input-field text-sm" placeholder="読書、ゴルフ など" />
          </div>

          <!-- コメント -->
          <div class="sm:col-span-2">
            <label class="block text-xs font-medium text-gray-500 mb-1">コメント（一言）</label>
            <input v-model="form.comment" type="text" class="input-field text-sm" placeholder="ひとこと" />
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
            <input v-model="form.risonaAccount" type="text" class="input-field text-sm" placeholder="支店名・口座番号" />
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
