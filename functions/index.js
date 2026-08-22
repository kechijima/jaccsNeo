const { onCall, HttpsError } = require('firebase-functions/v2/https')
const { onDocumentCreated } = require('firebase-functions/v2/firestore')
const { setGlobalOptions } = require('firebase-functions/v2')
const admin = require('firebase-admin')

admin.initializeApp()

setGlobalOptions({ region: 'asia-northeast1', maxInstances: 5 })

const AUTH_ERROR_MESSAGES = {
  'auth/email-already-exists': 'このメールアドレスは既に使用されています',
  'auth/invalid-email': 'メールアドレスの形式が正しくありません',
  'auth/invalid-password': 'パスワードは6文字以上で指定してください',
}

// 管理者がFirebase AuthユーザーとFirestoreプロフィールを同時に作成する。
// クライアントSDKのcreateUserWithEmailAndPasswordは呼び出した本人のセッションを
// 新規ユーザーに置き換えてしまう（＝管理者自身がログアウトされる）ため、
// Admin SDKを使えるCloud Functions側で作成する。
//
// ブートストラップ: usersコレクションが1件も存在しない場合に限り、未ログインでも
// 呼び出しを許可し、強制的にsystem_adminとして最初の管理者アカウントを作成する
// （/setup ページから利用）。1件でもユーザーが存在すればこの経路は閉じ、
// 以降は必ずログイン済みであることを要求する。
exports.createAuthUser = onCall(async (request) => {
  const usersSnapshot = await admin.firestore().collection('users').limit(1).get()
  const isBootstrap = usersSnapshot.empty

  if (!isBootstrap && !request.auth) {
    throw new HttpsError('unauthenticated', 'ログインが必要です')
  }

  const { email, password, displayName, role, specialTeams, groupId, kumiaiId, position } = request.data ?? {}

  if (!email || !password || !displayName) {
    throw new HttpsError('invalid-argument', 'メールアドレス・パスワード・氏名は必須です')
  }

  let userRecord
  try {
    userRecord = await admin.auth().createUser({ email, password, displayName })
  } catch (err) {
    const message = AUTH_ERROR_MESSAGES[err.code] ?? err.message ?? 'ユーザーの作成に失敗しました'
    throw new HttpsError('already-exists', message)
  }

  try {
    await admin.firestore().doc(`users/${userRecord.uid}`).set({
      email,
      displayName,
      role: isBootstrap ? 'system_admin' : (role ?? 'general'),
      specialTeams: isBootstrap ? [] : (specialTeams ?? []),
      groupId: groupId ?? null,
      kumiaiId: kumiaiId ?? null,
      position: position ?? null,
      isActive: true,
      createdBy: request.auth ? request.auth.uid : 'bootstrap',
      updatedBy: request.auth ? request.auth.uid : 'bootstrap',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    })
  } catch (err) {
    // プロフィール作成に失敗した場合はAuthユーザーも削除してロールバックする
    await admin.auth().deleteUser(userRecord.uid).catch(() => {})
    throw new HttpsError('internal', 'ユーザープロフィールの作成に失敗しました')
  }

  return { uid: userRecord.uid, bootstrap: isBootstrap }
})

// パスワードリセットメールが迷惑メールフォルダ等に振り分けられて届かず、
// ログインできなくなるケースへの対応。メールアドレスと生年月日（users/{uid}.birthday、
// 本人がマイページ等で登録した値）が一致した場合に限り、リセットメールを使わず
// その場でパスワードを変更できるようにする。
// パスワード再設定前で未ログインの状態から呼び出すため認証チェックは行わない
// （本人確認はメールアドレス＋生年月日の一致で代替する）。総当たり対策として、
// メールアドレスごとに直近15分間の失敗回数を記録し、5回を超えたら一時的に拒否する
exports.resetPasswordWithDob = onCall(async (request) => {
  const { email, birthday, newPassword } = request.data ?? {}

  if (!email || !birthday || !newPassword) {
    throw new HttpsError('invalid-argument', '入力内容を確認してください')
  }
  if (newPassword.length < 6) {
    throw new HttpsError('invalid-argument', 'パスワードは6文字以上で指定してください')
  }

  const normalizedEmail = String(email).trim().toLowerCase()
  const attemptsRef = admin.firestore().collection('passwordResetAttempts').doc(normalizedEmail)
  const attemptsSnap = await attemptsRef.get()
  const now = Date.now()
  const WINDOW_MS = 15 * 60 * 1000
  const MAX_ATTEMPTS = 5

  const recentFailures = attemptsSnap.exists
    ? (attemptsSnap.data().failures ?? []).filter((t) => now - t < WINDOW_MS)
    : []
  if (recentFailures.length >= MAX_ATTEMPTS) {
    throw new HttpsError('resource-exhausted', '試行回数が多すぎます。しばらく時間をおいてから再度お試しください')
  }

  const recordFailure = async () => {
    await attemptsRef.set({ failures: [...recentFailures, now] }, { merge: true })
  }

  let userRecord
  try {
    userRecord = await admin.auth().getUserByEmail(normalizedEmail)
  } catch (err) {
    await recordFailure()
    throw new HttpsError('not-found', 'メールアドレスまたは生年月日が正しくありません')
  }

  const userDoc = await admin.firestore().doc(`users/${userRecord.uid}`).get()
  const userData = userDoc.data()

  if (!userDoc.exists || !userData.birthday || userData.birthday !== birthday) {
    await recordFailure()
    throw new HttpsError('not-found', 'メールアドレスまたは生年月日が正しくありません')
  }

  if (userData.isWithdrawn) {
    throw new HttpsError('permission-denied', 'このアカウントはご利用いただけません')
  }

  await admin.auth().updateUser(userRecord.uid, { password: newPassword })
  await attemptsRef.delete().catch(() => {})

  return { success: true }
})

// notifications/{uid}/items/{itemId} にアプリ内通知が作成されるたびに、
// 対象ユーザーが登録済みのFCMトークン（users/{uid}.fcmTokens、複数端末分）へ
// push通知を送信する。アプリ内通知の作成自体はクライアントSDKから直接
// useNotifications.tsのsendNotification()で行われており、そのタイミングに
// 合わせてpush送信だけをサーバー側（Admin SDK）で行う設計にしている
exports.sendPushOnNotificationCreate = onDocumentCreated('notifications/{uid}/items/{itemId}', async (event) => {
  const uid = event.params.uid
  const data = event.data?.data()
  if (!data) return

  const userSnap = await admin.firestore().doc(`users/${uid}`).get()
  const tokens = userSnap.data()?.fcmTokens ?? []
  if (tokens.length === 0) return

  const link = data.linkUrl ?? '/notifications'

  const response = await admin.messaging().sendEachForMulticast({
    tokens,
    notification: {
      title: data.title ?? 'JACCS Neo',
      body: data.body ?? '',
    },
    webpush: {
      fcmOptions: { link },
      notification: { icon: '/icons/icon-192.png' },
    },
  })

  // 失効・無効になったトークンは以降送信対象から除外する
  const invalidTokens = []
  response.responses.forEach((res, idx) => {
    if (res.success) return
    const code = res.error?.code
    if (code === 'messaging/invalid-registration-token' || code === 'messaging/registration-token-not-registered') {
      invalidTokens.push(tokens[idx])
    }
  })
  if (invalidTokens.length > 0) {
    await admin.firestore().doc(`users/${uid}`).update({
      fcmTokens: admin.firestore.FieldValue.arrayRemove(...invalidTokens),
    })
  }
})
