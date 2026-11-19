/**
 * 块 10 · 分享
 *
 * H5 端分享的三层现实：
 *   1. 微信内 + 已配 JS-SDK  → 自定义卡片（标题/缩略图），需后端签名
 *   2. 系统支持 navigator.share → 拉起系统分享面板
 *   3. 都没有            → 复制链接
 *
 * 这里只做 2 和 3。第 1 层复用 core/jssdk.js（wxsign 云函数），
 * 页面已接入 setupShare，配好域名即生效，不需要改本模块。
 *
 * 分享的不是"某个模板"，而是**这张画本身**：链接里带 seed，
 * 朋友点开就是一模一样的一张，连角色朝向、粒子位置都相同。
 */

import { buildUrl, copyText } from '@/core/share'
import { CARD_PATH } from './config'
import { decodeSeed, encodeSeed } from './random'

/**
 * 构造贺卡分享链接
 * 保留 sharecode，把 seed 带过去；祝福语被钉住过（用户点了「换一句」）时再带一个 w。
 *
 * 为什么祝福语要进链接：
 *   链接里只有 seed 时，祝福语由 seed 决定，能复现；
 *   可用户一旦按了「换一句」，这句话就脱离了 seed —— 不带上 w，
 *   朋友点开看到的是"按 seed 抽出来的那句"，和图上印的不是同一句。
 */
export function buildCardShareUrl({ seed, wishIndex } = {}) {
  const code = seed == null ? '' : encodeSeed(seed)
  const params = {}
  if (code) params.s = code
  if (Number.isInteger(wishIndex) && wishIndex >= 0) params.w = String(wishIndex)
  return buildUrl(CARD_PATH, params)
}

/**
 * 解析进入参数：从分享链接来的 seed 与祝福语下标
 *
 * 分享参数是外部输入，可能是任何人手改的字符串 ——
 * 解析不出来就返回 null，让页面走"随机一张"，不报错、不白屏。
 */
export function parseCardEntry(options = {}) {
  let raw = options.s || options.seed || ''
  let rawW = options.w == null ? '' : String(options.w)

  // #ifdef H5
  if (!raw || !rawW) {
    try {
      const hashQuery = (window.location.hash || '').split('?')[1] || ''
      const search = window.location.search.slice(1)
      const fromHash = new URLSearchParams(hashQuery)
      const fromSearch = new URLSearchParams(search)
      raw = raw || fromHash.get('s') || fromSearch.get('s') || ''
      rawW = rawW || fromHash.get('w') || fromSearch.get('w') || ''
    } catch (e) {
      /* ignore */
    }
  }
  // #endif

  const seed = decodeSeed(String(raw || ''))
  const n = Number(rawW)
  const wishIndex = rawW !== '' && Number.isInteger(n) && n >= 0 ? n : null
  return { seed, wishIndex }
}

/**
 * 拉起分享
 * @returns {Promise<'shared'|'cancel'|'copied'|'failed'>}
 */
export async function shareCard({ url, title, text }) {
  // #ifdef H5
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, text, url })
      return 'shared'
    } catch (e) {
      if (e && e.name === 'AbortError') return 'cancel'
      // 其他错误（不支持 url 字段等）继续走复制兜底
    }
  }
  // #endif

  const ok = await copyText(url)
  return ok ? 'copied' : 'failed'
}
