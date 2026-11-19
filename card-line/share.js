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
 */

import { buildUrl, copyText } from '@/core/share'
import { CARD_PATH } from './config'

/**
 * 构造贺卡分享链接
 * 保留 sharecode，并把模板带过去 —— 朋友点开看到的是同一套画面
 */
export function buildCardShareUrl({ templateId } = {}) {
  return buildUrl(CARD_PATH, { tpl: templateId })
}

/** 解析进入参数：从分享链接来的模板 id */
export function parseCardEntry(options = {}) {
  let tpl = options.tpl || options.templateId || ''

  // #ifdef H5
  if (!tpl) {
    try {
      const raw = (window.location.hash || '').split('?')[1] || window.location.search.slice(1)
      tpl = new URLSearchParams(raw).get('tpl') || ''
    } catch (e) {
      /* ignore */
    }
  }
  // #endif

  return { tpl }
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
