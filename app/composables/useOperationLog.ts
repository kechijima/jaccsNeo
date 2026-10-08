/**
 * 操作ログ（重要操作・CSV出力の記録）
 * operationLogs コレクションに記録する。ログ記録自体の失敗で本来の操作を
 * 失敗させないよう、呼び出し側へは例外を投げない
 */
import {
  collection, addDoc, getDocs, query, orderBy, limit, serverTimestamp,
  type DocumentData,
} from 'firebase/firestore'
import { useAuthStore } from '~/stores/auth'

export type OperationLogAction =
  | 'login'
  | 'logout'
  | 'app_delete'
  | 'space_archive'
  | 'kumiai_create'
  | 'kumiai_dissolve'
  | 'group_create'
  | 'request_approve'
  | 'request_reject'
  | 'user_role_change'
  | 'user_withdraw'
  | 'csv_export'
  | 'csv_import'

export const OPERATION_LOG_LABELS: Record<OperationLogAction, string> = {
  login:             'ログイン',
  logout:            'ログアウト',
  app_delete:        'アプリの削除',
  space_archive:     'スペースのアーカイブ切替',
  kumiai_create:     '組合・準備室の登録',
  kumiai_dissolve:   '組合の解体',
  group_create:      'グループの登録',
  request_approve:   '申請の承認',
  request_reject:    '申請の却下',
  user_role_change:  'ユーザー権限の変更',
  user_withdraw:     '組合員の脱退',
  csv_export:        'CSV出力',
  csv_import:        'CSVインポート',
}

export interface OperationLogEntry {
  id: string
  action: OperationLogAction
  actionLabel: string
  detail?: string
  uid: string
  displayName: string
  createdAt: any
}

const toEntry = (id: string, data: DocumentData): OperationLogEntry => ({
  id,
  action:      data.action,
  actionLabel: data.actionLabel ?? OPERATION_LOG_LABELS[data.action as OperationLogAction] ?? data.action,
  detail:      data.detail,
  uid:         data.uid ?? '',
  displayName: data.displayName ?? '',
  createdAt:   data.createdAt,
})

export const useOperationLog = () => {
  const { $db } = useNuxtApp()
  const authStore = useAuthStore()

  const logsCol = () => collection($db, 'operationLogs')

  const log = async (action: OperationLogAction, detail?: string): Promise<void> => {
    try {
      await addDoc(logsCol(), {
        action,
        actionLabel: OPERATION_LOG_LABELS[action],
        detail:      detail ?? '',
        uid:         authStore.user?.uid ?? '',
        displayName: authStore.user?.displayName ?? '',
        createdAt:   serverTimestamp(),
      })
    } catch (e) {
      console.error('操作ログの記録に失敗しました', e)
    }
  }

  const fetchRecent = async (count = 300): Promise<OperationLogEntry[]> => {
    const snap = await getDocs(query(logsCol(), orderBy('createdAt', 'desc'), limit(count)))
    return snap.docs.map(d => toEntry(d.id, d.data()))
  }

  return { log, fetchRecent }
}
