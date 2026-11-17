/**
 * 埋点落库（G2 起启用）
 * 只记最小必要集，不采集设备指纹等敏感信息
 */
module.exports = async (ctx) => {
  const { name = '', props = {} } = ctx.payload
  if (!name) return { ok: false }

  try {
    await ctx.db.collection('events').add({
      data: {
        name: String(name).slice(0, 40),
        props: JSON.parse(JSON.stringify(props || {})),
        openid: ctx.openid,
        createdAt: Date.now()
      }
    })
  } catch (e) {
    // 埋点失败不影响业务
    console.error('[track]', e)
  }

  return { ok: true }
}
