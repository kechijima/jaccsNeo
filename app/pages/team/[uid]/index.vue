<script setup lang="ts">
import type { AppUser } from '~/types/user'

definePageMeta({ middleware: ['auth'] })

const route = useRoute()
const uid = computed(() => route.params.uid as string)

const { fetchUser } = useUsers()
const { user: currentUser } = useCurrentUser()

const profile = ref<AppUser | null>(null)
const loading = ref(true)
const error = ref('')

const loadProfile = async () => {
  loading.value = true
  error.value = ''
  try {
    profile.value = await fetchUser(uid.value)
    if (!profile.value) error.value = 'プロフィールが見つかりませんでした'
  } catch (e: any) {
    error.value = e.message ?? 'プロフィールの取得に失敗しました'
  } finally {
    loading.value = false
  }
}

onMounted(loadProfile)

const isOwnProfile = computed(() => currentUser.value?.uid === uid.value)

const groupLabel = computed(() => {
  const map: Record<string, string> = { reterace: 'Reterace', miraito: 'Miraito', asset: 'Asset' }
  return profile.value?.groupId ? (map[profile.value.groupId] ?? profile.value.groupId) : 'なし'
})

const roleLabels: Record<string, string> = {
  system_admin: 'システム管理者',
  board:        '理事会メンバー',
  em2_above:    'EM2以上',
  general:      '一般',
}

// 未入力の項目は「なし」と明示的に表示する
const v = (val?: string | null) => (val && val.trim() ? val : 'なし')

const tabs = [
  { key: 'basic',     label: '基本情報',   icon: 'heroicons:user' },
  { key: 'business',  label: 'ビジネス',   icon: 'heroicons:briefcase' },
  { key: 'bank',      label: '口座情報',   icon: 'heroicons:building-library' },
  { key: 'corporate', label: '法人情報',   icon: 'heroicons:building-office-2' },
  { key: 'goal',      label: '夢・目標',   icon: 'heroicons:star' },
] as const
const activeTab = ref<typeof tabs[number]['key']>('basic')
</script>

