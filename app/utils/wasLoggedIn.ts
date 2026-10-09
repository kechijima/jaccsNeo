// 直近でログイン済みだったことを示す目印。Vue起動前の静的プレースホルダー
// （app/spa-loading-template.html）が、未ログイン時用の偽ログイン画面ではなく
// 単純な「読み込み中」表示を出すかどうかの判定に使う。
// spa-loading-template.htmlは素のHTML/JSのためこの定数をimportできず、
// 同じキー文字列 'jaccsneo:wasLoggedIn' を直接ハードコードしている点に注意
// （キー名を変更する場合は両方を揃えて更新すること）
export const WAS_LOGGED_IN_KEY = 'jaccsneo:wasLoggedIn'

export const markWasLoggedIn = (loggedIn: boolean) => {
  try {
    if (loggedIn) {
      localStorage.setItem(WAS_LOGGED_IN_KEY, '1')
    } else {
      localStorage.removeItem(WAS_LOGGED_IN_KEY)
    }
  } catch {
    // プライベートブラウジング等で使えない場合でも無視する
    // （この場合はVue起動前の表示が毎回フォールバック=偽ログイン画面になるだけ）
  }
}
