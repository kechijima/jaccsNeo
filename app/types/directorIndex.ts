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
  // directorUid・memberUidsは同姓同名ユーザーの取り違え防止のため追加したuidベースの
  // 判定用フィールド。本機能のuid化（2026/10）以降に作成・更新された行のみ保持し、
  // 静的データ移行による過去の行（Excel取り込み分）には存在しない場合がある
  directorUid?: string     // ディレクター（サポート者）のuid
  directorName: string     // ディレクター（サポート者）名（表示用）
  kumiaiName: string       // 組合名
  role: DirectorRole       // メイン / サブ
  memberNames: string[]    // 担当メンバー名一覧（表示用）
  memberUids?: string[]    // 担当メンバーのうちuidが判明している分のuid一覧（memberNamesと要素数は一致しない場合がある）
}
