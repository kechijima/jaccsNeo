import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth, setPersistence, inMemoryPersistence } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
// firebase/storage・firebase/functionsはそれぞれ useStorage.ts / useUsers.ts の
// 該当処理内で動的import()する（利用ページがごく一部のため）。ここで静的importすると
// プラグイン＝アプリ起動時に常に読み込まれる経路に含まれてしまい、ほぼ全員が使わない
// 機能のためだけに初回読み込みのJS実行コストが増える

// 環境変数・CIシークレットに誤って引用符が含まれていた場合に備えて除去する
// （例: FIREBASE_STORAGE_BUCKET="jaccsneo.appspot.com" のように値ごと引用符が入ると
//   Storageのリクエストパスに %22 が混入し、CORS/接続エラーで一切通信できなくなる）
const sanitize = (value: unknown): string =>
  String(value ?? '').trim().replace(/^['"]+|['"]+$/g, '')

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()

  // authDomainが既定のfirebaseapp.com（実際にアプリを開いているHostingドメインとは
  // 別ドメイン）のままだと、ログイン状態の復元がクロスドメインiframe経由になり、
  // 特にモバイルのブラウザ（ITP等のプライバシー制限）で著しく遅く・不安定になる。
  // 実際に開いているホスト名をauthDomainとして使うことで同一オリジンで解決させ、
  // 高速かつ安定させる（Firebase HostingのドメインはFirebase Authに自動で
  // authorized domainとして登録されるため、この方式で問題なく動作する）
  const resolvedAuthDomain = window.location.hostname === 'localhost'
    ? sanitize(config.public.firebaseAuthDomain)
    : window.location.hostname

  const firebaseConfig = {
    apiKey:            sanitize(config.public.firebaseApiKey),
    authDomain:        resolvedAuthDomain,
    projectId:         sanitize(config.public.firebaseProjectId),
    storageBucket:     sanitize(config.public.firebaseStorageBucket),
    messagingSenderId: sanitize(config.public.firebaseMessagingSenderId),
    appId:             sanitize(config.public.firebaseAppId),
  }

  const app = getApps().length ? getApp() : initializeApp(firebaseConfig)

  const auth      = getAuth(app)
  // パスワードリセット等のFirebase Auth既定メールテンプレートを日本語で送信する
  auth.languageCode = 'ja'
  // ログイン状態はブラウザに永続化しない（画面更新・アプリ再起動のたびに必ず
  // ログイン画面から入り直す仕様のため）。メモリ上にのみ保持し、ページを離れる
  // （リロード・タブを閉じる等）と自動的に失われる
  setPersistence(auth, inMemoryPersistence).catch((e) => {
    console.error('ログイン状態の永続化設定に失敗しました', e)
  })
  const db = getFirestore(app)

  return {
    provide: {
      firebase: app,
      auth,
      db,
    },
  }
})
