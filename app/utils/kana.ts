// ふりがな（よみがな）入力をカタカナへ統一するためのヘルパー。
// ひらがな（U+3041-3096）はカタカナ（U+30A1-30F6）と対応するコードポイントの
// 差（0x60）が一定のため、1文字ずつシフトするだけで変換できる。
// 長音符（ー）・中黒（・）・全角スペース等は変換不要なのでそのまま保持する
export const toKatakana = (value: string): string =>
  value.replace(/[ぁ-ゖ]/g, c => String.fromCharCode(c.charCodeAt(0) + 0x60))

// 変換後、カタカナ・長音符・中黒・スペース以外の文字（漢字・英数字等）が
// 残っていないかを判定する。空文字は「問題なし」として扱う（未入力は別途必須
// チェック等に委ねる）
const NON_KATAKANA_PATTERN = /[^ァ-ヶーー・\s]/
export const hasNonKatakana = (value: string): boolean =>
  value.trim().length > 0 && NON_KATAKANA_PATTERN.test(value)
