/**
 * H5 端内容安全兜底（本地词表）
 *
 * ⚠️ 云调用（cloud.openapi.security.msgSecCheck）只在「小程序调用」的云函数上下文里可用，
 * HTTP 访问服务触发时没有微信用户上下文。所以 H5 端只能先做本地拦截。
 *
 * 这不是最终方案。对外放量前必须二选一：
 *   A. 公众号网页授权拿 openid + 云托管/固定 IP 服务器调 msgSecCheck
 *   B. 引入第三方内容安全（腾讯云 CMS 有免费额度）
 */

// 高频商业违规词（引流 / 赌博 / 色情 / 诈骗），命中即拒
const BLOCK_WORDS = [
  '加微信', '加V', '加v', '私聊', '代购', '刷单', '返利', '兼职日结',
  '博彩', '赌博', '下注', '时时彩', '六合彩', '棋牌', 'vx', 'VX',
  '色情', '裸聊', '约炮', '成人片', '黄片',
  '贷款', '套现', '洗钱', '发票', '枪支', '毒品', '冰毒',
  '法轮', '退党', '反动'
]

// 明显的联系方式（手机号 / 微信号样式），防止把人往站外引
const CONTACT_RE = /(1[3-9]\d{9})|([a-zA-Z][a-zA-Z0-9_-]{5,19}\s*(微信|weixin|vx))/i

/**
 * @param {string} text
 * @returns {{pass:boolean, reason?:string}}
 */
exports.check = (text) => {
  const s = String(text || '')
  if (!s.trim()) return { pass: true }

  const lower = s.toLowerCase()
  for (const w of BLOCK_WORDS) {
    if (lower.includes(w.toLowerCase())) {
      return { pass: false, reason: '内容含有不宜展示的信息' }
    }
  }
  if (CONTACT_RE.test(s)) {
    return { pass: false, reason: '不要留联系方式，写句心愿就好' }
  }
  return { pass: true }
}

/** 暴露词表长度，便于自测断言 */
exports.size = BLOCK_WORDS.length
