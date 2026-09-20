<script setup lang="ts">
// パーソナルデータアプリの主要項目を、各アプリの案件詳細画面から直接閲覧できるように
// するための共通コンポーネント。従来はkintoneのアクション連動で各アプリ側にも同名項目を
// 都度設定・複製していたが、二重管理・設定の手間を避けるため、パーソナルデータの
// レコードを直接（読み取り専用で）参照する形にしている。編集はパーソナルデータ画面で行う
import type { Customer } from '~/types/customer'

const props = defineProps<{ customer: Customer | null }>()

interface Entry { label: string; value: string }

const entries = computed<Entry[]>(() => {
  const c = props.customer
  if (!c) return []
  const list: Entry[] = []
  const push = (label: string, value?: string) => { if (value) list.push({ label, value }) }
  push('氏名', c.name)
  push('フリガナ', c.nameKana)
  push('性別', c.gender)
  push('生年月日（本人）', c.dob)
  push('TEL', c.tel)
  push('メールアドレス', c.email)
  push('住所', c.address)
  push('担当FP', c.assignedFpName)
  push('ワン', c.one)
  push('状況（ワン）', c.status1)
  push('ツー', c.two)
  push('状況（ツー）', c.status2)
  push('フォロー以降の状況', c.postFollowStatus)
  return list
})
</script>

<template>
  <div v-if="customer" class="card p-5">
    <div class="flex items-center justify-between mb-1">
      <h2 class="font-semibold text-gray-900 flex items-center gap-2">
        <Icon name="heroicons:identification" class="h-5 w-5 text-primary-600" />
        パーソナルデータ
      </h2>
      <NuxtLink :to="`/customers/${customer.id}`" class="text-xs text-primary-600 hover:underline shrink-0">
        詳しく見る・編集する
      </NuxtLink>
    </div>
    <p class="text-xs text-gray-400 mb-4">このアプリでは読み取り専用です。編集はパーソナルデータ画面で行ってください。</p>
    <div v-if="entries.length === 0" class="text-sm text-gray-400 text-center py-4">登録されているパーソナルデータがありません</div>
    <dl v-else class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
      <div v-for="e in entries" :key="e.label">
        <dt class="text-gray-500">{{ e.label }}</dt>
        <dd class="font-medium text-gray-900 whitespace-pre-line">{{ e.value }}</dd>
      </div>
    </dl>
  </div>
</template>
