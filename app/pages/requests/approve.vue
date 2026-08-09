<script setup lang="ts">
import { useRequests } from '~/composables/useRequests'
import { useGroups } from '~/composables/useGroups'
import { useUsers } from '~/composables/useUsers'
import { useNotifications } from '~/composables/useNotifications'
import { useDirectorIndex } from '~/composables/useDirectorIndex'
import { REQUEST_TYPE_LABELS, REQUEST_STATUS_LABELS } from '~/types/request'
import type { AppRequest } from '~/types/request'

definePageMeta({ middleware: ['auth', 'board-or-above'] })

const { requests, loading, fetchAll, markReviewed } = useRequests()
const { createGroup, createKumiai, updateKumiai } = useGroups()
const { createAuthUser, updateUser, fetchUser } = useUsers()
const { sendPasswordReset } = useAuth()
const { sendNotification } = useNotifications()
const { upsertDirectorAssignment, removeMemberFromIndex } = useDirectorIndex()

await fetchAll()

const filterStatus = ref<'pending' | 'approved' | 'rejected' | 'all'>('pending')
const filteredRequests = computed(() => {
  if (filterStatus.value === 'all') return requests.value
  return requests.value.filter(r => r.status === filterStatus.value)
})

const processingId = ref<string | null>(null)
const actionError = ref('')

const fmt = (ts: any) =>
  ts?.toDate?.().toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) ?? ''

const statusBadge = (status: string) => {
  if (status === 'approved') return 'bg-green-100 text-green-700'
  if (status === 'rejected') return 'bg-red-100 text-red-600'
  return 'bg-amber-100 text-amber-700'
}

// 申請内容の表示（種別ごとの項目一覧）
const payloadRows = (r: AppRequest): { label: string; value: string }[] => {
  const p = r.payload ?? {}
  if (r.type === 'kumiai_create') {
    return [
      { label: '所属グループ', value: p.groupName ?? p.groupId ?? '' },
      { label: '組合名', value: p.name ?? '' },
      { label: '組合管理者名', value: p.adminName || '（なし）' },
    ]
  }
  if (r.type === 'group_create') {
    return [{ label: 'グループ名', value: p.name ?? '' }]
  }
  if (r.type === 'kumiai_member_create') {
    return [
      { label: '氏名', value: p.displayName ?? '' },
      { label: 'メールアドレス', value: p.email ?? '' },
      { label: '所属グループ', value: p.groupName || '（なし）' },
      { label: '所属組合', value: p.kumiaiName || '（なし）' },
      { label: 'タイトル', value: p.position || '（なし）' },
      { label: 'メインサポート', value: p.mainSupporterName || '（なし）' },
      { label: 'サブサポート', value: p.subSupporterName || '（なし）' },
    ]
  }
  if (r.type === 'plan_change') {
    return [
      { label: '対象', value: p.targetName ?? '' },
      { label: '変更後のプラン', value: p.newPlan ?? '' },
    ]
  }
  if (r.type === 'supporter_change') {
    return [
      { label: '対象', value: p.targetName ?? '' },
      { label: '新しいメインサポート', value: p.mainSupporterName || '（変更なし）' },
      { label: '新しいサブサポート', value: p.subSupporterName || '（変更なし）' },
    ]
  }
  if (r.type === 'kumiai_member_withdraw') {
    return [{ label: '対象', value: p.targetName ?? '' }]
  }
  if (r.type === 'kumiai_dissolve') {
    return [
      { label: '所属グループ', value: p.groupName ?? p.groupId ?? '' },
      { label: '組合名', value: p.kumiaiName ?? '' },
    ]
  }
  return []
}

