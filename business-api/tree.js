/**
 * 业务语义 API —— 页面只跟这一层打交道
 * 这里负责：注入当前主题、统一默认参数、把平台异常转成人话
 */

import api from '@/core'
import { getTheme } from '@/themes'
import { getClientId } from '@/core/storage'

let currentTheme = getTheme('christmas')

export function setTheme(theme) {
  if (theme) currentTheme = theme
}

export function getThemeRef() {
  return currentTheme
}

function tid(treeId) {
  return treeId || currentTheme.meta.treeId
}

/** 拉取整棵树（G0 场景一次拿全，G2 可分页） */
export async function fetchWall({ treeId, sort, size = 200 } = {}) {
  const t = tid(treeId)
  return api.listNodes({
    treeId: t,
    sort: sort || currentTheme.rules.sortMode,
    page: 1,
    size
  })
}

/** 挂上我 */
export async function submitJoin({ avatar, wish, nickname, inviter, treeId }) {
  return api.joinTree({
    treeId: tid(treeId),
    avatar,
    wish,
    nickname: (nickname || '').trim() || '匿名',
    inviter: inviter || '',
    clientId: getClientId()
  })
}

/** 送祝福 */
export async function sendBless(nodeId, treeId) {
  return api.blessNode({ treeId: tid(treeId), nodeId, clientId: getClientId() })
}

/** 记录一次邀请（分享落地页调用） */
export async function recordInvite(nodeId, inviter, treeId) {
  if (!nodeId) return { inviteCount: 0 }
  return api.recordInvite({ treeId: tid(treeId), nodeId, inviter: inviter || '' })
}

/** 我自己的节点 */
export async function fetchMine(treeId) {
  return api.getMyNode({ treeId: tid(treeId), clientId: getClientId() })
}

/** 榜单（复用 fetchWall，按当前主题排序规则） */
export async function fetchRank({ treeId } = {}) {
  const res = await fetchWall({ treeId })
  return res.list
}
