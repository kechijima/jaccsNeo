<script setup lang="ts">
import { useAuthorProfileModal } from '~/composables/useAuthorProfileModal'

const { authorProfileModal, closeAuthorProfile } = useAuthorProfileModal()
const router = useRouter()

const goToProfile = () => {
  const uid = authorProfileModal.value.uid
  closeAuthorProfile()
  router.push(`/team/${uid}`)
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="authorProfileModal.open"
      class="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40"
      @click.self="closeAuthorProfile"
    >
      <div class="bg-white w-full md:max-w-xs rounded-t-2xl md:rounded-2xl p-6 space-y-4 shadow-xl text-center max-h-[85vh] overflow-y-auto">
        <div class="flex h-12 w-12 mx-auto items-center justify-center rounded-full bg-primary-100 text-primary-700 font-semibold shrink-0">
          {{ authorProfileModal.name.charAt(0) }}
        </div>
        <p class="text-sm text-gray-700 leading-relaxed">
          <span class="font-semibold text-gray-900">{{ authorProfileModal.name }}</span> さんの<br />
          マイページを見ますか？
        </p>
        <div class="flex gap-3 pt-1">
          <button class="flex-1 btn-secondary text-sm" @click="closeAuthorProfile">キャンセル</button>
          <button class="flex-1 btn-primary text-sm" @click="goToProfile">マイページを見る</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
