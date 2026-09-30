<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

const tools = [
  {
    label: '問い合わせ管理',
    description: '社内外からの問い合わせを登録・管理します',
    icon: 'heroicons:chat-bubble-left-ellipsis',
    to: '/tools/inquiries',
  },
  {
    label: '動画配信',
    description: '研修・案内動画を共有します',
    icon: 'heroicons:play-circle',
    to: '/tools/videos',
  },
  {
    label: 'ファイル管理',
    description: '各種ファイルをアップロード・共有します',
    icon: 'heroicons:folder',
    to: '/tools/files',
  },
]
</script>

<template>
  <div class="p-4 md:p-6 max-w-4xl mx-auto space-y-5">

    <div>
      <h1 class="text-xl font-bold text-gray-900">業務ツールアプリ</h1>
      <p class="text-sm text-gray-500 mt-0.5">利用するツールを選択してください</p>
    </div>

    <div class="grid md:grid-cols-3 gap-4">
      <NuxtLink
        v-for="tool in tools"
        :key="tool.to"
        :to="tool.to"
        class="card p-5 flex flex-col items-start gap-3 hover:shadow-md transition"
      >
        <span class="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
          <Icon :name="tool.icon" class="h-5 w-5" />
        </span>
        <div>
          <p class="font-semibold text-gray-900">{{ tool.label }}</p>
          <p class="text-xs text-gray-500 mt-1">{{ tool.description }}</p>
        </div>
      </NuxtLink>
    </div>

  </div>
</template>