// 承認時に実データへ反映する（各申請種別ごとの適用処理）
const applyRequest = async (r: AppRequest): Promise<void> => {
  const p = r.payload ?? {}
  if (r.type === 'kumiai_create') {
    await createKumiai(p.groupId, { name: p.name, adminName: p.adminName })
  } else if (r.type === 'group_create') {
    await createGroup(p.name)
  } else if (r.type === 'kumiai_member_create') {
    const tempPassword = `Jaccs${Math.random().toString(36).slice(-6)}!${Math.floor(Math.random() * 10)}`
    const uid = await createAuthUser({
      email:        p.email,
      password:     tempPassword,
      displayName:  p.displayName,
      role:         'general',
      specialTeams: [],
      groupId:      p.groupId || undefined,
      kumiaiId:     p.kumiaiId || undefined,
      position:     p.position || undefined,
    })
    await updateUser(uid, {
      kumiaiName:       p.kumiaiName || null,
      mainSupporterUid: p.mainSupporterUid || null,
      subSupporterUid:  p.subSupporterUid || null,
    })
    await sendPasswordReset(p.email).catch(() => {})
    await syncDirectorIndexForSupporters(p.displayName, p.kumiaiName, p)
  } else if (r.type === 'plan_change') {
    await updateUser(p.targetUid, { membershipPlan: p.newPlan })
  } else if (r.type === 'supporter_change') {
    await updateUser(p.targetUid, {
      mainSupporterUid: p.mainSupporterUid || null,
      subSupporterUid:  p.subSupporterUid || null,
    })
    // この申請には対象者の所属組合が含まれていないため、現在のプロフィールから取得する
    const target = await fetchUser(p.targetUid).catch(() => null)
    await syncDirectorIndexForSupporters(p.targetName ?? target?.displayName, target?.kumiaiName, p)
  } else if (r.type === 'kumiai_member_withdraw') {
    // データは削除せず脱退フラグのみ設定する。以後ログイン・システム利用はできなくなる
    await updateUser(p.targetUid, { isWithdrawn: true })
    // ディレクター逆引きの担当メンバー一覧からも除外する
    const target = await fetchUser(p.targetUid).catch(() => null)
    await removeMemberFromIndex(p.targetName ?? target?.displayName ?? '').catch(() => {})
  } else if (r.type === 'kumiai_dissolve') {
    // 組合データは残したまま解体フラグのみ設定する。以後、各種選択肢には表示されなくなる
    await updateKumiai(p.groupId, p.kumiaiId, { isDissolved: true })
  }
}

// メインサポート/サブサポートの設定をディレクター逆引きへ反映する
const syncDirectorIndexForSupporters = async (
  memberName: string | undefined,
  kumiaiName: string | undefined,
  p: Record<string, any>,
): Promise<void> => {
  if (!memberName || !kumiaiName) return
  if (p.mainSupporterName) {
    await upsertDirectorAssignment({ directorName: p.mainSupporterName, kumiaiName, role: 'main', memberName }).catch(() => {})
  }
  if (p.subSupporterName) {
    await upsertDirectorAssignment({ directorName: p.subSupporterName, kumiaiName, role: 'sub', memberName }).catch(() => {})
  }
}

const handleApprove = async (r: AppRequest) => {
  if (!confirm(`「${REQUEST_TYPE_LABELS[r.type]}」の申請を承認しますか？`)) return
  processingId.value = r.id
  actionError.value = ''
  try {
    await applyRequest(r)
    await markReviewed(r.id, 'approved')
    await sendNotification(r.requestedBy, {
      type: 'system',
      title: '申請が承認されました',
      body: `「${REQUEST_TYPE_LABELS[r.type]}」の申請が承認され、反映されました。`,
      linkUrl: '/requests',
    }).catch(() => {})

    // 新規アカウント作成時は、招待メールでパスワードを設定しただけでは本人が
    // アプリのURLを知る手段がないため、共有を促す
    if (r.type === 'kumiai_member_create') {
      alert(`「${r.payload?.displayName ?? ''}」さんのアカウントを作成しました。\n招待メールでパスワードを設定してもらった後、下記URLを別途お伝えください。\n\n${window.location.origin}/login`)
    }
  } catch (e: any) {
    actionError.value = e.message ?? '承認処理に失敗しました'
  } finally {
    processingId.value = null
  }
}

const handleReject = async (r: AppRequest) => {
  const reason = prompt('却下理由を入力してください（空欄でも可）') ?? ''
  if (reason === null) return
  processingId.value = r.id
  actionError.value = ''
  try {
    await markReviewed(r.id, 'rejected', reason || undefined)
    await sendNotification(r.requestedBy, {
      type: 'system',
      title: '申請が却下されました',
      body: `「${REQUEST_TYPE_LABELS[r.type]}」の申請が却下されました。${reason ? '理由: ' + reason : ''}`,
      linkUrl: '/requests',
    }).catch(() => {})
  } catch (e: any) {
    actionError.value = e.message ?? '却下処理に失敗しました'
  } finally {
    processingId.value = null
  }
}
</script>

