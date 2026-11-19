// #ifndef H5
/**
 * 块 8b · 导出（小程序实现）
 *
 * 与 H5 的差别只有三处，绘制/排版/图形一行都不改：
 *   1. 画布来自页面里的 <canvas type="2d">，不是 document.createElement
 *   2. 导出走 canvasToTempFilePath，拿到的是临时文件路径（可直接给 <image>）
 *   3. 保存走 saveImageToPhotosAlbum，失败要区分「用户拒绝授权」并引导去设置
 *
 * 为什么用 Canvas 2D 而不是老的 canvas-id：
 *   老接口要 ctx.draw() 且 measureText 不可靠，贺卡排版整块依赖 measureText。
 */

import { drawCard } from './render'
import { CARD_CANVAS_ID } from './config'

/** 取页面里的 canvas 节点（Canvas 2D 必须拿真实 node，不是 id 字符串） */
function getCanvasNode() {
  return new Promise((resolve, reject) => {
    uni
      .createSelectorQuery()
      .select('#' + CARD_CANVAS_ID)
      .fields({ node: true, size: true })
      .exec((res) => {
        const first = res && res[0]
        if (!first || !first.node) {
          reject(new Error('画布还没准备好，请重试'))
          return
        }
        resolve(first.node)
      })
  })
}

/** 画布 → 临时文件。uni 走不通时退回原生 wx 接口（两者参数一致） */
function toTempFile(canvas, width, height) {
  const options = {
    canvas,
    x: 0,
    y: 0,
    width,
    height,
    destWidth: width,
    destHeight: height,
    fileType: 'png',
    quality: 1
  }

  return new Promise((resolve, reject) => {
    const viaWx = () => {
      if (typeof wx !== 'undefined' && typeof wx.canvasToTempFilePath === 'function') {
        wx.canvasToTempFilePath({
          ...options,
          success: (res) => resolve(res.tempFilePath),
          fail: (err) => reject(new Error((err && err.errMsg) || '导出图片失败'))
        })
        return
      }
      reject(new Error('当前环境不支持导出图片'))
    }

    uni.canvasToTempFilePath({
      ...options,
      success: (res) => resolve(res.tempFilePath),
      fail: viaWx
    })
  })
}

/**
 * 画卡并导出
 * @param {Object} spec 同 drawCard 的 spec
 * @returns {Promise<{blob:string, url:string, width:number, height:number, paper:Object}>}
 *   blob 这里是临时文件路径（保持与 H5 同名，页面不用分支）
 */
export async function renderCardBlob(spec) {
  const width = Math.round(spec.width)
  const height = Math.round(spec.height)

  const canvas = await getCanvasNode()
  // 画布 CSS 尺寸与像素尺寸都是 750×1000，1:1 导出，不用再乘 dpr
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, width, height)

  const paper = drawCard(ctx, { ...spec, width, height })
  const url = await toTempFile(canvas, width, height)

  return { blob: url, url, width, height, paper }
}

/**
 * 存相册
 * @param {string} filePath renderCardBlob 返回的临时文件路径
 * @returns {Promise<boolean>} true 表示真的存进去了
 */
export function downloadBlob(filePath) {
  return new Promise((resolve) => {
    if (!filePath) {
      resolve(false)
      return
    }

    uni.saveImageToPhotosAlbum({
      filePath,
      success: () => resolve(true),
      fail: (err) => {
        const msg = String((err && (err.errMsg || err.message)) || '')
        // 用户拒过一次后会一直走到这里，必须给一个能跳设置的入口，否则永远存不上
        if (/auth|authorize|deny/i.test(msg)) {
          uni.showModal({
            title: '需要相册权限',
            content: '保存贺卡需要「保存到相册」权限，去设置里打开一下？',
            confirmText: '去设置',
            cancelText: '先不存',
            success: (r) => {
              if (r.confirm) uni.openSetting({})
            }
          })
        }
        resolve(false)
      }
    })
  })
}

/** 临时文件由微信自己回收，这里不需要额外操作（保留同名导出，页面不用分支） */
export function releaseUrl() {}

/** 小程序里不存在「微信内 iOS 浏览器长按 data URI 失效」的问题 */
export function isWechatIOS() {
  return false
}

export function isWechat() {
  return true
}
// #endif
