<script setup lang="ts">
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'

const props = defineProps(nodeViewProps)

const SIZES = [100, 250, 500, 750]

const applyWidth = (w: number | null) => {
  props.updateAttributes({ width: w ? `${w}px` : null })
}
</script>

<template>
  <NodeViewWrapper class="my-2">
    <span class="relative inline-block leading-none" :class="{ 'ring-2 ring-primary-400 rounded-lg': selected }">
      <img
        :src="node.attrs.src"
        :alt="node.attrs.alt"
        :style="node.attrs.width ? `width: ${node.attrs.width}` : ''"
        class="rounded-lg max-w-full align-top"
      />
      <span
        v-if="selected"
        class="absolute left-0 top-full z-20 mt-1 flex flex-wrap items-center gap-x-1 gap-y-0.5 rounded-lg border border-gray-200 bg-white px-2 py-1 shadow-lg text-xs text-primary-600 whitespace-nowrap"
        contenteditable="false"
      >
        <button
          v-for="s in SIZES"
          :key="s"
          type="button"
          class="hover:underline"
          @mousedown.prevent="applyWidth(s)"
        >{{ s }}px</button>
        <span class="text-gray-300">,</span>
        <button type="button" class="hover:underline" @mousedown.prevent="applyWidth(null)">
          元のサイズ<template v-if="node.attrs.originalWidth">({{ node.attrs.originalWidth }}px)</template>
        </button>
        <span class="text-gray-300">-</span>
        <button type="button" class="text-red-500 hover:underline" @mousedown.prevent="deleteNode">削除</button>
      </span>
    </span>
  </NodeViewWrapper>
</template>
