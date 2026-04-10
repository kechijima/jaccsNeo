<script setup lang="ts">
import type { CustomerForm } from '~/types/customer'

definePageMeta({ middleware: ['auth'] })

const { createCustomer } = useCustomers()

const form = ref<Partial<CustomerForm>>({
  type: 'individual',
  familyMembers: [],
})
const loading = ref(false)
const error   = ref('')

const handleSubmit = async () => {
  if (!form.value.name?.trim()) {
    error.value = '氏名は必須です'
    return
  }
  loading.value = true
  error.value = ''
  try {
    const id = await createCustomer(form.value as CustomerForm)
    await navigateTo(`/customers/${id}`)
  } catch (e: any) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="p-4 md:p-6 max-w-3xl mx-auto">
    <div class="mb-6">
      <NuxtLink to="/customers" class="text-sm text-gray-400 hover:text-gray-600">← 顧客一覧</NuxtLink>
      <h1 class="mt-1 text-xl font-bold text-gray-900">顧客登録</h1>
    </div>

    <div v-if="error" class="mb-4 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
      <Icon name="heroicons:exclamation-circle" class="mt-0.5 h-4 w-4 shrink-0" />
      {{ error }}
    </div>

    <CustomerForm v-model="form" :loading="loading" @submit="handleSubmit" />
  </div>
</template>
