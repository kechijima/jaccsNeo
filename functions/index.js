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
// 注意: このアプリのログインは現状モック実装（実際のFirebase Authに紐づく
// ユーザーロール管理をまだ行っていない）ため、ここでは「ログイン済み（匿名認証含む）」
// であることのみを確認している。実運用でロールベースのアクセス制御を厳格化する場合は、
// context.auth.uid に対応する users/{uid} ドキュメントの role が
// system_admin であることを別途検証すること。
exports.createAuthUser = onCall(async (request) => {
  if (!request.auth) {
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
      role: role ?? 'general',
      specialTeams: specialTeams ?? [],
      groupId: groupId ?? null,
      kumiaiId: kumiaiId ?? null,
      position: position ?? null,
      isActive: true,
      createdBy: request.auth.uid,
      updatedBy: request.auth.uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    })
  } catch (err) {
    // プロフィール作成に失敗した場合はAuthユーザーも削除してロールバックする
    await admin.auth().deleteUser(userRecord.uid).catch(() => {})
    throw new HttpsError('internal', 'ユーザープロフィールの作成に失敗しました')
  }

  return { uid: userRecord.uid }
})
