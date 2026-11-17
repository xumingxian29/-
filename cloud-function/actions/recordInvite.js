const { COLLECTIONS } = require('../lib/db')
const { computeScore } = require('../lib/rank')

/** 记录一次邀请（同一个 openid 只记一次） */
module.exports = async (ctx) => {
  const { nodeId, treeId = 'christmas' } = ctx.payload
  if (!nodeId) return { inviteCount: 0 }
  if (nodeId === ctx.payload.inviter && nodeId === ctx.openid) return { inviteCount: 0 }

  const coll = ctx.db.collection(COLLECTIONS.NODES)
  let node
  try {
    const res = await coll.doc(nodeId).get()
    node = res.data
  } catch (e) {
    return { inviteCount: 0 }
  }
  if (!node) return { inviteCount: 0 }
  if (node.openid === ctx.openid) return { inviteCount: node.inviteCount || 0 }

  const logs = ctx.db.collection(COLLECTIONS.INVITE_LOGS)
  const dup = await logs.where({ nodeId, openid: ctx.openid }).limit(1).get()
  if (dup.data && dup.data.length) {
    return { inviteCount: node.inviteCount || 0 }
  }

  await logs.add({ data: { nodeId, openid: ctx.openid, treeId, createdAt: Date.now() } })

  const nextInvite = (node.inviteCount || 0) + 1
  await coll.doc(nodeId).update({
    data: {
      inviteCount: ctx._.inc(1),
      score: computeScore(
        { blessCount: node.blessCount || 0, inviteCount: nextInvite },
        node.sortMode || 'invite'
      )
    }
  })

  return { inviteCount: nextInvite }
}
