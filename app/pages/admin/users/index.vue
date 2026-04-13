<script setup lang="ts">
import { MOCK_ADMIN_USERS } from '~/data/mock'

definePageMeta({ middleware: ['auth', 'admin'] })

const roleLabels: Record<string, string> = {
  system_admin: 'システム管理者',
  board:        '理事会メンバー',
  em2_above:    'EM2以上',
  general:      '一般',
}

const roleColors: Record<string, string> = {
  system_admin: 'bg-red-100 text-red-700',
  board:        'bg-purple-100 text-purple-700',
  em2_above:    'bg-indigo-100 text-indigo-700',
  general:      'bg-gray-100 text-gray-600',
}

const groupLabels: Record<string, string> = {
  reterace: 'Reterace',
  miraito:  'Miraito',
  asset:    'Asset',
}

// ── フィルター ────────────────────────────────────────────────────────
const searchQuery  = ref('')
const filterGroup  = ref('')
const filterRole   = ref('')
const showFilter   = ref(false)

const GROUPS = ['reterace', 'miraito', 'asset']

const activeCount = computed(() =>
  [filterGroup.value, filterRole.value].filter(Boolean).length
)

const resetFilters = () => {
  searchQuery.value = ''
  filterGroup.value = ''
  filterRole.value  = ''
}

// ── フィルタリング ─────────────────────────────────────────────────────
const users = computed(() => {
  let list = MOCK_ADMIN_USERS

  const q = searchQuery.value.trim().toLowerCase()
  if (q) {
    list = list.filter(u =>
      u.displayName?.includes(searchQuery.value.trim()) ||
      `${u.lastNameKana ?? ''}${u.firstNameKana ?? ''}`.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.mobile?.includes(q)
    )
  }
  if (filterGroup.value) list = list.filter(u => u.groupId === filterGroup.value)
  if (filterRole.value)  list = list.filter(u => u.role === filterRole.value)

  return list
})

// ── 選択ユーザー詳細 ──────────────────────────────────────────────────
const selectedUser = ref<any>(null)
const openDetail = (u: any) => { selectedUser.value = u }
</script>

