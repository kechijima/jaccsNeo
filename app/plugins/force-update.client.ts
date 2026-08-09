// デプロイ後もService Workerの更新サイクルが正しく進まず、古いJS/画像等が
// 表示され続けることがある（ハードリロードしても改善しないケースが複数報告された）。
// Nuxtがビルドごとに発行するbuildIdを前回訪問時と比較し、変化していれば
// 「新しいデプロイが反映された」とみなして、古いService Worker登録とキャッシュを
// 完全に削除してから一度だけ再読み込みする。通常のSW更新フローに依存しない、
// より確実な手段としてこの仕組みを用意する
export default defineNuxtPlugin(() => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

  const STORAGE_KEY = 'jaccsneo:build-id'
  // 短時間に連続してデプロイされた場合、reload後にすぐ次の新しいbuildIdを検出して
  // また削除→reloadしてしまい、reloadが連鎖して「読み込み中のまま止まらない」ように
  // 見える不具合を防ぐためのクールダウン（この時間内は強制reloadを行わない）
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

  if (lastBuildId && lastBuildId !== currentBuildId && !withinCooldown) {
    localStorage.setItem(STORAGE_KEY, currentBuildId)
    sessionStorage.setItem(RELOAD_COOLDOWN_KEY, String(Date.now()))
    ;(async () => {
      try {
        const regs = await navigator.serviceWorker.getRegistrations()
        await Promise.all(regs.map(r => r.unregister()))
        if ('caches' in window) {
          const keys = await caches.keys()
          await Promise.all(keys.map(k => caches.delete(k)))
        }
      } catch (e) {
        console.error('古いキャッシュの削除に失敗しました', e)
      } finally {
        window.location.reload()
      }
    })()
  } else {
    localStorage.setItem(STORAGE_KEY, currentBuildId)
  }
})
