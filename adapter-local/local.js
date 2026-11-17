/**
 * 本地实现（G0 主力，H5 端）
 *
 * 特点：数据只存在当前浏览器/设备，换设备看不到别人的头像。
 * 首页会显性提示这一点，避免演示时被误解为"假数据"。
 */

import { readJSON, writeJSON, uuid, getClientId } from '../storage'
import { sortNodes, findMyRank, withScores } from '../rank'
import { ApiError, ErrCode } from '../errors'
import { seedNodes } from './mockSeed'

const nodesKey = (t) => `nodes:${t}`
const meKey = (t) => `me:${t}`
const blessedKey = (t) => `blessed:${t}`
const invitedKey = (t, n) => `invited:${t}:${n}`

function loadNodes(treeId) {
  const cached = readJSON(nodesKey(treeId), null)
  if (Array.isArray(cached) && cached.length) return cached
  const seeded = seedNodes(treeId)
  writeJSON(nodesKey(treeId), seeded)
  return seeded
}

function saveNodes(treeId, nodes) {
  writeJSON(nodesKey(treeId), nodes)
}

function decorate(node, treeId, clientId) {
  const myId = readJSON(meKey(treeId), '')
  return {
    ...node,
    mine: !!myId && node.id === myId,
    avatarUrl: node.avatar || node.avatarUrl || '',
    // 本地模式所有内容视为已通过
    wishStatus: node.wishStatus === undefined ? 1 : node.wishStatus
  }
}

export default {
  mode: 'local',

  async init() {
    // 本地模式无需初始化，占位保持契约一致
  },

  async getTree({ treeId }) {
    const nodes = loadNodes(treeId)
    return { id: treeId, themeId: treeId, title: '', total: nodes.length }
  },

  async listNodes({ treeId, sort = 'invite', page = 1, size = 200 }) {
    const clientId = getClientId()
    const all = loadNodes(treeId).map((n) => decorate(n, treeId, clientId))
    const sorted = sortNodes(all, sort)
    const start = (page - 1) * size
    const slice = sorted.slice(start, start + size)
    const myId = readJSON(meKey(treeId), '')
    return {
      list: slice,
      total: sorted.length,
      myRank: findMyRank(sorted, myId),
      hasMore: start + size < sorted.length
    }
  },

  async joinTree({ treeId, avatar, wish, nickname }) {
    const text = (wish || '').trim()
    if (!text) throw new ApiError(ErrCode.PARAM, '写一句心愿再挂上去吧')
    if (text.length > 30) throw new ApiError(ErrCode.PARAM, '心愿最多 30 个字')

    const clientId = getClientId()
    const nodes = loadNodes(treeId)
    const myId = readJSON(meKey(treeId), '')
    const avatarUrl = (avatar && (avatar.dataUrl || avatar.path)) || ''

    let node = myId ? nodes.find((n) => n.id === myId) : null
    if (node) {
      node.wish = text
      node.nickname = nickname || node.nickname
      if (avatarUrl) {
        node.avatar = avatarUrl
        node.avatarUrl = avatarUrl
      }
      node.updatedAt = Date.now()
    } else {
      node = {
        id: 'n_' + uuid(),
        nickname: (nickname || '匿名').slice(0, 12),
        wish: text,
        avatar: avatarUrl,
        avatarUrl,
        blessCount: 0,
        inviteCount: 0,
        createdAt: Date.now(),
        wishStatus: 1
      }
      nodes.push(node)
      writeJSON(meKey(treeId), node.id)
    }

    saveNodes(treeId, nodes)
    return { node: decorate(node, treeId, clientId) }
  },

  async blessNode({ treeId, nodeId }) {
    const clientId = getClientId()
    const blessed = readJSON(blessedKey(treeId), [])
    const nodes = loadNodes(treeId)
    const node = nodes.find((n) => n.id === nodeId)
    if (!node) throw new ApiError(ErrCode.NOT_FOUND, '这个位置已经空了')

    if (blessed.includes(nodeId)) {
      return { blessCount: node.blessCount || 0, already: true }
    }

    node.blessCount = (node.blessCount || 0) + 1
    blessed.push(nodeId)
    saveNodes(treeId, nodes)
    writeJSON(blessedKey(treeId), blessed)
    return { blessCount: node.blessCount, already: false }
  },

  async recordInvite({ treeId, nodeId, inviter }) {
    const fromClientId = getClientId()
    if (!nodeId) return { inviteCount: 0 }
    const nodes = loadNodes(treeId)
    const node = nodes.find((n) => n.id === nodeId)
    if (!node) return { inviteCount: 0 }

    // 自己不能给自己记邀请；同一客户端只记一次
    if (node.id === inviter) return { inviteCount: node.inviteCount || 0 }
    const list = readJSON(invitedKey(treeId, nodeId), [])
    if (list.includes(fromClientId)) {
      return { inviteCount: node.inviteCount || 0 }
    }
    list.push(fromClientId)
    writeJSON(invitedKey(treeId, nodeId), list)
    node.inviteCount = (node.inviteCount || 0) + 1
    saveNodes(treeId, nodes)
    return { inviteCount: node.inviteCount }
  },

  async getMyNode({ treeId }) {
    const myId = readJSON(meKey(treeId), '')
    if (!myId) return null
    const clientId = getClientId()
    const node = loadNodes(treeId).find((n) => n.id === myId)
    return node ? decorate(node, treeId, clientId) : null
  },

  async resolveUrls(ids) {
    // 本地模式存的已是 dataURL，无需解析
    const map = {}
    ;(ids || []).forEach((id) => {
      map[id] = id
    })
    return map
  },

  async track(event) {
    // 本地模式只打日志，后续接真正埋点
    if (typeof console !== 'undefined') {
      console.debug('[track]', event.name, event.props || {})
    }
  }
}
