// デプロイのたびにJSファイル名（ハッシュ）が変わるため、デプロイ直後に古い
// バンドルを開いたままの画面で操作すると、既に存在しない古いチャンクを
// 読み込もうとして失敗することがある（例:「Failed to fetch dynamically
// imported module」）。nuxt.config.tsのexperimental.emitRouteChunkError:
// 'automatic'でページ遷移時のチャンク読み込み失敗は自動的にリロードされるが、
// それ以外（コンポーネントの動的import等）で同種のエラーが発生した場合の
// 保険として、ブラウザが発火するvite:preloadErrorも監視し、最新版を
// 再読み込みする
export default defineNuxtPlugin(() => {
  if (typeof window === 'undefined') return
  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault()
    window.location.reload()
  })
})
