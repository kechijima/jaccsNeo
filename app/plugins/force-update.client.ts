// デプロイ後もService Workerの更新サイクルが正しく進まず、古いJS/画像等が
// 表示され続けることがある（ハードリロードしても改善しないケースが複数報告された）。
// Nuxtがビルドごとに発行するbuildIdを前回訪問時と比較し、変化していれば
// 「新しいデプロイが反映された」とみなして、古いService Worker登録とキャッシュを
// 完全に削除してから一度だけ再読み込みする。通常のSW更新フローに依存しない、
// より確実な手段としてこの仕組みを用意する
export default defineNuxtPlugin(() => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

  const STORAGE_KEY = 'jaccsneo:build-id'
  const config = useRuntimeConfig()
  const currentBuildId = config.app.buildId

  if (!currentBuildId) return

  const lastBuildId = localStorage.getItem(STORAGE_KEY)

  if (lastBuildId && lastBuildId !== currentBuildId) {
    localStorage.setItem(STORAGE_KEY, currentBuildId)
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
