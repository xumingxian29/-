/**
 * 排序算法（与前端 src/core/rank.js 同源）
 * 改动时两边必须同步，否则海报名次与榜单不一致
 */
exports.computeScore = (node, sortMode = 'invite') => {
  const bless = node.blessCount || 0
  const invite = node.inviteCount || 0
  if (sortMode === 'bless') return bless * 1000 + invite
  if (sortMode === 'display') return 0
  return invite * 1000 + bless
}

exports.sortModeOf = (themeRules) => {
  const mode = themeRules && themeRules.sortMode
  return mode === 'bless' || mode === 'display' ? mode : 'invite'
}