<template>
  <div class="p-4 md:p-6 max-w-6xl mx-auto space-y-5">

    <!-- パンくず -->
    <div class="flex items-center gap-2 text-sm text-gray-400">
      <NuxtLink to="/admin">管理者設定</NuxtLink>
      <Icon name="heroicons:chevron-right" class="h-3 w-3" />
      <span class="text-gray-600">ユーザー管理</span>
    </div>

    <!-- ヘッダー -->
    <div class="flex items-start justify-between gap-3">
      <div>
        <h1 class="text-xl font-bold text-gray-900">ユーザー管理</h1>
        <p class="text-sm text-gray-500 mt-0.5">{{ users.length }}名表示中（全{{ MOCK_ADMIN_USERS.length }}名）</p>
      </div>
      <NuxtLink to="/admin/users/new" class="btn-primary text-sm flex items-center gap-1.5">
        <Icon name="heroicons:user-plus" class="h-4 w-4" />
        ユーザー追加
      </NuxtLink>
    </div>

    <!-- 検索 + フィルター -->
    <div class="flex items-center gap-2">
      <div class="relative flex-1">
        <Icon name="heroicons:magnifying-glass" class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          v-model="searchQuery"
          type="search"
          placeholder="氏名・よみがな・メール・携帯で検索..."
          class="input-field pl-9"
        />
      </div>
      <button
        class="relative flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition"
        :class="activeCount > 0
          ? 'border-primary-400 bg-primary-50 text-primary-700'
          : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'"
        @click="showFilter = !showFilter"
      >
        <Icon name="heroicons:adjustments-horizontal" class="h-4 w-4" />
        絞り込み
        <span
          v-if="activeCount > 0"
          class="flex h-4 w-4 items-center justify-center rounded-full bg-primary-500 text-[10px] text-white font-bold"
        >{{ activeCount }}</span>
      </button>
      <button
        v-if="activeCount > 0 || searchQuery"
        class="text-xs text-gray-400 hover:text-red-500 transition flex items-center gap-0.5"
        @click="resetFilters"
      >
        <Icon name="heroicons:x-mark" class="h-3.5 w-3.5" />リセット
      </button>
    </div>

    <!-- フィルターパネル -->
    <Transition
      enter-active-class="transition duration-150"
      enter-from-class="opacity-0 -translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-100"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-2"
    >
      <div v-if="showFilter" class="card p-4 grid grid-cols-2 gap-4">
        <div class="space-y-1">
          <label class="text-xs font-medium text-gray-500">グループ</label>
          <select v-model="filterGroup" class="input-field text-sm py-1.5">
            <option value="">すべて</option>
            <option v-for="g in GROUPS" :key="g" :value="g">{{ groupLabels[g] }}</option>
          </select>
        </div>
        <div class="space-y-1">
          <label class="text-xs font-medium text-gray-500">ロール</label>
          <select v-model="filterRole" class="input-field text-sm py-1.5">
            <option value="">すべて</option>
            <option v-for="(label, key) in roleLabels" :key="key" :value="key">{{ label }}</option>
          </select>
        </div>
      </div>
    </Transition>

    <!-- PC テーブル -->
    <div class="hidden md:block card overflow-hidden">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-gray-100 bg-gray-50">
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">氏名 / よみがな</th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">グループ / 組合</th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">携帯電話</th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">現在エリア</th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">ロール / 役職</th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">状態</th>
            <th class="px-4 py-3" />
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50">
          <tr v-if="users.length === 0">
            <td colspan="7" class="py-12 text-center text-gray-400">
              <Icon name="heroicons:users" class="h-10 w-10 mx-auto mb-2 text-gray-200" />
              条件に一致するユーザーがいません
            </td>
          </tr>
          <tr
            v-for="u in users"
            :key="u.uid"
            class="hover:bg-gray-50 cursor-pointer transition"
            @click="openDetail(u)"
          >
            <td class="px-4 py-3">
              <div class="font-medium text-gray-900">{{ u.displayName }}</div>
              <div v-if="u.lastNameKana" class="text-xs text-gray-400">{{ u.lastNameKana }} {{ u.firstNameKana }}</div>
            </td>
            <td class="px-4 py-3 text-xs text-gray-600">
              <span v-if="u.groupId" class="font-medium">{{ groupLabels[u.groupId] || u.groupId }}</span>
              <span v-if="u.kumiaiName" class="block text-gray-400 mt-0.5">{{ u.kumiaiName }}</span>
            </td>
            <td class="px-4 py-3 text-gray-600 text-xs">{{ u.mobile || '—' }}</td>
            <td class="px-4 py-3 text-gray-600 text-xs">{{ u.currentArea || '—' }}</td>
            <td class="px-4 py-3">
              <span class="badge text-xs" :class="roleColors[u.role]">{{ roleLabels[u.role] }}</span>
              <div v-if="u.position" class="text-xs text-gray-400 mt-0.5">{{ u.position }}</div>
            </td>
            <td class="px-4 py-3">
              <span class="badge text-xs" :class="u.isActive !== false ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'">
                {{ u.isActive !== false ? '有効' : '無効' }}
              </span>
            </td>
            <td class="px-4 py-3 text-right">
              <NuxtLink
                :to="`/admin/users/${u.uid}/edit`"
                class="text-xs text-primary-600 hover:underline"
                @click.stop
              >編集</NuxtLink>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- SP カードリスト -->
    <div class="md:hidden space-y-2">
      <div v-if="users.length === 0" class="card p-10 text-center text-gray-400">
        条件に一致するユーザーがいません
      </div>
      <div
        v-for="u in users"
        :key="u.uid"
        class="card p-4 cursor-pointer"
        @click="openDetail(u)"
      >
        <div class="flex items-start justify-between gap-2">
          <div>
            <p class="font-semibold text-gray-900">{{ u.displayName }}</p>
            <p v-if="u.lastNameKana" class="text-xs text-gray-400">{{ u.lastNameKana }} {{ u.firstNameKana }}</p>
            <p v-if="u.mobile" class="text-xs text-gray-600 mt-1">{{ u.mobile }}</p>
          </div>
          <div class="flex flex-col items-end gap-1 shrink-0">
            <span class="badge text-xs" :class="roleColors[u.role]">{{ roleLabels[u.role] }}</span>
            <span class="text-xs text-gray-400">{{ groupLabels[u.groupId] || '—' }}</span>
          </div>
        </div>
        <div class="mt-2 flex justify-between text-xs text-gray-400">
          <span>{{ u.kumiaiName || '' }}</span>
          <NuxtLink :to="`/admin/users/${u.uid}/edit`" class="text-primary-600" @click.stop>編集</NuxtLink>
        </div>
      </div>
    </div>

    <!-- ────── 詳細スライドオーバー ────── -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-200"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-150"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="selectedUser"
          class="fixed inset-0 z-50 flex justify-end bg-black/30"
          @click.self="selectedUser = null"
        >
          <div class="w-full max-w-md bg-white shadow-2xl overflow-y-auto">
            <!-- ヘッダー -->
            <div class="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between z-10">
              <h2 class="font-bold text-gray-900 text-base">{{ selectedUser.displayName }}</h2>
              <button class="p-1.5 rounded-lg hover:bg-gray-100" @click="selectedUser = null">
                <Icon name="heroicons:x-mark" class="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div class="p-5 space-y-6 text-sm">

              <!-- 基本情報 -->
              <section>
                <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">基本情報</h3>
                <dl class="space-y-2">
                  <div class="grid grid-cols-3 gap-1">
                    <dt class="text-gray-500">姓 / 名</dt>
                    <dd class="col-span-2 font-medium">{{ selectedUser.lastName }} {{ selectedUser.firstName }}</dd>
                  </div>
                  <div class="grid grid-cols-3 gap-1">
                    <dt class="text-gray-500">よみがな</dt>
                    <dd class="col-span-2">{{ selectedUser.lastNameKana }} {{ selectedUser.firstNameKana }}</dd>
                  </div>
                  <div class="grid grid-cols-3 gap-1">
                    <dt class="text-gray-500">携帯電話</dt>
                    <dd class="col-span-2">{{ selectedUser.mobile || '—' }}</dd>
                  </div>
                  <div class="grid grid-cols-3 gap-1">
                    <dt class="text-gray-500">誕生日</dt>
                    <dd class="col-span-2">{{ selectedUser.birthday || '—' }}</dd>
                  </div>
                  <div class="grid grid-cols-3 gap-1">
                    <dt class="text-gray-500">メール</dt>
                    <dd class="col-span-2 text-xs break-all">{{ selectedUser.email }}</dd>
                  </div>
                </dl>
              </section>

              <!-- 組織情報 -->
              <section>
                <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">組織情報</h3>
                <dl class="space-y-2">
                  <div class="grid grid-cols-3 gap-1">
                    <dt class="text-gray-500">グループ名</dt>
                    <dd class="col-span-2">{{ groupLabels[selectedUser.groupId] || '—' }}</dd>
                  </div>
                  <div class="grid grid-cols-3 gap-1">
                    <dt class="text-gray-500">組合</dt>
                    <dd class="col-span-2">{{ selectedUser.kumiaiName || '—' }}</dd>
                  </div>
                  <div class="grid grid-cols-3 gap-1">
                    <dt class="text-gray-500">組合加入年月</dt>
                    <dd class="col-span-2">{{ selectedUser.kumiaiJoinDate || '—' }}</dd>
                  </div>
                  <div class="grid grid-cols-3 gap-1">
                    <dt class="text-gray-500">ロール / 役職</dt>
                    <dd class="col-span-2">
                      <span class="badge text-xs mr-1" :class="roleColors[selectedUser.role]">{{ roleLabels[selectedUser.role] }}</span>
                      {{ selectedUser.position || '' }}
                    </dd>
                  </div>
                  <div v-if="selectedUser.supporter?.mainName || selectedUser.supporter?.subName" class="grid grid-cols-3 gap-1">
                    <dt class="text-gray-500">サポート者</dt>
                    <dd class="col-span-2">
                      <span v-if="selectedUser.supporter?.mainName">メイン: {{ selectedUser.supporter.mainName }}</span>
                      <span v-if="selectedUser.supporter?.subName" class="block">サブ: {{ selectedUser.supporter.subName }}</span>
                    </dd>
                  </div>
                </dl>
              </section>

              <!-- 活動情報 -->
              <section>
                <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">活動情報</h3>
                <dl class="space-y-2">
                  <div class="grid grid-cols-3 gap-1">
                    <dt class="text-gray-500">地元エリア</dt>
                    <dd class="col-span-2">{{ selectedUser.hometownArea || '—' }}</dd>
                  </div>
                  <div class="grid grid-cols-3 gap-1">
                    <dt class="text-gray-500">現在エリア</dt>
                    <dd class="col-span-2">{{ selectedUser.currentArea || '—' }}</dd>
                  </div>
                  <div v-if="selectedUser.businessContent" class="grid grid-cols-3 gap-1">
                    <dt class="text-gray-500">ビジネス内容</dt>
                    <dd class="col-span-2 text-xs leading-relaxed">{{ selectedUser.businessContent }}</dd>
                  </div>
                  <div v-if="selectedUser.salaryContent" class="grid grid-cols-3 gap-1">
                    <dt class="text-gray-500">サラリー内容</dt>
                    <dd class="col-span-2 text-xs leading-relaxed">{{ selectedUser.salaryContent }}</dd>
                  </div>
                  <div v-if="selectedUser.hobbies" class="grid grid-cols-3 gap-1">
                    <dt class="text-gray-500">趣味・特技</dt>
                    <dd class="col-span-2">{{ selectedUser.hobbies }}</dd>
                  </div>
                </dl>
              </section>

              <!-- 口座情報 -->
              <section>
                <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">口座情報</h3>
                <dl class="space-y-2">
                  <div v-if="selectedUser.resonaAccount" class="grid grid-cols-3 gap-1">
                    <dt class="text-gray-500">りそな</dt>
                    <dd class="col-span-2 text-xs">{{ selectedUser.resonaAccount.branch }} / {{ selectedUser.resonaAccount.number }}</dd>
                  </div>
                  <div v-if="selectedUser.sbiAccount" class="grid grid-cols-3 gap-1">
                    <dt class="text-gray-500">SBI</dt>
                    <dd class="col-span-2 text-xs">{{ selectedUser.sbiAccount.branch }} / {{ selectedUser.sbiAccount.number }}</dd>
                  </div>
                  <div v-if="selectedUser.otherBankAccount" class="grid grid-cols-3 gap-1">
                    <dt class="text-gray-500">その他銀行</dt>
                    <dd class="col-span-2 text-xs">
                      {{ selectedUser.otherBankAccount.bankName }} {{ selectedUser.otherBankAccount.branch }} /
                      {{ selectedUser.otherBankAccount.type }} {{ selectedUser.otherBankAccount.number }} /
                      {{ selectedUser.otherBankAccount.holderName }}
                    </dd>
                  </div>
                  <div v-if="selectedUser.yuchoAccount" class="grid grid-cols-3 gap-1">
                    <dt class="text-gray-500">ゆうちょ</dt>
                    <dd class="col-span-2 text-xs">
                      {{ selectedUser.yuchoAccount.storeName }}（{{ selectedUser.yuchoAccount.storeCode }}） /
                      {{ selectedUser.yuchoAccount.type }} {{ selectedUser.yuchoAccount.number }} /
                      {{ selectedUser.yuchoAccount.holderName }}
                    </dd>
                  </div>
                </dl>
              </section>

              <!-- 法人情報 -->
              <section v-if="selectedUser.corporateName || selectedUser.corporateResonaAccount || selectedUser.corporateSbiAccount">
                <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">法人情報</h3>
                <dl class="space-y-2">
                  <div v-if="selectedUser.corporateName" class="grid grid-cols-3 gap-1">
                    <dt class="text-gray-500">法人名</dt>
                    <dd class="col-span-2">{{ selectedUser.corporateName }}</dd>
                  </div>
                  <div v-if="selectedUser.corporateResonaAccount" class="grid grid-cols-3 gap-1">
                    <dt class="text-gray-500">法人りそな</dt>
                    <dd class="col-span-2 text-xs">{{ selectedUser.corporateResonaAccount.branch }} / {{ selectedUser.corporateResonaAccount.number }}</dd>
                  </div>
                  <div v-if="selectedUser.corporateSbiAccount" class="grid grid-cols-3 gap-1">
                    <dt class="text-gray-500">法人SBI</dt>
                    <dd class="col-span-2 text-xs">{{ selectedUser.corporateSbiAccount.branch }} / {{ selectedUser.corporateSbiAccount.number }}</dd>
                  </div>
                </dl>
              </section>

              <!-- プロフィール -->
              <section v-if="selectedUser.selfIntro || selectedUser.recentGoal">
                <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">プロフィール</h3>
                <dl class="space-y-3">
                  <div v-if="selectedUser.selfIntro">
                    <dt class="text-gray-500 mb-1">自己紹介</dt>
                    <dd class="text-xs leading-relaxed bg-gray-50 rounded-lg p-3">{{ selectedUser.selfIntro }}</dd>
                  </div>
                  <div v-if="selectedUser.recentGoal">
                    <dt class="text-gray-500 mb-1">直近の夢・目標</dt>
                    <dd class="text-xs leading-relaxed bg-gray-50 rounded-lg p-3">{{ selectedUser.recentGoal }}</dd>
                  </div>
                </dl>
              </section>

              <!-- アクション -->
              <div class="flex gap-3 pt-2">
                <NuxtLink :to="`/admin/users/${selectedUser.uid}/edit`" class="flex-1 btn-primary text-center text-sm">
                  編集する
                </NuxtLink>
                <button class="flex-1 btn-secondary text-sm" @click="selectedUser = null">閉じる</button>
              </div>

            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>
