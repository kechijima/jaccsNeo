import Papa from 'papaparse'

export interface ParsedCsv {
  headers: string[]
  rows: Record<string, string>[]
}

// kintoneのエクスポートCSVはUTF-8（BOM付き）のことが多いが、Shift_JISで
// 出力される場合もあるため、先頭バイト列からエンコーディングを推定してから
// テキスト化する。UTF-8として読んで置換文字（U+FFFD）が大量に出る場合は
// Shift_JISとして読み直す
export const readCsvFile = async (file: File): Promise<string> => {
  const buffer = await file.arrayBuffer()
  const utf8Text = new TextDecoder('utf-8', { fatal: false }).decode(buffer)
  const replacementCount = (utf8Text.match(/�/g) ?? []).length
  // 全体の1%を超えて置換文字が出た場合は文字化けとみなし、Shift_JISとして読み直す
  if (replacementCount > utf8Text.length * 0.01) {
    try {
      return new TextDecoder('shift-jis').decode(buffer)
    } catch {
      // Shift_JISデコーダが使えない環境ではUTF-8の結果をそのまま返す
      return utf8Text
    }
  }
  return utf8Text
}

// CSVテキストをヘッダー行付きの表形式にパースする。ダブルクォートで囲まれた
// フィールド内の改行・カンマ・エスケープされた引用符（""）にも対応する
// （PapaParseに委譲。kintoneエクスポート形式・一般的なExcel由来CSVいずれも想定）
export const parseCsv = (text: string): ParsedCsv => {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  })
  const headers = result.meta.fields ?? []
  return { headers, rows: result.data }
}
