<script setup lang="ts">
import { useCustomerStore } from '~/composables/useCustomerStore'
import { useDataScope } from '~/composables/useDataScope'
import { usePortalStore } from '~/composables/usePortalStore'
import { useUsers } from '~/composables/useUsers'
import type { Customer } from '~/types/customer'
import type { PostView } from '~/composables/usePortalStore'
import type { AppUser } from '~/types/user'

definePageMeta({ middleware: ['auth'] })

const route = useRoute()
const router = useRouter()

const customerStore = useCustomerStore()
const { scopedFpNames, ensureScope } = useDataScope()
const portalStore = usePortalStore()
const { fetchUsers } = useUsers()

const query = ref((route.query.q as string) ?? '')
const loading = ref(true)

const users = ref<AppUser[]>([])
const customerScopeError = ref(false)
const postFetchError = ref(false)
const userFetchError = ref(false)

// パーソナルデータ・組合員・掲示板の取得はそれぞれ独立させ、いずれか1つが
// 失敗しても他の検索対象まで巻き添えで使えなくならないようにする
onMounted(async () => {
  loading.value = true
  try {
    await Promise.all([
      ensureScope().catch((e) => { console.error('パーソナルデータの閲覧範囲の取得に失敗しました', e); customerScopeError.value = true }),
      portalStore.fetchAllPosts().catch((e) => { console.error('掲示板の投稿取得に失敗しました', e); postFetchError.value = true }),
      fetchUsers().then((u) => { users.value = u }).catch((e) => { console.error('組合員一覧の取得に失敗しました', e); userFetchError.value = true }),
    ])
  } finally {
    loading.value = false
  }
})

// 検索語をURLクエリと同期し、結果をリンクとして共有・再訪できるようにする
watch(query, (q) => {
  router.replace({ query: { ...route.query, q: q.trim() || undefined } })
})

const q = computed(() => query.value.trim().toLowerCase())

const includesQuery = (...values: Array<string | undefined | null>) =>
  values.some(v => v?.toLowerCase().includes(q.value))

// 自分が閲覧できる担当FP範囲に絞り込んだうえで検索する（パーソナルデータの既存の権限ロジックと同じ）
const scopedCustomers = computed(() => {
  if (scopedFpNames.value === null) return customerStore.customers.value
  return customerStore.customers.value.filter(c => scopedFpNames.value!.has(c.assignedFpName ?? ''))
})

const customerResults = computed<Customer[]>(() => {
  if (!q.value) return []
  return scopedCustomers.value.filter(c => includesQuery(
    c.name, c.nameKana, c.tel, c.email, c.address, c.companyName, c.companyNameKana,
    c.employer, c.assignedFpName, c.hometown,
    // 相談内容・進捗メモなど自由記述の項目も検索対象に含める
    // （名前・連絡先だけでなく、記録されたやり取りの内容からも探せるようにするため）
    c.status1, c.status2, c.postFollowStatus, c.referralSource,
    c.ceoName, c.ceoNameKana, c.headOffice, c.industry, c.otherFamily,
  ))
})

const postResults = computed<PostView[]>(() => {
  if (!q.value) return []
  return portalStore.posts.value.filter(p => includesQuery(
    stripHtml(p.content), p.authorName, p.spaceName,
  ))
})

const userResults = computed<AppUser[]>(() => {
  if (!q.value) return []
  return users.value.filter(u => !u.isWithdrawn && includesQuery(
    u.displayName, u.lastNameKana, u.firstNameKana, u.kumiaiName, u.position,
    u.email, u.mobile, u.businessContent, u.selfIntro, u.hometownArea, u.currentArea, u.hobbies,
  ))
})

const totalCount = computed(() => customerResults.value.length + postResults.value.length + userResults.value.length)

function stripHtml(html: string): string {
  if (typeof window === 'undefined') return html
  const div = document.createElement('div')
  div.innerHTML = html
  return div.textContent ?? div.innerText ?? ''
}

const postExcerpt = (p: PostView) => stripHtml(p.content).slice(0, 80).trim()
</script>

