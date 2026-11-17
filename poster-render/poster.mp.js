// #ifdef MP-WEIXIN
/**
 * 小程序海报：canvas 2d 节点 → canvasToTempFilePath
 *
 * 关键坑位（已验证）：
 *  1. 必须 uni.createSelectorQuery().in(getCurrentInstance())，否则选不到节点
 *  2. canvas 实例不能放进 reactive/ref，Vue3 代理后传给 canvasToTempFilePath 会变成 undefined
 *  3. 尺寸要乘 dpr，导出 destWidth 也乘，否则糊
 *  4. 导出后父组件应立刻隐藏画布，用 <image> 展示结果
 */

import { getCurrentInstance } from 'vue'
import { drawPoster } from './draw'

function getCanvasNode(canvasId) {
  return new Promise((resolve, reject) => {
    const instance = getCurrentInstance()
    const query = uni.createSelectorQuery().in(instance ? instance.proxy : undefined)
    query
      .select('#' + canvasId)
      .fields({ node: true, size: true })
      .exec((res) => {
        const target = res && res[0]
        if (!target || !target.node) {
          reject(new Error('画布未就绪，请稍后重试'))
          return
        }
        resolve(target.node)
      })
  })
}

function loadImageOnCanvas(canvas, src) {
  return new Promise((resolve) => {
    if (!src) return resolve(null)
    const img = canvas.createImage()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

/**
 * @param {{theme:Object, node:Object, total?:number, rank?:number|null, canvasId?:string, width?:number, height?:number}} opts
 * @returns {Promise<{tempFilePath:string}>}
 */
export async function makePoster(opts) {
  const W = opts.width || 750
  const H = opts.height || 1000
  const canvasId = opts.canvasId || 'posterCanvas'

  const canvas = await getCanvasNode(canvasId)
  const sys = uni.getSystemInfoSync()
  const dpr = Math.min(sys.pixelRatio || 2, 2)

  canvas.width = W * dpr
  canvas.height = H * dpr
  const ctx = canvas.getContext('2d')
  ctx.scale(dpr, dpr)

  const avatar = await loadImageOnCanvas(
    canvas,
    opts.node && (opts.node.avatarUrl || opts.node.avatar)
  )

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

  return new Promise((resolve, reject) => {
    uni.canvasToTempFilePath({
      canvas,
      x: 0,
      y: 0,
      width: W,
      height: H,
      destWidth: W * dpr,
      destHeight: H * dpr,
      success: (res) => resolve({ tempFilePath: res.tempFilePath }),
      fail: (err) => reject(new Error(err.errMsg || '海报生成失败'))
    })
  })
}

/** 保存到相册（需要隐私声明 scope.writePhotosAlbum） */
export function saveImage(tempFilePath) {
  return new Promise((resolve, reject) => {
    uni.saveImageToPhotosAlbum({
      filePath: tempFilePath,
      success: () => resolve(true),
      fail: (err) => {
        const msg = err.errMsg || ''
        if (msg.indexOf('auth deny') > -1 || msg.indexOf('authorize') > -1) {
          reject(new Error('需要相册权限，请在设置中允许'))
        } else {
          reject(new Error('保存失败'))
        }
      }
    })
  })
}
// #endif
