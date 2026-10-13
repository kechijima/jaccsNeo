import type { AppFieldDef } from '~/types/appDef'

// アプリ管理（フォームビルダー）で設定した表示条件（visibleWhen）に基づき、
// 現在の入力値でこの項目を表示すべきかどうかを判定する。
// フォーム描画（AppDynamicFields.vue）と、保存前の不要なデータ除去
// （customers/[id]/services/[serviceType]/new.vue・[caseId]/edit.vue）の
// 両方から共通で呼び出す
export const isFieldVisible = (
  field: Pick<AppFieldDef, 'visibleWhen'>,
  values: Record<string, string | string[]>,
): boolean => {
  if (!field.visibleWhen) return true
  const raw = values[field.visibleWhen.fieldId]
  const triggerValues = Array.isArray(raw) ? raw : (raw ? [raw] : [])
  return field.visibleWhen.values.some(v => triggerValues.includes(v))
}
