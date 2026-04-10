import type { Customer, CustomerForm, CustomerSummary } from '~/types/customer'
import {
  CSV_FIELD_MAP,
  CSV_SERVICE_MAP,
  FAMILY_MEMBER_FIELDS,
} from '~/types/customer'

// ===================================================
// CSV パース（kintone エクスポート形式 → CustomerForm[]）
// ===================================================

/**
 * CSVテキスト（UTF-8）をパースしてCustomerFormの配列に変換する
 */
export function parseCsvToCustomers(csvText: string): { data: CustomerForm[]; errors: string[] } {
  const errors: string[] = []
  const lines = parseCsvLines(csvText)
  if (lines.length < 2) return { data: [], errors: ['データが見つかりません'] }

  const headers = lines[0]
  const rows = lines.slice(1)

  const data: CustomerForm[] = []

  rows.forEach((row, rowIdx) => {
    if (row.every(cell => cell === '')) return // 空行スキップ

    const lineNum = rowIdx + 2
    try {
      const customer = rowToCustomer(headers, row)
      data.push(customer)
    } catch (e: any) {
      errors.push(`行${lineNum} (${row[1] ?? '?'}): ${e.message}`)
    }
  })

  return { data, errors }
}

function rowToCustomer(headers: string[], row: string[]): CustomerForm {
  const get = (col: string) => {
    const idx = headers.indexOf(col)
    return idx >= 0 ? row[idx]?.trim() ?? '' : ''
  }

  // 個人/法人区分
  const typeStr = get('個人/法人区分')
  const type = typeStr === '法人' ? 'corporate' : 'individual'

  // 家族情報
  const familyMembers = FAMILY_MEMBER_FIELDS
    .map(f => ({
      name:         get(f.nameCol),
      relationship: get(f.relCol),
      dob:          normalizeDateStr(get(f.dobCol)),
      occupation:   get(f.occCol),
    }))
    .filter(m => m.name !== '')

  // サービスフィールド
  const services: Record<string, string> = {}
  for (const [csvCol, firestoreKey] of Object.entries(CSV_SERVICE_MAP)) {
    const val = get(csvCol)
    if (val) services[firestoreKey] = val
  }

  // 基本フィールドマッピング
  const customer: any = { type, familyMembers }

  for (const [csvCol, firestoreKey] of Object.entries(CSV_FIELD_MAP)) {
    if (firestoreKey === '_type') continue  // 既に処理済み
    const val = get(csvCol)
    if (val !== '') {
      if (firestoreKey === 'referralCount') {
        customer[firestoreKey] = parseInt(val, 10) || 0
      } else if (firestoreKey === 'dob' || firestoreKey === 'establishedDate') {
        customer[firestoreKey] = normalizeDateStr(val)
      } else {
        customer[firestoreKey] = val
      }
    }
  }

  // リマインダー
  const reminders = [
    { label: get('リマインダー1'), scheduledAt: get('設定時刻１') },
    { label: get('リマインダー2'), scheduledAt: get('設定時刻2') },
    { label: get('リマインダー3'), scheduledAt: get('設定時刻3') },
  ].filter(r => r.label)

  // アポ場所
  const appointment1 = { place: get('ワン_アポ場所'), note: get('その他(記入欄)') }
  const appointment2 = { place: get('ツー_アポ場所') }

  return {
    ...customer,
    services: Object.keys(services).length > 0 ? services : undefined,
    reminders: reminders.length > 0 ? reminders : undefined,
    appointment1: appointment1.place ? appointment1 : undefined,
    appointment2: appointment2.place ? appointment2 : undefined,
  } as CustomerForm
}

// ===================================================
// CSV エクスポート（CustomerSummary[] → CSV文字列）
// ===================================================

