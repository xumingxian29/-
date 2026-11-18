/**
 * H5 身份：服务端签发的 uid + HMAC token
 *
 * 为什么不能直接用 clientId 当身份：
 *   clientId 由浏览器自己生成，任何人只要知道别人的 clientId 就能冒充；
 *   清一下 localStorage 换个 clientId 又能重刷祝福与邀请的"每人一次"。
 *
 * 现在的做法：
 *   1. 首次访问调 register，服务端发一个随机 uid（不含任何用户信息）
 *   2. uid 的签名 token 存在浏览器本地，之后每次请求带上 { uid, token }
 *   3. 服务端用 FT_SESSION_SECRET 验签，验不过就拒绝写入
 *
 * 能防的：冒充他人、篡改他人节点、伪造已有身份刷榜
 * 不能防的：批量注册新身份（Sybil）。那需要公众号网页授权拿真实 openid，
 *           或按 IP + 行为做风控——都不在本仓库范围内。
 *
 * 部署时必须配置环境变量 FT_SESSION_SECRET（32 位以上随机串）。
 * 未配置时 enabled=false，index.js 会退回旧的 clientId 伪身份并打警告——
 * 那种状态下任何人都能冒充别人，只能用于本地演示，绝不可对外。
 */

const crypto = require('crypto')

const SECRET = process.env.FT_SESSION_SECRET || ''

function mac(uid) {
  return crypto.createHmac('sha256', SECRET).update(String(uid)).digest('hex')
}

/** 是否已配置密钥（未配置时 H5 无法写入，只能匿名读） */
exports.enabled = !!SECRET

/** 签发一个新身份 */
exports.issue = () => {
  const uid = 'u_' + crypto.randomBytes(12).toString('hex')
  return { uid, token: mac(uid) }
}

/**
 * 验签
 * @param {string} uid
 * @param {string} token
 * @returns {boolean}
 */
exports.verify = (uid, token) => {
  if (!SECRET) return false
  if (!uid || !token) return false
  if (!/^u_[0-9a-f]{24}$/.test(String(uid))) return false

  const expect = Buffer.from(mac(uid))
  const got = Buffer.from(String(token))
  if (expect.length !== got.length) return false
  return crypto.timingSafeEqual(expect, got)
}
