// ヘッダーの更新ボタン用。F5キーや（モバイルの）下に引っ張る更新と違い、
// ブラウザ自体のリロードは行わず、現在のページコンポーネントだけを
// 強制的に再マウントしてデータを再取得する。アプリ全体の再読み込みを
// 伴わないため、Firebase Authの再初期化待ちレース状態（リロード直後に
// ログイン画面へ飛ばされる不具合の原因）が発生しない
export const useSoftRefresh = () => {
  const pageKey = useState<number>('soft-refresh:page-key', () => 0)
  const isRefreshing = useState<boolean>('soft-refresh:refreshing', () => false)

  const refresh = async () => {
    if (isRefreshing.value) return
    isRefreshing.value = true
    pageKey.value++
    // ローディング表示が一瞬で消えてちらついて見えないよう、最低限の表示時間を確保する
    await new Promise(resolve => setTimeout(resolve, 600))
    isRefreshing.value = false
  }

  return { pageKey, isRefreshing, refresh }
}
