const { COLLECTIONS, publicNode } = require('../lib/db')
const { computeScore } = require('../lib/rank')
const sec = require('../lib/sec')
const guard = require('../lib/guard')
const theme = require('../lib/theme')
const L = require('../lib/limits')

function badRequest(message) {
  const e = new Error(message)
  e.code = 4001
  return e
}

/** 码点长度：emoji 记 1 个，与前端 Array.from 口径一致 */
function charLen(s) {
  return Array.from(String(s || '')).length
}

/**
 * 挂上树：同一 openid 在一棵树上只有一个节点，重复提交视为更新
 */
module.exports = async (ctx) => {
  const {
    treeId = 'christmas',
    nickname = '',
    wish = '',
    avatarFileId = '',
    inviter = ''
  } = ctx.payload

  const text = (wish || '').trim()
  if (!text) throw badRequest('写一句心愿再挂上去吧')
  if (charLen(text) > L.WISH_MAX) throw badRequest(`心愿最多 ${L.WISH_MAX} 个字`)

  // 挂树频控：同一 IP 每小时最多 N 个节点，挡批量灌数据
  const allowJoin = await guard.checkJoinBurst(ctx, L.JOIN_PER_HOUR)
  if (!allowJoin) throw badRequest('这条网线挂得有点多，休息一会儿再来')

  const sortMode = await theme.getSortMode(ctx, treeId)

  // 文本内容安全
  //   小程序：云调用 msgSecCheck，不通过入待审队列（前台显示"审核中"）
  //   H5    ：云调用用不了，走本地词表，命中直接拒绝（体验上比"审核中"清楚）
  let passed = true
  if (ctx.isH5 && ctx.secCheck) {
    const r = ctx.secCheck(text)
    passed = !!r.pass
    if (!passed) throw badRequest(r.reason || '内容含有不宜展示的信息')
  } else {
    passed = await sec.msgSecCheck(ctx, text)
  }
  const wishStatus = passed ? 1 : 0

  // H5 传的是压缩后的 dataURL（约 8–15KB）；超限直接报错，不再静默丢弃头像
  const avatarValue = avatarFileId || ''
  if (avatarValue.length > L.AVATAR_MAX_BYTES) {
    throw badRequest('头像图片太大了，换一张小一点的')
  }

  const coll = ctx.db.collection(COLLECTIONS.NODES)
  const now = Date.now()
  const safeNickname = Array.from((nickname || '').trim() || '匿名')
    .slice(0, L.NICK_MAX)
    .join('')

  const existRes = await coll.where({ treeId, openid: ctx.openid }).limit(1).get()
  let nodeId = ''

  if (existRes.data && existRes.data.length) {
    const doc = existRes.data[0]
    nodeId = doc._id
    await coll.doc(doc._id).update({
      data: {
        nickname: safeNickname,
        wish: text,
        wishStatus,
        // sortMode 必须落库：blessNode 靠它算分，读不到就会退回 invite 口径
        sortMode,
        score: computeScore(
          { blessCount: doc.blessCount || 0, inviteCount: doc.inviteCount || 0 },
          sortMode
        ),
        updatedAt: now,
        ...(avatarValue ? { avatarFileId: avatarValue } : {})
      }
    })
  } else {
    const addRes = await coll.add({
      data: {
        treeId,
        openid: ctx.openid,
        nickname: safeNickname,
        wish: text,
        wishStatus,
        sortMode,
        avatarFileId: avatarValue,
        blessCount: 0,
        inviteCount: 0,
        score: 0,
        ip: ctx.ip || '',
        createdAt: now,
        updatedAt: now
      }
    })
    nodeId = addRes._id
  }

  // 头像异步审核：先发后审，命中违规由定时任务置为待审
  // 仅小程序上传的云存储文件适用；H5 的 dataURL 没有可拉的 mediaUrl
  if (avatarValue && avatarValue.indexOf('cloud://') === 0) {
    await sec.mediaCheckAsync(ctx, avatarValue, ctx.openid)
  }

  // 记录邀请（同一个 openid 只给邀请人记一次）
  if (inviter && inviter !== nodeId) {
    try {
      const logs = ctx.db.collection(COLLECTIONS.INVITE_LOGS)
      const dup = await logs.where({ nodeId: inviter, openid: ctx.openid }).limit(1).get()
      const quota = await guard.checkDailyLimit(ctx, 'invite', L.INVITE_DAILY)
      if ((!dup.data || !dup.data.length) && quota) {
        await logs.add({
          data: { nodeId: inviter, treeId, openid: ctx.openid, ip: ctx.ip || '', createdAt: now }
        })
        const inviterRes = await coll.doc(inviter).get()
        if (inviterRes.data) {
          const d = inviterRes.data
          await coll.doc(inviter).update({
            data: {
              inviteCount: ctx._.inc(1),
              score: computeScore(
                { blessCount: d.blessCount || 0, inviteCount: (d.inviteCount || 0) + 1 },
                sortMode
              )
            }
          })
        }
      }
    } catch (e) {
      console.error('[joinTree] record invite failed', e)
    }
  }

  const fresh = await coll.doc(nodeId).get()
  // 与 listNodes 同一口径：非 invite 档不把 inviteCount 回给客户端
  return { node: publicNode(fresh.data, ctx.openid, { hideInvite: sortMode !== 'invite' }) }
}
