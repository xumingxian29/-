/**
 * 排序算法（与前端 rank-slots/rank.js 同源）
 * 改动时两边必须同步，否则海报名次与榜单不一致。
 * scripts/test-cloud.js 会在同一组数据上比对两边结果。
 *
 * 2026-11 修复：
 *   1. 排序不再依赖 score 字段（原来 primary*1000+secondary，计数过千就串味）
 *   2. 直接按真实计数比较：主维度降序 → 次维度降序 → createdAt 升序
 */

const PRIMARY = { invite: 'inviteCount', bless: 'blessCount' }
const SECONDARY = { invite: 'blessCount', bless: 'inviteCount' }

/** 排序模式归一化，非法值回落 invite */
exports.sortModeOf = (themeRules) => {
  const mode = themeRules && themeRules.sortMode
  return mode === 'bless' || mode === 'display' ? mode : 'invite'
}

/**
 * 比较器（纯函数，无上限问题）
 * @returns {number} 负数 = a 在前
 */
exports.compareNodes = (a, b, sortMode = 'invite') => {
  if (sortMode === 'display') return (a.createdAt || 0) - (b.createdAt || 0)

  const main = PRIMARY[sortMode] || 'inviteCount'
  const sub = SECONDARY[sortMode] || 'blessCount'
  const d = (b[main] || 0) - (a[main] || 0)
  if (d) return d
  const s = (b[sub] || 0) - (a[sub] || 0)
  if (s) return s
  return (a.createdAt || 0) - (b.createdAt || 0)
}

/**
 * ⚠️ 兼容字段，不要用它排序
 * score 写进 nodes 文档只是为了老数据和后台排查，排序已改为按真实计数。
 * 次维度超过 999 时会饱和，因此它只能当"大致排位"看。
 */
exports.computeScore = (node, sortMode = 'invite') => {
  const bless = node.blessCount || 0
  const invite = node.inviteCount || 0
  if (sortMode === 'display') return 0
  if (sortMode === 'bless') return bless * 1000 + Math.min(invite, 999)
  return invite * 1000 + Math.min(bless, 999)
}
