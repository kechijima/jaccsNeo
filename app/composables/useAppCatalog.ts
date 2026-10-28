import { SERVICE_LABELS, SERVICE_CATEGORY_MAP, APP_CATEGORY_LIST } from '~/types/service'
import { useAppDefs } from './useAppDefs'

export interface AppCatalogEntry {
  key: string        // ルーティング・案件データの保存先として使うキー（serviceType）
  label: string
  category: string
  appDefId?: string
  isCustom: boolean   // 固定18アプリ＋生命保険に含まれない、新規作成されたアプリかどうか
  iconUrl?: string    // カスタムアイコン画像（AppDef連携があり設定されている場合のみ）
  isSuspended: boolean // 取扱い停止中かどうか（AppDef連携がない固定アプリは常にfalse）
}

// 固定サービス種別（生命保険＋既存18アプリ）と、アプリ管理（AppDef）で作成された
// アプリを統合した「アプリ」一覧を組み立てる。
// - 固定サービス種別に連携（sourceServiceType一致）しているAppDefがあれば、その
//   表示名・カテゴリ設定を優先する（未設定時はSERVICE_LABELS・SERVICE_CATEGORY_MAPの
//   既定値にフォールバック。アプリ管理はあくまでデータ保存先の連携設定だが、
//   表示名を変更したい場合はそちらで設定したものを「プロダクトアプリ」「アプリ連携」
//   画面の両方に反映する）
// - 固定サービス種別と一致しないsourceServiceType（新規作成時に自動設定される自分自身の
//   ID）を持つAppDefは、新規アプリとして一覧に追加する
export const useAppCatalog = () => {
  const { appDefs, fetchAll } = useAppDefs()

  const ensureLoaded = (force = false) => fetchAll(force)

  const catalog = computed<AppCatalogEntry[]>(() => {
    const knownKeys = new Set(Object.keys(SERVICE_LABELS))

    const baseline: AppCatalogEntry[] = Object.entries(SERVICE_LABELS).map(([key, label]) => {
      const linkedDef = appDefs.value.find(a => a.isPublished && a.sourceServiceType === key)
      return {
        key,
        label: linkedDef?.name || label,
        category: linkedDef?.category || SERVICE_CATEGORY_MAP[key] || 'その他',
        appDefId: linkedDef?.id,
        isCustom: false,
        iconUrl: linkedDef?.iconUrl,
        isSuspended: linkedDef?.isSuspended ?? false,
      }
    })

    const custom: AppCatalogEntry[] = appDefs.value
      .filter(a => a.isPublished && a.sourceServiceType && !knownKeys.has(a.sourceServiceType))
      .map(a => ({
        key: a.sourceServiceType as string,
        label: a.name,
        category: a.category && APP_CATEGORY_LIST.includes(a.category) ? a.category : 'その他',
        appDefId: a.id,
        isCustom: true,
        iconUrl: a.iconUrl,
        isSuspended: a.isSuspended ?? false,
      }))

    return [...baseline, ...custom]
  })

  return { catalog, ensureLoaded }
}
