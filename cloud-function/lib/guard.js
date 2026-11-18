/**
 * 频控：防止单账号刷祝福 / 刷邀请 / 刷挂树
 *
 * 两层：
 *   checkDailyLimit  按身份（openid / uid）算 24 小时配额
 *   checkBurst       按 IP 算短窗口配额，挡住"清 localStorage 换身份"这类绕过
 *
 * 两个函数都在日志集合上做 count，所以日志必须落库（见 joinTree / blessNode）。
 * 没有 IP（小程序 callFunction 拿不到）时 burst 直接放行，由身份配额兜底。
 */

const DAY = 24 * 3600 * 1000
const MINUTE = 60 * 1000
const HOUR = 60 * MINUTE

const LOG_COLLECTION = { bless: 'bless_logs', invite: 'invite_logs' }

/**
 * @param {Object} ctx
 * @param {'bless'|'invite'} kind
 * @param {number} limit 24 小时内允许次数
 * @returns {Promise<boolean>} true = 允许
 */
exports.checkDailyLimit = async (ctx, kind, limit) => {
  if (!limit || limit <= 0) return true
  if (!ctx.openid) return false
  const collName = LOG_COLLECTION[kind] || 'bless_logs'

  const res = await ctx.db
    .collection(collName)
    .where({ openid: ctx.openid, createdAt: ctx._.gte(Date.now() - DAY) })
    .count()

  return (res.total || 0) < limit
}

/**
 * 同一 IP 在窗口内的操作次数（按日志集合算）
 * @param {Object} ctx
 * @param {'bless'|'invite'} kind
 * @param {number} limit
 * @param {number} [windowMs]
 */
exports.checkBurst = async (ctx, kind, limit, windowMs = MINUTE) => {
  if (!limit || limit <= 0) return true
  if (!ctx.ip) return true // 拿不到 IP 就不误伤
  const collName = LOG_COLLECTION[kind] || 'bless_logs'

  const res = await ctx.db
    .collection(collName)
    .where({ ip: ctx.ip, createdAt: ctx._.gte(Date.now() - windowMs) })
    .count()

  return (res.total || 0) < limit
}

/**
 * 挂树频控：一个 IP 每小时最多挂几个节点
 * 用 nodes 集合算，所以创建节点时必须写入 ip 字段
 */
exports.checkJoinBurst = async (ctx, limit, windowMs = HOUR) => {
  if (!limit || limit <= 0) return true
  if (!ctx.ip) return true

  const res = await ctx.db
    .collection('nodes')
    .where({ ip: ctx.ip, createdAt: ctx._.gte(Date.now() - windowMs) })
    .count()

  return (res.total || 0) < limit
}
