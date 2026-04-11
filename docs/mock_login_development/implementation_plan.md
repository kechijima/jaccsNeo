# モックログイン実装計画（開発・デモ用）

モックアップ段階において、Firebaseの実装状況にかかわらず、任意のIDとパスワードの入力でダッシュボードへ遷移できるように変更します。

## 現状
現在、`useAuth.ts` は実際の Firebase Authentication および Firestore のユーザー情報を取得しようとしています。開発環境やモックアップの確認においては、これがボトルネックとなって遷移できない場合があります。

## 修正方針
1.  **`useAuth.ts` の `login` 関数をモック化**:
    - 実際の Firebase 認証処理をコメントアウトまたは削除します。
    - 入力されたメールアドレスを受け取り、固定のテストユーザー情報（`AppUser` 型）を作成して `authStore` にセットします。
    - その後、ダッシュボードへ遷移させます。
2.  **`initAuth` の調整（任意）**:
    - 現在の `initAuth` はアプリ起動時に Firebase の状態を同期しますが、モック環境用にはそのままでも問題ない（未ログイン状態で起動し、ログインボタンでモックユーザーがセットされる）と判断します。

## 変更内容

### app/composables

#### [MODIFY] [useAuth.ts](file:///c:/Users/Public/Desktop/workspace/jaccsNeo/app/composables/useAuth.ts)
- `login` 関数を以下のロジックに差し替えます。
```typescript
  const login = async (email: string, password: string) => {
    authStore.setLoading(true)
    try {
      // モックユーザーの作成
      const mockUser: AppUser = {
        uid: 'mock-user-123',
        email: email || 'test@example.com',
        displayName: 'テストユーザー',
        role: 'system_admin',
        specialTeams: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      authStore.setUser(mockUser)
      await router.push('/dashboard')
    } finally {
      authStore.setLoading(false)
    }
  }
```

## 検証計画

### 手動確認
1.  ログイン画面を表示する。
2.  任意のメールアドレスとパスワードを入力して「ログイン」ボタンをクリックする。
3.  即座にダッシュボード画面に遷移し、「テストユーザーさん」と表示されることを確認する。