<template>
  <div class="p-4 md:p-6 max-w-3xl mx-auto space-y-5">

    <div class="flex items-center gap-2 text-sm text-gray-400">
      <NuxtLink to="/requests">申請</NuxtLink>
      <Icon name="heroicons:chevron-right" class="h-3 w-3" />
      <span class="text-gray-600">承認キュー</span>
    </div>

    <h1 class="text-xl font-bold text-gray-900 flex items-center gap-2">
      <Icon name="heroicons:clipboard-document-check" class="h-6 w-6 text-primary-600" />
      承認キュー
    </h1>

    <div v-if="actionError" class="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
      <Icon name="heroicons:exclamation-circle" class="mt-0.5 h-4 w-4 shrink-0" />
      {{ actionError }}
    </div>

    <!-- フィルタータブ -->
    <div class="flex items-center gap-2 flex-wrap">
      <button
        v-for="s in [{ key: 'pending', label: '承認待ち' }, { key: 'approved', label: '承認済み' }, { key: 'rejected', label: '却下' }, { key: 'all', label: 'すべて' }]"
        :key="s.key"
        class="px-3 py-1.5 rounded-full text-sm font-medium transition"
        :class="filterStatus === s.key ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
        @click="filterStatus = s.key as any"
      >{{ s.label }}</button>
    </div>

    <!-- 読み込み中 -->
    <div v-if="loading" class="card p-12 text-center">
      <Icon name="heroicons:arrow-path" class="h-8 w-8 text-gray-300 mx-auto mb-2 animate-spin" />
      <p class="text-sm text-gray-400">読み込み中...</p>
    </div>

    <!-- 空の状態 -->
    <div v-else-if="filteredRequests.length === 0" class="card p-16 text-center">
      <Icon name="heroicons:clipboard-document-check" class="h-12 w-12 text-gray-200 mx-auto mb-3" />
      <p class="text-gray-400 font-medium">該当する申請はありません</p>
    </div>

    <!-- 申請一覧 -->
    <div v-else class="space-y-3">
      <div v-for="r in filteredRequests" :key="r.id" class="card p-5">
        <div class="flex items-start justify-between gap-3 flex-wrap">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="badge text-xs bg-gray-100 text-gray-600">{{ REQUEST_TYPE_LABELS[r.type] }}</span>
            <span class="badge text-xs" :class="statusBadge(r.status)">{{ REQUEST_STATUS_LABELS[r.status] }}</span>
          </div>
          <p class="text-xs text-gray-400">申請者: {{ r.requestedByName }}（{{ fmt(r.requestedAt) }}）</p>
        </div>

        <div class="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
          <div v-for="row in payloadRows(r)" :key="row.label" class="text-sm">
            <span class="text-gray-400">{{ row.label }}:</span>
            <span class="text-gray-800 ml-1">{{ row.value }}</span>
          </div>
        </div>

        <p v-if="r.note" class="mt-2 text-xs text-gray-500 border-t border-gray-100 pt-2">備考: {{ r.note }}</p>
        <p v-if="r.status === 'rejected' && r.rejectReason" class="mt-2 text-xs text-red-500">却下理由: {{ r.rejectReason }}</p>
        <p v-if="r.status !== 'pending' && r.reviewedByName" class="mt-1 text-xs text-gray-400">
          承認者: {{ r.reviewedByName }}（{{ REQUEST_STATUS_LABELS[r.status] }} · {{ fmt(r.reviewedAt) }}）
        </p>

        <div v-if="r.status === 'pending'" class="mt-4 flex justify-end gap-2">
          <button
            class="btn-secondary text-sm text-red-600"
            :disabled="processingId === r.id"
            @click="handleReject(r)"
          >却下</button>
          <button
            class="btn-primary text-sm"
            :disabled="processingId === r.id"
            @click="handleApprove(r)"
          >
            <Icon v-if="processingId === r.id" name="heroicons:arrow-path" class="h-4 w-4 animate-spin mr-1" />
            承認する
          </button>
        </div>
      </div>
    </div>

  </div>
</template>
