// #ifdef MP-WEIXIN
/**
 * 微信小程序实现（G2 主力）
 *
 * 铁律：wx.* 只能出现在函数体内，不得在模块顶层取 wx.cloud，
 * 否则 H5 构建产物一旦误引用就是运行时崩溃。
 */

import { ApiError, ErrCode, toApiError, unwrap } from '../errors'
import { getClientId } from '../storage'
import { CLOUD_ENV_ID } from '../env'

let inited = false
const urlCache = {} // fileID -> { url, expireAt }

function ensureCloud() {
  if (typeof wx === 'undefined' || !wx.cloud) {
    throw new ApiError(ErrCode.UNKNOWN, '当前微信版本不支持云开发，请升级微信')
  }
  if (!CLOUD_ENV_ID) {
    throw new ApiError(
      ErrCode.AUTH,
      '尚未配置云开发环境 ID，请在 src/core/env.js 填写 CLOUD_ENV_ID'
    )
  }
  if (!inited) {
    wx.cloud.init({ env: CLOUD_ENV_ID, traceUser: true })
    inited = true
  }
}

function call(action, payload) {
  ensureCloud()
  return wx.cloud
    .callFunction({
      name: 'tree',
      data: { action, payload, clientId: getClientId() }
    })
    .then((res) => unwrap(res.result))
    .catch((e) => {
      throw toApiError(e, '请求失败，请检查网络')
    })
}

export default {
  mode: 'cloud',

  async init() {
    ensureCloud()
  },

  async getTree({ treeId }) {
    return call('getTree', { treeId })
  },

  async listNodes({ treeId, sort = 'invite', page = 1, size = 30 }) {
    const data = await call('listNodes', { treeId, sort, page, size })
    // 头像统一走临时链接（cloud:// 也能显示，但 H5 复用同一套组件时更稳）
    const ids = (data.list || []).map((n) => n.avatar).filter(Boolean)
    if (ids.length) {
      const map = await this.resolveUrls(ids)
      data.list = data.list.map((n) => ({ ...n, avatarUrl: map[n.avatar] || n.avatar }))
    }
    return data
  },

  async joinTree({ treeId, avatar, wish, nickname, inviter }) {
    ensureCloud()
    let fileID = ''
    if (avatar && avatar.path) {
      const ext = (avatar.path.match(/\.(\w+)$/) || [, 'jpg'])[1]
      const cloudPath = `avatar/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
      const up = await wx.cloud.uploadFile({ cloudPath, filePath: avatar.path })
      fileID = up.fileID
      // 上传后短期内直接用本地路径显示，避免多一次网络请求
      urlCache[fileID] = { url: avatar.path, expireAt: Date.now() + 3600 * 1000 }
    }
    const res = await call('joinTree', {
      treeId,
      nickname,
      wish,
      avatarFileId: fileID,
      inviter: inviter || ''
    })
    return res
  },

  async blessNode({ treeId, nodeId }) {
    return call('blessNode', { treeId, nodeId })
  },

  async recordInvite({ treeId, nodeId, inviter }) {
    return call('recordInvite', { treeId, nodeId, inviter })
  },

  async getMyNode({ treeId }) {
    const node = await call('getMyNode', { treeId })
    if (node && node.avatar) {
      const map = await this.resolveUrls([node.avatar])
      return { ...node, avatarUrl: map[node.avatar] || node.avatar }
    }
    return node
  },

  async resolveUrls(ids) {
    ensureCloud()
    const now = Date.now()
    const need = []
    const map = {}
    ;(ids || []).forEach((id) => {
      if (!id) return
      if (/^(https?:|data:|wxfile:|\/)/.test(id)) {
        map[id] = id
        return
      }
      const hit = urlCache[id]
      if (hit && hit.expireAt > now + 5 * 60 * 1000) {
        map[id] = hit.url
      } else {
        need.push(id)
      }
    })

    // 微信单次 getTempFileURL 上限 50
    for (let i = 0; i < need.length; i += 50) {
      const chunk = need.slice(i, i + 50)
      const res = await wx.cloud.getTempFileURL({ fileList: chunk })
      ;(res.fileList || []).forEach((f) => {
        if (f.tempFileURL) {
          map[f.fileID] = f.tempFileURL
          // 官方临时链接默认 2 小时，这里按 1.5 小时刷新
          urlCache[f.fileID] = { url: f.tempFileURL, expireAt: now + 90 * 60 * 1000 }
        }
      })
    }
    return map
  },

  async track(event) {
    try {
      await call('track', event)
    } catch (e) {
      // 埋点失败不影响主流程
    }
  }
}
// #endif
