/**
 * 块 7 · 选择状态
 *
 * 只存两个字段：选了哪个模板、选了第几句祝福。
 * 任何外部输入（storage、分享参数）进来都要过 normalize ——
 * 模板被删掉、索引越界、存储被塞了脏数据，都回退到默认值，绝不抛错白屏。
 */

import { CARD_STORAGE_KEY } from './config'

/** 默认状态 */
export function createState(card) {
  const first = (card && card.templates && card.templates[0]) || null
  return { templateId: first ? first.id : '', presetIndex: 0 }
}

/**
 * 把任意输入收敛成合法状态
 * @param {Object} card theme.card
 * @param {Object} raw 可能来自 storage / 分享参数 / 用户手改
 */
export function normalizeState(card, raw) {
  const base = createState(card)
  const templates = (card && card.templates) || []
  const presets = (card && card.presets) || []
  const src = raw && typeof raw === 'object' ? raw : {}

  const templateId = templates.some((t) => t.id === src.templateId)
    ? src.templateId
    : base.templateId

  let presetIndex = Number(src.presetIndex)
  if (!Number.isInteger(presetIndex) || presetIndex < 0 || presetIndex >= presets.length) {
    presetIndex = 0
  }

  return { templateId, presetIndex }
}

/** 切换模板 */
export function selectTemplate(state, card, templateId) {
  const next = normalizeState(card, { ...state, templateId })
  return next
}

/** 切换祝福语 */
export function selectPreset(state, card, index) {
  const next = normalizeState(card, { ...state, presetIndex: index })
  return next
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

/** 取当前选中的模板对象与祝福语 */
export function resolveSelection(state, card) {
  const templates = (card && card.templates) || []
  const presets = (card && card.presets) || []
  const template = templates.find((t) => t.id === state.templateId) || templates[0] || null
  const wish = presets[state.presetIndex] || presets[0] || ''
  return { template, wish }
}
