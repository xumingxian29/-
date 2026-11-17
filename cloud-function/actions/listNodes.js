const { COLLECTIONS, publicNode } = require('../lib/db')

/**
 * 榜单 / 整棵树
 * 依赖索引：nodes(treeId, wishStatus, score desc, createdAt asc)
 */
module.exports = async (ctx) => {
  const { treeId = 'christmas', sort = 'invite', page = 1, size = 30 } = ctx.payload
  const skip = Math.max(0, (page - 1) * size)
  const limit = Math.min(100, Math.max(1, size))

  const coll = ctx.db.collection(COLLECTIONS.NODES)
  let query = coll.where({ treeId, wishStatus: 1 })

  if (sort === 'display') {
    query = query.orderBy('createdAt', 'asc')
  } else {
    query = query.orderBy('score', 'desc').orderBy('createdAt', 'asc')
  }

  const [listRes, totalRes] = await Promise.all([
    query.skip(skip).limit(limit).get(),
    coll.where({ treeId, wishStatus: 1 }).count()
  ])

  const list = (listRes.data || []).map((doc) => publicNode(doc, ctx.openid))

  // 我的名次：统计分数比我高的人数 + 1
  let myRank = null
  const myRes = await coll.where({ treeId, openid: ctx.openid }).limit(1).get()
  const mine = myRes.data && myRes.data[0]
  if (mine) {
    const higher = await coll
      .where({ treeId, wishStatus: 1, score: ctx._.gt(mine.score || 0) })
      .count()
    myRank = (higher.total || 0) + 1
  }

  return {
    list,
    total: totalRes.total || 0,
    myRank,
    hasMore: skip + list.length < totalRes.total
  }
}
