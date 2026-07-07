// パーソナルデータ画面の絞り込み条件（項目選択式クエリビルダー）の型
export type FilterOperator = 'contains' | 'notContains' | 'equals' | 'notEmpty' | 'empty'

export interface FilterCondition {
  field: string
  operator: FilterOperator
  value: string
}

// ログインユーザーごとに保存する検索条件プリセット
export interface SavedSearch {
  id: string
  uid: string
  name: string
  searchQuery: string
  filterType: 'all' | 'individual' | 'corporate'
  matchMode: 'and' | 'or'
  conditions: FilterCondition[]
  createdAt: string   // ISO文字列（localStorage保存のため）
}

export type SavedSearchInput = Omit<SavedSearch, 'id' | 'createdAt'>
