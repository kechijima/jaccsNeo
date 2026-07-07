// kintoneのログインメールアドレス → 担当未来設計士の表示名 変換マップ
export const FP_EMAIL_TO_NAME: Record<string, string> = {
  'alljapanekiden@gmail.com': '西島伸樹',
  'hyodol012@gmail.com':      '兵頭将宏',
  'yh19880804@gmail.com':     '服部純元',
  'inokoshi@reterace.com':    '猪腰健治',
}

export const resolveFpName = (raw: string): string => FP_EMAIL_TO_NAME[raw] ?? raw
