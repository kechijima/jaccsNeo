// Firebase Cloud Messaging用のバックグラウンド受信Service Worker。
// クライアントの環境変数（実際のFirebase設定値）をビルド時に埋め込んで配信する
// （Service Workerは静的ファイルとして配信されるため、Nuxtのruntime configや
// import.meta.envはそのままでは参照できない）。
//
// vite-pwa（@vite-pwa/nuxt）が発行する既存のService Worker（/sw.js、scope: '/'）
// と同じスコープに別スクリプトを登録すると競合するため、このSWは
// クライアント側（usePushNotifications.ts）で専用スコープ
// （/firebase-cloud-messaging-push-scope）に登録して使い分ける。
export default defineEventHandler((event) => {
  setHeader(event, 'Content-Type', 'application/javascript; charset=utf-8')

  const sanitize = (value: unknown): string =>
    String(value ?? '').trim().replace(/^['"]+|['"]+$/g, '')

  const firebaseConfig = {
    apiKey: sanitize(process.env.FIREBASE_API_KEY),
    authDomain: sanitize(process.env.FIREBASE_AUTH_DOMAIN),
    projectId: sanitize(process.env.FIREBASE_PROJECT_ID),
    storageBucket: sanitize(process.env.FIREBASE_STORAGE_BUCKET),
    messagingSenderId: sanitize(process.env.FIREBASE_MESSAGING_SENDER_ID),
    appId: sanitize(process.env.FIREBASE_APP_ID),
  }

  return `
importScripts('https://www.gstatic.com/firebasejs/11.0.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/11.0.0/firebase-messaging-compat.js')

firebase.initializeApp(${JSON.stringify(firebaseConfig)})

const messaging = firebase.messaging()

// アプリがフォアグラウンドに無い（タブが非アクティブ・閉じている）ときの通知表示
messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title ?? 'JACCS Neo'
  const body = payload.notification?.body ?? ''
  const link = payload.fcmOptions?.link ?? payload.data?.link ?? '/notifications'
  self.registration.showNotification(title, {
    body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: { link },
  })
})

// 通知をタップしたら該当ページを開く（既に開いていればそのタブにフォーカス）
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const link = event.notification.data?.link ?? '/notifications'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(link) && 'focus' in client) return client.focus()
      }
      if (clients.openWindow) return clients.openWindow(link)
    }),
  )
})
`.trim()
})
