/**
 * 块 1 · 常量
 *
 * 贺卡线所有"魔法数字"都在这里，别处一律引用。
 * 视觉颜色不进这个文件 —— 颜色只在 themes/*.js 的 card 段里。
 */

/** 贺卡页路由，分享链接与页面跳转共用 */
export const CARD_PATH = '/pages/card/card'

/** 画布尺寸：3:4，朋友圈与手机竖屏都能完整显示 */
export const CARD_CANVAS = { width: 750, height: 1000 }

/**
 * 小程序端离屏画布的节点 id
 * 页面里必须有对应 <canvas type="2d">，H5 端不需要（走 document.createElement）
 */
export const CARD_CANVAS_ID = 'card-canvas'

/** 祝福语排版规则 */
export const CARD_TEXT = {
  maxLines: 3,
  size: 34,
  minSize: 24,
  weight: 600,
  lineHeightRatio: 1.55
}

/**
 * 称呼行规则
 *
 * 名字和祝福语是两套排版策略，不能共用 fitText：
 *   祝福语可以折行、可以加省略号收尾（"愿你被这个世界温柔以…"能读）；
 *   名字不行 —— "张小…" 是事故。所以名字单行、只降字号、绝不折行。
 */
export const CARD_NAME = {
  maxLen: 12,
  size: 26,
  minSize: 18,
  weight: 500,
  /** 称呼行与祝福语之间的间距 */
  gap: 14,
  /** 称呼行的行高倍数，用于算白卡内容总高 */
  lineHeightRatio: 1.4
}

/** 白卡内边距 */
export const CARD_PAPER = { padX: 44, padV: 34 }

/** canvas 字体栈：必须是系统字体，不引外链字体（画布不等待字体加载） */
export const CARD_FONT = 'PingFang SC, Hiragino Sans GB, Microsoft YaHei, sans-serif'

/** 本地记住上次选择，下次进来还是那套 */
export const CARD_STORAGE_KEY = 'ft_card_choice_v1'

/** 导出文件名前缀 */
export const CARD_FILE_PREFIX = 'christmas-card'
