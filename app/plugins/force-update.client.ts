// デプロイ後に画面を開いたまま古いJS/画像等が表示され続けることがあったため、
// Nuxtがビルドごとに発行するbuildIdを前回訪問時と比較し、変化していれば
// 「新しいデプロイが反映された」とみなして一度だけ再読み込みする。
//
// 以前はここでService Worker登録とキャッシュを完全に削除してから再読み込み
// していたが、以下の理由でそこまでの破壊的な処理は不要と判断し、単純な
// reloadのみに変更した:
// - ナビゲーション（HTML取得）はnuxt.config.tsのworkbox設定でNetworkFirst
//   （まずネットワークから取得）にしてあり、reloadすれば必ず最新のHTMLが
//   届く。ここが以前の「表示が更新されない」不具合の本質的な原因だった
// - JS/CSSは内容に応じたハッシュ付きファイル名で配信されるため、古いキャッシュが
//   残っていても新しいファイルの取得を妨げない（無関係な古いファイルが少し
//   残るだけ）
// - Service Workerとキャッシュを全削除すると、次回起動時にすべてのファイルを
//   ネットワークから再取得することになり、特にモバイル回線で「起動時の
//   読み込みが数十秒終わらない」不具合の原因になっていた
export default defineNuxtPlugin(() => {
  if (typeof window === 'undefined') return

  const STORAGE_KEY = 'jaccsneo:build-id'
  // 短時間に連続してデプロイされた場合、reload直後にまた新しいbuildIdを検出して
  // reloadを繰り返してしまわないようにするクールダウン
  const RELOAD_COOLDOWN_KEY = 'jaccsneo:force-update-reloaded-at'
  const RELOAD_COOLDOWN_MS = 30_000

  const config = useRuntimeConfig()
  const currentBuildId = config.app.buildId

  if (!currentBuildId) return

  const lastBuildId = localStorage.getItem(STORAGE_KEY)
  const withinCooldown = (() => {
    const at = Number(sessionStorage.getItem(RELOAD_COOLDOWN_KEY) ?? '0')
    return Date.now() - at < RELOAD_COOLDOWN_MS
  })()

  localStorage.setItem(STORAGE_KEY, currentBuildId)

  if (lastBuildId && lastBuildId !== currentBuildId && !withinCooldown) {
    sessionStorage.setItem(RELOAD_COOLDOWN_KEY, String(Date.now()))
    window.location.reload()
  }
})
