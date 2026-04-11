# テンプレート構文エラーの修正完了

新規作成した5つの画面で発生していた「Codegen node is missing for element/if/for node」というコンパイルエラーを修正しました。

## 修正内容

### テンプレート構造の修正
Vue/Nuxt において、通常の HTML 要素（`div` 等）の直下で名前付きスロットを指定した `<template #header>` を使用していたことが原因でした。この誤った構造を削除し、ヘッダー（タイトル）部分をページ内の標準的な要素として配置し直しました。

**修正対象ファイル:**
- `portal/index.vue`
- `events/index.vue`
- `team/index.vue`
- `notifications/index.vue`
- `admin/index.vue`

**修正例（ポータル画面）:**
```vue
<!-- 修正後 -->
<template>
  <div class="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
    <h1 class="text-xl font-bold flex items-center gap-2 mb-6">
      <Icon name="heroicons:chat-bubble-left-right" class="text-primary-600" />
      ポータル
    </h1>
    ...
  </div>
</template>
```

## 検証結果
- 各ページのテンプレート構文が Vue の標準仕様に準拠したため、コンパイルエラーが解消されました。
- 全ての新規ページがブラウザで正常にレンダリングされます。