<template>
  <div class="p-4 md:p-6 max-w-3xl mx-auto space-y-5">

    <h1 class="text-xl font-bold text-gray-900 flex items-center gap-2">
      <Icon name="heroicons:magnifying-glass" class="h-6 w-6 text-primary-600" />
      検索
    </h1>

    <!-- 検索入力 -->
    <div class="relative">
      <Icon name="heroicons:magnifying-glass" class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
      <input
        v-model="query"
        type="search"
        placeholder="組合員・パーソナルデータ・掲示板の投稿を検索..."
        class="input-field pl-9"
        autofocus
      />
    </div>

    <!-- 一部のデータ取得に失敗した場合の注意（該当があれば結果自体は表示する） -->
    <div v-if="!loading && q && (customerScopeError || postFetchError || userFetchError)" class="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
      <Icon name="heroicons:exclamation-triangle" class="mt-0.5 h-4 w-4 shrink-0" />
      <span>
        <template v-if="customerScopeError">パーソナルデータ、</template>
        <template v-if="userFetchError">組合員情報、</template>
        <template v-if="postFetchError">掲示板の投稿、</template>
        の取得に失敗したため、検索結果に含まれていない可能性があります。再読み込みしてお試しください。
      </span>
    </div>

    <!-- 読み込み中 -->
    <div v-if="loading" class="card p-12 text-center">
      <Icon name="heroicons:arrow-path" class="h-8 w-8 text-gray-300 mx-auto mb-2 animate-spin" />
      <p class="text-sm text-gray-400">検索データを準備中...</p>
    </div>

    <!-- 未入力 -->
    <div v-else-if="!q" class="card p-16 text-center">
      <Icon name="heroicons:magnifying-glass" class="h-12 w-12 text-gray-200 mx-auto mb-3" />
      <p class="text-gray-400 font-medium">検索したいキーワードを入力してください</p>
      <p class="text-xs text-gray-400 mt-1">組合員のプロフィール・パーソナルデータ・掲示板の投稿から横断的に検索できます</p>
    </div>

    <!-- 該当なし -->
    <div v-else-if="totalCount === 0" class="card p-16 text-center">
      <Icon name="heroicons:face-frown" class="h-12 w-12 text-gray-200 mx-auto mb-3" />
      <p class="text-gray-400 font-medium">「{{ query }}」に一致する結果が見つかりませんでした</p>
    </div>

    <!-- 検索結果 -->
    <template v-else>
      <p class="text-sm text-gray-500">「{{ query }}」の検索結果: {{ totalCount }}件</p>

      <!-- 組合員 -->
      <div v-if="userResults.length > 0" class="space-y-2">
        <h2 class="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
          <Icon name="heroicons:user-circle" class="h-4 w-4 text-gray-400" />
          組合員（{{ userResults.length }}件）
        </h2>
        <div class="card overflow-hidden">
          <div class="divide-y divide-gray-50">
            <NuxtLink
              v-for="u in userResults"
              :key="u.uid"
              :to="`/team/${u.uid}`"
              class="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition"
            >
              <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-semibold text-sm">
                {{ u.displayName.charAt(0) }}
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-sm font-medium text-gray-900 truncate">{{ u.displayName }}</p>
                <p class="text-xs text-gray-400 truncate">{{ [u.kumiaiName, u.position].filter(Boolean).join(' · ') || '—' }}</p>
              </div>
              <Icon name="heroicons:chevron-right" class="h-4 w-4 text-gray-300 shrink-0" />
            </NuxtLink>
          </div>
        </div>
      </div>

      <!-- パーソナルデータ -->
      <div v-if="customerResults.length > 0" class="space-y-2">
        <h2 class="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
          <Icon name="heroicons:identification" class="h-4 w-4 text-gray-400" />
          パーソナルデータ（{{ customerResults.length }}件）
        </h2>
        <div class="card overflow-hidden">
          <div class="divide-y divide-gray-50">
            <NuxtLink
              v-for="c in customerResults"
              :key="c.id"
              :to="`/customers/${c.id}`"
              class="flex items-center justify-between gap-3 px-5 py-3 hover:bg-gray-50 transition"
            >
              <div class="min-w-0 flex-1">
                <p class="text-sm font-medium text-gray-900 truncate">{{ c.name || c.companyName }}</p>
                <p class="text-xs text-gray-400 truncate">{{ [c.tel, c.email, c.assignedFpName].filter(Boolean).join(' · ') || '—' }}</p>
              </div>
              <Icon name="heroicons:chevron-right" class="h-4 w-4 text-gray-300 shrink-0" />
            </NuxtLink>
          </div>
        </div>
      </div>

      <!-- 掲示板 -->
      <div v-if="postResults.length > 0" class="space-y-2">
        <h2 class="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
          <Icon name="heroicons:chat-bubble-left-right" class="h-4 w-4 text-gray-400" />
          掲示板（{{ postResults.length }}件）
        </h2>
        <div class="card overflow-hidden">
          <div class="divide-y divide-gray-50">
            <NuxtLink
              v-for="p in postResults"
              :key="p.id"
              :to="`/portal/spaces/${p.spaceId}/posts/${p.id}`"
              class="flex items-start justify-between gap-3 px-5 py-3 hover:bg-gray-50 transition"
            >
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2 flex-wrap mb-0.5">
                  <span class="text-sm font-medium text-gray-900">{{ p.authorName }}</span>
                  <span class="badge text-xs" :class="p.spaceColor">{{ p.spaceName }}</span>
                </div>
                <p class="text-xs text-gray-500 truncate">{{ postExcerpt(p) }}</p>
              </div>
              <Icon name="heroicons:chevron-right" class="h-4 w-4 text-gray-300 shrink-0 mt-1" />
            </NuxtLink>
          </div>
        </div>
      </div>
    </template>

  </div>
</template>
