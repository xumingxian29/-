/**
 * 贺卡线对外唯一入口
 *
 * 分装清单（每块单一职责，可单独替换）：
 *   config.js     常量：画布尺寸、排版规则、存储 key
 *   theme.js      从 themes/*.js 的 card 段取配置，缺失自动回退
 *   text.js       字体串拼装 + 折行 + 自动降字号
 *   motifs.js     雪花 / 麋鹿 / 圣诞树，全矢量路径
 *   layout.js     版面比例计算 + 合法性自检
 *   render.js     drawCard(ctx, spec) 纯绘制
 *   state.js      选择状态与本地记忆，脏数据收敛
 *   export.h5.js  H5 导出：blob + 下载 + 微信长按兜底
 *   export.js     导出壳选择（将来接小程序只改这里）
 *   share.js      分享链接与分享动作
 *
 * 页面只 import 这个文件，不直接摸内部模块。
 */

export {
  CARD_PATH,
  CARD_CANVAS,
  CARD_TEXT,
  CARD_PAPER,
  CARD_FONT,
  CARD_STORAGE_KEY,
  CARD_FILE_PREFIX
} from './config'

export { pickCardTheme, findTemplate } from './theme'

export {
  createState,
  normalizeState,
  selectTemplate,
  selectPreset,
  loadState,
  saveState,
  resolveSelection
} from './state'

export { fontString, measureWidth, wrapText, fitText } from './text'

export { computeLayout, paperBox, validateLayout, DECO_POINTS } from './layout'

export {
  drawMotif,
  drawStar,
  drawSnowflake,
  drawDeer,
  drawTree
} from './motifs'

export { drawCard } from './render'

export { renderCardBlob, downloadBlob, releaseUrl, isWechatIOS, isWechat } from './export'

export { buildCardShareUrl, parseCardEntry, shareCard } from './share'
