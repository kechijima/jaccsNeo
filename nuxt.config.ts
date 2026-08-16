// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  ssr: false,
  // JS読み込み前の「真っ白な画面」を防ぐため、SPA読み込み中の静的な画面を表示する
  spaLoadingTemplate: true,

  css: [
    '~/assets/css/main.css',
    'tippy.js/dist/tippy.css',
  ],

  modules: [
    '@nuxtjs/tailwindcss',
    '@pinia/nuxt',
    '@vueuse/nuxt',
    '@nuxt/icon',
    '@vite-pwa/nuxt',
  ],

  // @nuxt/iconは既定では、ビルド時にバンドルされていないアイコンを
  // /api/_nuxt_icon/:collection（Nuxtサーバー）→ 見つからなければ
  // 外部のIconify API（api.iconify.design）へフォールバック取得する。
  // このアプリはssr:false + 静的ホスティング（Firebase Hosting）のため
  // サーバー自体が存在せず、本番では常に外部APIへのフェッチが発生していた
  // （モバイル回線では特に、この余分な外部ドメインへの通信がページ表示の
  // 遅延要因になり得る）。使用しているアイコンをビルド時にクライアント
  // バンドルへ埋め込み、実行時のアイコン取得を完全になくす
  icon: {
    provider: 'none',
    clientBundle: {
      scan: true,
      includeCustomCollections: false,
    },
  },

  runtimeConfig: {
    public: {
      firebaseApiKey: process.env.FIREBASE_API_KEY,
      firebaseAuthDomain: process.env.FIREBASE_AUTH_DOMAIN,
      firebaseProjectId: process.env.FIREBASE_PROJECT_ID,
      firebaseStorageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      firebaseMessagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
      firebaseAppId: process.env.FIREBASE_APP_ID,
      // push通知（FCM）用のVAPIDキー（Web Push証明書）。Firebaseコンソール →
      // プロジェクトの設定 → Cloud Messaging → ウェブ プッシュ証明書 で発行する
      firebaseVapidKey: process.env.FIREBASE_VAPID_KEY,
    },
  },

  // /firebase-messaging-sw.js は server/routes/ で動的に生成している
  // （実際のFirebase設定値をビルド時に埋め込む必要があるため）。クロールでは
  // 発見されない（HTMLのどこからもリンクされていない）URLなので、生成対象に
  // 明示的に加えておかないと `nuxi generate` の静的書き出しに含まれない
  nitro: {
    prerender: {
      routes: ['/firebase-messaging-sw.js'],
    },
  },

  app: {
    head: {
      title: 'JACCS Neo',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'FP業務管理ツール' },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
        { name: 'apple-mobile-web-app-title', content: 'JACCS Neo' },
        { name: 'theme-color', content: '#00afcc' },
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        { rel: 'apple-touch-icon', href: '/icons/icon-192.png' },
        // ssr:falseのためコンポーネント(<NuxtPwaManifest />)側のuseHead()は
        // 静的HTMLには出力されない。PWAインストール判定に必須なので、ここでも
        // 直接指定して確実にmanifestが読み込まれるようにする
        { rel: 'manifest', href: '/manifest.webmanifest' },
        // Google Fontsへの接続を前もって確立し、フォントCSS取得の待ち時間を短縮する
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        // Firebase Auth/Firestoreへの接続も前もって確立しておく。JSバンドルの読み込みが
        // 終わってからDNS・TLSのコールドスタートを行うと直列に時間がかかるため、
        // HTML解析の早い段階から並行して準備しておくことで、認証確認・データ取得の
        // 開始を早める
        { rel: 'preconnect', href: 'https://identitytoolkit.googleapis.com', crossorigin: '' },
        { rel: 'preconnect', href: 'https://securetoken.googleapis.com', crossorigin: '' },
        { rel: 'preconnect', href: 'https://firestore.googleapis.com', crossorigin: '' },
        // main.cssの@importは描画をブロックしてしまう（モバイル回線が不安定な場合、
        // フォント取得待ちで画面全体の表示が数秒〜数十秒単位で遅れる原因になり得る）ため、
        // ここでは非ブロッキングで読み込む（読み込み完了まではシステムフォントで表示される）
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;600;700&display=swap',
          media: 'print',
          onload: "this.media='all'",
        },
      ],
    },
  },

  pwa: {
    // 'prompt': 新しいバージョンが見つかっても即座には適用せず、$pwa.needRefresh を
    // trueにするだけにとどめる。UI側（UpdateAvailableBanner.vue）で「更新する」を
    // 押したときだけ適用・再読み込みする（入力中の内容が急に失われるのを防ぐため）
    registerType: 'prompt',
    client: {
      installPrompt: true,
      // タブを開いたままでも新しいデプロイに気づけるよう、定期的に更新をチェックする（30分ごと）
      periodicSyncForUpdates: 1800,
    },
    manifest: {
      name: 'JACCS Neo',
      short_name: 'JACCS Neo',
      description: 'FP業務管理ツール',
      theme_color: '#00afcc',
      background_color: '#ffffff',
      display: 'standalone',
      orientation: 'portrait',
      start_url: '/',
      scope: '/',
      icons: [
        {
          src: '/icons/icon-192.png',
          sizes: '192x192',
          type: 'image/png',
        },
        {
          src: '/icons/icon-512.png',
          sizes: '512x512',
          type: 'image/png',
        },
        {
          src: '/icons/icon-512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any maskable',
        },
      ],
    },
    // Service Workerは「ホーム画面に追加」できるようにする（PWAインストール）ためだけに
    // 登録し、画面・データの先読みキャッシュや横取りは一切行わない。
    // 以前はnavigateFallback + precache + runtimeCachingで画面を積極的にキャッシュして
    // いたが、デプロイのたびに「更新されない」「起動が固まる」といった不具合を繰り返し
    // 引き起こしていた。このアプリは常時Firestore通信が前提でオフライン利用の必要性が
    // 低いため、キャッシュの野心を捨てて通常のブラウザキャッシュ（ファイル名にハッシュが
    // 付くため安全に長期キャッシュされる）に任せる方針にした
    workbox: {
      navigateFallback: undefined,
      globPatterns: [],
      runtimeCaching: [],
    },
    devOptions: {
      enabled: false,
    },
  },
})
