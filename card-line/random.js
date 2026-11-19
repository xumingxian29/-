/**
 * 块 4 · 随机造型
 *
 * 目标：每次点"换一张"都得到不同的画面，但**同一颗 seed 必须画出完全相同的图**。
 * 分享链接里带的就是 seed，朋友点开看到的是同一张 —— 所以构图里绝不允许
 * 出现 Math.random()，全部走确定性 PRNG（mulberry32）。
 *
 * 组合维度：
 *   配色池 card.palettes   × 角色池 card.mascots   × 粒子（位置/形状/大小）
 * 10 个角色 × 8 套配色 × 粒子排布，够一个人点很久不重样。
 */

const SEED_MAX = 0xffffffff

/** mulberry32：32 位状态、无依赖、分布够用，最关键是确定性 */
export function createRng(seed) {
  let a = normalizeSeed(seed) >>> 0
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function normalizeSeed(seed) {
  const n = Math.floor(Number(seed))
  if (!Number.isFinite(n)) return 1
  const v = ((n % SEED_MAX) + SEED_MAX) % SEED_MAX
  return v === 0 ? 1 : v
}

/** seed → 短码。base36 最多 7 位，链接里不刺眼 */
export function encodeSeed(seed) {
  return normalizeSeed(seed).toString(36)
}

/**
 * 短码 → seed。任何不像短码的输入都返回 null，
 * 不抛错 —— 分享参数是外部输入，绝不能让它把页面弄白屏。
 */
export function decodeSeed(code) {
  if (typeof code !== 'string') return null
  const raw = code.trim().toLowerCase()
  if (!/^[0-9a-z]{1,7}$/.test(raw)) return null
  const n = parseInt(raw, 36)
  if (!Number.isFinite(n) || n <= 0 || n > SEED_MAX) return null
  return n
}

/** 取一颗新种子。只有这里允许用 Math.random */
export function randomSeed(rand) {
  const r = typeof rand === 'function' ? rand : Math.random
  return Math.floor(r() * (SEED_MAX - 1)) + 1
}

/** 画布上的禁区：主图形区和白卡区，粒子和文字不能压上去 */
function inMotifZone(x, y) {
  return x > 0.16 && x < 0.84 && y > 0.18 && y < 0.52
}
function inPaperZone(x, y) {
  return y > 0.63 && y < 0.94
}

const KINDS = ['dot', 'star', 'snow']

/**
 * 生成装饰粒子。位置用比例坐标，渲染时再乘画布尺寸。
 * @returns {Array<{x:number,y:number,r:number,kind:string,alpha:number}>}
 */
function makeParticles(rng, count) {
  const out = []
  let guard = 0
  while (out.length < count && guard < count * 12) {
    guard++
    const x = 0.04 + rng() * 0.92
    const y = 0.03 + rng() * 0.9
    if (inMotifZone(x, y) || inPaperZone(x, y)) continue
    out.push({
      x,
      y,
      r: 2.4 + rng() * 3.4,
      kind: KINDS[Math.floor(rng() * KINDS.length)],
      alpha: 0.45 + rng() * 0.45
    })
  }
  return out
}

/**
 * 造一张"画稿"：这份对象直接就能当 render 的 template 用
 *
 * @param {number} seed
 * @param {Object} card theme.card
 * @returns {Object} 含 bg/ink/white/accent/accent2/blush/deco/motif/particles/tag/name/seed/id
 */
export function buildArtwork(seed, card) {
  const palettes = (card && card.palettes) || []
  const mascots = (card && card.mascots) || []
  if (!palettes.length || !mascots.length) {
    throw new Error('随机造型需要 theme.card.palettes 与 theme.card.mascots')
  }

  const s = normalizeSeed(seed)
  const rng = createRng(s)

  const palette = palettes[Math.floor(rng() * palettes.length)]

  // 只从"适配当前背景明度"的角色里抽：
  // 白背景配白雪人 / 深背景配深企鹅，都会糊成一团
  const fits = mascots.filter((m) => m.fit === 'any' || m.fit === palette.bgTone)
  const pool = fits.length ? fits : mascots
  const mascot = pool[Math.floor(rng() * pool.length)]

  // 粒子数量也随机，但给个下限，不然会空得像没画完
  const particleCount = 10 + Math.floor(rng() * 6)
  const particles = makeParticles(rng, particleCount)

  // 文字色跟背景明度走：浅背景还写白字等于没写
  const textSet = (card && card.text) || {}
  const text = textSet[palette.bgTone === 'dark' ? 'onDark' : 'onLight'] || null

  return {
    seed: s,
    id: 'r' + encodeSeed(s),
    name: mascot.name,
    motif: mascot.id,
    tag: mascot.tag || mascot.name,
    bg: palette.bg,
    bgTone: palette.bgTone,
    ink: palette.ink,
    white: palette.white,
    accent: palette.accent,
    accent2: palette.accent2,
    blush: palette.blush,
    deco: palette.deco,
    text,
    particles,
    paletteId: palette.id
  }
}

/** 换一张：在旧 seed 上跳一大步，保证肉眼可见地不同 */
export function nextSeed(seed) {
  return normalizeSeed(normalizeSeed(seed) * 1103515245 + 12345)
}
