const { onCall, HttpsError } = require('firebase-functions/v2/https')
const { onDocumentCreated } = require('firebase-functions/v2/firestore')
const { onSchedule } = require('firebase-functions/v2/scheduler')
const { setGlobalOptions } = require('firebase-functions/v2')
const { initializeApp } = require('firebase-admin/app')
const { getFirestore, FieldValue } = require('firebase-admin/firestore')
const { getAuth } = require('firebase-admin/auth')
const { getMessaging } = require('firebase-admin/messaging')
const { getStorage } = require('firebase-admin/storage')

// firebase-admin v13以降、admin.firestore()・admin.auth()等の名前空間形式の
// APIは廃止された（admin.firestoreはundefinedになる）。各モジュールの
// getXxx()関数を使うモジュラー形式のAPIに統一する（firebase-admin
// 12.6.0→14.5.0へのアップデート（コミットb1bbe39、Node 20 EOL対応）の際、
// この破壊的変更を見落としたまま名前空間形式のまま残っており、デプロイ後
// admin.firestore()等を呼ぶすべての関数が実行時に
// 「TypeError: admin.firestore is not a function」で失敗していた）
initializeApp()
const db = getFirestore()
const auth = getAuth()
const messaging = getMessaging()
const storage = getStorage()

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
  const usersSnapshot = await db.collection('users').limit(1).get()
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
    userRecord = await auth.createUser({ email, password, displayName })
  } catch (err) {
    const message = AUTH_ERROR_MESSAGES[err.code] ?? err.message ?? 'ユーザーの作成に失敗しました'
    throw new HttpsError('already-exists', message)
  }

  try {
    await db.doc(`users/${userRecord.uid}`).set({
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
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })
  } catch (err) {
    // プロフィール作成に失敗した場合はAuthユーザーも削除してロールバックする
    await auth.deleteUser(userRecord.uid).catch(() => {})
    throw new HttpsError('internal', 'ユーザープロフィールの作成に失敗しました')
  }

  return { uid: userRecord.uid, bootstrap: isBootstrap }
})

// メールアドレスを誤って入力したまま作成してしまったアカウント等、正式な脱退
// フローを経ずにアカウント自体を削除したい場合に使う（Firebase Authユーザーと
// Firestoreのusersプロフィールの両方を削除する）。脱退フラグ
// （users.isWithdrawn）とは異なり、データは一切残さず完全に削除する点に注意。
// Admin SDKでのAuthユーザー削除が必要なためCloud Functions側で行う
exports.deleteAuthUser = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'ログインが必要です')
  }
  const callerSnap = await db.doc(`users/${request.auth.uid}`).get()
  if (callerSnap.data()?.role !== 'system_admin') {
    throw new HttpsError('permission-denied', 'システム管理者のみ実行できます')
  }

  const { uid } = request.data ?? {}
  if (!uid) {
    throw new HttpsError('invalid-argument', '対象ユーザーが指定されていません')
  }
  if (uid === request.auth.uid) {
    throw new HttpsError('invalid-argument', '自分自身のアカウントは削除できません')
  }

  try {
    await auth.deleteUser(uid)
  } catch (err) {
    if (err.code !== 'auth/user-not-found') {
      throw new HttpsError('internal', 'Authユーザーの削除に失敗しました')
    }
  }
  await db.doc(`users/${uid}`).delete()

  return { success: true }
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
  const attemptsRef = db.collection('passwordResetAttempts').doc(normalizedEmail)
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
    userRecord = await auth.getUserByEmail(normalizedEmail)
  } catch (err) {
    await recordFailure()
    throw new HttpsError('not-found', 'メールアドレスまたは生年月日が正しくありません')
  }

  const userDoc = await db.doc(`users/${userRecord.uid}`).get()
  const userData = userDoc.data()

  if (!userDoc.exists || !userData.birthday || userData.birthday !== birthday) {
    await recordFailure()
    throw new HttpsError('not-found', 'メールアドレスまたは生年月日が正しくありません')
  }

  if (userData.isWithdrawn) {
    throw new HttpsError('permission-denied', 'このアカウントはご利用いただけません')
  }

  await auth.updateUser(userRecord.uid, { password: newPassword })
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

  const userSnap = await db.doc(`users/${uid}`).get()
  const tokens = userSnap.data()?.fcmTokens ?? []
  if (tokens.length === 0) return

  const link = data.linkUrl ?? '/notifications'

  const response = await messaging.sendEachForMulticast({
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
    await db.doc(`users/${uid}`).update({
      fcmTokens: FieldValue.arrayRemove(...invalidTokens),
    })
  }
})

const STATUS_LABELS = {
  consulting: '相談中',
  considering: '検討中',
  contracted: '成約',
  completed: '完了',
  failed: '不成立',
}

