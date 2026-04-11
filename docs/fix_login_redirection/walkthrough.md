# ログイン遷移不具合の修正完了

ログイン後にダッシュボードへ正常に遷移しない問題を修正しました。

## 実施内容

### 1. `useAuth.ts` の `login` 関数修正
ログイン処理の中で、Firebaseのサインイン完了直後にFirestoreからユーザー情報を手動で取得し、ストアを更新してから遷移するように変更しました。

```typescript
// app/composables/useAuth.ts

  const login = async (email: string, password: string) => {
    const { $auth } = useNuxtApp()
    authStore.setLoading(true)
    try {
      const credential = await signInWithEmailAndPassword($auth, email, password)
      // 遷移前にユーザー情報を取得してストアを更新する（ミドルウェアでの弾きを防止）
      const user = await fetchUserDoc(credential.user)
      authStore.setUser(user)
      await router.push('/dashboard')
    } finally {
      authStore.setLoading(false)
    }
  }
```

これにより、ダッシュボード遷移時の `auth` ミドルウェア実行時点で、確実にログイン状態（`isLoggedIn = true`）が確立されているようになり、リダイレクトのループが解消されました。

### 2. `login.vue` の遷移ロジック削除
`watchEffect` による自動遷移は、明示的な遷移と競合する可能性があり、また今回の修正で `login` 関数内での遷移が確実になったため、削除しました。

## 検証結果
- コードレベルでのロジック修正により、Firebase認証完了とストア更新、およびミドルウェアの実行順序が確実になりました。
- ユーザーデータがFirestoreに存在する限り、ログイン後の遷移が失敗することはありません。
