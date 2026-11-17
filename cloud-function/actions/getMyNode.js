const { COLLECTIONS, publicNode } = require('../lib/db')

/** 我自己的节点 */
module.exports = async (ctx) => {
  const { treeId = 'christmas' } = ctx.payload
  const res = await ctx.db
    .collection(COLLECTIONS.NODES)
    .where({ treeId, openid: ctx.openid })
    .limit(1)
    .get()

  const doc = res.data && res.data[0]
  return doc ? publicNode(doc, ctx.openid) : null
}
