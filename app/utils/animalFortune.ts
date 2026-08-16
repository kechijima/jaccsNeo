// 動物占い（簡易版）: 生年月日から12種類の動物キャラクターを判定する
// 本家の占いは60パターンの複雑な命数表を使うため、ここでは生年月日から
// 一意かつ再現性のある形で12動物のいずれかを導出する簡易ロジックを用いている

export interface AnimalFortuneResult {
  animal: string
  emoji: string
  trait: string
}

const ANIMALS: AnimalFortuneResult[] = [
  { animal: '狼',       emoji: '🐺', trait: 'マイペースで自分の世界を大切にする一匹狼タイプ' },
  { animal: 'こじか',   emoji: '🦌', trait: '協調性があり、常識と信頼を大事にするタイプ' },
  { animal: '猿',       emoji: '🐵', trait: '陽気でサービス精神旺盛、周りを楽しませるタイプ' },
  { animal: 'チーター',  emoji: '🐆', trait: '好奇心旺盛でフットワークが軽い行動派タイプ' },
  { animal: '黒ひょう',  emoji: '🐈‍⬛', trait: 'クールで美意識が高く、独自のセンスを持つタイプ' },
  { animal: 'ライオン',  emoji: '🦁', trait: 'プライドが高く統率力に優れたリーダータイプ' },
  { animal: '虎',       emoji: '🐯', trait: '面倒見が良く、マイペースな野心家タイプ' },
  { animal: 'たぬき',   emoji: '🦝', trait: '堅実で人情に厚く、じっくり物事を進めるタイプ' },
  { animal: 'コアラ',   emoji: '🐨', trait: 'マイペースな自由人で、のんびり屋タイプ' },
  { animal: 'ゾウ',     emoji: '🐘', trait: '社交的で人脈作りが得意な世話好きタイプ' },
  { animal: 'ひつじ',   emoji: '🐑', trait: '協調性があり優しく、周囲に気を配るタイプ' },
  { animal: 'ペガサス',  emoji: '🦄', trait: '独創的で自由奔放、ひらめきを大事にするタイプ' },
]

// YYYY-MM-DD 形式の文字列から動物占い結果を算出する。不正な日付の場合はnullを返す
export const getAnimalFortune = (dob: string | undefined | null): AnimalFortuneResult | null => {
  if (!dob) return null
  const date = new Date(`${dob}T00:00:00`)
  if (Number.isNaN(date.getTime())) return null

  const days = Math.floor(date.getTime() / 86400000)
  const index = ((days % ANIMALS.length) + ANIMALS.length) % ANIMALS.length
  return ANIMALS[index]
}
