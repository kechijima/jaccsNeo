/**
 * push通知（Firebase Cloud Messaging）の有効化・トークン管理
 *
 * vite-pwaが登録する既存のService Worker（/sw.js、scope: '/'）と競合しないよう、
 * FCM用のService Worker（/firebase-messaging-sw.js）は専用スコープに登録する。
 */
import { doc, updateDoc, arrayUnion, arrayRemove, serverTimestamp } from 'firebase/firestore'
import { useAuthStore } from '~/stores/auth'
import { useToast } from '~/composables/useToast'
import { withRealIndexedDB } from '~/plugins/firebase.client'

const PUSH_SCOPE = '/firebase-cloud-messaging-push-scope'

// モジュールスコープで保持する（usePushNotifications()はlayouts/default.vue・
// settings/index.vue等、複数箇所から呼ばれ、呼び出しごとに新しいクロージャに
// なるため、composable関数の中に置くと呼び出し元ごとに別々の変数になって
// しまい、二重実行の防止にならない）
let inFlightRegisterToken: Promise<'ok' | 'no-vapid-key' | 'no-token'> | null = null

export const usePushNotifications = () => {
  const { $db } = useNuxtApp()
  const config = useRuntimeConfig()
  const authStore = useAuthStore()
  const { show: showToast } = useToast()

  // 'unsupported': ブラウザがpush通知に非対応（Safariの一部バージョン等）
  const status = useState<'idle' | 'unsupported' | 'granted' | 'denied' | 'requesting'>(
    'push:status',
    () => 'idle',
  )

  // firebase/messagingのisSupported()は「対応していない」という結果しか返さず、
  // どの条件で非対応と判定されたかが分からない。端末を問わず非対応と表示される
  // 不具合の原因切り分け用に、同等の判定を1つずつ行い、失敗した項目を保持する
  const unsupportedReasons = useState<string[]>('push:unsupportedReasons', () => [])

  // enablePush()が失敗した際の、ブラウザ・Firebaseが実際に返したエラー内容
  // （「push通知の有効化に失敗しました」という汎用メッセージだけでは原因が
  // 分からないため、個人設定画面にそのまま表示して切り分けの手がかりにする）
  const lastEnableError = useState<string>('push:lastEnableError', () => '')

  // 成功可否に加え、失敗時はDOMExceptionの name/message をそのまま返す
  // （「ブロックされている」とひとくちに言っても原因は様々なため、ブラウザが
  // 報告する実際のエラー内容を画面にそのまま出して切り分けの手がかりにする）
  const checkIndexedDbOpenable = (): Promise<{ ok: boolean; detail?: string }> => {
    // 正規のChromeでも window.indexedDB が未定義になるのは、通常はそのサイト専用の
    // 「Cookie とサイトデータ」権限が「ブロック」に設定されている場合（全体設定が
    // 「許可」でも、サイトごとの例外設定で上書きされていることがある）。原因の仮説と
    // 次に確認すべき操作を具体的に案内する
    if (typeof indexedDB === 'undefined') {
      return Promise.resolve({
        ok: false,
        detail: 'window.indexedDB が未定義です。Chromeのアドレスバー左のサイト情報アイコン→「Cookie とサイトデータ」が、このサイトだけ「ブロック」になっている可能性が高いです。「許可」に変更のうえ、ページを再読み込みしてお試しください',
      })
    }
    return new Promise((resolve) => {
      try {
        const req = indexedDB.open('__fcm_support_check__')
        req.onsuccess = () => {
          req.result.close()
          indexedDB.deleteDatabase('__fcm_support_check__')
          resolve({ ok: true })
        }
        req.onerror = () => {
          const err = req.error
          resolve({ ok: false, detail: err ? `${err.name}: ${err.message}` : '不明なエラー' })
        }
        req.onblocked = () => resolve({ ok: false, detail: 'blocked（他のタブ等で古いバージョンが開いたままの可能性があります）' })
      } catch (e: any) {
        resolve({ ok: false, detail: e?.name ? `${e.name}: ${e.message}` : String(e) })
      }
    })
  }

  const diagnoseUnsupported = async (): Promise<string[]> => {
    const reasons: string[] = []
    if (!('Notification' in window)) reasons.push('Notification API に非対応です')
    if (!('serviceWorker' in navigator)) reasons.push('Service Worker に非対応です')
    if (!('PushManager' in window)) reasons.push('PushManager に非対応です（ブラウザ設定でプッシュサービスが無効になっている場合があります）')
    if (!navigator.cookieEnabled) reasons.push('Cookieが無効になっています（ブラウザまたは端末の設定でブロックされています）')
    if (typeof ServiceWorkerRegistration === 'undefined' || !('showNotification' in ServiceWorkerRegistration.prototype)) {
      reasons.push('ServiceWorkerRegistration.showNotification に非対応です')
    }
    if (typeof PushSubscription === 'undefined' || !('getKey' in PushSubscription.prototype)) {
      reasons.push('PushSubscription.getKey に非対応です')
    }
    const idbResult = await checkIndexedDbOpenable()
    if (!idbResult.ok) {
      reasons.push(`IndexedDBを開けません（プライベートブラウジング中か、端末・ブラウザのストレージ設定で制限されている可能性があります）／詳細: ${idbResult.detail ?? '不明'}`)
    }
    // Android端末のアプリ内ブラウザ（WebView）で開いている場合はUser-Agentに
    // 'wv' が含まれる。通常のChromeブラウザではなくWebView埋め込みだと、
    // ストレージ関連のAPIが一部制限されることがあるため切り分け材料として表示する
    reasons.push(`参考: User-Agent = ${navigator.userAgent}`)
    return reasons
  }

  const checkSupport = async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
      status.value = 'unsupported'
      unsupportedReasons.value = typeof window === 'undefined' ? [] : await diagnoseUnsupported()
      return false
    }
    // 以前はここでfirebase/messagingのisSupported()（内部でIndexedDBを開ける
    // かどうかを厳密にテストする）を見て、falseなら登録処理自体を試みずに
    // 「対応していません」と表示して打ち切っていた。しかし、Chromeのサイト別・
    // 全体のCookie/サイトデータ設定がいずれも問題ない環境でもこのテストが
    // falseを返すケースが確認されており、実際に登録できるかどうかを正確に
    // 反映していなかった。基本的なAPIの存在チェックのみ行い、実際に登録
    // できるかどうかはenablePush()/registerToken()で直接試す
    unsupportedReasons.value = []
    return true
  }

  // 現在の許可状況を反映する（ページ表示時の初期表示用）。
  // ブラウザの許可（Notification.permission）が既に「許可」になっていても、
  // 実際にFCMトークンを登録できるとは限らない（登録してみて初めて分かる）
  // ため、許可済みの場合は ensureRegistered() で実際の登録を試みた結果を
  // そのままステータスに反映する（許可されているだけで「有効」と見なさない）
  const syncStatus = async () => {
    if (!(await checkSupport())) return
    if (status.value === 'unsupported') return
    if (Notification.permission === 'denied') {
      status.value = 'denied'
      return
    }
    if (Notification.permission !== 'granted') {
      status.value = 'idle'
      return
    }
    await ensureRegistered()
  }

  // navigator.serviceWorker.register()は登録の「開始」が完了した時点で解決し、
  // Service Workerが実際に有効化（active）されるのを待ってくれない。このSWは
  // ページ自体のスコープとは別の専用スコープ（PUSH_SCOPE）に登録しているため、
  // ページを制御するSWを待つ navigator.serviceWorker.ready も使えない
  // （別スコープのSWはそもそもこのページを制御しないため）。有効化前に
  // pushManager.subscribe()（getToken内部で呼ばれる）を実行すると
  // 「AbortError: ... no active Service Worker」で失敗するため、この
  // registration自体が active になるまで明示的に待つ
  const waitForServiceWorkerActive = (registration: ServiceWorkerRegistration): Promise<void> => {
    if (registration.active) return Promise.resolve()
    const worker = registration.installing ?? registration.waiting
    if (!worker) return Promise.resolve()
    return new Promise((resolve) => {
      const onStateChange = () => {
        if (worker.state === 'activated') {
          worker.removeEventListener('statechange', onStateChange)
          resolve()
        }
      }
      worker.addEventListener('statechange', onStateChange)
    })
  }

  // サービスワーカー登録→VAPIDキー確認→トークン取得→fcmTokensへ保存、という
  // コア処理。許可ダイアログを出す明示的な有効化（enablePush）と、既に許可済みの
  // 場合にアプリ起動時に静かに呼ぶ自動再登録（ensureRegistered）の両方から使う。
  // layouts/default.vueのonMountedとsettings/index.vueのonMountedが同じ
  // ページ読み込みで両方発火するため、許可が既に得られている状態でこのページを
  // 開くと2つの呼び出しがほぼ同時に走る。同じ登録処理（service worker登録・
  // getToken）を並行して2回実行すると、ブラウザ側で予期しない競合エラー
  // （IndexedDBアクセス関連のエラーなど）につながる可能性があるため、
  // 実行中の呼び出しがあればそれをそのまま待つだけにし、二重実行を防ぐ
  // （inFlightRegisterTokenはモジュールスコープで定義）
  const registerToken = (uid: string): Promise<'ok' | 'no-vapid-key' | 'no-token'> => {
    if (inFlightRegisterToken) return inFlightRegisterToken
    inFlightRegisterToken = (async () => {
      const { getMessaging, getToken, onMessage } = await import('firebase/messaging')
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: PUSH_SCOPE })
      await waitForServiceWorkerActive(registration)
      const messaging = getMessaging()
      const vapidKey = String(config.public.firebaseVapidKey ?? '').trim()
      if (!vapidKey) {
        console.error('FIREBASE_VAPID_KEY が設定されていません')
        return 'no-vapid-key' as const
      }

      const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration })
      if (!token) return 'no-token' as const

      await updateDoc(doc($db, 'users', uid), {
        fcmTokens: arrayUnion(token),
        updatedAt: serverTimestamp(),
      })

      // フォアグラウンド（このタブを開いている間）はOS通知が自動表示されないため、トーストで代替表示する
      onMessage(messaging, (payload) => {
        const title = payload.notification?.title ?? '通知'
        const body = payload.notification?.body ?? ''
        showToast(body ? `${title}: ${body}` : title, 5000)
      })
      return 'ok' as const
    })()
    return inFlightRegisterToken.finally(() => { inFlightRegisterToken = null })
  }

  // 通知の許可をリクエストし、許可されればFCMトークンを取得してFirestoreへ保存する
  const enablePush = async (): Promise<void> => {
    lastEnableError.value = ''
    if (!(await checkSupport())) {
      showToast('この端末・ブラウザはpush通知に対応していません')
      return
    }
    const uid = authStore.user?.uid
    if (!uid) return

    status.value = 'requesting'
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        status.value = permission === 'denied' ? 'denied' : 'idle'
        if (permission === 'denied') {
          showToast('通知が許可されませんでした。ブラウザの設定から許可してください')
        }
        return
      }

      // アプリ起動時はページ読み込みのハング対策でwindow.indexedDBを無効化
      // している（firebase.client.ts参照）が、push通知はIndexedDBが無いと
      // 一切動作しない。ユーザーが明示的にこのボタンを押した、この操作の
      // 間だけ本物のIndexedDBを一時的に復元する（自動再登録では使わない）
      const result = await withRealIndexedDB(() => registerToken(uid))
      if (result === 'no-vapid-key') {
        showToast('push通知の設定が未完了です（VAPIDキー未設定）')
        lastEnableError.value = 'VAPIDキーが設定されていません（アプリ側の設定不備）'
        status.value = 'idle'
        return
      }
      if (result === 'no-token') {
        showToast('push通知の有効化に失敗しました')
        lastEnableError.value = 'getToken()がトークンを返しませんでした（原因不明）'
        status.value = 'idle'
        return
      }

      status.value = 'granted'
      showToast('push通知を有効にしました')
    } catch (e: any) {
      console.error('push通知の有効化に失敗しました', e)
      status.value = 'idle'
      showToast('push通知の有効化に失敗しました')
      lastEnableError.value = e?.name ? `${e.name}: ${e.message}` : String(e?.message ?? e)
    }
  }

  // 通知の許可が既に得られている場合、確認ダイアログを出さずに静かにトークンを
  // 再登録する。アプリ起動のたびに呼ぶことを想定しており、FCMトークンの有効期限
  // 切れ・ローテーションで気づかないうちにpushが届かなくなる事故を防ぐ
  // （成功時もトーストは出さない＝毎回の起動で表示されてしまうのを避ける）。
  // 失敗時はトーストこそ出さないが、lastEnableErrorには実際のエラーを残し、
  // 個人設定画面でいつでも確認できるようにする。
  // 注意: ここでは意図的にwithRealIndexedDB()を使わない（本物のIndexedDBは
  // enablePush()等、ユーザーが明示的に操作した時だけ復元する）。アプリ起動の
  // たびに自動実行されるこの処理でIndexedDBを触ると、firebase.client.tsで
  // 無効化した本来の不具合（ページ読み込みが長時間止まる現象）を毎回の起動で
  // 再発させるリスクがあるため、自動再登録は許可状況の確認のみに留める
  const ensureRegistered = async (): Promise<void> => {
    const uid = authStore.user?.uid
    if (!uid) return
    if (typeof window === 'undefined' || typeof Notification === 'undefined') return
    if (Notification.permission !== 'granted') return
    if (!(await checkSupport())) return
    try {
      const result = await registerToken(uid)
      if (result === 'ok') {
        status.value = 'granted'
        lastEnableError.value = ''
      } else if (result === 'no-vapid-key') {
        status.value = 'idle'
        lastEnableError.value = 'VAPIDキーが設定されていません（アプリ側の設定不備）'
      } else {
        status.value = 'idle'
        lastEnableError.value = 'getToken()がトークンを返しませんでした（原因不明）'
      }
    } catch (e: any) {
      console.warn('push通知トークンの自動再登録に失敗しました', e)
      status.value = 'idle'
      lastEnableError.value = e?.name ? `${e.name}: ${e.message}` : String(e?.message ?? e)
    }
  }

  // この端末のトークンだけを取り消す（他端末のトークンは残す）。
  // ユーザーの明示的な操作（ボタン押下）のため、enablePush()と同様に
  // 本物のIndexedDBをこの処理の間だけ一時的に復元する
  const disablePush = async (): Promise<void> => {
    const uid = authStore.user?.uid
    if (!uid) return
    try {
      if (!(await checkSupport())) return
      await withRealIndexedDB(async () => {
        const { getMessaging, getToken, deleteToken } = await import('firebase/messaging')
        const registration = await navigator.serviceWorker.getRegistration(PUSH_SCOPE)
        if (registration) await waitForServiceWorkerActive(registration)
        const messaging = getMessaging()
        const vapidKey = String(config.public.firebaseVapidKey ?? '').trim()
        const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration ?? undefined }).catch(() => null)
        if (token) {
          await updateDoc(doc($db, 'users', uid), { fcmTokens: arrayRemove(token), updatedAt: serverTimestamp() })
          await deleteToken(messaging).catch(() => {})
        }
      })
    } finally {
      status.value = 'idle'
      showToast('この端末のpush通知を無効にしました')
    }
  }

  return { status, unsupportedReasons, lastEnableError, syncStatus, enablePush, ensureRegistered, disablePush }
}
