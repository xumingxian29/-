/**
 * 块 2 · 配置解析
 *
 * 贺卡视觉全部来自 theme.card 段。当前主题没有 card 段时（例如新年主题）
 * 回退到 christmas.card，页面与绘制层都不用改。
 */

import { resolveTheme, getTheme } from '@/themes'
import { DEFAULT_TREE_ID } from '@/core/env'

/**
 * @param {Object} [theme] 已解析的主题；不传则按日期规则现算
 * @returns {{theme:Object, card:Object, fallback:boolean}}
 */
export function pickCardTheme(theme) {
  const current = theme || resolveTheme()
  if (current && current.card) {
    return { theme: current, card: current.card, fallback: false }
  }
  const fallbackTheme = getTheme(DEFAULT_TREE_ID)
  return { theme: fallbackTheme, card: fallbackTheme.card, fallback: true }
}

/** 取某个角色配置，找不到返回 null（不能回退到第一个，否则会画错风格） */
export function findMascot(card, mascotId) {
  const list = (card && card.mascots) || []
  if (!list.length) return null
  return list.find((m) => m.id === mascotId) || null
}

/** 配色数量与角色数量：随机空间大小，给页面做"能抽多少张"的提示 */
export function styleSpaceSize(card) {
  const p = ((card && card.palettes) || []).length
  const m = ((card && card.mascots) || []).length
  return p * m
}
