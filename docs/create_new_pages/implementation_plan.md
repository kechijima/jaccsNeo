# 新規画面作成計画（ポータル・イベント・チーム・通知・管理者設定）

システムの主要な不足画面（計5画面）をモックアップとして新規作成し、全体のナビゲーションを完成させます。

## 作成対象の画面

1.  **ポータル (`/portal`)**:
    - 業務連絡、最新ニュース、便利ツールへのリンクなどを集約した掲示板形式の画面。
2.  **イベント (`/events`)**:
    - 月間カレンダー（モック）や予定リストを表示するスケジュール管理画面。
3.  **チーム (`/team`)**:
    - 所属グループのメンバー一覧や、チーム全体のKPI統計を表示する画面。
4.  **通知 (`/notifications`)**:
    - システムからのアラート、顧客対応期限、新着ポータル投稿などの履歴を一覧表示する画面。
5.  **管理者設定 (`/admin`)**:
    - ユーザー一覧管理、グループ設定、システム設定などを行う画面（システム管理者のみアクセス可）。

## 共通のデザイン方針
- 既存のダッシュボードや顧客一覧画面と色調・レイアウトを統一。
- Tailwind CSS を使用し、レスポンシブ対応（PC・スマホ両対応）を徹底。
- アイコンには `heroicons` を使用。

## 変更内容

### app/pages

#### [NEW] [portal/index.vue](file:///c:/Users/Public/Desktop/workspace/jaccsNeo/app/pages/portal/index.vue)
- お知らせ一覧、カテゴリ別リンク集などを実装。

#### [NEW] [events/index.vue](file:///c:/Users/Public/Desktop/workspace/jaccsNeo/app/pages/events/index.vue)
- 週間/月間の予定リストビューを実装。

#### [NEW] [team/index.vue](file:///c:/Users/Public/Desktop/workspace/jaccsNeo/app/pages/team/index.vue)
- メンバーカード、チーム目標達成率のグラフ（モック）などを実装。

#### [NEW] [notifications/index.vue](file:///c:/Users/Public/Desktop/workspace/jaccsNeo/app/pages/notifications/index.vue)
- 未読・既読のフィルタリング、アイコン付きの通知リストを実装。

#### [NEW] [admin/index.vue](file:///c:/Users/Public/Desktop/workspace/jaccsNeo/app/pages/admin/index.vue)
- ユーザー一覧テーブル、権限変更ボタンなどを実装。認証ミドルウェアで保護。

## 検証計画

### 手動確認
1.  各ページへナビゲーションメニューから正常に遷移できるか。
2.  各ページのタイトルやレイアウトが崩れていないか。
3.  管理者設定画面が、一般ユーザーアカウントでアクセス拒否されるか（ミドルウェアによる保護の確認）。
4.  スマホ画面でもボトムナビゲーションから各ページへ遷移し、表示が適切に調整されているか。
