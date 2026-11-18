const { COLLECTIONS } = require('../lib/db')
const { computeScore } = require('../lib/rank')
const guard = require('../lib/guard')
const theme = require('../lib/theme')
const L = require('../lib/limits')

function fail(code, message) {
  const e = new Error(message)
  e.code = code
  return e
}

/** 祝福日志的确定性主键：同一 (node, 身份) 只可能有一条 */
function blessLogId(nodeId, openid) {
  return String(`${nodeId}__${openid}`)
    .replace(/[^\w-]/g, '')
    .slice(0, 120)
}

/**
 * 送祝福：同一身份对同一节点只记一次；每日有上限
 *
 * 2026-11 修复：
 *   1. 去重从"先查再写"改为"确定性 _id + 唯一约束"，并发下不会双计
 *   2. 更新后用 inc 再回读，返回的 blessCount 一定等于库里的值
 *   3. sortMode 改为读树配置（原来读 node.sortMode，但该字段从不存在）
 *   4. 给自己送祝福明确报错，不再伪装成"已送过"
 */
module.exports = async (ctx) => {
  const { nodeId, treeId = 'christmas' } = ctx.payload
  if (!nodeId) throw fail(4001, '缺少 nodeId')
  if (!ctx.openid) throw fail(4010, '身份无效，请刷新页面后重试')

  const coll = ctx.db.collection(COLLECTIONS.NODES)
  let node
  try {
    const res = await coll.doc(nodeId).get()
    node = res.data
  } catch (e) {
    node = null
  }
  if (!node) throw fail(4004, '这个位置已经空了')

  // 不能给自己刷祝福
  if (node.openid === ctx.openid) throw fail(4003, '不能给自己送祝福')

  // IP 短时爆发限制（挡批量刷）
  const burst = await guard.checkBurst(ctx, 'bless', L.BURST_PER_MIN)
  if (!burst) throw fail(4003, '操作太频繁，稍后再试')

  const logs = ctx.db.collection(COLLECTIONS.BLESS_LOGS)
  const logId = blessLogId(nodeId, ctx.openid)

  // 抢锁：靠主键唯一性做去重，并发请求只有一个能写进去
  try {
    await logs.add({
      data: {
        _id: logId,
        nodeId,
        treeId,
        openid: ctx.openid,
        ip: ctx.ip || '',
        createdAt: Date.now()
      }
    })
  } catch (e) {
    const dup = await logs
      .where({ _id: logId })
      .limit(1)
      .get()
      .catch(() => null)
    if (dup && dup.data && dup.data.length) {
      return { blessCount: node.blessCount || 0, already: true }
    }
    throw e
  }

  // 配额在抢锁之后检查：抢不到锁说明本来就已经送过，不该消耗配额
  const allowed = await guard.checkDailyLimit(ctx, 'bless', L.BLESS_DAILY)
  if (!allowed) {
    // 释放锁，避免把今天的名额白白占掉
    await logs
      .doc(logId)
      .remove()
      .catch(() => {})
    throw fail(4003, '今天祝福得有点多啦，明天再来')
  }

  const sortMode = node.sortMode || (await theme.getSortMode(ctx, treeId))

  await coll.doc(nodeId).update({
    data: {
      blessCount: ctx._.inc(1),
      // score 仅兼容展示用；排序已改为按真实计数（见 lib/rank.js）
      score: computeScore(
        { blessCount: (node.blessCount || 0) + 1, inviteCount: node.inviteCount || 0 },
        sortMode
      )
    }
  })

  // 回读取真值，避免并发下返回值与库不一致
  const fresh = await coll.doc(nodeId).get()
  return { blessCount: (fresh.data && fresh.data.blessCount) || 0, already: false }
}
