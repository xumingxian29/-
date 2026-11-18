const { COLLECTIONS, publicNode } = require('../lib/db')
const theme = require('../lib/theme')
const L = require('../lib/limits')

/** 排序维度 → 实际计数字段 */
const SORT_FIELD = { invite: 'inviteCount', bless: 'blessCount' }

/**
 * 榜单 / 整棵树
 *
 * 需要的索引（云开发控制台手建）：
 *   nodes(treeId, wishStatus, inviteCount desc, createdAt asc)
 *   nodes(treeId, wishStatus, blessCount  desc, createdAt asc)
 *   nodes(treeId, wishStatus, createdAt asc)          // display 模式
 *
 * 2026-11 修复：
 *   1. 排序真正按 sort 生效（原来 sort 参数解构出来却没用，一律按 score desc）
 *   2. 排序口径由服务端主题配置决定，客户端传的 sort 一律忽略
 *   3. myRank 与排序口径对齐（display 模式按 createdAt 算，原来仍按 score）
 */
module.exports = async (ctx) => {
  const { treeId = 'christmas', page = 1, size = L.PAGE_SIZE } = ctx.payload

  const sortMode = await theme.getSortMode(ctx, treeId)
  const limit = Math.min(L.PAGE_SIZE_MAX, Math.max(1, Number(size) || L.PAGE_SIZE))
  const skip = Math.max(0, ((Number(page) || 1) - 1) * limit)

  const coll = ctx.db.collection(COLLECTIONS.NODES)
  const base = () => coll.where({ treeId, wishStatus: 1 })

  let query
  if (sortMode === 'display') {
    query = base().orderBy('createdAt', 'asc')
  } else {
    const field = SORT_FIELD[sortMode] || 'inviteCount'
    query = base().orderBy(field, 'desc').orderBy('createdAt', 'asc')
  }

  const [listRes, totalRes] = await Promise.all([
    query.skip(skip).limit(limit).get(),
    base().count()
  ])

  const hideInvite = sortMode !== 'invite'
  const list = (listRes.data || []).map((doc) =>
    publicNode(doc, ctx.openid, { hideInvite })
  )

  // 我的名次：与当前排序口径一致
  let myRank = null
  const myRes = await coll.where({ treeId, openid: ctx.openid }).limit(1).get()
  const mine = myRes.data && myRes.data[0]
  if (mine) {
    let higher
    if (sortMode === 'display') {
      higher = await coll
        .where({ treeId, wishStatus: 1, createdAt: ctx._.lt(mine.createdAt || 0) })
        .count()
    } else {
      const field = SORT_FIELD[sortMode] || 'inviteCount'
      higher = await coll
        .where({ treeId, wishStatus: 1, [field]: ctx._.gt(mine[field] || 0) })
        .count()
    }
    myRank = ((higher && higher.total) || 0) + 1
  }

  return {
    list,
    total: totalRes.total || 0,
    myRank,
    hasMore: skip + list.length < (totalRes.total || 0)
  }
}
