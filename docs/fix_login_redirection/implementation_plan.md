# ログイン遷移不具合の修正計画

ログイン画面からログインをするとダッシュボードに遷移しない不具合を修正します。

## 現状の課題
現在、`useAuth.ts` の `login` 関数において、Firebase Authentication でのサインイン (`signInWithEmailAndPassword`) 完了直後に `router.push('/dashboard')` を実行しています。
しかし、ダッシュボードへの遷移時に動作する `auth` ミドルウェアは Pinia ストア内の `isLoggedIn` フラグをチェックしています。
この `isLoggedIn` フラグは Firestore からのユーザーデータ取得完了後に `true` になりますが、Firestore からのデータ取得は非同期（`onAuthStateChanged` 内）で行われるため、`router.push` の時点ではまだデータ取得が完了しておらず、ミドルウェアによってログイン画面に押し戻されている（リダイレクトされている）可能性が高いです。

## 修正方針
1.  **`useAuth.ts` の修正**: `login` 関数内で、Firebase サインイン完了後、手動で Firestore からユーザーデータを取得し、ストアにセットしてから遷移を行うように変更します。これにより、ミドルウェア実行時に確実に `isLoggedIn` が `true` になっている状態を作ります。
2.  **`login.vue` の修正**: `watchEffect` による自動遷移ロジックを削除し、`login` 関数内での明示的な遷移に一本化します。これにより、挙動の予測可能性を高めます。

## 変更内容

### app/composables

#### [MODIFY] [useAuth.ts](file:///c:/Users/Public/Desktop/workspace/jaccsNeo/app/composables/useAuth.ts)
- `login` 関数を修正し、`fetchUserDoc` を待機してから `authStore.setUser` を呼び出し、その後に `router.push` を実行するようにします。

### app/pages

#### [MODIFY] [login.vue](file:///c:/Users/Public/Desktop/workspace/jaccsNeo/app/pages/login.vue)
- `isLoggedIn` を監視して `navigateTo('/dashboard')` を実行している `watchEffect` を削除します。

## 検証計画

### 自動テスト
- 現時点では自動テスト環境がないため、コードの静的チェックとロジックの確認を行います。

### 手動確認
1.  ログイン画面から正しい資格情報でログインを試行する。
2.  ログイン後、リダイレクトされることなくダッシュボード画面が表示されることを確認する。
3.  ログイン後にブラウザをリロードしても、ログイン状態が維持されダッシュボードが表示されることを確認する（`initAuth` の挙動確認）。