// 毎朝9時（日本時間）に、アプリ管理（appDefs）で「放置アラート」（staleAlertDays /
// staleAlertStatuses）が設定されているアプリについて、対象ステータスのまま指定日数
// 以上ステータス変更・更新がない案件（customers/{cid}/services/{type}/cases/{caseId}）を
// 検出し、担当者・担当未来設計士・アプリ責任者へ通知する。
// collectionGroupクエリにwhereを付けるとコレクショングループ用の複合インデックスが
// 別途必要になる（このリポジトリのCIはFirestoreのインデックスを自動デプロイしない）ため、
// useServices.tsのfetchAllCases()と同様、絞り込みなしで全件取得してから
// メモリ上でフィルタする。同じ案件に毎日通知しないよう、案件のupdatedAtを
// staleAlertSentForに記録し、再更新されるまで再通知しない
exports.checkStaleServiceCases = onSchedule({ schedule: '0 9 * * *', timeZone: 'Asia/Tokyo' }, async () => {

  const appDefsSnap = await db.collection('appDefs').where('isPublished', '==', true).get()
  const targets = appDefsSnap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(a => a.sourceServiceType && a.staleAlertDays > 0)
  if (targets.length === 0) return

  const casesSnap = await db.collectionGroup('cases').get()
  const now = Date.now()
  const notificationPrefsCache = new Map()

  const isNotifiable = async (uid) => {
    if (!notificationPrefsCache.has(uid)) {
      const snap = await db.doc(`users/${uid}`).get()
      notificationPrefsCache.set(uid, snap.data()?.notificationPrefs ?? null)
    }
    const prefs = notificationPrefsCache.get(uid)
    return prefs?.system !== false
  }

  for (const app of targets) {
    const statuses = (Array.isArray(app.staleAlertStatuses) && app.staleAlertStatuses.length > 0)
      ? app.staleAlertStatuses
      : ['consulting', 'considering']
    const thresholdMs = app.staleAlertDays * 24 * 60 * 60 * 1000

    for (const caseDoc of casesSnap.docs) {
      const c = caseDoc.data()
      if (c.serviceType !== app.sourceServiceType) continue
      if (!statuses.includes(c.status)) continue
      const updatedAt = c.updatedAt?.toDate?.()
      if (!updatedAt) continue
      if (now - updatedAt.getTime() < thresholdMs) continue

      const updatedAtIso = updatedAt.toISOString()
      if (c.staleAlertSentFor === updatedAtIso) continue

      const recipientUids = [...new Set([c.assigneeUid, c.plannerUid, ...(app.ownerUids ?? [])].filter(Boolean))]
      if (recipientUids.length === 0) continue

      const customerRef = caseDoc.ref.parent.parent.parent.parent
      const customerSnap = await customerRef.get()
      const customerName = customerSnap.data()?.name ?? '顧客'
      const statusLabel = STATUS_LABELS[c.status] ?? c.status

      for (const uid of recipientUids) {
        if (!(await isNotifiable(uid))) continue
        await db.collection('notifications').doc(uid).collection('items').add({
          type: 'system',
          title: '案件が一定期間更新されていません',
          body: `${customerName}様の「${app.name}」案件が、ステータス「${statusLabel}」のまま${app.staleAlertDays}日以上更新されていません。`,
          linkUrl: `/customers/${customerRef.id}/services/${app.sourceServiceType}/${caseDoc.id}`,
          relatedId: caseDoc.id,
          uid,
          isRead: false,
          createdAt: FieldValue.serverTimestamp(),
        })
      }

      await caseDoc.ref.update({ staleAlertSentFor: updatedAtIso })
    }
  }
})

// 毎日深夜、作成から1ヶ月（30日）以上経過した通知（notifications/{uid}/items/{itemId}）を
// 自動削除する。collectionGroupクエリにwhereを付けるとコレクショングループ用の
// インデックスが別途必要になる（このリポジトリのCIはFirestoreのインデックスを
// 自動デプロイしない）ため、checkStaleServiceCasesと同様に絞り込みなしで全件取得
// してからメモリ上でフィルタする。都度の個別削除は別途アプリ側（通知一覧の削除
// ボタン）で対応している
exports.cleanupOldNotifications = onSchedule({ schedule: '30 3 * * *', timeZone: 'Asia/Tokyo' }, async () => {
  const RETENTION_MS = 30 * 24 * 60 * 60 * 1000
  const cutoff = Date.now() - RETENTION_MS

  const snap = await db.collectionGroup('items').get()
  const expired = snap.docs.filter((d) => {
    const createdAt = d.data().createdAt?.toDate?.()
    return createdAt && createdAt.getTime() < cutoff
  })
  if (expired.length === 0) return

  // Firestoreのバッチ書き込みは1回あたり最大500件
  for (let i = 0; i < expired.length; i += 500) {
    const batch = db.batch()
    expired.slice(i, i + 500).forEach(d => batch.delete(d.ref))
    await batch.commit()
  }
})

// 毎日深夜、活動報告（掲示板投稿・スペースのピン留め投稿）のリッチテキスト本文に
// 埋め込まれた画像のうち、アップロードから45日以上経過したものをStorageから自動
// 削除する（ストレージ容量の圧迫を防ぐための運用上の対応）。削除後は投稿本文中の
// 該当画像を表示できなくなる（本文のHTML自体は変更しない）。対象は
// richtext/posts/配下のみ（RichTextEditorのupload-path-prefixで、活動報告の
// 投稿エディターからの画像だけがこのフォルダに保存されるようクライアント側で
// 分けている）。お知らせ・案件メモ・イベント説明等、他の用途でRichTextEditorから
// アップロードされた画像（richtext/直下）は保持期限の対象外
exports.cleanupOldPostImages = onSchedule({ schedule: '0 4 * * *', timeZone: 'Asia/Tokyo' }, async () => {
  const RETENTION_MS = 45 * 24 * 60 * 60 * 1000
  const cutoff = Date.now() - RETENTION_MS

  const bucket = storage.bucket()
  const [files] = await bucket.getFiles({ prefix: 'richtext/posts/' })

  const expired = files.filter((file) => {
    const created = file.metadata?.timeCreated
    return created && new Date(created).getTime() < cutoff
  })
  if (expired.length === 0) return

  await Promise.all(expired.map(file => file.delete().catch(() => {})))
})
