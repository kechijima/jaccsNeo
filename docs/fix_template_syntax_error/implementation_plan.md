# テンプレート構文エラーの修正計画

新規作成した5つの画面（ポータル、イベント、チーム、通知、管理者設定）において発生している Vue/Nuxt のテンプレートコンパイルエラーを修正します。

## エラーの原因
各ページのテンプレート内で、通常の `div` 要素の直下に `<template #header>` を配置していました。Vue では、名前付きスロット (`#slotname` または `v-slot:slotname`) はコンポーネントの直下でのみ有効であり、通常の HTML 要素（`div` 等）の中で使用しようとすると「Codegen node is missing for element/if/for node」というエラーが発生します。

## 修正方針
1.  **各ページのテンプレート修正**:
    - `<template #header>` というラッパーを削除します。
    - 中身のヘッダー要素（`h1` 等）を、ページ全体のメイン `div` 内の先頭に直接配置します。
2.  **対象ファイル**:
    - `app/pages/portal/index.vue`
    - `app/pages/events/index.vue`
    - `app/pages/team/index.vue`
    - `app/pages/notifications/index.vue`
    - `app/pages/admin/index.vue`

## 変更内容（全ページ共通のパターン）

### 修正前
```vue
<template>
  <div class="p-4 md:p-6 ...">
    <template #header>
      <h1>...</h1>
    </template>
    ...
  </div>
</template>
```

### 修正後
```vue
<template>
  <div class="p-4 md:p-6 ...">
    <!-- ヘッダーの内容を直接配置（レイアウトのslotではなくページ内ヘッダーとして扱う） -->
    <h1 class="text-xl font-bold flex items-center gap-2 mb-6">
      ...
    </h1>
    ...
  </div>
</template>
```

## 検証計画

### 手動確認
1.  各ページを表示し、コンパイルエラーが解消されていることを確認する。
2.  各ページのタイトル（ヘッダー部分）が正しく表示されていることを確認する。
