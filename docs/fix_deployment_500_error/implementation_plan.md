# GitHub Actionsデプロイ時の500エラー解消計画 (サービスアカウント設定考慮版)

ユーザー様により `FIREBASE_SERVICE_ACCOUNT` (GCPサービスアカウントのJSONキー) が正しく設定されていることを前提に、現在の 500 エラーの原因と対策を以下のようにまとめました。

## 現状の分析
サービスアカウントの設定は「デプロイ権限」を付与するものですが、サイト自体が正常に動作し、かつ 500 エラーを回避するためには以下の修正が必要と考えられます。

1.  **デプロイ対象ディレクトリの不整合 (最有力要因)**:
    -   `firebase.json`: `"public": "dist"` と指定。
    -   ローカル環境: `dist` は `.output/public` へのジャンクション。
    -   GitHub Actions: ジャンクションが存在しないため、`dist` ディレクトリが見つからないか、空の状態でデプロイが試行されます。
    -   **結果**: Firebase Hosting が適切なファイル（`index.html` 等）を見つけられず、フレームワーク自動検出機能が誤動作してバックエンド関数を呼び出そうとし、500 エラーが発生している可能性があります。

2.  **ビルド時のアプリケーション設定不足**:
    -   Nuxt の `runtimeConfig` で使用している Firebase API キー等がビルド時に欠落しています。
    -   サービスアカウントは「デプロイ用」であり、アプリケーションがブラウザで動くための「APIキー」とは別物です。
    -   **結果**: 静的ファイル生成時に API キーが埋め込まれず、ブラウザ側で Firebase の初期化に失敗します。

## 修正方針

### 1. ディレクトリ指定の正規化
`dist` というリンクを介さず、Nuxt 3/4 の標準出力である `.output/public` を直接デプロイ対象にします。
#### [MODIFY] [firebase.json](file:///c:/Users/Public/Desktop/workspace/jaccsNeo/firebase.json)
- `public` を `"dist"` から `".output/public"` へ変更。

### 2. 環境変数の CI への注入
ビルドステップで、アプリケーションが使用する API キー等を環境変数として渡します。
#### [MODIFY] [deploy.yml](file:///c:/Users/Public/Desktop/workspace/jaccsNeo/.github/workflows/deploy.yml)
- `npm run generate` 実行時に、GitHub Secrets から取得した値を `env` として渡す定義を追加。

---

## ユーザー様にお願いしたい準備

> [!IMPORTANT]
> サービスアカウント (`FIREBASE_SERVICE_ACCOUNT`) に加え、以下の5つの情報を GitHub Secrets に追加していただく必要があります（これらはアプリケーションのビルドに必要です）。
> - `FIREBASE_API_KEY`
> - `FIREBASE_AUTH_DOMAIN`
> - `FIREBASE_PROJECT_ID`
> - `FIREBASE_STORAGE_BUCKET`
> - `FIREBASE_MESSAGING_SENDER_ID`
> - `FIREBASE_APP_ID`

## 検証計画
1. 設定変更後、GitHub にプッシュして Actions を実行。
2. Actions のログで「Deploy to Firebase Hosting」が成功しているか確認。
3. デプロイ後の URL で 500 エラーが解消され、Firebase のデータが正しく取得できているか確認。
