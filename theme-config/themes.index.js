/**
 * 主题注册表与选择规则
 * 优先级：FORCED_THEME_ID > 日期匹配 > 默认主题
 */

import christmas from './christmas'
import newyear from './newyear'
import { FORCED_THEME_ID, DEFAULT_TREE_ID } from '@/core/env'

const registry = {
  [christmas.id]: christmas,
  [newyear.id]: newyear
}

export function getTheme(id) {
  return registry[id] || registry[DEFAULT_TREE_ID] || christmas
}

export function listThemes() {
  return Object.values(registry)
}

/**
 * 按本地时区解析 'YYYY-MM-DD'
 *
 * 不能用 Date.parse('2026-12-01')：它按 UTC 零点算，东八区要到当天 08:00 才生效，
 * 相当于主题窗口整体错位 8 小时。这里显式按本地时间构造。
 * @param {string} s
 * @param {boolean} endOfDay true 则取当天 23:59:59.999
 * @returns {number} 时间戳，非法返回 NaN
 */
function parseLocalDate(s, endOfDay) {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(String(s || ''))
  if (!m) return NaN
  const d = endOfDay
    ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 23, 59, 59, 999)
    : new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 0, 0, 0, 0)
  return d.getTime()
}

/**
 * 解析当前应使用的主题
 * @param {{forcedId?:string, date?:Date, treeId?:string}} [opts]
 */
export function resolveTheme(opts = {}) {
  const forced = opts.forcedId || FORCED_THEME_ID
  if (forced && registry[forced]) return registry[forced]

  if (opts.treeId && registry[opts.treeId]) return registry[opts.treeId]

  const now = opts.date || new Date()
  const ts = now.getTime()
  const hit = listThemes().find((t) => {
    const s = parseLocalDate(t.meta.startAt, false)
    const e = parseLocalDate(t.meta.endAt, true)
    return !Number.isNaN(s) && !Number.isNaN(e) && ts >= s && ts <= e
  })
  return hit || getTheme(DEFAULT_TREE_ID)
}

export default registry
