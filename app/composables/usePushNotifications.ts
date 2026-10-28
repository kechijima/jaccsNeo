/**
 * push通知（Firebase Cloud Messaging）の有効化・トークン管理
 *
 * vite-pwaが登録する既存のService Worker（/sw.js、scope: '/'）と競合しないよう、
 * FCM用のService Worker（/firebase-messaging-sw.js）は専用スコープに登録する。
 */
import { doc, updateDoc, arrayUnion, arrayRemove, serverTimestamp } from 'firebase/firestore'
import { useAuthStore } from '~/stores/auth'
import { useToast } from '~/composables/useToast'

const PUSH_SCOPE = '/firebase-cloud-messaging-push-scope'

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

  // 成功可否に加え、失敗時はDOMExceptionの name/message をそのまま返す
  // （「ブロックされている」とひとくちに言っても原因は様々なため、ブラウザが
  // 報告する実際のエラー内容を画面にそのまま出して切り分けの手がかりにする）
  const checkIndexedDbOpenable = (): Promise<{ ok: boolean; detail?: string }> => {
    if (typeof indexedDB === 'undefined') return Promise.resolve({ ok: false, detail: 'indexedDBが存在しません' })
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
    const { isSupported } = await import('firebase/messaging')
    if (!(await isSupported())) {
      status.value = 'unsupported'
      unsupportedReasons.value = await diagnoseUnsupported()
      return false
    }
    unsupportedReasons.value = []
    return true
  }

  // 現在の許可状況を反映する（ページ表示時の初期表示用。トークン取得は行わない）
  const syncStatus = async () => {
    if (!(await checkSupport())) return
    if (status.value === 'unsupported') return
    status.value = Notification.permission === 'granted'
      ? 'granted'
      : Notification.permission === 'denied'
        ? 'denied'
        : 'idle'
  }

  // 通知の許可をリクエストし、許可されればFCMトークンを取得してFirestoreへ保存する
  const enablePush = async (): Promise<void> => {
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

      const { getMessaging, getToken, onMessage } = await import('firebase/messaging')
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: PUSH_SCOPE })
      const messaging = getMessaging()
      const vapidKey = String(config.public.firebaseVapidKey ?? '').trim()
      if (!vapidKey) {
        console.error('FIREBASE_VAPID_KEY が設定されていません')
        showToast('push通知の設定が未完了です（VAPIDキー未設定）')
        status.value = 'idle'
        return
      }

      const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration })
      if (!token) {
        status.value = 'idle'
        return
      }

      await updateDoc(doc($db, 'users', uid), {
        fcmTokens: arrayUnion(token),
        updatedAt: serverTimestamp(),
      })
      status.value = 'granted'
      showToast('push通知を有効にしました')

      // フォアグラウンド（このタブを開いている間）はOS通知が自動表示されないため、トーストで代替表示する
      onMessage(messaging, (payload) => {
        const title = payload.notification?.title ?? '通知'
        const body = payload.notification?.body ?? ''
        showToast(body ? `${title}: ${body}` : title, 5000)
      })
    } catch (e) {
      console.error('push通知の有効化に失敗しました', e)
      status.value = 'idle'
      showToast('push通知の有効化に失敗しました')
    }
  }

  // この端末のトークンだけを取り消す（他端末のトークンは残す）
  const disablePush = async (): Promise<void> => {
    const uid = authStore.user?.uid
    if (!uid) return
    try {
      if (!(await checkSupport())) return
      const { getMessaging, getToken, deleteToken } = await import('firebase/messaging')
      const registration = await navigator.serviceWorker.getRegistration(PUSH_SCOPE)
      const messaging = getMessaging()
      const vapidKey = String(config.public.firebaseVapidKey ?? '').trim()
      const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration ?? undefined }).catch(() => null)
      if (token) {
        await updateDoc(doc($db, 'users', uid), { fcmTokens: arrayRemove(token), updatedAt: serverTimestamp() })
        await deleteToken(messaging).catch(() => {})
      }
    } finally {
      status.value = 'idle'
      showToast('この端末のpush通知を無効にしました')
    }
  }

  return { status, unsupportedReasons, syncStatus, enablePush, disablePush }
}
