/** 集合名与索引约定（索引需在云开发控制台手动创建，见 docs/deploy.md） */
exports.COLLECTIONS = {
  TREES: 'trees',
  NODES: 'nodes',
  BLESS_LOGS: 'bless_logs',
  INVITE_LOGS: 'invite_logs',
  CONFIGS: 'configs'
}

/** 节点对外字段投影：绝不把 openid 返回给客户端 */
exports.publicNode = (doc, openid) => ({
  id: doc._id,
  nickname: doc.nickname,
  wish: doc.wishStatus === 1 ? doc.wish : '（内容审核中）',
  avatar: doc.avatarFileId || '',
  avatarUrl: doc.avatarFileId || '',
  blessCount: doc.blessCount || 0,
  inviteCount: doc.inviteCount || 0,
  score: doc.score || 0,
  createdAt: doc.createdAt || 0,
  wishStatus: doc.wishStatus === undefined ? 1 : doc.wishStatus,
  mine: !!openid && doc.openid === openid
})
