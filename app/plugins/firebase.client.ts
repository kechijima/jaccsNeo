import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'
import { getFunctions } from 'firebase/functions'

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
  // ログイン状態をブラウザに永続化する（明示的にログアウトするまでタブを閉じても
  // 再訪問時に自動的にログイン状態が復元されるようにする）
  setPersistence(auth, browserLocalPersistence).catch((e) => {
    console.error('ログイン状態の永続化設定に失敗しました', e)
  })
  const db        = getFirestore(app)
  const storage   = getStorage(app)
  // Cloud Functionsのデプロイリージョン（functions/index.jsのsetGlobalOptionsと揃える）
  const functions = getFunctions(app, 'asia-northeast1')

  return {
    provide: {
      firebase: app,
      auth,
      db,
      storage,
      functions,
    },
  }
})
