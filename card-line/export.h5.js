// #ifdef H5
/**
 * 块 8 · 导出（H5 实现）
 *
 * 为什么不直接 toDataURL 塞 <img>：
 *   1. data URI 很长，iOS Safari 上有长度与解码风险
 *   2. 微信内置浏览器长按 data URI 图片经常不出"保存到手机"菜单
 * 所以这里产出 blob + objectURL：预览用 blob，保存走 a[download]，
 * 下载不可用时页面再退化成"长按保存"的提示文案。
 */

import { drawCard } from './render'
import { CARD_FILE_PREFIX } from './config'

/** 建离屏画布。scale 用于导出 2 倍图（默认 1 倍即 750×1000） */
export function createCanvas(width, height, scale = 1) {
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(width * scale)
  canvas.height = Math.round(height * scale)
  const ctx = canvas.getContext('2d')
  if (scale !== 1) ctx.scale(scale, scale)
  return { canvas, ctx }
}

export function dataUrlToBlob(dataUrl) {
  const parts = String(dataUrl).split(',')
  const meta = parts[0] || ''
  const body = parts[1] || ''
  const mime = (meta.match(/:(.*?);/) || [])[1] || 'image/png'
  const binary = atob(body)
  const len = binary.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

export function canvasToBlob(canvas, type = 'image/png') {
  return new Promise((resolve, reject) => {
    if (typeof canvas.toBlob === 'function') {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob)
        else reject(new Error('canvas.toBlob 返回空'))
      }, type)
      return
    }
    // 极老内核兜底
    try {
      resolve(dataUrlToBlob(canvas.toDataURL(type)))
    } catch (e) {
      reject(e)
    }
  })
}

/**
 * 画卡并导出
 * @param {Object} spec 同 drawCard 的 spec
 * @returns {Promise<{blob:Blob, url:string, width:number, height:number, paper:Object}>}
 */
export async function renderCardBlob(spec) {
  const width = spec.width
  const height = spec.height
  const { canvas, ctx } = createCanvas(width, height, 1)
  const paper = drawCard(ctx, { ...spec, width, height })
  const blob = await canvasToBlob(canvas)
  return { blob, url: URL.createObjectURL(blob), width, height, paper }
}

/** 触发下载；返回 false 表示当前环境不支持（调用方改提示长按） */
export function downloadBlob(blob, filename) {
  try {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename || `${CARD_FILE_PREFIX}-${Date.now()}.png`
    a.rel = 'noopener'
    a.style.display = 'none'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 5000)
    return true
  } catch (e) {
    return false
  }
}

export function releaseUrl(url) {
  if (url && String(url).startsWith('blob:')) {
    try {
      URL.revokeObjectURL(url)
    } catch (e) {
      /* ignore */
    }
  }
}

/**
 * 微信内 + iOS：a[download] 基本不生效，只能引导长按。
 * Android 微信部分版本可以下载，先试再退。
 */
export function isWechatIOS() {
  const ua = (navigator.userAgent || '').toLowerCase()
  const isWx = ua.includes('micromessenger')
  const isIOS = /iphone|ipad|ipod/.test(ua) || (ua.includes('macintosh') && 'ontouchend' in document)
  return isWx && isIOS
}

export function isWechat() {
  return (navigator.userAgent || '').toLowerCase().includes('micromessenger')
}
// #endif
