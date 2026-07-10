<script setup lang="ts">
import type { OrgTreeNode } from '~/composables/useOrgTree'

defineProps<{ node: OrgTreeNode }>()

const ROLE_LABELS: Record<string, string> = {
  system_admin: 'システム管理者',
  board:        '理事会メンバー',
  em2_above:    'EM2以上',
  general:      '一般',
}
</script>

<template>
  <div class="flex flex-col items-center shrink-0">
    <NuxtLink
      :to="`/team/${node.user.uid}`"
      class="flex flex-col items-center gap-1 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm hover:shadow-md hover:border-primary-300 transition min-w-[136px] max-w-[160px]"
    >
      <div class="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-primary-700 font-semibold shrink-0">
        {{ node.user.displayName.charAt(0) }}
      </div>
      <p class="text-sm font-semibold text-gray-900 text-center leading-tight">{{ node.user.displayName }}</p>
      <p class="text-[10px] text-gray-400 text-center">{{ node.user.position || ROLE_LABELS[node.user.role] }}</p>
      <p v-if="node.subSupporter" class="text-[10px] text-indigo-500 text-center mt-0.5 truncate w-full">
        サブ: {{ node.subSupporter.displayName }}
      </p>
    </NuxtLink>

    <template v-if="node.children.length > 0">
      <div class="w-px h-5 bg-gray-300" />
      <div class="flex items-start gap-6">
        <div v-for="child in node.children" :key="child.user.uid" class="flex flex-col items-center">
          <OrgTreeNode :node="child" />
        </div>
      </div>
    </template>
  </div>
</template>
