<script setup lang="ts">
import { HELP_SECTIONS } from '~/data/helpSections'

definePageMeta({ middleware: ['auth'] })

const sections = HELP_SECTIONS

const expanded = ref<string[]>(['requests'])
const toggle = (id: string) => {
  expanded.value = expanded.value.includes(id)
    ? expanded.value.filter(x => x !== id)
    : [...expanded.value, id]
}
const expandAll = () => { expanded.value = sections.map(s => s.id) }
const collapseAll = () => { expanded.value = [] }
</script>

<template>
  <div class="p-4 md:p-6 max-w-3xl mx-auto space-y-5">

    <!-- ヘッダー -->
    <div class="flex items-start justify-between gap-3 flex-wrap">
      <div>
        <h1 class="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Icon name="heroicons:book-open" class="h-6 w-6 text-primary-600" />
          マニュアル
        </h1>
        <p class="text-sm text-gray-500 mt-0.5">各画面の使い方をまとめています。困ったときはここを確認してください。</p>
      </div>
      <div class="flex items-center gap-2 text-xs shrink-0">
        <button class="text-primary-600 hover:underline" @click="expandAll">すべて開く</button>
        <span class="text-gray-300">|</span>
        <button class="text-primary-600 hover:underline" @click="collapseAll">すべて閉じる</button>
      </div>
    </div>

    <!-- セクション一覧 -->
    <div class="space-y-2">
      <div v-for="s in sections" :key="s.id" class="card overflow-hidden">
        <button
          class="w-full flex items-center justify-between gap-3 px-5 py-4 text-left"
          @click="toggle(s.id)"
        >
          <div class="flex items-center gap-3 min-w-0">
            <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-600">
              <Icon :name="s.icon" class="h-5 w-5" />
            </div>
            <div class="min-w-0">
              <p class="font-semibold text-gray-900">{{ s.title }}</p>
              <p class="text-xs text-gray-500 truncate">{{ s.summary }}</p>
            </div>
          </div>
          <Icon
            name="heroicons:chevron-down"
            class="h-5 w-5 text-gray-400 shrink-0 transition-transform"
            :class="expanded.includes(s.id) ? 'rotate-180' : ''"
          />
        </button>

        <div v-if="expanded.includes(s.id)" class="px-5 pb-4">
          <ul class="space-y-1.5 border-t border-gray-100 pt-3">
            <li v-for="(p, i) in s.points" :key="i" class="flex items-start gap-2 text-sm text-gray-600">
              <Icon name="heroicons:check" class="h-4 w-4 text-primary-400 shrink-0 mt-0.5" />
              <span>{{ p }}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <p class="text-xs text-gray-400 text-center pt-2">
      上記で解決しない場合は、理事会メンバーまたはシステム管理者にお問い合わせください。
    </p>

  </div>
</template>
