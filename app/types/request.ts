import type { Timestamp } from 'firebase/firestore'

// 申請→理事会承認フロー。承認されると各payloadの内容が実データへ反映される
export type RequestType =
  | 'kumiai_create'         // 組合の登録
  | 'kumiai_preparatory_create' // 準備室の登録（組合登録前の段階）
  | 'kumiai_promote'        // 準備室から組合への昇格
  | 'group_create'          // グループの登録
  | 'kumiai_member_create'  // 組合員の登録
  | 'plan_change'           // 組合員のプラン変更
  | 'supporter_change'      // サポート者の変更
  | 'kumiai_member_withdraw' // 組合員の脱退
  | 'kumiai_dissolve'        // 組合の解体

export type RequestStatus = 'pending' | 'approved' | 'rejected'

export const REQUEST_TYPE_LABELS: Record<RequestType, string> = {
  kumiai_create:             '組合の登録',
  kumiai_preparatory_create: '準備室の登録',
  kumiai_promote:            '準備室から組合への昇格',
  group_create:              'グループの登録',
  kumiai_member_create:      '組合員の登録',
  plan_change:               '組合員のプラン変更',
  supporter_change:          'サポート者の変更',
  kumiai_member_withdraw:    '組合員の脱退',
  kumiai_dissolve:           '組合の解体',
}

export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  pending:  '承認待ち',
  approved: '承認済み',
  rejected: '却下',
}

// ── 申請種別ごとのペイロード（承認時にそのまま実データへ反映される） ──────
export interface KumiaiCreatePayload {
  groupId: string
  groupName?: string   // 表示用（一覧でグループを再取得しなくて済むように保持）
  name: string
  adminName?: string
}

export interface GroupCreatePayload {
  name: string
}

export interface KumiaiMemberCreatePayload {
  displayName: string
  email: string
  groupId?: string
  groupName?: string
  kumiaiId?: string
  kumiaiName?: string
  position?: string
  mainSupporterUid?: string
  mainSupporterName?: string
  subSupporterUid?: string
  subSupporterName?: string
}

export interface PlanChangePayload {
  targetUid: string
  targetName: string
  newPlan: string
}

export interface SupporterChangePayload {
  targetUid: string
  targetName: string
  mainSupporterUid?: string
  mainSupporterName?: string
  subSupporterUid?: string
  subSupporterName?: string
}

export interface KumiaiMemberWithdrawPayload {
  targetUid: string
  targetName: string
}

export interface KumiaiDissolvePayload {
  groupId: string
  groupName?: string
  kumiaiId: string
  kumiaiName: string
}

// 準備室の登録はkumiai_createと同じ項目（承認時にstatus:'preparatory'で組合を作成する）
export type KumiaiPreparatoryCreatePayload = KumiaiCreatePayload

export interface KumiaiPromotePayload {
  groupId: string
  groupName?: string
  kumiaiId: string
  kumiaiName: string
}

export type RequestPayload =
  | KumiaiCreatePayload
  | KumiaiPreparatoryCreatePayload
  | KumiaiPromotePayload
  | GroupCreatePayload
  | KumiaiMemberCreatePayload
  | PlanChangePayload
  | SupporterChangePayload
  | KumiaiMemberWithdrawPayload
  | KumiaiDissolvePayload

export interface AppRequest {
  id: string
  type: RequestType
  status: RequestStatus
  payload: Record<string, any>
  note?: string
  requestedBy: string
  requestedByName: string
  requestedAt: Timestamp
  reviewedBy?: string
  reviewedByName?: string
  reviewedAt?: Timestamp
  rejectReason?: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface RequestForm {
  type: RequestType
  payload: Record<string, any>
  note?: string
}
