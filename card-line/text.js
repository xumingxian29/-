/**
 * 块 3 · 文字排版
 *
 * 这里只干两件事：把字设对、把字折对。
 *
 * ⚠️ 踩过的坑：canvas 的 ctx.font 必须是完整 CSS font 简写，
 * 传裸数字（例如 ctx.font = 26）浏览器会静默忽略，沿用上一个字体，
 * 结果 measureText 用错字号算宽度 —— 表现为"每行只有一个字"。
 * 所以本模块所有函数都要求显式传 size，内部统一用 fontString() 拼装。
 */

import { CARD_FONT } from './config'

/** 避头点：这些字符不允许出现在行首（中文排版的基本要求） */
const NO_LINE_START = '，。、；：！？）》」』】…—,.;:!?)]}'

/** 拼 CSS font 简写，size 必须是有单位之外的正数（px 由这里补） */
export function fontString(size, weight = 600, family = CARD_FONT) {
  const s = Number(size)
  if (!Number.isFinite(s) || s <= 0) {
    throw new TypeError(`fontString 需要正整数 size，收到 ${size}`)
  }
  return `${weight} ${s}px ${family}`
}

/** 设置字体后测量宽度 */
export function measureWidth(ctx, text, size, weight) {
  ctx.font = fontString(size, weight)
  return ctx.measureText(String(text || '')).width
}

/**
 * 按字符折行，超出行数则末行省略号
 * @returns {{lines:string[], truncated:boolean}}
 */
export function wrapText(ctx, text, maxWidth, opts = {}) {
  const { maxLines = 3, size = 34, weight = 600 } = opts
  ctx.font = fontString(size, weight)

  const chars = Array.from(String(text || ''))
  if (!chars.length) return { lines: [''], truncated: false }

  const lines = []
  let line = ''

  for (let i = 0; i < chars.length; i++) {
    const test = line + chars[i]
    if (ctx.measureText(test).width <= maxWidth || !line) {
      line = test
      continue
    }

    // 当前行满了，要换行
    // 避头点：标点不能落在行首，宁可让上一行轻微超宽（视觉上比孤立标点好得多）
    if (NO_LINE_START.includes(chars[i]) && line.length > 1) {
      line = test
      continue
    }

    if (lines.length === maxLines - 1) {
      // 已是最后一行容量：把剩下的全塞进来，裁到放得下再补省略号
      const restAll = line + chars.slice(i).join('')
      let rest = restAll
      while (rest.length > 1 && ctx.measureText(rest + '…').width > maxWidth) {
        rest = rest.slice(0, -1)
      }
      const truncated = rest.length < restAll.length
      lines.push(truncated ? rest + '…' : rest)
      return { lines, truncated }
    }

    lines.push(line)
    line = chars[i]
  }

  if (line) lines.push(line)
  return { lines, truncated: false }
}

/**
 * 自动降字号，直到内容能放进 maxLines
 * 长祝福语不会被砍成省略号，优先缩字号，缩到底才截断。
 * @returns {{lines:string[], size:number, lineHeight:number, truncated:boolean}}
 */
export function fitText(ctx, text, opts = {}) {
  const {
    maxWidth = 500,
    maxLines = 3,
    size = 34,
    minSize = 24,
    weight = 600,
    lineHeightRatio = 1.55,
    step = 2
  } = opts

  for (let s = size; s >= minSize; s -= step) {
    const probe = wrapText(ctx, text, maxWidth, { maxLines: maxLines + 1, size: s, weight })
    if (probe.lines.length <= maxLines) {
      return { lines: probe.lines, size: s, lineHeight: s * lineHeightRatio, truncated: false }
    }
  }

  const result = wrapText(ctx, text, maxWidth, { maxLines, size: minSize, weight })
  return {
    lines: result.lines,
    size: minSize,
    lineHeight: minSize * lineHeightRatio,
    truncated: true
  }
}
