<script setup lang="ts">
import { useCustomerStore } from '~/composables/useCustomerStore'

definePageMeta({ middleware: ['auth'] })

const store = useCustomerStore()
const router = useRouter()

// ── 検索・フィルタ ────────────────────────────────────────────────────────
const searchQuery = ref('')
const filterType  = ref<'all' | 'individual' | 'corporate'>('all')

const filtered = computed(() => {
  let list = store.customers.value
  if (filterType.value !== 'all') {
    list = list.filter(c => c.type === filterType.value)
  }
  const q = searchQuery.value.trim().toLowerCase()
  if (q) {
    list = list.filter(c =>
      c.name?.toLowerCase().includes(q) ||
      c.nameKana?.toLowerCase().includes(q) ||
      c.tel?.includes(q) ||
      c.email?.toLowerCase().includes(q),
    )
  }
  return list
})

// ── CSV インポートモーダル ─────────────────────────────────────────────────
const showImportModal = ref(false)
const importStatus    = ref<'idle' | 'importing' | 'done' | 'error'>('idle')
const importMessage   = ref('')
const fileInputRef    = ref<HTMLInputElement>()

const handleFileSelect = async (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  importStatus.value  = 'importing'
  importMessage.value = 'CSVを読み込み中...'
  await new Promise(r => setTimeout(r, 800))
  importStatus.value  = 'done'
  importMessage.value = `${file.name} のインポートが完了しました（実装予定）`
}

// ── ステータス色 ──────────────────────────────────────────────────────────
const statusColor = (s: string) => {
  const map: Record<string, string> = {
    'ワン中':       'bg-sky-100 text-sky-700',
    'ワン済み':     'bg-blue-100 text-blue-700',
    'ツー中':       'bg-indigo-100 text-indigo-700',
    'ツー済み':     'bg-purple-100 text-purple-700',
    'アポ調整中':   'bg-amber-100 text-amber-700',
    '成約':         'bg-green-100 text-green-700',
    '完了':         'bg-gray-100 text-gray-500',
    '不成立':       'bg-red-100 text-red-600',
  }
  return map[s] ?? 'bg-gray-100 text-gray-500'
}
</script>

