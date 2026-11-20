/**
 * 贺卡线对外唯一入口
 *
 * 分装清单（每块单一职责，可单独替换）：
 *   config.js     常量：画布尺寸、排版规则、存储 key
 *   theme.js      从 themes/*.js 的 card 段取配置，缺失自动回退
 *   random.js     确定性随机：seed ↔ 短码、配色×角色×粒子 组合
 *   safety.js     内容安全闸：文案命中兜底 + 名字严格裁决（拒绝而非替换）
 *   text.js       字体串拼装 + 折行 + 自动降字号 + 单行自适应（名字专用）
 *   mascots.js    可爱角色：雪人/企鹅/姜饼人/小熊/礼物/铃铛/袜子/花环
 *   motifs.js     图形调度（含老的雪花/麋鹿/树，保证旧链接仍能画）
 *   layout.js     版面比例计算 + 合法性自检
 *   render.js     drawCard(ctx, spec) 纯绘制
 *   state.js      选择状态与本地记忆，脏数据收敛
 *   export.h5.js  H5 导出：blob + 下载 + 微信长按兜底
 *   export.mp.js  小程序导出：Canvas 2D 节点 + canvasToTempFilePath + 存相册
 *   export.js     导出壳选择（平台分叉点之一）
 *   music.js      背景音乐壳（平台分叉点之二）：H5 合成 / 小程序音频文件
 *   share.js      分享链接与分享动作
 *
 * 页面只 import 这个文件，不直接摸内部模块。
 */

export {
  CARD_PATH,
  CARD_CANVAS,
  CARD_CANVAS_ID,
  CARD_TEXT,
  CARD_NAME,
  CARD_PAPER,
  CARD_FONT,
  CARD_STORAGE_KEY,
  CARD_FILE_PREFIX,
  CARD_MUSIC
} from './config'

export { pickCardTheme, findMascot, styleSpaceSize } from './theme'

export {
  createRng,
  normalizeSeed,
  encodeSeed,
  decodeSeed,
  randomSeed,
  nextSeed,
  pickWishIndex,
  buildArtwork
} from './random'

export {
  scanText,
  sanitizeText,
  sanitizeName,
  clampName,
  scanAll,
  MAX_TEXT_LEN,
  MAX_NAME_LEN
} from './safety'

export {
  createState,
  normalizeState,
  reroll,
  nextWish,
  resolveWishIndex,
  selectPreset,
  loadState,
  saveState,
  resolveSelection
} from './state'

export { fontString, measureWidth, wrapText, fitText, fitLine } from './text'

export { computeLayout, paperBox, validateLayout, DECO_POINTS } from './layout'

export {
  drawMotif,
  drawStar,
  drawSnowflake,
  drawDeer,
  drawTree
} from './motifs'

export {
  drawMascot,
  drawSnowman,
  drawPenguin,
  drawGingerbread,
  drawBear,
  drawGift,
  drawBell,
  drawSock,
  drawWreath,
  drawStarPet,
  MASCOT_SCALE
} from './mascots'

export { drawCard } from './render'

export { renderCardBlob, downloadBlob, releaseUrl, isWechatIOS, isWechat } from './export'

export { buildCardShareUrl, parseCardEntry, shareCard } from './share'

export { createMusic } from './music'
