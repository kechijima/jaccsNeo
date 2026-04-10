<script setup lang="ts">
import type { CustomerForm, FamilyMember } from '~/types/customer'

const props = defineProps<{
  modelValue: Partial<CustomerForm>
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: Partial<CustomerForm>]
  'submit': []
}>()

const form = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const update = (key: string, value: any) => {
  emit('update:modelValue', { ...props.modelValue, [key]: value })
}

// ===== 家族メンバー操作 =====
const familyMembers = computed<FamilyMember[]>({
  get: () => props.modelValue.familyMembers ?? [],
  set: (v) => update('familyMembers', v),
})

const addFamilyMember = () => {
  if (familyMembers.value.length >= 6) return
  familyMembers.value = [...familyMembers.value, { name: '', relationship: '' }]
}

const removeFamilyMember = (idx: number) => {
  familyMembers.value = familyMembers.value.filter((_, i) => i !== idx)
}

const updateFamilyMember = (idx: number, key: keyof FamilyMember, value: string) => {
  const updated = familyMembers.value.map((m, i) => i === idx ? { ...m, [key]: value } : m)
  familyMembers.value = updated
}
</script>

<template>
  <form class="space-y-6" @submit.prevent="emit('submit')">

    <!-- ===== 個人/法人区分 ===== -->
    <div class="card p-5">
      <h3 class="font-semibold text-gray-900 mb-4">区分</h3>
      <div class="flex gap-4">
        <label class="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            :checked="(form.type ?? 'individual') === 'individual'"
            value="individual"
            class="h-4 w-4 text-primary-600"
            @change="update('type', 'individual')"
          />
          <span class="text-sm font-medium text-gray-700">個人</span>
        </label>
        <label class="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            :checked="form.type === 'corporate'"
            value="corporate"
            class="h-4 w-4 text-primary-600"
            @change="update('type', 'corporate')"
          />
          <span class="text-sm font-medium text-gray-700">法人</span>
        </label>
      </div>
    </div>

    <!-- ===== 基本情報 ===== -->
    <div class="card p-5">
      <h3 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Icon name="heroicons:user" class="h-5 w-5 text-primary-600" />
        基本情報
      </h3>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div class="sm:col-span-2">
          <label class="block text-sm font-medium text-gray-700 mb-1">
            氏名 <span class="text-red-500">*</span>
          </label>
          <input
            :value="form.name"
            type="text"
            required
            class="input-field"
            placeholder="山田 太郎"
            @input="update('name', ($event.target as HTMLInputElement).value)"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">フリガナ</label>
          <input
            :value="form.nameKana"
            type="text"
            class="input-field"
            placeholder="ヤマダ タロウ"
            @input="update('nameKana', ($event.target as HTMLInputElement).value)"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">性別</label>
          <select
            :value="form.gender ?? ''"
            class="input-field"
            @change="update('gender', ($event.target as HTMLSelectElement).value)"
          >
            <option value="">未選択</option>
            <option value="男">男</option>
            <option value="女">女</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">生年月日</label>
          <input
            :value="form.dob"
            type="date"
            class="input-field"
            @input="update('dob', ($event.target as HTMLInputElement).value)"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">TEL</label>
          <input
            :value="form.tel"
            type="tel"
            class="input-field"
            placeholder="090-0000-0000"
            @input="update('tel', ($event.target as HTMLInputElement).value)"
          />
        </div>
        <div class="sm:col-span-2">
          <label class="block text-sm font-medium text-gray-700 mb-1">メールアドレス</label>
          <input
            :value="form.email"
            type="email"
            class="input-field"
            placeholder="example@email.com"
            @input="update('email', ($event.target as HTMLInputElement).value)"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">郵便番号</label>
          <input
            :value="form.postalCode"
            type="text"
            class="input-field"
            placeholder="000-0000"
            maxlength="8"
            @input="update('postalCode', ($event.target as HTMLInputElement).value)"
          />
        </div>
        <div class="sm:col-span-2">
          <label class="block text-sm font-medium text-gray-700 mb-1">住所</label>
          <input
            :value="form.address"
            type="text"
            class="input-field"
            @input="update('address', ($event.target as HTMLInputElement).value)"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">勤務先</label>
          <input
            :value="form.employer"
            type="text"
            class="input-field"
            @input="update('employer', ($event.target as HTMLInputElement).value)"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">年収</label>
          <input
            :value="form.annualIncome"
            type="text"
            class="input-field"
            placeholder="500万円"
            @input="update('annualIncome', ($event.target as HTMLInputElement).value)"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">出身</label>
          <input
            :value="form.hometown"
            type="text"
            class="input-field"
            @input="update('hometown', ($event.target as HTMLInputElement).value)"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">国籍</label>
          <input
            :value="form.nationality"
            type="text"
            class="input-field"
            @input="update('nationality', ($event.target as HTMLInputElement).value)"
          />
        </div>
        <div class="sm:col-span-2">
          <label class="block text-sm font-medium text-gray-700 mb-1">SNS/HP URL</label>
          <input
            :value="form.snsUrl"
            type="url"
            class="input-field"
            placeholder="https://"
            @input="update('snsUrl', ($event.target as HTMLInputElement).value)"
          />
        </div>
      </div>
    </div>

    <!-- ===== 法人情報 ===== -->
    <div v-if="form.type === 'corporate'" class="card p-5">
      <h3 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Icon name="heroicons:building-office" class="h-5 w-5 text-amber-600" />
        法人情報
      </h3>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">法人名</label>
          <input :value="form.companyName" type="text" class="input-field"
            @input="update('companyName', ($event.target as HTMLInputElement).value)" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">法人名（カナ）</label>
          <input :value="form.companyNameKana" type="text" class="input-field"
            @input="update('companyNameKana', ($event.target as HTMLInputElement).value)" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">業種</label>
          <input :value="form.industry" type="text" class="input-field"
            @input="update('industry', ($event.target as HTMLInputElement).value)" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">年商</label>
          <input :value="form.annualSales" type="text" class="input-field"
            @input="update('annualSales', ($event.target as HTMLInputElement).value)" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">資本金</label>
          <input :value="form.capital" type="text" class="input-field"
            @input="update('capital', ($event.target as HTMLInputElement).value)" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">代表TEL</label>
          <input :value="form.companyTel" type="tel" class="input-field"
            @input="update('companyTel', ($event.target as HTMLInputElement).value)" />
        </div>
        <div class="sm:col-span-2">
          <label class="block text-sm font-medium text-gray-700 mb-1">本店所在地</label>
          <input :value="form.headOffice" type="text" class="input-field"
            @input="update('headOffice', ($event.target as HTMLInputElement).value)" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">代表取締役氏名</label>
          <input :value="form.ceoName" type="text" class="input-field"
            @input="update('ceoName', ($event.target as HTMLInputElement).value)" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">設立年月日</label>
          <input :value="form.establishedDate" type="date" class="input-field"
            @input="update('establishedDate', ($event.target as HTMLInputElement).value)" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">従業員の有無</label>
          <input :value="form.employees" type="text" class="input-field"
            @input="update('employees', ($event.target as HTMLInputElement).value)" />
        </div>
      </div>
    </div>

    <!-- ===== 家族情報 ===== -->
    <div class="card p-5">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-semibold text-gray-900 flex items-center gap-2">
          <Icon name="heroicons:user-group" class="h-5 w-5 text-primary-600" />
          家族情報
        </h3>
        <button
          v-if="familyMembers.length < 6"
          type="button"
          class="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
          @click="addFamilyMember"
        >
          <Icon name="heroicons:plus" class="h-4 w-4" />
          追加
        </button>
      </div>

      <div v-if="familyMembers.length === 0" class="text-sm text-gray-400 text-center py-4">
        家族情報はまだありません
      </div>

      <div class="space-y-3">
        <div
          v-for="(member, idx) in familyMembers"
          :key="idx"
          class="relative grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-gray-50 rounded-lg"
        >
          <button
            type="button"
            class="absolute top-2 right-2 text-gray-400 hover:text-red-500"
            @click="removeFamilyMember(idx)"
          >
            <Icon name="heroicons:x-mark" class="h-4 w-4" />
          </button>
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">氏名</label>
            <input :value="member.name" type="text" class="input-field text-sm py-1.5"
              @input="updateFamilyMember(idx, 'name', ($event.target as HTMLInputElement).value)" />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">続柄</label>
            <input :value="member.relationship" type="text" class="input-field text-sm py-1.5"
              @input="updateFamilyMember(idx, 'relationship', ($event.target as HTMLInputElement).value)" />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">生年月日</label>
            <input :value="member.dob" type="date" class="input-field text-sm py-1.5"
              @input="updateFamilyMember(idx, 'dob', ($event.target as HTMLInputElement).value)" />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">職業</label>
            <input :value="member.occupation" type="text" class="input-field text-sm py-1.5"
              @input="updateFamilyMember(idx, 'occupation', ($event.target as HTMLInputElement).value)" />
          </div>
        </div>
      </div>
      <div v-if="familyMembers.length > 0" class="mt-3">
        <label class="block text-sm font-medium text-gray-700 mb-1">その他家族</label>
        <input :value="form.otherFamily" type="text" class="input-field"
          @input="update('otherFamily', ($event.target as HTMLInputElement).value)" />
      </div>
    </div>

    <!-- ===== 担当・関係性 ===== -->
    <div class="card p-5">
      <h3 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Icon name="heroicons:chart-bar" class="h-5 w-5 text-primary-600" />
        担当・活動状況
      </h3>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">関係性</label>
          <input :value="form.relationship" type="text" class="input-field"
            @input="update('relationship', ($event.target as HTMLInputElement).value)" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">段数</label>
          <input :value="form.stage" type="text" class="input-field"
            @input="update('stage', ($event.target as HTMLInputElement).value)" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">紹介元</label>
          <input :value="form.referralSource" type="text" class="input-field"
            @input="update('referralSource', ($event.target as HTMLInputElement).value)" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">状況（ワン）</label>
          <input :value="form.status1" type="text" class="input-field"
            @input="update('status1', ($event.target as HTMLInputElement).value)" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">状況（ツー）</label>
          <input :value="form.status2" type="text" class="input-field"
            @input="update('status2', ($event.target as HTMLInputElement).value)" />
        </div>
        <div class="sm:col-span-2">
          <label class="block text-sm font-medium text-gray-700 mb-1">フォロー以降の状況</label>
          <textarea :value="form.postFollowStatus" rows="2" class="input-field resize-none"
            @input="update('postFollowStatus', ($event.target as HTMLTextAreaElement).value)" />
        </div>
      </div>
    </div>

    <!-- ===== 送信ボタン ===== -->
    <div class="flex items-center justify-end gap-3 pb-8">
      <NuxtLink to="/customers" class="btn-secondary">キャンセル</NuxtLink>
      <button type="submit" class="btn-primary" :disabled="loading">
        <Icon v-if="loading" name="heroicons:arrow-path" class="h-4 w-4 animate-spin" />
        {{ loading ? '保存中...' : '保存する' }}
      </button>
    </div>

  </form>
</template>
