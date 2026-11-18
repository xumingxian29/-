/**
 * 主题的排序口径（服务端为准）
 *
 * 为什么单独抽出来：
 *   之前 joinTree 写 score、blessNode 读 node.sortMode，但 nodes 文档里
 *   从来没有 sortMode 字段，于是永远回落到 'invite'——春节切 bless 榜
 *   时 score 仍是邀请口径，榜单直接排错。
 *
 * 现在唯一真相是 configs/app.themes[treeId].sortMode，读取带 60s 内存缓存。
 * 没有配置时按 'invite'（与历史行为一致）。
 */

const CACHE_TTL = 60 * 1000
const cache = {}

const VALID = ['invite', 'bless', 'display']

/**
 * @param {Object} ctx 至少含 ctx.db
 * @param {string} treeId
 * @returns {Promise<'invite'|'bless'|'display'>}
 */
exports.getSortMode = async (ctx, treeId) => {
  const key = String(treeId || 'christmas')
  const now = Date.now()
  const hit = cache[key]
  if (hit && hit.expireAt > now) return hit.mode

  let mode = 'invite'
  try {
    const res = await ctx.db.collection('configs').doc('app').get()
    const themes = (res.data && res.data.themes) || {}
    const raw = themes[key] && themes[key].sortMode
    if (VALID.indexOf(raw) > -1) mode = raw
  } catch (e) {
    // 配置不存在 / 读失败：沿用历史默认，不阻断业务
  }

  cache[key] = { mode, expireAt: now + CACHE_TTL }
  return mode
}

/** 自测用：清缓存 */
exports.clearCache = () => {
  Object.keys(cache).forEach((k) => delete cache[k])
}
