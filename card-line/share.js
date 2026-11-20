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
import { decodeSeed, encodeSeed, normalizeSeed } from './random'

/**
 * 构造贺卡分享链接
 *
 * 三个参数各管一件事，缺一个朋友看到的就不是同一张卡：
 *   s  = 画面种子
 *   ws = 祝福语种子（只在它和画面种子不同时才带，链接才不啰嗦）
 *   w  = 被「换一句」钉住的句子下标（钉住了才带，它的优先级高于 ws）
 *
 * 为什么必须有 ws：
 *   祝福语已经和画面解耦 —— 用户换过画面之后，wishSeed 仍是进场时那颗，
 *   和 s 不再相等。只带 s 的话，朋友点开算出来的是"按这张画的种子抽的句子"，
 *   和图上印的不是同一句。
 */
export function buildCardShareUrl({ seed, wishSeed, wishIndex } = {}) {
  const code = seed == null ? '' : encodeSeed(seed)
  const params = {}
  if (code) params.s = code

  if (wishSeed != null && normalizeSeed(wishSeed) !== normalizeSeed(seed)) {
    params.ws = encodeSeed(wishSeed)
  }
  if (Number.isInteger(wishIndex) && wishIndex >= 0) params.w = String(wishIndex)
  return buildUrl(CARD_PATH, params)
}

/**
 * 解析进入参数：从分享链接来的画面种子、祝福种子与祝福语下标
 *
 * 分享参数是外部输入，可能是任何人手改的字符串 ——
 * 解析不出来就返回 null，让页面走"随机一张"，不报错、不白屏。
 */
export function parseCardEntry(options = {}) {
  let raw = options.s || options.seed || ''
  let rawW = options.w == null ? '' : String(options.w)
  let rawWs = options.ws == null ? '' : String(options.ws)

  // #ifdef H5
  if (!raw || !rawW || !rawWs) {
    try {
      const hashQuery = (window.location.hash || '').split('?')[1] || ''
      const search = window.location.search.slice(1)
      const fromHash = new URLSearchParams(hashQuery)
      const fromSearch = new URLSearchParams(search)
      raw = raw || fromHash.get('s') || fromSearch.get('s') || ''
      rawW = rawW || fromHash.get('w') || fromSearch.get('w') || ''
      rawWs = rawWs || fromHash.get('ws') || fromSearch.get('ws') || ''
    } catch (e) {
      /* ignore */
    }
  }
  // #endif

  const seed = decodeSeed(String(raw || ''))
  const n = Number(rawW)
  const wishIndex = rawW !== '' && Number.isInteger(n) && n >= 0 ? n : null
  return { seed, wishSeed: decodeSeed(String(rawWs || '')), wishIndex }
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
