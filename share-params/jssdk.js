/**
 * 微信 JS-SDK：自定义分享卡片
 *
 * 只在「H5 + 微信内置浏览器 + 配置齐全」时生效，其余情况静默跳过，
 * 不影响页面本身。没配也不会报错，只是分享出去是白卡片。
 *
 * 三个前置条件（缺一不可，见 docs/h5-launch.md）：
 *   1. 认证过的公众号（订阅号认证也行）——未认证没有分享接口权限
 *   2. 域名已 ICP 备案，并配到公众号「JS 接口安全域名」
 *   3. 后端签名接口（用 AppSecret 算 signature，不能在前端算）
 */

import { ENABLE_JSSDK, WX_OA_APPID, WX_SIGN_URL, SHARE_TITLE, SHARE_DESC } from './env'

const SDK_SRC = 'https://res.wx.qq.com/open/js/jweixin-1.6.0.js'

let loadPromise = null
let configured = false

/** 是否在微信内置浏览器里 */
function isWeixin() {
  // #ifdef H5
  if (typeof navigator === 'undefined') return false
  return /micromessenger/i.test(navigator.userAgent || '')
  // #endif
  // #ifndef H5
  return false
  // #endif
}

function loadSdk() {
  // #ifdef H5
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'))
  if (window.wx) return Promise.resolve(window.wx)
  if (loadPromise) return loadPromise

  loadPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = SDK_SRC
    s.async = true
    s.onload = () => (window.wx ? resolve(window.wx) : reject(new Error('wx 未就绪')))
    s.onerror = () => reject(new Error('JS-SDK 加载失败'))
    document.head.appendChild(s)
  })
  return loadPromise
  // #endif
  // #ifndef H5
  return Promise.reject(new Error('not h5'))
  // #endif
}

/**
 * 签名用的 URL：必须去掉 # 及其后面部分
 * 本项目用 hash 路由，页面切换不改这段 URL，所以一次签名长期有效。
 */
function signUrl() {
  // #ifdef H5
  return window.location.href.split('#')[0]
  // #endif
  // #ifndef H5
  return ''
  // #endif
}

async function fetchSignature() {
  const res = await fetch(WX_SIGN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: signUrl() })
  })
  if (!res.ok) throw new Error('签名接口异常 ' + res.status)
  const json = await res.json()
  if (!json || !json.signature) throw new Error((json && json.msg) || '签名失败')
  return json
}

/**
 * 初始化并设置分享内容
 * @param {{title?:string, desc?:string, link?:string, imgUrl?:string}} opts
 * @returns {Promise<boolean>} 是否成功启用
 */
export async function setupShare(opts = {}) {
  if (!ENABLE_JSSDK || !WX_OA_APPID || !WX_SIGN_URL) return false
  if (!isWeixin()) return false

  try {
    const wx = await loadSdk()

    if (!configured) {
      const sign = await fetchSignature()
      await new Promise((resolve) => {
        wx.config({
          debug: false,
          appId: WX_OA_APPID,
          timestamp: sign.timestamp,
          nonceStr: sign.nonceStr,
          signature: sign.signature,
          jsApiList: [
            'updateAppMessageShareData',
            'updateTimelineShareData',
            'onMenuShareAppMessage',
            'onMenuShareTimeline'
          ]
        })
        wx.ready(() => resolve())
        wx.error((err) => {
          console.warn('[jssdk] config 失败', err)
          resolve()
        })
      })
      configured = true
    }

    const payload = {
      title: opts.title || SHARE_TITLE,
      desc: opts.desc || SHARE_DESC,
      link: opts.link || signUrl(),
      imgUrl: opts.imgUrl || ''
    }

    // 新版接口
    wx.updateAppMessageShareData({ ...payload })
    wx.updateTimelineShareData({ title: payload.title, link: payload.link, imgUrl: payload.imgUrl })
    // 旧版兜底（部分老版本微信仍走这里）
    wx.onMenuShareAppMessage({ ...payload })
    wx.onMenuShareTimeline({ title: payload.title, link: payload.link, imgUrl: payload.imgUrl })

    return true
  } catch (e) {
    console.warn('[jssdk] 未启用自定义分享：', e && e.message)
    return false
  }
}
