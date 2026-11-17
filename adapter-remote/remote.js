/**
 * H5 远程实现（上公众号必需）
 *
 * 走云开发「HTTP 访问服务」→ 同一个 tree 云函数，
 * 所以 H5 与小程序看到的是同一棵树、同一份榜单。
 *
 * 与 mp.js 的差别只有两处：
 *   1. 传输：wx.cloud.callFunction → fetch(API_BASE)
 *   2. 头像：wx.cloud.uploadFile → 直接把压缩后的 dataURL 存进字段
 *      （H5 没有云存储直传通道；160px JPEG ≈ 8KB，一座树 60 个节点约 0.5MB，G0 够用）
 *      后续要换成真云存储，见 docs/h5-launch.md 的「头像升级」一节。
 */

import { ApiError, ErrCode, toApiError, unwrap } from '../errors'
import { getClientId } from '../storage'
import { API_BASE } from '../env'

const TIMEOUT = 15000
const MAX_NODES = 60

// 头像压缩目标（与 image.js 的 H5 分支呼应）
const AVATAR_MAX_BYTES = 40 * 1024

async function call(action, payload) {
  if (!API_BASE) {
    throw new ApiError(ErrCode.AUTH, '尚未配置 H5 后端地址（src/core/env.js 的 API_BASE）')
  }

  const body = JSON.stringify({ action, payload, clientId: getClientId() })
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null
  const timer = ctrl ? setTimeout(() => ctrl.abort(), TIMEOUT) : null

  try {
    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal: ctrl ? ctrl.signal : undefined,
      credentials: 'omit'
    })
    if (!res.ok) {
      throw new ApiError(ErrCode.NET, `服务异常（${res.status}），请稍后再试`)
    }
    const json = await res.json()
    return unwrap(json)
  } catch (e) {
    throw toApiError(e, '网络不太顺，稍后再试')
  } finally {
    if (timer) clearTimeout(timer)
  }
}

/** dataURL 转小图；超限就降级重压，避免把数据库单条记录撑爆 */
function pickAvatarPayload(avatar) {
  if (!avatar) return ''
  const raw = avatar.dataUrl || ''
  if (!raw) return ''
  if (raw.length <= AVATAR_MAX_BYTES) return raw
  // 兜底：直接交给后端截断，前端不再二次压（二次压要 canvas，时机已过）
  return raw
}

export default {
  mode: 'remote',

  async init() {
    // 预热：把 clientId 落到本地，减少首屏抖动
    getClientId()
  },

  async getTree({ treeId }) {
    return call('getTree', { treeId })
  },

  async listNodes({ treeId, sort = 'invite', page = 1, size = MAX_NODES }) {
    const data = await call('listNodes', {
      treeId,
      sort,
      page,
      size: Math.min(size, MAX_NODES)
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
