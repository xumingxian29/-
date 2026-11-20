/**
 * 块 7 · 选择状态
 *
 * 三颗种子各管一件事，这是整条线最容易被改坏的地方：
 *   seed      —— 画面（配色 × 角色 × 粒子）
 *   wishSeed  —— 祝福语
 *   presetIndex —— 用户点「换一句」钉住的那句（null = 没钉，跟着 wishSeed 走）
 *
 * 为什么祝福语要单独一颗 wishSeed，而不是继续挂在 seed 上：
 *   挂在 seed 上时，"换一张"必然连祝福语一起换。可用户的心理模型是
 *   「画面归画面，文案归文案」—— 喜欢这句话、只想换张画，是极常见的动作。
 *   拆成两颗后：换画面不碰 wishSeed，换句子不碰 seed，两个方向都干净。
 *
 * 兼容旧链接：老链接只有 s，没有 ws。此时 wishSeed 缺省等于 seed，
 * 而 pickWishIndex 内部还有自己的盐值，算出来和旧版一模一样 ——
 * 已经发出去的链接不会突然换一句话。
 *
 * 任何外部输入（storage、分享参数）进来都要过 normalize ——
 * seed 不像短码、索引越界、存储被塞了脏数据，都回退到默认值，绝不抛错白屏。
 */

import { CARD_STORAGE_KEY } from './config'
import { buildArtwork, normalizeSeed, pickWishIndex, randomSeed } from './random'
import { clampName, sanitizeText } from './safety'

/**
 * 默认状态。传 seed 时用它开局（测试与分享入口需要确定性）
 *
 * wishSeed 缺省跟 seed 走：一是兼容旧链接，二是初次进入时
 * "画面和文案都由同一颗种子决定"读起来最自然，分享一次能复现两样。
 *
 * toName / fromName 用 null 而不是 '' 表示"没填"：
 *   绘制层要区分"没填"（不画称呼行）和"填了空"（也不画，但语义不同），
 *   后续做"填了又删掉"的交互时，null 和 '' 的差别会立刻显出来。
 */
export function createState(card, seed, wishSeed) {
  const artSeed = normalizeSeed(seed == null ? randomSeed() : seed)
  return {
    seed: artSeed,
    wishSeed: wishSeed == null ? artSeed : normalizeSeed(wishSeed),
    presetIndex: null,
    toName: null,
    fromName: null
  }
}

/**
 * 把任意输入收敛成合法状态
 * @param {Object} card theme.card
 * @param {Object} raw 可能来自 storage / 分享参数 / 用户手改
 */
export function normalizeState(card, raw) {
  const presets = (card && card.presets) || []
  const src = raw && typeof raw === 'object' ? raw : {}

  // seed 非法就现取一颗 —— 不能让"参数坏了"变成"页面空白"
  const n = Math.floor(Number(src.seed))
  const seed = Number.isFinite(n) && n > 0 ? normalizeSeed(n) : randomSeed()

  // 祝福语种子缺省 = seed，旧链接与旧存储靠这一条保持原样
  const w = Math.floor(Number(src.wishSeed))
  const wishSeed = Number.isFinite(w) && w > 0 ? normalizeSeed(w) : seed

  // null / undefined / 空串 / 越界 一律回到"跟 wishSeed 随机"
  let presetIndex = null
  if (src.presetIndex !== null && src.presetIndex !== undefined && src.presetIndex !== '') {
    const idx = Number(src.presetIndex)
    if (Number.isInteger(idx) && idx >= 0 && idx < presets.length) presetIndex = idx
  }

  return {
    seed,
    wishSeed,
    presetIndex,
    toName: clampName(src.toName),
    fromName: clampName(src.fromName)
  }
}

/**
 * 换一张：只换画面
 *
 * 这里**不动** wishSeed，也不动 presetIndex：
 * 用户说"换卡片的时候不换祝福语"，那就一个字都不能碰文案。
 * 想换句子有「换一句」，两个按钮各管一件事，不会互相牵连。
 */
export function reroll(state) {
  return { ...state, seed: randomSeed() }
}


/**
 * 这一张实际用的是第几句祝福
 *
 * 钉住过就用钉住的那句，否则由 **wishSeed** 决定 —— 注意不是 seed。
 * 所有"图上写什么"的地方都必须走这里，不能各算各的。
 */
