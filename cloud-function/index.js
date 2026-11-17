/**
 * 云函数单一入口：action 路由
 *
 * 两个调用来源共用一份业务逻辑：
 *   1. 小程序  wx.cloud.callFunction  → event = { action, payload, clientId }
 *   2. H5      HTTP 访问服务 POST     → event = { httpMethod, body, ... }
 *
 * 好处：一次部署覆盖两端，H5 与小程序看到的是同一棵树。
 */

const cloud = require('wx-server-sdk')
const resp = require('./lib/resp')
const secH5 = require('./lib/secH5')

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

const CORS_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Cache-Control': 'no-store'
}

/** HTTP 访问服务转发过来时，event 带 httpMethod / requestContext */
function isHttpEvent(event) {
  return !!(event && (event.httpMethod || event.requestContext || event.path))
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

/** H5 的身份：clientId（浏览器本地生成的 uuid）映射成伪 openid */
function h5Openid(clientId) {
  const id = String(clientId || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 40)
  if (!id) return ''
  return 'h5_' + id
}

async function dispatch({ action, payload, clientId, openid, isH5 }) {
  const handler = handlers[action]
  if (!handler) return resp.fail(4001, '未知操作: ' + action)

  const ctx = {
    cloud,
    db: cloud.database(),
    _: cloud.database().command,
    openid,
    clientId,
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
  const { action, payload = {}, clientId = '' } = event || {}
  const wxContext = cloud.getWXContext()

  if (!wxContext.OPENID) return resp.fail(4010, '请在小程序内打开')

  return dispatch({
    action,
    payload,
    clientId,
    openid: wxContext.OPENID,
    isH5: false
  })
}

/** H5 调用入口 */
async function handleHttp(event) {
  const method = (event.httpMethod || 'POST').toUpperCase()
  if (method === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' }
  }
  if (method !== 'POST') {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify(resp.fail(4005, '只支持 POST'))
    }
  }

  const body = parseBody(event)
  if (!body) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify(resp.fail(4001, '请求体不是合法 JSON'))
    }
  }

  const openid = h5Openid(body.clientId)
  if (!openid) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify(resp.fail(4001, '缺少 clientId'))
    }
  }

  const result = await dispatch({
    action: body.action,
    payload: body.payload,
    clientId: body.clientId,
    openid,
    isH5: true
  })

  return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify(result) }
}

exports.main = async (event) => {
  if (isHttpEvent(event)) return handleHttp(event)
  return handleCall(event)
}
