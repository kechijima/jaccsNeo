const { onCall, HttpsError } = require('firebase-functions/v2/https')
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