/** エクスポート用CSV列定義 */
const EXPORT_COLUMNS: Array<{ label: string; key: keyof CustomerSummary | string }> = [
  { label: 'ID',         key: 'id' },
  { label: 'kintoneID',  key: 'kintoneId' },
  { label: '氏名',       key: 'name' },
  { label: 'フリガナ',   key: 'nameKana' },
  { label: 'TEL',        key: 'tel' },
  { label: 'メール',     key: 'email' },
  { label: '住所',       key: 'address' },
  { label: '担当FP',     key: 'assignedFpName' },
  { label: '関係性',     key: 'relationship' },
  { label: '段数',       key: 'stage' },
  { label: '状況（ワン）', key: 'status1' },
  { label: '更新日時',   key: 'updatedAt' },
]

export function exportCustomersToCsv(customers: CustomerSummary[]): string {
  const header = EXPORT_COLUMNS.map(c => `"${c.label}"`).join(',')
  const rows = customers.map(customer => {
    return EXPORT_COLUMNS.map(col => {
      const val = (customer as any)[col.key]
      if (val == null) return '""'
      if (val?.toDate) return `"${val.toDate().toLocaleDateString('ja-JP')}"`
      if (val instanceof Date) return `"${val.toLocaleDateString('ja-JP')}"`
      return `"${String(val).replace(/"/g, '""')}"`
    }).join(',')
  })
  return [header, ...rows].join('\r\n')
}

/** 詳細エクスポート（Customer全フィールド） */
export function exportCustomerFullToCsv(customers: Customer[]): string {
  const allHeaders = Object.keys(CSV_FIELD_MAP)
  const header = allHeaders.map(h => `"${h}"`).join(',')

  const rows = customers.map(c => {
    return allHeaders.map(csvCol => {
      const key = CSV_FIELD_MAP[csvCol]
      if (key === '_type') {
        return `"${c.type === 'corporate' ? '法人' : '個人'}"`
      }
      const val = (c as any)[key]
      if (val == null) return '""'
      if (val?.toDate) return `"${val.toDate().toLocaleDateString('ja-JP')}"`
      if (val instanceof Date) return `"${val.toLocaleDateString('ja-JP')}"`
      return `"${String(val).replace(/"/g, '""')}"`
    }).join(',')
  })

  return [header, ...rows].join('\r\n')
}

/**
 * BOMつきUTF-8でダウンロードトリガー
 */
export function downloadCsv(csvText: string, filename: string) {
  const bom = '\uFEFF'
  const blob = new Blob([bom + csvText], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ===================================================
// CSV行パーサー（クォート・カンマ対応）
// ===================================================
function parseCsvLines(text: string): string[][] {
  const lines: string[][] = []
  const rows = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')

  let currentRow: string[] = []
  let currentCell = ''
  let inQuotes = false

  for (const row of rows) {
    for (let i = 0; i < row.length; i++) {
      const ch = row[i]
      if (ch === '"') {
        if (inQuotes && row[i + 1] === '"') {
          currentCell += '"'
          i++
        } else {
          inQuotes = !inQuotes
        }
      } else if (ch === ',' && !inQuotes) {
        currentRow.push(currentCell)
        currentCell = ''
      } else {
        currentCell += ch
      }
    }

    if (inQuotes) {
      // 行をまたぐセル
      currentCell += '\n'
    } else {
      currentRow.push(currentCell)
      lines.push(currentRow)
      currentRow = []
      currentCell = ''
    }
  }

  return lines.filter(r => r.length > 1)
}

// ===================================================
// ユーティリティ
// ===================================================

/** "2024/03/15" → "2024-03-15" */
function normalizeDateStr(val: string): string {
  if (!val) return ''
  return val.replace(/\//g, '-')
}

/**
 * Shift-JIS ファイルを UTF-8 テキストとして読み込む
 */
export function readFileAsText(file: File, encoding = 'shift_jis'): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => resolve(e.target?.result as string)
    reader.onerror = reject
    reader.readAsText(file, encoding)
  })
}
