/**
 * 图片处理统一出口
 *
 * 平台边界文件：这里是少数允许出现平台 API 的文件之一（另一个是 core/poster/*）。
 * 页面与组件只调用 pickAvatar()，永远不直接碰 chooseImage / document / Image。
 */

/**
 * @typedef {Object} PickedAvatar
 * @property {string} path    本地临时路径（可直接用于 <image src>）
 * @property {number} width
 * @property {number} height
 * @property {string} dataUrl 已压缩的小图（H5 用于本地持久化与海报绘制；小程序为空串）
 */

/** 取图片信息（两端通用） */
export function getImageInfo(path) {
  return new Promise((resolve, reject) => {
    uni.getImageInfo({
      src: path,
      success: (res) => resolve({ width: res.width, height: res.height }),
      fail: reject
    })
  })
}

// #ifdef H5
/**
 * H5 端：把选中的图压缩成 ≤max×max 的 dataURL
 * 目的有三：本地可持久化（blob URL 刷新即失效）、海报绘制不跨域、体积可控
 */
function shrinkToDataUrl(src, max = 200, quality = 0.78) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const ratio = Math.min(1, max / Math.max(img.width, img.height))
      const w = Math.max(1, Math.round(img.width * ratio))
      const h = Math.max(1, Math.round(img.height * ratio))
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, w, h)
      resolve({ dataUrl: canvas.toDataURL('image/jpeg', quality), width: w, height: h })
    }
    img.onerror = () => reject(new Error('图片读取失败'))
    img.src = src
  })
}
// #endif

/**
 * 选择并处理头像
 * @returns {Promise<PickedAvatar>}
 */
export function pickAvatar() {
  return new Promise((resolve, reject) => {
    uni.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: async (res) => {
        const path = (res.tempFilePaths && res.tempFilePaths[0]) || ''
        if (!path) return reject(new Error('未选择图片'))
        try {
          const info = await getImageInfo(path)

          // #ifdef H5
          const out = await shrinkToDataUrl(path, 200)
          resolve({ path, width: out.width, height: out.height, dataUrl: out.dataUrl })
          // #endif

          // #ifndef H5
          resolve({ path, width: info.width, height: info.height, dataUrl: '' })
          // #endif
        } catch (e) {
          reject(e)
        }
      },
      fail: (err) => reject(err)
    })
  })
}

/** 生成默认头像（纯前端，不依赖网络） */
export function makeFallbackAvatar(text = '?', bg = '#2F6B52') {
  const ch = (text || '?').slice(0, 1)
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128">` +
    `<rect width="128" height="128" fill="${bg}"/>` +
    `<text x="64" y="82" font-size="60" fill="#F5F3EC" text-anchor="middle" ` +
    `font-family="PingFang SC,Microsoft YaHei,sans-serif">${ch}</text></svg>`
  // #ifdef H5
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
  // #endif
  // #ifndef H5
  return ''
  // #endif
}
