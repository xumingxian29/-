/**
 * 块 9 · 导出壳选择
 *
 * 贺卡线目前只做 H5。将来接小程序时，新增 export.mp.js
 * （wx.canvasToTempFilePath + saveImageToPhotosAlbum），只改这个文件，
 * render / layout / text / motifs 一行都不用动。
 */

// #ifdef H5
import {
  renderCardBlob,
  downloadBlob,
  releaseUrl,
  isWechatIOS,
  isWechat
} from './export.h5'
// #endif

// #ifndef H5
const NOT_READY = '贺卡线当前只实现 H5 端，小程序端待接 export.mp.js'
const renderCardBlob = () => Promise.reject(new Error(NOT_READY))
const downloadBlob = () => false
const releaseUrl = () => {}
const isWechatIOS = () => false
const isWechat = () => false
// #endif

export { renderCardBlob, downloadBlob, releaseUrl, isWechatIOS, isWechat }
