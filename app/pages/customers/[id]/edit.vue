<script setup lang="ts">
import type { Customer, CustomerForm } from '~/types/customer'

definePageMeta({ middleware: ['auth'] })

const route = useRoute()
const { fetchCustomer, updateCustomer } = useCustomers()
const { canEditCustomer } = usePermission()

const id       = computed(() => route.params.id as string)
const customer = ref<Customer | null>(null)
const form     = ref<Partial<CustomerForm>>({})
const loading  = ref(false)
const fetching = ref(true)
const error    = ref('')

onMounted(async () => {
  try {
    customer.value = await fetchCustomer(id.value)
    if (!customer.value) {
      error.value = '顧客が見つかりません'
      return
    }
    if (!canEditCustomer.value) {
      await navigateTo(`/customers/${id.value}`)
      return
    }
    // フォームに展開（タイムスタンプ等は除く）
    const { createdAt, updatedAt, ...rest } = customer.value
    form.value = { ...rest }
  } catch (e: any) {
    error.value = e.message
  } finally {
    fetching.value = false
  }
})

const handleSubmit = async () => {
  if (!form.value.name?.trim()) {
    error.value = '氏名は必須です'
    return
  }
  loading.value = true
  error.value = ''
  try {
    await updateCustomer(id.value, form.value)
    await navigateTo(`/customers/${id.value}`)
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
      <NuxtLink :to="`/customers/${id}`" class="text-sm text-gray-400 hover:text-gray-600">← 詳細に戻る</NuxtLink>
      <h1 class="mt-1 text-xl font-bold text-gray-900">顧客編集</h1>
      <p v-if="customer" class="text-sm text-gray-500">{{ customer.name }}</p>
    </div>

    <div v-if="fetching" class="flex items-center justify-center py-20">
      <Icon name="heroicons:arrow-path" class="h-8 w-8 animate-spin text-gray-400" />
    </div>

    <div v-else-if="error" class="card p-8 text-center">
      <Icon name="heroicons:exclamation-circle" class="h-12 w-12 text-red-400 mx-auto mb-3" />
      <p class="text-gray-600">{{ error }}</p>
    </div>

    <template v-else>
      <div v-if="error" class="mb-4 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
        <Icon name="heroicons:exclamation-circle" class="mt-0.5 h-4 w-4 shrink-0" />
        {{ error }}
      </div>
      <CustomerForm v-model="form" :loading="loading" @submit="handleSubmit" />
    </template>
  </div>
</template>
