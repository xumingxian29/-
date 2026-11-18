/**
 * 内容安全：文本同步审核 + 图片异步审核（仅「小程序调用」上下文可用）
 *
 * 必须在 cloud-function/config.json 里声明 openapi 权限，否则调用报 -604101。
 * HTTP 触发（H5）没有微信用户上下文，走 secH5.js 的本地词表兜底。
 */

/**
 * 文本审核
 * @param {Object} ctx
 * @param {string} content
 * @returns {Promise<boolean>} 是否通过
 */
exports.msgSecCheck = async (ctx, content) => {
  const text = (content || '').trim()
  if (!text) return true

  // 没有 openid 就别硬调：云调用会直接抛错，被 catch 成"待审"会让所有 H5 内容进审核队列
  if (!ctx.openid) return false

  try {
    const res = await ctx.cloud.openapi.security.msgSecCheck({
      openid: ctx.openid,
      scene: 2, // 2 = 评论/文本内容
      version: 2,
      content: Array.from(text).slice(0, 2500).join('')
    })
    const suggest = res && res.result && res.result.suggest
    return suggest === 'pass'
  } catch (e) {
    if (e && e.errCode === 87014) return false // 命中违规词
    // 审核接口异常时保守处理：标记待审，不直接放行
    console.error('[sec] msgSecCheck error', e)
    return false
  }
}

/**
 * 图片异步审核（头像）
 * 注意：异步接口只返回 traceId，结果需通过回调或定时任务拉取。
 * 本仓库**不含**该定时任务——上线前必须自己补，否则 wishStatus=0 的节点无人处理。
 *
 * @returns {Promise<string>} traceId，失败返回空串
 */
exports.mediaCheckAsync = async (ctx, fileID, openid) => {
  if (!fileID) return ''
  try {
    const res = await ctx.cloud.openapi.security.mediaCheckAsync({
      mediaUrl: fileID,
      mediaType: 2, // 2 = 图片
      version: 2,
      scene: 2,
      openid
    })
    return (res && res.traceId) || ''
  } catch (e) {
    console.error('[sec] mediaCheckAsync error', e)
    return ''
  }
}
