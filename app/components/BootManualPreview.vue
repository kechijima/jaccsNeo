<script setup lang="ts">
import { HELP_SECTIONS } from '~/data/helpSections'

// 起動待機中（認証確認中）の読み込み画面で、待ち時間を無駄にしないよう
// マニュアルの内容を見られるようにする。スマホ回線では起動に時間が
// かかることがあるための対策
const show = ref(false)
const expanded = ref<string | null>(null)

const toggleSection = (id: string) => {
  expanded.value = expanded.value === id ? null : id
}
</script>

<template>
  <div class="mt-6 w-full max-w-sm px-4">
    <button
      type="button"
      class="mx-auto flex items-center gap-1.5 text-xs text-primary-600 hover:underline"
      @click="show = !show"
    >
      <Icon name="heroicons:book-open" class="h-3.5 w-3.5" />
      {{ show ? '使い方を閉じる' : '読み込みを待つ間に使い方を見る' }}
    </button>

    <div
      v-if="show"
      class="mt-3 max-h-[50vh] overflow-y-auto rounded-xl border border-gray-100 bg-white shadow-sm divide-y divide-gray-50 text-left"
    >
      <div v-for="s in HELP_SECTIONS" :key="s.id">
        <button
          type="button"
          class="w-full flex items-center gap-2 px-3 py-2.5 text-left"
          @click="toggleSection(s.id)"
        >
          <Icon :name="s.icon" class="h-4 w-4 text-primary-500 shrink-0" />
          <span class="flex-1 min-w-0 text-xs font-medium text-gray-800 truncate">{{ s.title }}</span>
          <Icon
            name="heroicons:chevron-down"
            class="h-3.5 w-3.5 text-gray-300 shrink-0 transition-transform"
            :class="expanded === s.id ? 'rotate-180' : ''"
          />
        </button>
        <ul v-if="expanded === s.id" class="px-3 pb-2.5 space-y-1">
          <li v-for="(p, i) in s.points" :key="i" class="flex items-start gap-1.5 text-[11px] text-gray-500 leading-relaxed">
            <Icon name="heroicons:check" class="h-3 w-3 text-primary-400 shrink-0 mt-0.5" />
            <span>{{ p }}</span>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
