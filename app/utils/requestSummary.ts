import type { AppRequest } from '~/types/request'

// 申請の一覧表示で使う共通ヘルパー（requests/index.vue・requests/new.vue で共有）
export const requestStatusBadge = (status: string) => {
  if (status === 'approved') return 'bg-green-100 text-green-700'
  if (status === 'rejected') return 'bg-red-100 text-red-600'
  return 'bg-amber-100 text-amber-700'
}

export const requestPayloadSummary = (r: AppRequest): string => {
  const p = r.payload ?? {}
  if (r.type === 'kumiai_create') return `${p.groupName ?? ''} / ${p.name ?? ''}`
  if (r.type === 'group_create') return p.name ?? ''
  if (r.type === 'kumiai_member_create') return `${p.displayName ?? ''}（${p.email ?? ''}）`
  if (r.type === 'plan_change') return `${p.targetName ?? ''} → ${p.newPlan ?? ''}`
  if (r.type === 'supporter_change') return `${p.targetName ?? ''} のサポート者変更`
  if (r.type === 'kumiai_member_withdraw') return `${p.targetName ?? ''} の脱退`
  if (r.type === 'kumiai_dissolve') return `${p.groupName ?? ''} / ${p.kumiaiName ?? ''} の解体`
  return ''
}
