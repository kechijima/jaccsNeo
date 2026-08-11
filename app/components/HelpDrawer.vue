<script setup lang="ts">
import { HELP_SECTIONS } from '~/data/helpSections'
import { useHelpDrawer } from '~/composables/useHelpDrawer'

const { isOpen, close } = useHelpDrawer()

const expanded = ref<string[]>(['requests'])
const toggle = (id: string) => {
  expanded.value = expanded.value.includes(id)
    ? expanded.value.filter(x => x !== id)
    : [...expanded.value, id]
}
</script>

<template>
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
        v-if="isOpen"
        class="fixed inset-0 z-[70] flex justify-end bg-black/30"
        @click.self="close"
      >
        <Transition
          enter-active-class="transition duration-200"
          enter-from-class="translate-x-full"
          enter-to-class="translate-x-0"
          leave-active-class="transition duration-150"
          leave-from-class="translate-x-0"
          leave-to-class="translate-x-full"
        >
          <div v-if="isOpen" class="w-full max-w-md bg-white shadow-2xl flex flex-col h-full">
            <!-- ヘッダー -->
            <div class="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between z-10 shrink-0">
              <h2 class="font-bold text-gray-900 text-base flex items-center gap-2">
                <Icon name="heroicons:book-open" class="h-5 w-5 text-primary-600" />
                マニュアル
              </h2>
              <button class="p-1.5 rounded-lg hover:bg-gray-100" @click="close">
                <Icon name="heroicons:x-mark" class="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <!-- セクション一覧 -->
            <div class="flex-1 overflow-y-auto p-4 space-y-2">
              <p class="text-xs text-gray-400 px-1 pb-1">各画面の使い方をまとめています。困ったときはここを確認してください。</p>
              <div v-for="s in HELP_SECTIONS" :key="s.id" class="card overflow-hidden">
                <button
                  class="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
                  @click="toggle(s.id)"
                >
                  <div class="flex items-center gap-3 min-w-0">
                    <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-600">
                      <Icon :name="s.icon" class="h-4 w-4" />
                    </div>
                    <div class="min-w-0">
                      <p class="text-sm font-semibold text-gray-900">{{ s.title }}</p>
                      <p class="text-xs text-gray-500 truncate">{{ s.summary }}</p>
                    </div>
                  </div>
                  <Icon
                    name="heroicons:chevron-down"
                    class="h-4 w-4 text-gray-400 shrink-0 transition-transform"
                    :class="expanded.includes(s.id) ? 'rotate-180' : ''"
                  />
                </button>

                <div v-if="expanded.includes(s.id)" class="px-4 pb-3">
                  <ul class="space-y-1.5 border-t border-gray-100 pt-3">
                    <li v-for="(p, i) in s.points" :key="i" class="flex items-start gap-2 text-sm text-gray-600">
                      <Icon name="heroicons:check" class="h-4 w-4 text-primary-400 shrink-0 mt-0.5" />
                      <span>{{ p }}</span>
                    </li>
                  </ul>
                </div>
              </div>

              <p class="text-xs text-gray-400 text-center pt-2 pb-4">
                上記で解決しない場合は、理事会メンバーまたはシステム管理者にお問い合わせください。
              </p>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
