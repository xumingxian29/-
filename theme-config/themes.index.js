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
    const s = Date.parse(t.meta.startAt)
    const e = Date.parse(t.meta.endAt)
    return !Number.isNaN(s) && !Number.isNaN(e) && ts >= s && ts <= e
  })
  return hit || getTheme(DEFAULT_TREE_ID)
}

export default registry
