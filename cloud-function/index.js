/**
 * 云函数单一入口：action 路由
 *
 * 两个调用来源共用一份业务逻辑：
 *   1. 小程序  wx.cloud.callFunction  → event = { action, payload }
 *   2. H5      HTTP 访问服务 POST     → event = { httpMethod, body, headers, ... }
 *
 * 一次部署覆盖两端，H5 与小程序看到的是同一棵树。
 *
 * 2026-11 修复：
 *   1. H5 身份改为服务端签发 uid + HMAC 验签（原来直接用 clientId，可冒充他人）
 *   2. CORS 从 '*' 收敛为可配置白名单（FT_ALLOWED_ORIGIN）
 *   3. 补 IP 解析，供 lib/guard.js 做频控
 *   4. 补 register 动作，签发会话
 */

const cloud = require('wx-server-sdk')
const resp = require('./lib/resp')
const secH5 = require('./lib/secH5')
const session = require('./lib/session')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const handlers = {
  getTree: require('./actions/getTree'),
  listNodes: require('./actions/listNodes'),
  joinTree: require('./actions/joinTree'),
  blessNode: require('./actions/blessNode'),
  recordInvite: require('./actions/recordInvite'),
  getMyNode: require('./actions/getMyNode'),
  track: require('./actions/track')
}

/** 允许跨域的来源：逗号分隔；默认 * ，但会在日志里提示收敛 */
const ALLOW_ORIGIN = process.env.FT_ALLOWED_ORIGIN || '*'

function corsHeaders(origin) {
  let allow = ALLOW_ORIGIN
  if (ALLOW_ORIGIN !== '*') {
    const list = ALLOW_ORIGIN.split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    allow = list.indexOf(origin) > -1 ? origin : list[0] || ''
  }
  return {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Cache-Control': 'no-store',
    Vary: 'Origin'
  }
}

/** HTTP 访问服务转发过来时，event 带 httpMethod / requestContext / headers */
function isHttpEvent(event) {
  return !!(event && (event.httpMethod || event.requestContext || event.headers))
}

function parseBody(event) {
  let raw = event.body
  if (!raw) return {}
  if (event.isBase64Encoded) {
    raw = Buffer.from(raw, 'base64').toString('utf8')
  }
  if (typeof raw === 'object') return raw
  try {
    return JSON.parse(raw)
  } catch (e) {
    return null
  }
}

/** 从 HTTP 事件里取真实客户端 IP（云开发会把链式代理塞在 x-forwarded-for） */
function clientIp(event) {
  const h = event.headers || {}
  const raw =
    h['x-forwarded-for'] ||
    h['X-Forwarded-For'] ||
    h['x-real-ip'] ||
    (event.requestContext && event.requestContext.identity && event.requestContext.identity.sourceIp) ||
    ''
  return String(raw).split(',')[0].trim()
}

/** 兜底：未配置会话密钥时，退回旧的 clientId 伪身份（可伪造，仅演示用） */
function legacyOpenid(clientId) {
  const id = String(clientId || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 40)
  return id ? 'h5_' + id : ''
}

let warnedNoSecret = false

async function dispatch({ action, payload, openid, clientId, isH5, ip }) {
  const handler = handlers[action]
  if (!handler) return resp.fail(4001, '未知操作: ' + action)

  const ctx = {
    cloud,
    db: cloud.database(),
    _: cloud.database().command,
    openid,
    clientId,
    ip,
    payload: payload || {},
    isH5: !!isH5
  }

  // H5 走本地敏感词兜底；小程序走云调用内容安全
  if (isH5) {
    ctx.secCheck = (text) => secH5.check(text)
  }

  try {
    const data = await handler(ctx)
    return resp.ok(data)
  } catch (e) {
    console.error('[tree]', action, e)
    return resp.fail(e.code || 5000, e.message || '服务异常，请稍后重试')
  }
}

/** 小程序调用入口 */
async function handleCall(event) {
  const { action, payload = {} } = event || {}
  const wxContext = cloud.getWXContext()
  if (!wxContext.OPENID) return resp.fail(4010, '请在小程序内打开')

  return dispatch({
    action,
    payload,
    clientId: '',
    openid: wxContext.OPENID,
    isH5: false,
    ip: ''
  })
}

/** H5 调用入口 */
async function handleHttp(event) {
  const method = (event.httpMethod || 'POST').toUpperCase()
  const origin = (event.headers && (event.headers.origin || event.headers.Origin)) || ''
  const headers = corsHeaders(origin)

  if (method === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' }
  }
  if (method !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify(resp.fail(4005, '只支持 POST')) }
  }

  const body = parseBody(event)
  if (!body) {
    return { statusCode: 400, headers, body: JSON.stringify(resp.fail(4001, '请求体不是合法 JSON')) }
  }

  const ip = clientIp(event)
  const action = body.action

  // 签发会话：不需要已有身份
  if (action === 'register') {
    if (!session.enabled) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(resp.fail(4010, '服务端未配置 FT_SESSION_SECRET，暂不能签发身份'))
      }
    }
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(resp.ok(session.issue()))
    }
  }

  // 验签
  let openid = ''
  if (session.enabled) {
    if (!session.verify(body.uid, body.token)) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(resp.fail(4010, '会话已失效，请刷新页面'))
      }
    }
    openid = body.uid
  } else {
    openid = legacyOpenid(body.clientId)
    if (!warnedNoSecret) {
      warnedNoSecret = true
      console.warn('[tree] 未配置 FT_SESSION_SECRET：H5 身份退回 clientId，可被冒充，仅可用于本地演示')
    }
    if (!openid) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify(resp.fail(4001, '缺少 clientId'))
      }
    }
  }

  const result = await dispatch({
    action,
    payload: body.payload,
    clientId: body.clientId,
    openid,
    isH5: true,
    ip
  })

  return { statusCode: 200, headers, body: JSON.stringify(result) }
}

exports.main = async (event) => {
  if (isHttpEvent(event)) return handleHttp(event)
  return handleCall(event)
}
