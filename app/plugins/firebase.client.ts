import { initializeApp, getApps, getApp } from 'firebase/app'
import { initializeAuth, inMemoryPersistence, type Auth } from 'firebase/auth'
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
  // Firebase SDKは背景でハートビート計測（SDK利用状況をFirebase側へ送るための
  // 計測データ）のためIndexedDBへアクセスする。このアプリはAnalytics/
  // Performance/App Checkを使っておらず、Firestoreのオフライン永続化も有効に
  // していない（enableIndexedDbPersistence等は未使用）ため、IndexedDBは
  // アプリ内のどの機能にも実際には使われていない。
  // それにもかかわらず、実機のDevTools（Networkタブ）で調査したところ、個々の
  // リクエストはすべて50ms未満で完了しているのに、ページ全体が数秒〜30秒以上
  // 「読み込み中」のまま先に進まない現象が確認された。ブラウザのIndexedDB実装は
  // 「同一オリジンへの他のタブ/ウィンドウの接続が残っている」等の状況で
  // indexedDB.open()がエラーにもならず長時間応答を返さない（ハングする）ことが
  // 知られており、これが原因だった（特にPWAをアイコンから起動すると、既存の
  // ブラウザタブと並行してウィンドウが開くため接続が競合しやすい）。
  // Firebase SDKはIndexedDBが利用できない環境でも例外を投げず正常に動作する
  // よう設計されている（typeof indexedDB !== 'object' なら機能を静かに無効化
  // するだけ）ため、ここで意図的にindexedDBを無効化し、このハングを未然に防ぐ
  if (typeof window !== 'undefined' && 'indexedDB' in window) {
    try {
      Object.defineProperty(window, 'indexedDB', { value: undefined, configurable: true })
    } catch (e) {
      console.error('IndexedDBの無効化に失敗しました', e)
    }
  }

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

  // getAuth(app)は永続化方式が未指定の場合、既定でindexedDBLocalPersistence→
  // browserLocalPersistence→browserSessionPersistenceの順にブラウザストレージの
  // 利用可否を内部的に同期チェックする。この処理がSafariのプライベートブラウズ・
  // LINE等のアプリ内ブラウザ・厳格なプライバシー設定など、IndexedDB/localStorageが
  // 制限された環境で同期的に例外を投げることがあり、アプリ起動全体がクラッシュして
  // 「読み込み中」のまま止まって見える不具合の原因になっていた（モバイルでのみ
  // 発生していたのはこのため）。
  // ログイン状態を永続化しない方針（inMemoryPersistence固定）である以上、そもそも
  // ブラウザストレージへ一切アクセスする必要がないため、initializeAuthで永続化方式を
  // 最初からinMemoryPersistenceのみに限定して初期化し、上記の同期チェック自体を回避する
  let auth: Auth
  try {
    auth = initializeAuth(app, { persistence: inMemoryPersistence })
  } catch (e) {
    console.error('Firebase Authの初期化に失敗しました', e)
    return {}
  }
  // パスワードリセット等のFirebase Auth既定メールテンプレートを日本語で送信する
  auth.languageCode = 'ja'
  const db = getFirestore(app)

  return {
    provide: {
      firebase: app,
      auth,
      db,
    },
  }
})
