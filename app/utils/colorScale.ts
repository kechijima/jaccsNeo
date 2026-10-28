// ユーザーが選択した1色（メインカラー）から、Tailwindのprimaryカラースケール
// （50〜950の11段階）を生成する。既存のブランドカラー #00AFCC から手動で
// 作られていたスケール（main.css参照）のHSL値を分析し、各段階の「明度の
// ベース(600)からの差分」「彩度のベース(600)に対する比率」を抽出して、
// 同じ形のスケールを任意の色相でも再現できるようにしている。

type RGB = { r: number; g: number; b: number }
type HSL = { h: number; s: number; l: number }

const STOPS = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'] as const
export type ColorStop = (typeof STOPS)[number]

// 各段階の、600を基準とした明度(L)の差分・彩度(S)の比率
// （ブランドカラー#00AFCCで作られた既存スケールの値から逆算したもの）
const LIGHTNESS_DELTA: Record<ColorStop, number> = {
  '50': 56.86, '100': 52.94, '200': 45.1, '300': 33.92, '400': 20, '500': 10,
  '600': 0,
  '700': -10, '800': -18.04, '900': -23.92, '950': -30,
}
const SATURATION_RATIO: Record<ColorStop, number> = {
  '50': 0.619, '100': 0.662, '200': 0.738, '300': 0.789, '400': 0.8825, '500': 0.936,
  '600': 1,
  '700': 0.935, '800': 0.893, '900': 0.856, '950': 0.804,
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

const hexToRgb = (hex: string): RGB | null => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return null
  const n = parseInt(m[1], 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

const rgbToHsl = ({ r, g, b }: RGB): HSL => {
  const rn = r / 255, gn = g / 255, bn = b / 255
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  if (max === min) return { h: 0, s: 0, l: l * 100 }
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h: number
  switch (max) {
    case rn: h = ((gn - bn) / d + (gn < bn ? 6 : 0)); break
    case gn: h = (bn - rn) / d + 2; break
    default:  h = (rn - gn) / d + 4
  }
  return { h: h * 60, s: s * 100, l: l * 100 }
}

const hslToRgb = ({ h, s, l }: HSL): RGB => {
  const sn = s / 100, ln = l / 100
  if (sn === 0) {
    const v = Math.round(ln * 255)
    return { r: v, g: v, b: v }
  }
  const q = ln < 0.5 ? ln * (1 + sn) : ln + sn - ln * sn
  const p = 2 * ln - q
  const hk = h / 360
  const toChannel = (t: number) => {
    let tt = t
    if (tt < 0) tt += 1
    if (tt > 1) tt -= 1
    if (tt < 1 / 6) return p + (q - p) * 6 * tt
    if (tt < 1 / 2) return q
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6
    return p
  }
  return {
    r: Math.round(toChannel(hk + 1 / 3) * 255),
    g: Math.round(toChannel(hk) * 255),
    b: Math.round(toChannel(hk - 1 / 3) * 255),
  }
}

// 戻り値は main.css の --color-primary-* と同じ "R G B" 形式の文字列
export const generatePrimaryScale = (hex: string): Record<ColorStop, string> | null => {
  const rgb = hexToRgb(hex)
  if (!rgb) return null
  const base = rgbToHsl(rgb)

  const result = {} as Record<ColorStop, string>
  for (const stop of STOPS) {
    const l = clamp(base.l + LIGHTNESS_DELTA[stop], 0, 100)
    const s = clamp(base.s * SATURATION_RATIO[stop], 0, 100)
    const { r, g, b } = hslToRgb({ h: base.h, s, l })
    result[stop] = `${r} ${g} ${b}`
  }
  return result
}
