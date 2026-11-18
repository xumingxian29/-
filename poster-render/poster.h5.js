// #ifdef H5
/**
 * H5 海报：离屏 canvas → toDataURL
 * 头像统一用 dataURL/blob，避免画布被跨域污染导致 toDataURL 抛 SecurityError
 */

import { drawPoster } from './draw'

function loadImage(src) {
  return new Promise((resolve, reject) => {
    if (!src) return resolve(null)
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

/**
 * @param {{theme:Object, node:Object, total?:number, rank?:number|null, width?:number, height?:number}} opts
 * @returns {Promise<{dataUrl:string, width:number, height:number}>}
 */
export async function makePoster(opts) {
  const W = opts.width || 750
  const H = opts.height || 1000
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')

  const avatar = await loadImage(opts.node && (opts.node.avatarUrl || opts.node.avatar))

  drawPoster(ctx, {
    width: W,
    height: H,
    theme: opts.theme,
    avatar,
    nickname: opts.node && opts.node.nickname,
    wish: opts.node && opts.node.wish,
    blessCount: (opts.node && opts.node.blessCount) || 0,
    total: opts.total || 0,
    rank: opts.rank || null
  })

  // JPEG：750×1000 的 PNG 约 1–2MB，JPEG(0.92) 约 150KB，内存和传输都更省
  return { dataUrl: canvas.toDataURL('image/jpeg', 0.92), width: W, height: H }
}
// #endif