<template>
  <div class="p-4 md:p-6 max-w-4xl mx-auto space-y-5">

    <!-- パンくず -->
    <div class="flex items-center gap-2 text-sm text-gray-400">
      <NuxtLink to="/team/members">チームメンバー</NuxtLink>
      <Icon name="heroicons:chevron-right" class="h-3 w-3" />
      <span class="text-gray-600">プロフィール</span>
    </div>

    <!-- 読み込み中 -->
    <div v-if="loading" class="card p-12 text-center">
      <Icon name="heroicons:arrow-path" class="h-8 w-8 text-gray-300 mx-auto mb-2 animate-spin" />
      <p class="text-sm text-gray-400">読み込み中...</p>
    </div>

    <!-- エラー -->
    <div v-else-if="error || !profile" class="card p-12 text-center">
      <Icon name="heroicons:exclamation-circle" class="h-8 w-8 text-red-300 mx-auto mb-2" />
      <p class="text-sm text-red-500">{{ error }}</p>
    </div>

    <template v-else>
      <!-- プロフィールカード -->
      <div class="card p-5 flex items-center gap-4 flex-wrap">
        <img
          v-if="profile.avatarUrl"
          :src="profile.avatarUrl"
          alt=""
          class="h-16 w-16 shrink-0 rounded-full object-cover"
        />
        <div v-else class="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700 text-2xl font-bold">
          {{ profile.displayName.charAt(0) }}
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-lg font-bold text-gray-900">{{ profile.displayName }}</p>
          <div class="flex items-center gap-2 flex-wrap mt-1">
            <span class="badge bg-primary-50 text-primary-700 text-xs">{{ v(profile.position) }}</span>
            <span class="badge bg-gray-100 text-gray-600 text-xs">{{ groupLabel }}</span>
            <span class="badge bg-indigo-50 text-indigo-600 text-xs">{{ roleLabels[profile.role] }}</span>
            <span class="text-xs text-gray-400">{{ profile.email }}</span>
          </div>
        </div>
        <NuxtLink v-if="isOwnProfile" to="/mypage" class="btn-secondary text-xs flex items-center gap-1.5 shrink-0">
          <Icon name="heroicons:pencil" class="h-3.5 w-3.5" />
          編集する
        </NuxtLink>
      </div>

      <!-- タブ -->
      <div class="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-hide">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors shrink-0"
          :class="activeTab === tab.key ? 'bg-primary-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100'"
          @click="activeTab = tab.key"
        >
          <Icon :name="tab.icon" class="h-4 w-4" />
          {{ tab.label }}
        </button>
      </div>

      <!-- タブコンテンツ -->
      <div class="card p-5 space-y-4">

        <!-- 基本情報 -->
        <template v-if="activeTab === 'basic'">
          <h2 class="font-semibold text-gray-900 border-b border-gray-100 pb-2">基本情報</h2>
          <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div><dt class="text-gray-500 text-xs">氏名（よみがな）</dt><dd class="font-medium text-gray-900 mt-0.5">{{ v(`${profile.lastNameKana ?? ''} ${profile.firstNameKana ?? ''}`.trim()) }}</dd></div>
            <div><dt class="text-gray-500 text-xs">携帯電話</dt><dd class="font-medium text-gray-900 mt-0.5">{{ v(profile.mobile) }}</dd></div>
            <div><dt class="text-gray-500 text-xs">従業員ID</dt><dd class="font-medium text-gray-900 mt-0.5">{{ v(profile.employeeId) }}</dd></div>
            <div><dt class="text-gray-500 text-xs">入社日</dt><dd class="font-medium text-gray-900 mt-0.5">{{ v(profile.joinDate) }}</dd></div>
            <div><dt class="text-gray-500 text-xs">誕生日</dt><dd class="font-medium text-gray-900 mt-0.5">{{ v(profile.birthday) }}</dd></div>
            <div><dt class="text-gray-500 text-xs">組合加入年月</dt><dd class="font-medium text-gray-900 mt-0.5">{{ v(profile.kumiaiJoinDate) }}</dd></div>
            <div><dt class="text-gray-500 text-xs">国籍</dt><dd class="font-medium text-gray-900 mt-0.5">{{ v(profile.nationality) }}</dd></div>
            <div><dt class="text-gray-500 text-xs">地元エリア</dt><dd class="font-medium text-gray-900 mt-0.5">{{ v(profile.localArea) }}</dd></div>
            <div class="sm:col-span-2"><dt class="text-gray-500 text-xs">SNS / HP URL</dt><dd class="font-medium text-gray-900 mt-0.5 break-all">{{ v(profile.snsUrl) }}</dd></div>
            <div class="sm:col-span-2"><dt class="text-gray-500 text-xs">趣味・特技</dt><dd class="font-medium text-gray-900 mt-0.5">{{ v(profile.hobbies) }}</dd></div>
            <div class="sm:col-span-2"><dt class="text-gray-500 text-xs">コメント（一言）</dt><dd class="font-medium text-gray-900 mt-0.5">{{ v(profile.comment) }}</dd></div>
            <div class="sm:col-span-2"><dt class="text-gray-500 text-xs">自己紹介</dt><dd class="font-medium text-gray-900 mt-0.5 whitespace-pre-line">{{ v(profile.selfIntro) }}</dd></div>
          </dl>
        </template>

        <!-- ビジネス情報 -->
        <template v-if="activeTab === 'business'">
          <h2 class="font-semibold text-gray-900 border-b border-gray-100 pb-2">ビジネス情報</h2>
          <dl class="space-y-3 text-sm">
            <div><dt class="text-gray-500 text-xs">サポート者</dt><dd class="font-medium text-gray-900 mt-0.5">{{ v(profile.supportPerson) }}</dd></div>
            <div><dt class="text-gray-500 text-xs">ビジネス内容</dt><dd class="font-medium text-gray-900 mt-0.5 whitespace-pre-line">{{ v(profile.businessContent) }}</dd></div>
            <div><dt class="text-gray-500 text-xs">サラリーの内容</dt><dd class="font-medium text-gray-900 mt-0.5 whitespace-pre-line">{{ v(profile.salaryContent) }}</dd></div>
          </dl>
        </template>

        <!-- 口座情報 -->
        <template v-if="activeTab === 'bank'">
          <h2 class="font-semibold text-gray-900 border-b border-gray-100 pb-2">個人口座情報</h2>
          <dl class="space-y-3 text-sm">
            <div><dt class="text-gray-500 text-xs">りそな口座</dt><dd class="font-medium text-gray-900 mt-0.5">{{ v(profile.resonaAccount) }}</dd></div>
            <div><dt class="text-gray-500 text-xs">SBI口座</dt><dd class="font-medium text-gray-900 mt-0.5">{{ v(profile.sbiAccount) }}</dd></div>
            <div><dt class="text-gray-500 text-xs">上記以外の銀行</dt><dd class="font-medium text-gray-900 mt-0.5">{{ v([profile.otherBankName, profile.otherBankBranch, profile.otherBankAccount].filter(Boolean).join(' / ')) }}</dd></div>
            <div><dt class="text-gray-500 text-xs">ゆうちょ加入情報</dt><dd class="font-medium text-gray-900 mt-0.5 whitespace-pre-line">{{ v(profile.yuuchoInfo) }}</dd></div>
          </dl>
        </template>

        <!-- 法人情報 -->
        <template v-if="activeTab === 'corporate'">
          <h2 class="font-semibold text-gray-900 border-b border-gray-100 pb-2">法人情報</h2>
          <dl class="space-y-3 text-sm">
            <div><dt class="text-gray-500 text-xs">法人名</dt><dd class="font-medium text-gray-900 mt-0.5">{{ v(profile.corporateName) }}</dd></div>
            <div><dt class="text-gray-500 text-xs">法人口座（メイン）</dt><dd class="font-medium text-gray-900 mt-0.5">{{ v(profile.corporateAccount) }}</dd></div>
            <div><dt class="text-gray-500 text-xs">法人SBI口座</dt><dd class="font-medium text-gray-900 mt-0.5">{{ v(profile.corporateSbiAccount) }}</dd></div>
            <div><dt class="text-gray-500 text-xs">インボイス番号</dt><dd class="font-medium text-gray-900 mt-0.5">{{ v(profile.invoiceNumber) }}</dd></div>
          </dl>
        </template>

        <!-- 夢・目標 -->
        <template v-if="activeTab === 'goal'">
          <h2 class="font-semibold text-gray-900 border-b border-gray-100 pb-2">夢・目標</h2>
          <p class="text-sm text-gray-900 whitespace-pre-line">{{ v(profile.dreamGoal) }}</p>
        </template>

      </div>
    </template>

  </div>
</template>
