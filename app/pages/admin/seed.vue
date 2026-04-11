<script setup lang="ts">
import type { ServiceType } from '~/types/service'

definePageMeta({ middleware: ['auth', 'admin'] })

const { createCustomer } = useCustomers()
const { createCase } = useServices()

const loading = ref(false)
const done = ref(false)
const logs = ref<Array<{ type: 'info' | 'success' | 'error'; text: string }>>([])

const sampleCustomers = [
  {
    type: 'individual' as const,
    name: '田中 一郎',
    nameKana: 'タナカ イチロウ',
    gender: '男性',
    dob: '1981-03-15',
    tel: '090-1234-5678',
    email: 'tanaka.ichiro@example.com',
    postalCode: '790-0001',
    address: '愛媛県松山市一番町1-1-1',
    employer: '株式会社松山製作所',
    annualIncome: '600万円',
    jobType: '製造業',
    relationship: '友人',
    stage: '3段',
    familyMembers: [
      { name: '田中 幸子', relationship: '配偶者', dob: '1983-07-22', occupation: '専業主婦' },
      { name: '田中 健太', relationship: '長男', dob: '2010-04-05', occupation: '小学生' },
    ],
    cases: [
      { serviceType: 'lifeInsurance' as ServiceType, status: 'contracted', date: '2025-06-01', contractDate: '2025-09-15', amount: '月額28,000円', company: '住友生命', notes: '定期保険3000万+医療特約。受取人は配偶者。' },
      { serviceType: 'homeLoan' as ServiceType, status: 'consulting', date: '2026-03-01', notes: '新築マンション購入を検討中。借入希望額3,500万円。' },
    ],
  },
  {
    type: 'individual' as const,
    name: '佐藤 花子',
    nameKana: 'サトウ ハナコ',
    gender: '女性',
    dob: '1988-11-03',
    tel: '080-9876-5432',
    email: 'sato.hanako@example.com',
    postalCode: '790-0063',
    address: '愛媛県松山市余戸西2-3-4',
    employer: '医療法人 松山クリニック',
    annualIncome: '450万円',
    jobType: '医療・福祉',
    relationship: '紹介',
    stage: '2段',
    familyMembers: [
      { name: '佐藤 太郎', relationship: '配偶者', dob: '1985-05-18', occupation: '会社員' },
    ],
    cases: [
      { serviceType: 'lifeInsurance' as ServiceType, status: 'considering', date: '2026-02-15', notes: 'アフラック医療保険と比較検討中。子供の教育保険も追加希望。' },
      { serviceType: 'realEstatePurchase' as ServiceType, status: 'consulting', date: '2026-03-20', notes: '子供の学区内で戸建てを探している。予算3,000万前後。' },
    ],
  },
  {
    type: 'individual' as const,
    name: '山本 健二',
    nameKana: 'ヤマモト ケンジ',
    gender: '男性',
    dob: '1974-07-28',
    tel: '090-5555-1234',
    email: 'yamamoto.kenji@example.com',
    postalCode: '791-0270',
    address: '愛媛県松山市東石井3-5-10',
    employer: '松山電機工業株式会社',
    annualIncome: '800万円',
    jobType: '電気・電子',
    relationship: '直接',
    stage: '4段',
    familyMembers: [
      { name: '山本 由紀', relationship: '配偶者', dob: '1976-02-14', occupation: '主婦' },
      { name: '山本 拓也', relationship: '長男', dob: '2005-08-20', occupation: '大学生' },
      { name: '山本 彩', relationship: '長女', dob: '2008-12-01', occupation: '高校生' },
    ],
    cases: [
      { serviceType: 'lifeInsurance' as ServiceType, status: 'contracted', date: '2024-01-10', contractDate: '2024-03-01', amount: '月額42,000円', company: '大同生命', notes: '法人保険も含めて提案。節税効果あり。' },
      { serviceType: 'realEstateSale' as ServiceType, status: 'completed', date: '2025-04-01', contractDate: '2025-08-30', amount: '2,800万円', notes: '旧宅の売却完了。次は購入の相談あり。' },
      { serviceType: 'autoInsurance' as ServiceType, status: 'contracted', date: '2025-10-01', contractDate: '2025-10-15', amount: '年額98,000円', company: 'ソニー損保', notes: '家族全員分を一括加入。' },
    ],
  },
  {
    type: 'individual' as const,
    name: '鈴木 美咲',
    nameKana: 'スズキ ミサキ',
    gender: '女性',
    dob: '1998-04-12',
    tel: '070-3333-7777',
    email: 'suzuki.misaki@example.com',
    postalCode: '790-0912',
    address: '愛媛県松山市春日町8-2-3',
    employer: '株式会社エヒメコンテンツ',
    annualIncome: '280万円',
    jobType: 'IT・通信',
    relationship: '友人',
    stage: '1段',
    cases: [
      { serviceType: 'jobChange' as ServiceType, status: 'consulting', date: '2026-03-10', notes: 'IT系エンジニアへのキャリアチェンジを希望。給与アップも目標。' },
      { serviceType: 'bridal' as ServiceType, status: 'considering', date: '2026-04-01', notes: '来年秋の挙式予定。松山市内の式場で探している。' },
    ],
  },
  {
    type: 'individual' as const,
    name: '高橋 誠司',
    nameKana: 'タカハシ セイジ',
    gender: '男性',
    dob: '1965-09-05',
    tel: '090-2222-3333',
    email: 'takahashi.seiji@example.com',
    postalCode: '790-0907',
    address: '愛媛県松山市道後湯月町10-1',
    employer: '高橋工務店（自営業）',
    annualIncome: '950万円',
    jobType: '建設',
    relationship: '直接',
    stage: '5段',
    familyMembers: [
      { name: '高橋 和子', relationship: '配偶者', dob: '1967-03-20', occupation: '専業主婦' },
      { name: '高橋 浩二', relationship: '長男', dob: '1993-06-15', occupation: '会社員' },
    ],
    cases: [
      { serviceType: 'inheritance' as ServiceType, status: 'consulting', date: '2026-02-01', notes: '父親の相続手続き。不動産あり。税理士との連携が必要。' },
      { serviceType: 'seniorPlanning' as ServiceType, status: 'consulting', date: '2026-03-01', notes: '60歳以降の資産形成についてのアドバイス希望。退職後の収入計画。' },
      { serviceType: 'lifeInsurance' as ServiceType, status: 'contracted', date: '2023-05-01', contractDate: '2023-07-01', amount: '月額55,000円', company: '明治安田生命', notes: '役員向け法人保険。損金算入可能プランで提案済。' },
    ],
  },
  {
    type: 'corporate' as const,
    name: '株式会社愛媛フード',
    nameKana: 'カブシキカイシャ エヒメフード',
    companyName: '株式会社愛媛フード',
    companyNameKana: 'カブシキカイシャ エヒメフード',
    headOffice: '愛媛県松山市大街道2-4-6',
    companyTel: '089-123-4567',
    establishedDate: '2005-04-01',
    capital: '1,000万円',
    industry: '食品製造業',
    annualSales: '3億円',
    employees: '50名',
    ceoName: '木村 正明',
    ceoNameKana: 'キムラ マサアキ',
    relationship: '紹介',
    stage: '3段',
    cases: [
      { serviceType: 'lifeInsurance' as ServiceType, status: 'contracted', date: '2025-01-01', contractDate: '2025-03-01', amount: '月額85,000円', company: '明治安田生命', notes: '役員3名向け法人保険。損金算入可能プランで提案。' },
      { serviceType: 'companySetup' as ServiceType, status: 'completed', date: '2024-06-01', contractDate: '2024-08-15', notes: '子会社「愛媛フード販売株式会社」の設立サポート完了。' },
    ],
  },
]

