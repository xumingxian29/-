/**
 * 排序与槽位分配 —— 纯函数，零平台依赖
 * 云函数 cloudfunctions/tree/lib/rank.js 与本文件保持同源（改动需同步复制）
 *
 * 产品口径（来自项目计划书）：
 *  - 圣诞档 sortMode='invite'：按邀请人数排序（历史机制）
 *  - 春节档 sortMode='bless' ：按被祝福次数排序，且前端不展示邀请人数，规避诱导分享
 *  - sortMode='display'     ：纯展示，不排序
 */

/** 计算排序分：主权重 + 次权重，避免同分乱序 */
export function computeScore(node, sortMode = 'invite') {
  const bless = node.blessCount || 0
  const invite = node.inviteCount || 0
  if (sortMode === 'bless') return bless * 1000 + invite
  if (sortMode === 'display') return 0
  return invite * 1000 + bless
}

/** 为一组节点补齐 score */
export function withScores(nodes, sortMode) {
  return (nodes || []).map((n) => ({ ...n, score: computeScore(n, sortMode) }))
}

/** 排序：分数降序 → 创建时间升序（先来的靠前） */
export function sortNodes(nodes, sortMode = 'invite') {
  const list = withScores(nodes, sortMode)
  if (sortMode === 'display') {
    return list.slice().sort((a, b) => a.createdAt - b.createdAt)
  }
  return list.slice().sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return a.createdAt - b.createdAt
  })
}

/** 找出「我」在整个榜单中的名次（1 起） */
export function findMyRank(sortedNodes, myId) {
  if (!myId) return null
  const idx = sortedNodes.findIndex((n) => n.id === myId)
  return idx < 0 ? null : idx + 1
}

/**
 * 生成兜底栅格槽位（当 theme.layout.slots 不够用时）
 * @param {number} count
 * @param {number} [rows]
 */
export function makeGridSlots(count, rows = 6) {
  const perRow = Math.max(1, Math.ceil(count / rows))
  const slots = []
  for (let i = 0; i < count; i++) {
    const r = Math.floor(i / perRow)
    const c = i % perRow
    slots.push({
      x: 0.5 + (c - (perRow - 1) / 2) * (0.8 / perRow),
      y: 0.22 + r * (0.62 / Math.max(1, rows - 1)),
      scale: 0.9,
      rotate: 0,
      layer: 3
    })
  }
  return slots
}

/**
 * 把已排序的节点分配到主题槽位
 * 槽位顺序约定：index 0 = 树顶（最高位），依次向下
 * @param {Array} sortedNodes 已排序节点
 * @param {{slots:Array, slotFallback?:string}} layout 主题布局
 * @returns {Array<{node:Object, slot:Object, index:number}>}
 */
export function assignSlots(sortedNodes, layout) {
  const list = sortedNodes || []
  const themeSlots = (layout && layout.slots) || []
  const slots =
    themeSlots.length >= list.length
      ? themeSlots
      : themeSlots.concat(makeGridSlots(list.length - themeSlots.length))

  return list.map((node, index) => {
    const slot =
      slots[index] || { x: 0.5, y: 0.5, scale: 1, rotate: 0, layer: 3 }
    return { node, slot, index }
  })
}
