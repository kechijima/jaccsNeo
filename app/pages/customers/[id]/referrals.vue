<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

const route = useRoute()
const customerId = computed(() => route.params.id as string)

const customerName = ref('田中 一郎')

// ダミー紹介ネットワークデータ（Phase3でFirestoreから取得）
const referredBy = ref({
  id: 'customer_abc',
  name: '山田 太郎',
  relationship: '同僚',
  date: '2021/03',
})

const referredCustomers = ref([
  { id: 'cust_001', name: '佐藤 花子', relationship: '友人', date: '2022/05', services: ['生命保険', '不動産'] },
  { id: 'cust_002', name: '鈴木 美咲', relationship: '家族', date: '2023/01', services: ['生命保険'] },
  { id: 'cust_003', name: '伊藤 健二', relationship: '会社同僚', date: '2023/08', services: ['転職'] },
])

const totalReferrals = computed(() => referredCustomers.value.length)
</script>

<template>
  <div class="p-4 md:p-6 max-w-3xl mx-auto space-y-5">

    <!-- パンくず -->
    <div class="flex items-center gap-2 text-sm text-gray-400">
      <NuxtLink to="/customers">顧客管理</NuxtLink>
      <Icon name="heroicons:chevron-right" class="h-3 w-3" />
      <NuxtLink :to="`/customers/${customerId}`">{{ customerName }}</NuxtLink>
      <Icon name="heroicons:chevron-right" class="h-3 w-3" />
      <span class="text-gray-600">紹介ネットワーク</span>
    </div>

    <div>
      <h1 class="text-xl font-bold text-gray-900 flex items-center gap-2">
        <Icon name="heroicons:share" class="h-5 w-5 text-primary-600" />
        紹介ネットワーク
      </h1>
      <p class="text-sm text-gray-500 mt-0.5">{{ customerName }} さんの紹介関係</p>
    </div>

    <!-- 紹介元 -->
    <div class="card p-5">
      <h2 class="font-semibold text-gray-900 mb-3 flex items-center gap-2">
        <Icon name="heroicons:arrow-left-circle" class="h-5 w-5 text-amber-500" />
        紹介元
      </h2>
      <div v-if="referredBy" class="flex items-center gap-4 p-3 rounded-lg bg-amber-50">
        <div class="flex h-10 w-10 items-center justify-center rounded-full bg-amber-200 text-amber-800 font-semibold text-sm">
          {{ referredBy.name.charAt(0) }}
        </div>
        <div class="flex-1">
          <NuxtLink :to="`/customers/${referredBy.id}`" class="font-medium text-gray-900 hover:text-primary-600">
            {{ referredBy.name }}
          </NuxtLink>
          <p class="text-xs text-gray-500 mt-0.5">関係: {{ referredBy.relationship }} · {{ referredBy.date }}</p>
        </div>
        <NuxtLink :to="`/customers/${referredBy.id}`" class="text-xs text-primary-600 hover:underline shrink-0">
          詳細を見る →
        </NuxtLink>
      </div>
      <p v-else class="text-sm text-gray-400 py-2">紹介元の情報がありません</p>
    </div>

    <!-- 紹介した顧客 -->
    <div class="card p-5">
      <div class="flex items-center justify-between mb-3">
        <h2 class="font-semibold text-gray-900 flex items-center gap-2">
          <Icon name="heroicons:arrow-right-circle" class="h-5 w-5 text-primary-500" />
          紹介した顧客
        </h2>
        <span class="badge bg-primary-50 text-primary-700">{{ totalReferrals }}名</span>
      </div>

      <div v-if="referredCustomers.length === 0" class="text-sm text-gray-400 py-4 text-center">
        <Icon name="heroicons:users" class="h-8 w-8 text-gray-300 mx-auto mb-2" />
        紹介した顧客はまだいません
      </div>

      <div v-else class="space-y-2">
        <div
          v-for="c in referredCustomers"
          :key="c.id"
          class="flex items-center gap-4 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition"
        >
          <div class="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 text-primary-700 font-semibold text-sm">
            {{ c.name.charAt(0) }}
          </div>
          <div class="flex-1 min-w-0">
            <p class="font-medium text-gray-900">{{ c.name }}</p>
            <p class="text-xs text-gray-500">{{ c.relationship }} · {{ c.date }}</p>
            <div class="flex flex-wrap gap-1 mt-1">
              <span
                v-for="svc in c.services"
                :key="svc"
                class="badge bg-green-50 text-green-700 text-xs"
              >
                {{ svc }}
              </span>
            </div>
          </div>
          <NuxtLink :to="`/customers/${c.id}`" class="text-xs text-primary-600 hover:underline shrink-0">
            詳細 →
          </NuxtLink>
        </div>
      </div>
    </div>

    <!-- ネットワーク図プレースホルダー（Phase3/4で実装） -->
    <div class="card p-5">
      <h2 class="font-semibold text-gray-900 mb-3 flex items-center gap-2">
        <Icon name="heroicons:map" class="h-5 w-5 text-primary-600" />
        ネットワーク図
      </h2>
      <div class="flex flex-col items-center justify-center h-48 rounded-xl bg-gray-50 border-2 border-dashed border-gray-200 text-center">
        <Icon name="heroicons:share" class="h-10 w-10 text-gray-300 mb-2" />
        <p class="text-sm text-gray-400">ビジュアルネットワーク図</p>
        <p class="text-xs text-gray-300 mt-1">Phase 3/4 で実装予定</p>
      </div>
    </div>

  </div>
</template>