export function resolveWishIndex(state, card) {
  const presets = (card && card.presets) || []
  if (!presets.length) return 0
  const pinned = state && state.presetIndex
  if (Number.isInteger(pinned) && pinned >= 0 && pinned < presets.length) return pinned
  const wishSeed = state && state.wishSeed != null ? state.wishSeed : state && state.seed
  return pickWishIndex(wishSeed, presets.length)
}

/** 切换祝福语（指定第几句） */
export function selectPreset(state, card, index) {
  return normalizeState(card, { ...state, presetIndex: index })
}

/**
 * 「换一句」：换一句**一定不同**的，画面完全不动
 *
 * 随机步长而不是固定 +1：固定 +1 连点两次会回到原句，
 * 用户会以为按钮坏了。步长取 1..n-1，保证 (cur + step) % n !== cur。
 */
export function nextWish(state, card, rand) {
  const presets = (card && card.presets) || []
  const n = presets.length
  if (n <= 1) return { ...state, presetIndex: n ? 0 : null }

  const cur = resolveWishIndex(state, card)
  const r = typeof rand === 'function' ? rand : Math.random
  const step = 1 + Math.floor(r() * (n - 1))
  const idx = (cur + step) % n
  return { ...state, presetIndex: idx >= 0 ? idx : 0 }
}

/** 读本地记忆；读不到或坏了都返回默认值 */
export function loadState(card) {
  try {
    const raw = typeof uni !== 'undefined' && uni.getStorageSync
      ? uni.getStorageSync(CARD_STORAGE_KEY)
      : ''
    if (raw) {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
      return normalizeState(card, parsed)
    }
  } catch (e) {
    /* 存储不可用（隐私模式等）就当没记忆 */
  }
  return createState(card)
}

/**
 * 写本地记忆；写失败不影响主流程
 *
 * 名字**不落盘**：手机借人、二手机、共享电脑，存储里的真名是真实风险，
 * 而它只值"少打一次字"。所以落盘前把 toName / fromName 摘掉，
 * 下次进来是匿名态，填过的人自己会再填一次。
 */
export function saveState(state) {
  try {
    if (typeof uni !== 'undefined' && uni.setStorageSync) {
      const { toName, fromName, ...rest } = state || {}
      uni.setStorageSync(CARD_STORAGE_KEY, JSON.stringify(rest))
    }
  } catch (e) {
    /* 忽略 */
  }
}

/**
 * 把模板里的 {name} 换成真名
 * 用 split/join 而不是 replace：replace 只换第一个，且会被名字里的 $ 影响
 */
function fillName(tpl, name) {
  return String(tpl || '').split('{name}').join(name)
}

/**
 * 把状态解析成"这次要画的东西"
 *
 * 文案在这里过一遍内容安全闸：卡片上的字是要被转到群里的，
 * 一旦带人名地名就收不回来，所以出图前必须扫。
 *
 * 名字的规则（本功能的核心约定）：
 *   没填收卡人 → 白卡第一行不画
 *   填了收卡人 → "致 小明"
 *   没填署名   → 落款"送给你的贺卡"（匿名，但不写"匿名"二字）
 *   填了署名   → 落款"阿花送你的贺卡"
 * 模板串放在 theme.card.copy 里，改文案不用动代码。
 *
 * @returns {{template:Object, art:Object, wish:string, wishIndex:number,
 *            greeting:string, footer:string, toName:string|null, fromName:string|null}}
 */
export function resolveSelection(state, card) {
  const presets = (card && card.presets) || []
  const copy = (card && card.copy) || {}
  const art = buildArtwork(state.seed, card)

  const idx = resolveWishIndex(state, card)
  const raw = presets[idx] || presets[0] || ''
  const fallback = copy.heroTitle || '圣诞快乐'
  const safe = sanitizeText(raw, fallback)

  const toName = clampName(state && state.toName)
  const fromName = clampName(state && state.fromName)

  const greeting = toName ? fillName(copy.toTemplate || '致 {name}', toName) : ''
  const footer = fromName
    ? fillName(copy.signTemplate || '{name}送你的贺卡', fromName)
    : copy.signAnon || '送给你的贺卡'

  // template 与 art 是同一个对象：render 侧沿用 spec.template 的命名
  return {
    template: art,
    art,
    wish: safe.text,
    wishIndex: idx,
    greeting,
    footer,
    toName,
    fromName
  }
}
