// 動物占い: 生年月日から12種類の動物キャラクターを判定する
//
// 動物占いは四柱推命の「日の干支（60種類の暦の組み合わせ）」を「十二運星」という
// 概念で12パターンに変換したものがベースになっている（本家はさらに10色×60パターン
// まで細分化されるが、そこまでの色の割り当てルールは確実な情報源が確認できなかった
// ため、ここでは12動物までを算出する）。
//
// 較正の根拠: 2000-01-01が「戊午」の日であることは複数の暦サイトで一致しており
// （干支は60日周期の連続した日数カウントのため、うるう年・うるう日があっても
// ズレは生じない）、これを基準にエポック日数からのオフセットを決定している。

export interface AnimalFortuneResult {
  animal: string
  emoji: string
  trait: string
}

const STAGE_ORDER = ['長生', '沐浴', '冠帯', '建禄', '帝旺', '衰', '病', '死', '墓', '絶', '胎', '養'] as const

const STAGE_TO_ANIMAL: Record<string, AnimalFortuneResult> = {
  '長生': { animal: '猿',      emoji: '🐵',    trait: '陽気でサービス精神旺盛、周りを楽しませるタイプ' },
  '沐浴': { animal: 'チーター', emoji: '🐆',    trait: '好奇心旺盛でフットワークが軽い行動派タイプ' },
  '冠帯': { animal: '黒ひょう', emoji: '🐈‍⬛', trait: 'クールで美意識が高く、独自のセンスを持つタイプ' },
  '建禄': { animal: 'ライオン', emoji: '🦁',    trait: 'プライドが高く統率力に優れたリーダータイプ' },
  '帝旺': { animal: '虎',      emoji: '🐯',    trait: '面倒見が良く、マイペースな野心家タイプ' },
  '衰':   { animal: 'たぬき',  emoji: '🦝',    trait: '堅実で人情に厚く、じっくり物事を進めるタイプ' },
  '病':   { animal: 'コアラ',  emoji: '🐨',    trait: 'マイペースな自由人で、のんびり屋タイプ' },
  '死':   { animal: 'ゾウ',    emoji: '🐘',    trait: '社交的で人脈作りが得意な世話好きタイプ' },
  '墓':   { animal: 'ひつじ',  emoji: '🐑',    trait: '協調性があり優しく、周囲に気を配るタイプ' },
  '絶':   { animal: 'ペガサス', emoji: '🦄',    trait: '独創的で自由奔放、ひらめきを大事にするタイプ' },
  '胎':   { animal: '狼',      emoji: '🐺',    trait: 'マイペースで自分の世界を大切にする一匹狼タイプ' },
  '養':   { animal: 'こじか',  emoji: '🦌',    trait: '協調性があり、常識と信頼を大事にするタイプ' },
}

// 十干（甲乙丙丁戊己庚辛壬癸）ごとの「長生」地支（子=0〜亥=11のインデックス）
const CHOUSEI_BRANCH_BY_STEM = [11, 6, 2, 9, 2, 9, 5, 0, 8, 3]

// エポック日数（1970-01-01 UTC起点）から日干支インデックス(0=甲子)を求めるためのオフセット。
// 2000-01-01（エポック日数10957）が戊午（干支インデックス54）になるよう較正した値
const GANSHI_EPOCH_OFFSET = 17

const DOB_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

// YYYY-MM-DD 形式の文字列から動物占い結果を算出する。不正な日付の場合はnullを返す
export const getAnimalFortune = (dob: string | undefined | null): AnimalFortuneResult | null => {
  if (!dob) return null
  const match = DOB_PATTERN.exec(dob)
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])

  // タイムゾーンによる日付ズレを避けるため、Dateのパースを介さずUTCの年月日から直接エポック日数を求める
  const utcMs = Date.UTC(year, month - 1, day)
  const roundTrip = new Date(utcMs)
  if (roundTrip.getUTCFullYear() !== year || roundTrip.getUTCMonth() !== month - 1 || roundTrip.getUTCDate() !== day) {
    return null // 2月30日などの不正な日付
  }

  const days = Math.floor(utcMs / 86400000)
  const ganshiIndex = ((days + GANSHI_EPOCH_OFFSET) % 60 + 60) % 60
  const stemIndex = ganshiIndex % 10
  const branchIndex = ganshiIndex % 12

  const chouseiBranch = CHOUSEI_BRANCH_BY_STEM[stemIndex]
  const isYang = stemIndex % 2 === 0
  const stageIndex = isYang
    ? (branchIndex - chouseiBranch + 12) % 12
    : (chouseiBranch - branchIndex + 12) % 12

  return STAGE_TO_ANIMAL[STAGE_ORDER[stageIndex]]
}
