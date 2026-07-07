<script setup lang="ts">
import { useToast } from '~/composables/useToast'
const { toast } = useToast()
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200"
      enter-from-class="opacity-0 translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-150"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-2"
    >
      <div
        v-if="toast.visible"
        class="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 rounded-full bg-gray-900 text-white px-4 py-2.5 text-sm shadow-lg"
      >
        <Icon name="heroicons:check-circle" class="h-4 w-4 text-green-400 shrink-0" />
        {{ toast.message }}
      </div>
    </Transition>
  </Teleport>
</template>
