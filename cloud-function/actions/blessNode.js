const { COLLECTIONS } = require('../lib/db')
const { computeScore } = require('../lib/rank')
const guard = require('../lib/guard')

/** 送祝福：同一个人对同一节点只记一次；每日有上限 */
module.exports = async (ctx) => {
  const { nodeId, treeId = 'christmas' } = ctx.payload
  if (!nodeId) {
    const e = new Error('缺少 nodeId')
    e.code = 4001
    throw e
  }

  const coll = ctx.db.collection(COLLECTIONS.NODES)
  let node
  try {
    const res = await coll.doc(nodeId).get()
    node = res.data
  } catch (e) {
    node = null
  }
  if (!node) {
    const e = new Error('这个位置已经空了')
    e.code = 4004
    throw e
  }

  // 不能给自己刷祝福
  if (node.openid === ctx.openid) {
    return { blessCount: node.blessCount || 0, already: true }
  }

  const logs = ctx.db.collection(COLLECTIONS.BLESS_LOGS)
  const dup = await logs.where({ nodeId, openid: ctx.openid }).limit(1).get()
  if (dup.data && dup.data.length) {
    return { blessCount: node.blessCount || 0, already: true }
  }

  const allowed = await guard.checkDailyLimit(ctx, 'bless', 20)
  if (!allowed) {
    const e = new Error('今天祝福得有点多啦，明天再来')
    e.code = 4003
    throw e
  }

  await logs.add({ data: { nodeId, openid: ctx.openid, treeId, createdAt: Date.now() } })

  const nextBless = (node.blessCount || 0) + 1
  await coll.doc(nodeId).update({
    data: {
      blessCount: ctx._.inc(1),
      score: computeScore(
        { blessCount: nextBless, inviteCount: node.inviteCount || 0 },
        node.sortMode || 'invite'
      )
    }
  })

  return { blessCount: nextBless, already: false }
}
