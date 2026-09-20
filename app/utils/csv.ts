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

export interface FieldGuess {
  type: string
  options: string[]
}

const DATE_RE = /^\d{4}[-\/]\d{1,2}[-\/]\d{1,2}$/
const TIME_RE = /^\d{1,2}:\d{2}(:\d{2})?$/
const DATETIME_RE = /^\d{4}[-\/]\d{1,2}[-\/]\d{1,2}[ T]\d{1,2}:\d{2}/
const YES_NO_VALUES = new Set(['はい', 'いいえ', '有', '無', 'yes', 'no', 'true', 'false', '○', '×', '1', '0'])

// CSV列の実際の値（複数行分）から、アプリ管理のフィールドタイプを推測する。
// あくまで叩き台であり、精度を保証するものではないため呼び出し側でユーザーに確認・修正させる想定
export const guessFieldType = (values: string[]): FieldGuess => {
  const nonEmpty = values.map(v => v.trim()).filter(Boolean)
  if (nonEmpty.length === 0) return { type: 'text', options: [] }

  if (nonEmpty.every(v => DATETIME_RE.test(v))) return { type: 'datetime', options: [] }
  if (nonEmpty.every(v => DATE_RE.test(v))) return { type: 'date', options: [] }
  if (nonEmpty.every(v => TIME_RE.test(v))) return { type: 'time', options: [] }

  const distinct = [...new Set(nonEmpty)]
  if (distinct.length <= 2 && distinct.every(v => YES_NO_VALUES.has(v.toLowerCase()))) {
    return { type: 'yes_no', options: [] }
  }

  // カンマ・読点区切りで複数の値が入っている列は複数選択とみなす
  if (nonEmpty.some(v => /[、,]/.test(v))) {
    const tokens = new Set<string>()
    nonEmpty.forEach(v => v.split(/[、,]/).map(s => s.trim()).filter(Boolean).forEach(t => tokens.add(t)))
    if (tokens.size > 0 && tokens.size <= 30) {
      return { type: 'multi_select', options: [...tokens] }
    }
  }

  // 値の種類が少なく、かつ同じ値が繰り返し出現する列は選択肢とみなす
  if (nonEmpty.length >= 3 && distinct.length <= 8 && distinct.length < nonEmpty.length) {
    return { type: distinct.length <= 4 ? 'radio' : 'dropdown', options: distinct }
  }

  if (nonEmpty.some(v => v.length > 30 || v.includes('\n'))) {
    return { type: 'textarea', options: [] }
  }

  return { type: 'text', options: [] }
}
