/**
 * H5 远程实现（上公众号必需）
 *
 * 走云开发「HTTP 访问服务」→ 同一个 tree 云函数，
 * 所以 H5 与小程序看到的是同一棵树、同一份榜单。
 *
 * 与 mp.js 的差别只有两处：
 *   1. 传输：wx.cloud.callFunction → fetch(API_BASE)
 *   2. 头像：wx.cloud.uploadFile → 压缩后的 dataURL 直接进字段
 *      （H5 没有云存储直传通道；160px JPEG ≈ 8KB，一屏 60 个节点约 0.5MB）
 *
 * 2026-11 修复：
 *   1. 身份改为服务端签发 uid + token（原来直接拿 clientId 当身份，可冒充他人）
 *   2. 头像超限显式报错（原来两个分支返回同一个值，等于没校验，超限被后端静默丢弃）
 *   3. 分页大小统一取 limits，不再出现 200/60/30 三套口径
 */

import { ApiError, ErrCode, toApiError, unwrap } from '../errors'
import { getClientId, readSession, writeSession, clearSession } from '../storage'
import { API_BASE } from '../env'
import { WALL_PAGE_SIZE, AVATAR_CLIENT_MAX_BYTES } from '../limits'

const TIMEOUT = 15000

/** 未配置会话密钥时后端会拒绝签发，此时退回 clientId 身份（仅演示可用） */
let legacyMode = false
let sessionPromise = null

async function post(body) {
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null
  const timer = ctrl ? setTimeout(() => ctrl.abort(), TIMEOUT) : null

  try {
    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl ? ctrl.signal : undefined,
      credentials: 'omit'
    })
    if (!res.ok) {
      throw new ApiError(ErrCode.NET, `服务异常（${res.status}），请稍后再试`)
    }
    return await res.json()
  } catch (e) {
    throw toApiError(e, '网络不太顺，稍后再试')
  } finally {
    if (timer) clearTimeout(timer)
  }
}

/** 取会话；没有就去 register 换一个 */
async function ensureSession(force = false) {
  if (legacyMode) return null
  if (!force) {
    const cached = readSession()
    if (cached) return cached
  }
  if (sessionPromise) return sessionPromise

  sessionPromise = (async () => {
    const json = await post({ action: 'register' })
    if (!json || json.code !== 0) {
      // 后端没配 FT_SESSION_SECRET：退回旧身份，能读能写但不可防冒充
      legacyMode = true
      return null
    }
    const s = { uid: json.data.uid, token: json.data.token }
    writeSession(s)
    return s
  })()

  try {
    return await sessionPromise
  } finally {
    sessionPromise = null
  }
}

async function call(action, payload, retry = true) {
  if (!API_BASE) {
    throw new ApiError(ErrCode.AUTH, '尚未配置 H5 后端地址（config-env/env.js 的 API_BASE）')
  }

  const session = await ensureSession()
  const body = { action, payload, clientId: getClientId() }
  if (session) {
    body.uid = session.uid
    body.token = session.token
  }

  const json = await post(body)

  // 会话失效：清掉重签一次，避免用户被迫手刷
  if (json && json.code === 4010 && retry && !legacyMode) {
    clearSession()
    await ensureSession(true)
    return call(action, payload, false)
  }

  return unwrap(json)
}

/** dataURL 体积校验；超限直接告诉用户，不静默丢头像 */
function pickAvatarPayload(avatar) {
  const raw = (avatar && avatar.dataUrl) || ''
  if (!raw) return ''
  if (raw.length > AVATAR_CLIENT_MAX_BYTES) {
    throw new ApiError(ErrCode.PARAM, '头像太大了，换一张图片试试')
  }
  return raw
}

export default {
  mode: 'remote',

  async init() {
    // 预热会话与 clientId，减少首屏抖动
    getClientId()
    await ensureSession()
  },

  async getTree({ treeId }) {
    return call('getTree', { treeId })
  },

  async listNodes({ treeId, sort = 'invite', page = 1, size = WALL_PAGE_SIZE }) {
    const data = await call('listNodes', {
      treeId,
      sort,
      page,
      size: Math.min(size, WALL_PAGE_SIZE)
    })
    // 头像已是 dataURL / https，直接可用；兼容后端返回 cloud:// 的情况
    data.list = (data.list || []).map((n) => ({
      ...n,
      avatarUrl: n.avatarUrl || n.avatar || ''
    }))
    return data
  },

  async joinTree({ treeId, avatar, wish, nickname, inviter }) {
    return call('joinTree', {
      treeId,
      nickname,
      wish,
      avatarFileId: pickAvatarPayload(avatar),
      inviter: inviter || ''
    })
  },

  async blessNode({ treeId, nodeId }) {
    return call('blessNode', { treeId, nodeId })
  },

  async recordInvite({ treeId, nodeId, inviter }) {
    return call('recordInvite', { treeId, nodeId, inviter })
  },

  async getMyNode({ treeId }) {
    return call('getMyNode', { treeId })
  },

  async resolveUrls(ids) {
    // H5 头像本身就是可直接渲染的地址，无需换取临时链接
    const map = {}
    ;(ids || []).forEach((id) => {
      map[id] = id
    })
    return map
  },

  async track(event) {
    try {
      await call('track', event)
    } catch (e) {
      /* 埋点失败不影响主流程 */
    }
  }
}
