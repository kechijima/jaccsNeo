// ディレクター（メイン/サブサポート）×組合×役割ごとの担当メンバー検索インデックス
// kintoneの202607シートから抽出したdirector_relationships_202607_DB.xlsxを取り込んだもの
export type DirectorRole = 'main' | 'sub'

export const DIRECTOR_ROLE_LABELS: Record<DirectorRole, string> = {
  main: 'メイン',
  sub:  'サブ',
}

export interface DirectorIndexRow {
  id: string
  yearMonth: string        // 対象年月（例: '202607'）
  directorName: string     // ディレクター（サポート者）名
  kumiaiName: string       // 組合名
  role: DirectorRole       // メイン / サブ
  memberNames: string[]    // 担当メンバー名一覧
}
