const { COLLECTIONS } = require('../lib/db')

/** 读取树种元信息与总人数 */
module.exports = async (ctx) => {
  const treeId = ctx.payload.treeId || 'christmas'

  const countRes = await ctx.db
    .collection(COLLECTIONS.NODES)
    .where({ treeId, wishStatus: 1 })
    .count()

  return {
    id: treeId,
    themeId: treeId,
    title: '',
    total: countRes.total || 0
  }
}
