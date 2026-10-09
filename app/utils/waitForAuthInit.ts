import type { useAuthStore } from '~/stores/auth'

// 認証初期化(initAuth)の完了を待つ。app.vueはスプラッシュを即座に表示するため
// initAuth()自体はawaitしていないので、authStore.userが埋まる前にmiddlewareの
// 判定が走ってしまう（＝ログイン済みでも一瞬ログアウト扱いになる）のを防ぐため
// 各種authミドルウェアで共通して使う。万一initAuth側で何らかの理由により
// initializedが立たないままになっても画面遷移自体が永久に固まらないよう、
// 保険のタイムアウトを設けている
export const waitForAuthInit = (authStore: ReturnType<typeof useAuthStore>) => {
  if (authStore.initialized) return Promise.resolve()
  return new Promise<void>((resolve) => {
    // initAuth自体のタイムアウト(4秒)より長く取り、あくまで「initAuth側の
    // タイムアウト処理すら動かなかった」場合だけの保険とする
    const timeout = setTimeout(() => resolve(), 6000)
    const stop = watch(() => authStore.initialized, (val) => {
      if (val) {
        clearTimeout(timeout)
        stop()
        resolve()
      }
    })
  })
}
