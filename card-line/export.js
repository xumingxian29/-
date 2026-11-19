/**
 * 块 9 · 导出壳选择
 *
 * 这里是整条贺卡线唯一的平台分叉点：绘制 / 排版 / 图形完全共用，
 * 只有「怎么拿到画布」和「怎么存进相册」两端不同。
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
import {
  renderCardBlob,
  downloadBlob,
  releaseUrl,
  isWechatIOS,
  isWechat
} from './export.mp'
// #endif

export { renderCardBlob, downloadBlob, releaseUrl, isWechatIOS, isWechat }