<template>
  <div class="p-4 md:p-6 max-w-7xl mx-auto space-y-5">

    <!-- ===== ページヘッダー ===== -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <h1 class="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Icon name="heroicons:identification" class="h-6 w-6 text-primary-600" />
          パーソナルデータ
        </h1>
        <p class="mt-1 text-sm text-gray-500">顧客の詳細情報管理・CSV連携</p>
      </div>
      <div class="flex items-center gap-2">
        <button
          class="btn-secondary text-sm flex items-center gap-1.5"
          @click="showImportModal = true"
        >
          <Icon name="heroicons:arrow-up-tray" class="h-4 w-4" />
          CSVインポート
        </button>
        <NuxtLink to="/customers/new" class="btn-primary text-sm flex items-center gap-1.5">
          <Icon name="heroicons:plus" class="h-4 w-4" />
          新規登録
        </NuxtLink>
      </div>
    </div>

    <!-- ===== サマリーカード ===== -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div class="card p-4">
        <p class="text-xs text-gray-500">総件数</p>
        <p class="mt-1 text-2xl font-bold text-gray-900">{{ store.customers.value.length }}<span class="text-xs font-normal text-gray-400 ml-1">件</span></p>
      </div>
      <div class="card p-4">
        <p class="text-xs text-gray-500">個人</p>
        <p class="mt-1 text-2xl font-bold text-gray-900">{{ store.customers.value.filter(c => c.type !== 'corporate').length }}<span class="text-xs font-normal text-gray-400 ml-1">件</span></p>
      </div>
      <div class="card p-4">
        <p class="text-xs text-gray-500">法人</p>
        <p class="mt-1 text-2xl font-bold text-gray-900">{{ store.customers.value.filter(c => c.type === 'corporate').length }}<span class="text-xs font-normal text-gray-400 ml-1">件</span></p>
      </div>
      <div class="card p-4">
        <p class="text-xs text-gray-500">絞り込み結果</p>
        <p class="mt-1 text-2xl font-bold text-primary-600">{{ filtered.length }}<span class="text-xs font-normal text-gray-400 ml-1">件</span></p>
      </div>
    </div>

    <!-- ===== 検索・フィルタ ===== -->
    <div class="flex flex-col sm:flex-row gap-2">
      <div class="relative flex-1">
        <Icon name="heroicons:magnifying-glass" class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="氏名・フリガナ・電話・メールで検索..."
          class="input-field pl-9 text-sm"
        />
      </div>
      <div class="flex items-center gap-2">
        <button
          v-for="btn in [{ key: 'all', label: 'すべて' }, { key: 'individual', label: '個人' }, { key: 'corporate', label: '法人' }]"
          :key="btn.key"
          class="px-3 py-1.5 rounded-full text-sm font-medium transition"
          :class="filterType === btn.key
            ? 'bg-primary-600 text-white'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
          @click="filterType = btn.key as any"
        >{{ btn.label }}</button>
      </div>
    </div>

    <!-- ===== テーブル（PC） ===== -->
    <div class="hidden md:block card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-100 bg-gray-50">
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">氏名</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">性別</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">生年月日</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">電話</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">住所</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">ステータス</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">区分</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">詳細</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            <tr
              v-for="c in filtered"
              :key="c.id"
              class="hover:bg-gray-50 transition-colors cursor-pointer"
              @click="router.push(`/customers/${c.id}`)"
            >
              <td class="px-4 py-3">
                <div class="font-medium text-gray-900 whitespace-nowrap">{{ c.name }}</div>
                <div class="text-xs text-gray-400 mt-0.5">{{ c.nameKana }}</div>
              </td>
              <td class="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">{{ c.gender ?? '—' }}</td>
              <td class="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">{{ c.dob?.replace(/-/g, '/') ?? '—' }}</td>
              <td class="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">{{ c.tel ?? '—' }}</td>
              <td class="px-4 py-3 text-gray-500 text-xs max-w-[160px]">
                <span class="line-clamp-1">{{ c.address ?? '—' }}</span>
              </td>
              <td class="px-4 py-3 whitespace-nowrap">
                <span v-if="c.status1" class="badge text-xs" :class="statusColor(c.status1)">
                  {{ c.status1 }}
                </span>
                <span v-else class="text-xs text-gray-300">—</span>
              </td>
              <td class="px-4 py-3 whitespace-nowrap">
                <span
                  class="badge text-xs"
                  :class="c.type === 'corporate' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'"
                >
                  {{ c.type === 'corporate' ? '法人' : '個人' }}
                </span>
              </td>
              <td class="px-4 py-3 whitespace-nowrap">
                <NuxtLink
                  :to="`/customers/${c.id}`"
                  class="inline-flex items-center gap-0.5 text-xs text-primary-600 hover:underline"
                  @click.stop
                >
                  詳細
                  <Icon name="heroicons:arrow-top-right-on-square" class="h-3 w-3" />
                </NuxtLink>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="filtered.length === 0" class="p-12 text-center">
        <Icon name="heroicons:magnifying-glass" class="h-10 w-10 text-gray-200 mx-auto mb-2" />
        <p class="text-gray-400 text-sm">該当するデータが見つかりませんでした</p>
      </div>
    </div>

    <!-- ===== カード一覧（SP） ===== -->
    <div class="md:hidden space-y-3">
      <div
        v-for="c in filtered"
        :key="c.id"
        class="card p-4"
      >
        <div class="flex items-start justify-between gap-3 mb-2">
          <div>
            <p class="font-semibold text-gray-900">{{ c.name }}</p>
            <p class="text-xs text-gray-400 mt-0.5">{{ c.nameKana }}</p>
          </div>
          <div class="flex items-center gap-1.5">
            <span v-if="c.status1" class="badge text-xs" :class="statusColor(c.status1)">{{ c.status1 }}</span>
            <span
              class="badge text-xs"
              :class="c.type === 'corporate' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'"
            >{{ c.type === 'corporate' ? '法人' : '個人' }}</span>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-1 text-xs text-gray-500 mb-3">
          <div v-if="c.tel"><Icon name="heroicons:phone" class="h-3 w-3 inline mr-1" />{{ c.tel }}</div>
          <div v-if="c.dob"><Icon name="heroicons:calendar" class="h-3 w-3 inline mr-1" />{{ c.dob?.replace(/-/g, '/') }}</div>
          <div v-if="c.address" class="col-span-2 truncate"><Icon name="heroicons:map-pin" class="h-3 w-3 inline mr-1" />{{ c.address }}</div>
        </div>
        <NuxtLink
          :to="`/customers/${c.id}`"
          class="block w-full text-center text-xs text-primary-600 font-medium py-2 rounded-lg border border-primary-200 hover:bg-primary-50 transition"
        >
          詳細を見る →
        </NuxtLink>
      </div>
    </div>

    <!-- フッター件数 -->
    <p class="text-xs text-gray-400 text-right">{{ filtered.length }} / {{ store.customers.value.length }} 件表示中</p>

    <!-- ===== CSVインポートモーダル ===== -->
    <Teleport to="body">
      <div
        v-if="showImportModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
        @click.self="showImportModal = false"
      >
        <div class="bg-white w-full max-w-md rounded-2xl p-6 space-y-5 shadow-xl mx-4">
          <div class="flex items-center justify-between">
            <h3 class="font-bold text-gray-900 flex items-center gap-2">
              <Icon name="heroicons:arrow-up-tray" class="h-5 w-5 text-primary-600" />
              CSVインポート
            </h3>
            <button class="p-1.5 rounded-lg hover:bg-gray-100 transition" @click="showImportModal = false">
              <Icon name="heroicons:x-mark" class="h-5 w-5 text-gray-500" />
            </button>
          </div>

          <!-- 対応フォーマット説明 -->
          <div class="rounded-xl bg-blue-50 border border-blue-100 p-4 text-sm text-blue-700">
            <p class="font-semibold mb-1">対応CSVフォーマット</p>
            <ul class="text-xs space-y-0.5 text-blue-600 list-disc list-inside">
              <li>レコード番号、氏名（フルネーム）、フリガナ</li>
              <li>性別、生年月日（本人）、TEL、メールアドレス</li>
              <li>郵便番号、住所、家族情報（最大6名）</li>
              <li>勤務先、年収、関係性、段数</li>
              <li>各種サービスフラグ（生命保険、火災保険など）</li>
              <li>法人情報（法人名、本店所在地など）</li>
            </ul>
          </div>

          <!-- ファイル選択 -->
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-2">CSVファイルを選択</label>
            <div
              class="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-primary-400 transition cursor-pointer"
              @click="fileInputRef?.click()"
            >
              <Icon name="heroicons:document-text" class="h-10 w-10 text-gray-300 mx-auto mb-2" />
              <p class="text-sm text-gray-500">クリックしてCSVファイルを選択</p>
              <p class="text-xs text-gray-400 mt-1">Shift-JIS / UTF-8 対応</p>
              <input
                ref="fileInputRef"
                type="file"
                accept=".csv"
                class="hidden"
                @change="handleFileSelect"
              />
            </div>
          </div>

          <!-- インポートステータス -->
          <div v-if="importStatus !== 'idle'" class="rounded-xl p-3 text-sm"
            :class="{
              'bg-blue-50 text-blue-700': importStatus === 'importing',
              'bg-green-50 text-green-700': importStatus === 'done',
              'bg-red-50 text-red-700': importStatus === 'error',
            }"
          >
            <Icon
              :name="importStatus === 'importing' ? 'heroicons:arrow-path' : importStatus === 'done' ? 'heroicons:check-circle' : 'heroicons:exclamation-circle'"
              class="h-4 w-4 inline mr-1"
              :class="importStatus === 'importing' ? 'animate-spin' : ''"
            />
            {{ importMessage }}
          </div>

          <div class="flex gap-3">
            <button class="flex-1 btn-secondary" @click="showImportModal = false">閉じる</button>
          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>
