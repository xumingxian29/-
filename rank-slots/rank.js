/**
 * 排序与槽位分配 —— 纯函数，零平台依赖
 * 云函数 cloud-function/lib/rank.js 与本文件保持同源（scripts/test-cloud.js 会对拍）
 *
 * 产品口径（来自项目计划书）：
 *  - sortMode='invite' ：按邀请人数排序（圣诞档历史机制）
 *  - sortMode='bless'  ：按被祝福次数排序，且前端不展示邀请人数，规避诱导分享
 *  - sortMode='display'：纯展示，按加入时间
 *
 * 2026-11 修复：
 *   1. 排序改为比较器，不再用 primary*1000+secondary 的加权分（计数过千会串味）
 *   2. 槽位溢出的兜底栅格从"最后一个主题槽位下方"开始，不再叠回树顶
 */

const PRIMARY = { invite: 'inviteCount', bless: 'blessCount' }
const SECONDARY = { invite: 'blessCount', bless: 'inviteCount' }

/**
 * 比较器：主维度降序 → 次维度降序 → 创建时间升序
 * @param {Object} a
 * @param {Object} b
 * @param {'invite'|'bless'|'display'} sortMode
 * @returns {number}
 */
export function compareNodes(a, b, sortMode = 'invite') {
  if (sortMode === 'display') return (a.createdAt || 0) - (b.createdAt || 0)

  const main = PRIMARY[sortMode] || 'inviteCount'
  const sub = SECONDARY[sortMode] || 'blessCount'
  const d = (b[main] || 0) - (a[main] || 0)
  if (d) return d
  const s = (b[sub] || 0) - (a[sub] || 0)
  if (s) return s
  return (a.createdAt || 0) - (b.createdAt || 0)
}

/**
 * ⚠️ 兼容字段，不要用它排序
 * 仅用于展示与老数据迁移，次维度超过 999 会饱和。
 */
export function computeScore(node, sortMode = 'invite') {
  const bless = node.blessCount || 0
  const invite = node.inviteCount || 0
  if (sortMode === 'display') return 0
  if (sortMode === 'bless') return bless * 1000 + Math.min(invite, 999)
  return invite * 1000 + Math.min(bless, 999)
}

/** 为一组节点补齐 score（兼容展示用，不参与排序） */
export function withScores(nodes, sortMode) {
  return (nodes || []).map((n) => ({ ...n, score: computeScore(n, sortMode) }))
}

/** 排序：不改入参 */
export function sortNodes(nodes, sortMode = 'invite') {
  const list = (nodes || []).slice()
  return list.sort((a, b) => compareNodes(a, b, sortMode))
}

/** 找出「我」在整个榜单中的名次（1 起） */
export function findMyRank(sortedNodes, myId) {
  if (!myId) return null
  const idx = (sortedNodes || []).findIndex((n) => n.id === myId)
  return idx < 0 ? null : idx + 1
}

/**
 * 兜底栅格：把 count 个点排成网格，纵向落在 [top, bottom] 区间内
 * @param {number} count
 * @param {{top?:number, bottom?:number, rows?:number}} [opts]
 */
export function makeGridSlots(count, opts = {}) {
  const n = Math.max(0, count | 0)
  if (!n) return []

  const top = typeof opts.top === 'number' ? opts.top : 0.22
  const bottom = typeof opts.bottom === 'number' ? opts.bottom : 0.9
  const rows = Math.max(1, opts.rows || Math.min(6, n))
  const perRow = Math.max(1, Math.ceil(n / rows))
  const stepY = rows > 1 ? (bottom - top) / (rows - 1) : 0

  const slots = []
  for (let i = 0; i < n; i++) {
    const r = Math.floor(i / perRow)
    const c = i % perRow
    // 每行横向占位随个数收缩，避免贴边出界
    const spread = Math.min(0.8, perRow * 0.14)
    slots.push({
      x: 0.5 + (c - (perRow - 1) / 2) * (spread / Math.max(1, perRow)),
      y: Math.min(bottom, top + r * stepY),
      scale: 0.88,
      rotate: 0,
      layer: 3
    })
  }
  return slots
}

/**
 * 把已排序的节点分配到主题槽位
 * 槽位顺序约定：index 0 = 树顶（最高位），依次向下
 *
 * 超出主题槽位数量时，兜底栅格从**最后一个主题槽位下方**开始，
 * 不会像以前那样从 y=0.22 重新开始把树顶盖住。
 *
 * @param {Array} sortedNodes 已排序节点
 * @param {{slots:Array, slotFallback?:string}} layout 主题布局
 * @returns {Array<{node:Object, slot:Object, index:number}>}
 */
export function assignSlots(sortedNodes, layout) {
  const list = sortedNodes || []
  const themeSlots = (layout && layout.slots) || []

  let slots = themeSlots
  if (themeSlots.length < list.length) {
    const extra = list.length - themeSlots.length
    const lastY = themeSlots.length
      ? themeSlots.reduce((m, s) => Math.max(m, s.y || 0), 0)
      : 0.2
    const top = Math.min(0.84, lastY + 0.06)
    slots = themeSlots.concat(makeGridSlots(extra, { top, bottom: 0.94 }))
  }

  return list.map((node, index) => {
    const slot = slots[index] || { x: 0.5, y: 0.62, scale: 1, rotate: 0, layer: 3 }
    return { node, slot, index }
  })
}
