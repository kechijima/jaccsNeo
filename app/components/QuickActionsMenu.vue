<script setup lang="ts">
// PCヘッダーに常設するクイックアクション。どの画面からでもよく使う作成系の
// 操作にすぐ飛べるようにする（依頼書「5. UI/UX・画面表示の変更」の
// ヘッダークイックアクション配置に対応）。活動報告の新規投稿は特定のスペースを
// 選んでから投稿する作り（スペースをまたいだ投稿専用ページが無い）のため、
// スペース一覧へのリンクにしている
const items = [
  { label: 'カレンダー',         icon: 'heroicons:calendar-days',    to: '/events' },
  { label: '顧客登録（新規）',    icon: 'heroicons:user-plus',        to: '/customers/new' },
  { label: '活動報告の新規投稿', icon: 'heroicons:pencil-square',    to: '/portal/spaces' },
  { label: '新規申請',           icon: 'heroicons:document-plus',    to: '/requests/new' },
]

const open = ref(false)
const containerRef = ref<HTMLElement>()

const onClickOutside = (e: MouseEvent) => {
  if (containerRef.value && !containerRef.value.contains(e.target as Node)) open.value = false
}
onMounted(() => document.addEventListener('click', onClickOutside))
onBeforeUnmount(() => document.removeEventListener('click', onClickOutside))
</script>

<template>
  <div ref="containerRef" class="relative">
    <button
      type="button"
      class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 transition"
      @click="open = !open"
    >
      <Icon name="heroicons:bolt" class="h-4 w-4" />
      クイックアクション
      <Icon name="heroicons:chevron-down" class="h-3.5 w-3.5 text-gray-400" />
    </button>

    <Transition
      enter-active-class="transition duration-150"
      enter-from-class="opacity-0 -translate-y-1"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-100"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="open" class="absolute left-0 mt-2 w-56 rounded-lg bg-white shadow-lg ring-1 ring-gray-200 py-1 z-30">
        <NuxtLink
          v-for="item in items"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
          @click="open = false"
        >
          <Icon :name="item.icon" class="h-4 w-4 text-gray-400 shrink-0" />
          {{ item.label }}
        </NuxtLink>
      </div>
    </Transition>
  </div>
</template>
