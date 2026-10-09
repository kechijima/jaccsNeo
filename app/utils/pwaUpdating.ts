// PWAの更新ボタン押下によるリロードであることを、リロード前後で引き継ぐための
// 目印。通常のsessionStorageへの読み書きのため、確実に失敗しうる前提で
// 呼び出し側は必ずtry/catchで囲むこと（プライベートブラウジング等）
export const PWA_UPDATING_KEY = 'jaccsneo:pwaUpdating'
