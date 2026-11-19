/**
 * 块 7 · 选择状态
 *
 * 只存两个字段：这张画用的 seed、选了第几句祝福。
 * 任何外部输入（storage、分享参数）进来都要过 normalize ——
 * seed 不像短码、索引越界、存储被塞了脏数据，都回退到默认值，绝不抛错白屏。
 *
 * 为什么状态里存 seed 而不是"模板 id"：
 *   模板只有 3 套，用户两天就看腻了；seed 能放出上亿张，而且
 *   同一颗 seed 在任何设备上都能复现同一张图，分享才有意义。
 */

import { CARD_STORAGE_KEY } from './config'
import { buildArtwork, normalizeSeed, randomSeed } from './random'
import { sanitizeText } from './safety'

/** 默认状态。传 seed 时用它开局（测试与分享入口需要确定性） */
export function createState(card, seed) {
  return { seed: normalizeSeed(seed == null ? randomSeed() : seed), presetIndex: 0 }
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

  let presetIndex = Number(src.presetIndex)
  if (!Number.isInteger(presetIndex) || presetIndex < 0 || presetIndex >= presets.length) {
    presetIndex = 0
  }

  return { seed, presetIndex }
}

/** 换一张：直接换一颗新种子，画面必然不同 */
export function reroll(state) {
  return { ...state, seed: randomSeed() }
}

/** 切换祝福语 */
export function selectPreset(state, card, index) {
  return normalizeState(card, { ...state, presetIndex: index })
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

/** 写本地记忆；写失败不影响主流程 */
export function saveState(state) {
  try {
    if (typeof uni !== 'undefined' && uni.setStorageSync) {
      uni.setStorageSync(CARD_STORAGE_KEY, JSON.stringify(state))
    }
  } catch (e) {
    /* 忽略 */
  }
}

/**
 * 把状态解析成"这次要画的东西"
 *
 * 文案在这里过一遍内容安全闸：卡片上的字是要被转到群里的，
 * 一旦带人名地名就收不回来，所以出图前必须扫。
 *
 * @returns {{template:Object, art:Object, wish:string}}
 */
export function resolveSelection(state, card) {
  const presets = (card && card.presets) || []
  const art = buildArtwork(state.seed, card)

  const raw = presets[state.presetIndex] || presets[0] || ''
  const fallback = (card && card.copy && card.copy.heroTitle) || '圣诞快乐'
  const safe = sanitizeText(raw, fallback)

  // template 与 art 是同一个对象：render 侧沿用 spec.template 的命名
  return { template: art, art, wish: safe.text }
}
