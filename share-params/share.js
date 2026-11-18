/**
 * 分享参数统一编解码
 * 一个小程序、一个 H5，参数形态不同：
 *   小程序：onLoad(options) → { inviter, treeId }（扫码还可带 scene）
 *   H5    ：hash 路由 → #/pages/join/join?inviter=xxx&treeId=xxx
 */

/** 拼查询串 */
export function buildQuery(params = {}) {
  const pairs = Object.keys(params)
    .filter((k) => params[k] !== undefined && params[k] !== null && params[k] !== '')
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
  return pairs.join('&')
}

/**
 * 构造 H5 分享链接（当前域名 + hash 路由）
 *
 * 必须保留原有 query：某些托管平台靠 ?sharecode= 之类的参数做访问鉴权，
 * 丢掉它转发出去的链接就打不开。
 *
 * 但要**剔除路由参数**（inviter/treeId）：它们只属于 hash 路由，
 * 留在 search 里会随每次转发叠加，导致落地页拿到上一手的邀请人。
 *
 * @param {{treeId?:string, inviter?:string, path?:string}} opts
 */
export function buildH5ShareUrl(opts = {}) {
  const path = opts.path || '/pages/join/join'
  const qs = buildQuery({ treeId: opts.treeId, inviter: opts.inviter })
  // #ifdef H5
  const { origin, pathname } = window.location
  return `${origin}${pathname}${keepPlatformQuery(window.location.search)}#${path}${qs ? '?' + qs : ''}`
  // #endif
  // #ifndef H5
  return `${path}${qs ? '?' + qs : ''}`
  // #endif
}

/** 保留平台参数，剔除会串味的业务参数 */
function keepPlatformQuery(search) {
  const raw = String(search || '').replace(/^\?/, '')
  if (!raw) return ''
  const DROP = ['inviter', 'treeId', 'tree', 'scene']
  const kept = raw
    .split('&')
    .filter(Boolean)
    .filter((pair) => {
      const k = decodeURIComponent(pair.split('=')[0] || '')
      return DROP.indexOf(k) === -1
    })
  return kept.length ? '?' + kept.join('&') : ''
}

/** 复制到剪贴板（两端通用） */
export function copyText(text, tip = '链接已复制') {
  return new Promise((resolve) => {
    uni.setClipboardData({
      data: text,
      success: () => {
        uni.showToast({ title: tip, icon: 'none' })
        resolve(true)
      },
      fail: () => resolve(false)
    })
  })
}

/**
 * 解析进入参数，输出版本无关结构
 * @param {Object} options 页面 onLoad 的 options
 * @returns {{inviter:string, treeId:string}}
 */
export function parseEntry(options = {}) {
  let inviter = options.inviter || ''
  let treeId = options.treeId || options.tree || ''

  // 小程序扫码进入场景值
  if (!inviter && options.scene) {
    try {
      const scene = decodeURIComponent(options.scene)
      const kv = Object.fromEntries(
        scene
          .split('&')
          .map((s) => s.split('='))
          .filter((p) => p.length === 2)
      )
      inviter = kv.inviter || ''
      treeId = treeId || kv.treeId || ''
    } catch (e) {
      /* ignore */
    }
  }

  // #ifdef H5
  if (!inviter) {
    try {
      const raw = (window.location.hash || '').split('?')[1] || window.location.search.slice(1)
      const params = new URLSearchParams(raw)
      inviter = params.get('inviter') || ''
      treeId = treeId || params.get('treeId') || ''
    } catch (e) {
      /* ignore */
    }
  }
  // #endif

  return { inviter, treeId }
}
