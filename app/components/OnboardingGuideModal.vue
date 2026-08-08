<script setup lang="ts">
import { useUsers } from '~/composables/useUsers'
import { useAuthStore } from '~/stores/auth'
import type { AppUser } from '~/types/user'

const authStore = useAuthStore()
const { updateMyProfile } = useUsers()

// 認証確認が完了し、初回ログイン（onboardingSeenが未設定）のユーザーにのみ表示する
const show = computed(() =>
  authStore.confirmed && !!authStore.user && !authStore.user.onboardingSeen,
)

const dismissing = ref(false)

const dismiss = async () => {
  if (!authStore.user || dismissing.value) return
  dismissing.value = true
  try {
    await updateMyProfile({ onboardingSeen: true })
    authStore.setUser({ ...authStore.user, onboardingSeen: true } as AppUser)
  } catch {
    // 保存に失敗しても、その場では閉じられるようにする（次回起動時に再度表示される）
    authStore.setUser({ ...authStore.user, onboardingSeen: true } as AppUser)
  } finally {
    dismissing.value = false
  }
}

const goToSettings = () => {
  dismiss()
  navigateTo('/settings')
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="show"
      class="fixed inset-0 z-[70] flex items-end md:items-center justify-center bg-black/50 p-0 md:p-4"
    >
      <div class="bg-white w-full md:max-w-md rounded-t-2xl md:rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
        <div class="p-6 text-center border-b border-gray-100">
          <img src="/logo.png" alt="" class="w-14 h-14 object-contain mx-auto mb-3" />
          <h2 class="text-lg font-bold text-gray-900">JACCS Neoへようこそ</h2>
          <p class="text-sm text-gray-500 mt-1">はじめに、次の2つの設定をおすすめします</p>
        </div>

        <div class="p-5 space-y-4">
          <!-- PWAインストール -->
          <div class="rounded-xl border border-primary-200 bg-primary-50 p-4">
            <div class="flex items-start gap-3">
              <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-600">
                <Icon name="heroicons:arrow-down-tray" class="h-5 w-5" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="font-semibold text-gray-900 text-sm">アプリとしてインストール</p>
                <p class="text-xs text-gray-600 mt-1 leading-relaxed">
                  ホーム画面・デスクトップに追加すると、ブラウザを開かずアプリのようにすぐ使えます。
                </p>
              </div>
            </div>
          </div>

          <!-- 通知設定 -->
          <div class="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div class="flex items-start gap-3">
              <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                <Icon name="heroicons:bell" class="h-5 w-5" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="font-semibold text-gray-900 text-sm">通知設定を確認する</p>
                <p class="text-xs text-gray-600 mt-1 leading-relaxed">
                  メンションやコメント、イベント作成などの通知を受け取るかどうかを設定できます。
                </p>
              </div>
            </div>
          </div>

          <p class="text-xs text-gray-400 text-center">
            どちらも「設定」画面からいつでも変更できます
          </p>
        </div>

        <div class="p-5 pt-0 flex flex-col gap-2">
          <button type="button" class="btn-primary w-full text-sm" :disabled="dismissing" @click="goToSettings">
            <Icon name="heroicons:cog-6-tooth" class="h-4 w-4" />
            設定画面を開く
          </button>
          <button type="button" class="btn-secondary w-full text-sm" :disabled="dismissing" @click="dismiss">
            あとで（このガイドを閉じる）
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
