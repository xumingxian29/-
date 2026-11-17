const { COLLECTIONS, publicNode } = require('../lib/db')
const { computeScore } = require('../lib/rank')
const sec = require('../lib/sec')

function badRequest(message) {
  const e = new Error(message)
  e.code = 4001
  return e
}

/** 读取某树种的排序规则（服务端为准，不信任客户端传参） */
async function getSortMode(ctx, treeId) {
  try {
    const res = await ctx.db.collection(COLLECTIONS.CONFIGS).doc('app').get()
    const themes = (res.data && res.data.themes) || {}
    return (themes[treeId] && themes[treeId].sortMode) || 'invite'
  } catch (e) {
    return 'invite'
  }
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
  if (Array.from(text).length > 30) throw badRequest('心愿最多 30 个字')

  const sortMode = await getSortMode(ctx, treeId)

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

  // H5 传的是压缩后的 dataURL（约 8–30KB），超限直接丢弃，避免撑爆单条记录
  const avatarValue = avatarFileId && avatarFileId.length <= 200 * 1024 ? avatarFileId : ''

  const coll = ctx.db.collection(COLLECTIONS.NODES)
  const now = Date.now()
  const safeNickname = Array.from((nickname || '').trim() || '匿名').slice(0, 12).join('')

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
        avatarFileId: avatarValue,
        blessCount: 0,
        inviteCount: 0,
        score: 0,
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
      if (!dup.data || !dup.data.length) {
        await logs.add({ data: { nodeId: inviter, openid: ctx.openid, createdAt: now } })
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
  return { node: publicNode(fresh.data, ctx.openid) }
}