const addLog = (type: 'info' | 'success' | 'error', text: string) => {
  logs.value.push({ type, text })
}

const runSeed = async () => {
  loading.value = true
  logs.value = []
  addLog('info', 'サンプルデータの投入を開始します...')

  try {
    for (const customer of sampleCustomers) {
      const { cases, ...customerForm } = customer
      addLog('info', `顧客「${customer.name}」を作成中...`)

      try {
        const customerId = await createCustomer(customerForm as any)
        addLog('success', `✓ 顧客「${customer.name}」を作成しました (ID: ${customerId})`)

        for (const c of cases) {
          const { serviceType, ...caseForm } = c
          try {
            await createCase(customerId, serviceType, caseForm as any)
            addLog('success', `  ✓ ${serviceType} 案件を作成しました`)
          } catch (e: any) {
            addLog('error', `  ✗ ${serviceType} 案件の作成に失敗: ${e.message}`)
          }
        }
      } catch (e: any) {
        addLog('error', `✗ 顧客「${customer.name}」の作成に失敗: ${e.message}`)
      }
    }

    addLog('success', `\n完了！${sampleCustomers.length}名の顧客とサービス案件を投入しました。`)
    done.value = true
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="p-4 md:p-6 max-w-4xl mx-auto space-y-5">

    <!-- パンくず -->
    <div class="flex items-center gap-2 text-sm text-gray-400">
      <NuxtLink to="/admin">管理者設定</NuxtLink>
      <Icon name="heroicons:chevron-right" class="h-3 w-3" />
      <span class="text-gray-600">サンプルデータ投入</span>
    </div>

    <!-- ヘッダー -->
    <div>
      <h1 class="text-xl font-bold text-gray-900 flex items-center gap-2">
        <Icon name="heroicons:beaker" class="h-6 w-6 text-amber-500" />
        サンプルデータ投入
      </h1>
      <p class="text-sm text-gray-500 mt-0.5">デモ・動作確認用の顧客データをFirestoreに投入します</p>
    </div>

    <!-- 警告 -->
    <div class="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 flex items-start gap-3">
      <Icon name="heroicons:exclamation-triangle" class="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
      <div class="text-sm text-amber-800">
        <p class="font-semibold">注意</p>
        <p class="mt-0.5">このページは開発・デモ専用です。ボタンを押すたびに同じデータが重複して作成されます。本番環境では使用しないでください。</p>
      </div>
    </div>

    <!-- プレビュー -->
    <div class="card overflow-hidden">
      <div class="px-5 py-3 border-b border-gray-100 bg-gray-50">
        <h2 class="font-semibold text-gray-900">投入されるサンプルデータ（{{ sampleCustomers.length }}名）</h2>
      </div>
      <div class="divide-y divide-gray-50">
        <div v-for="c in sampleCustomers" :key="c.name" class="px-5 py-3 flex items-start gap-4">
          <!-- アイコン -->
          <div
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold"
            :class="c.type === 'corporate' ? 'bg-indigo-100 text-indigo-700' : 'bg-blue-100 text-blue-700'"
          >
            <Icon :name="c.type === 'corporate' ? 'heroicons:building-office-2' : 'heroicons:user'" class="h-4 w-4" />
          </div>
          <!-- 情報 -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="font-semibold text-gray-900">{{ c.name }}</span>
              <span class="text-xs text-gray-400">{{ c.nameKana }}</span>
              <span class="badge text-xs bg-gray-100 text-gray-500">{{ c.type === 'corporate' ? '法人' : '個人' }}</span>
            </div>
            <div class="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500">
              <span v-if="'dob' in c && c.dob">生年月日: {{ c.dob }}</span>
              <span v-if="'employer' in c && c.employer">{{ c.employer }}</span>
              <span v-if="'annualIncome' in c && c.annualIncome">{{ c.annualIncome }}</span>
              <span>関係性: {{ c.relationship }}</span>
            </div>
            <!-- 案件プレビュー -->
            <div class="mt-1.5 flex flex-wrap gap-1.5">
              <span
                v-for="(cs, i) in c.cases"
                :key="i"
                class="badge text-xs"
                :class="{
                  'bg-green-100 text-green-700': cs.status === 'contracted',
                  'bg-blue-100 text-blue-700': cs.status === 'completed',
                  'bg-amber-100 text-amber-700': cs.status === 'considering',
                  'bg-sky-100 text-sky-700': cs.status === 'consulting',
                  'bg-red-100 text-red-600': cs.status === 'failed',
                }"
              >
                {{ cs.serviceType }}: {{ cs.status }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 実行ボタン -->
    <div class="flex gap-3">
      <button
        class="btn-primary flex items-center gap-2"
        :disabled="loading || done"
        @click="runSeed"
      >
        <Icon v-if="loading" name="heroicons:arrow-path" class="h-4 w-4 animate-spin" />
        <Icon v-else name="heroicons:arrow-up-tray" class="h-4 w-4" />
        {{ loading ? '投入中...' : done ? '投入済み' : 'サンプルデータを投入する' }}
      </button>
      <NuxtLink v-if="done" to="/customers" class="btn-secondary flex items-center gap-2">
        <Icon name="heroicons:users" class="h-4 w-4" />
        顧客一覧で確認
      </NuxtLink>
    </div>

    <!-- ログ -->
    <div v-if="logs.length > 0" class="card p-4">
      <h3 class="text-sm font-semibold text-gray-700 mb-2">実行ログ</h3>
      <div class="space-y-1 text-xs font-mono max-h-64 overflow-y-auto">
        <p
          v-for="(log, i) in logs"
          :key="i"
          :class="{
            'text-gray-500': log.type === 'info',
            'text-green-700': log.type === 'success',
            'text-red-600': log.type === 'error',
          }"
        >{{ log.text }}</p>
      </div>
    </div>

  </div>
</template>
