/**
 * 块 6 · 绘制
 *
 * 纯 Canvas2D，零平台 API、零 DOM、零 uni.*。
 * 输入一个 ctx 和一份 spec，画完就结束 —— 所以它能在浏览器、小程序、
 * Node + mock ctx（自测）三种环境里跑同一份代码。
 */

import { computeLayout, paperBox, DECO_POINTS } from './layout'
import { fitLine, fitText, fontString } from './text'
import { drawMotif, drawStar } from './motifs'
import { CARD_CANVAS, CARD_NAME, CARD_TEXT, CARD_PAPER } from './config'

/**
 * 卡片上的文字色兜底值：只有老模板（没带 text 字段）才会用到。
 * 随机造型会按背景明度给一套，浅背景上这套白字会直接看不见。
 */
const CARD_INK = {
  tag: 'rgba(255, 255, 255, 0.78)',
  title: '#FFFFFF',
  footer: 'rgba(255, 255, 255, 0.60)'
}

function inkOf(template) {
  const t = template.text || {}
  return {
    tag: t.tag || CARD_INK.tag,
    title: t.title || CARD_INK.title,
    footer: t.footer || CARD_INK.footer
  }
}

function drawBackground(ctx, width, height, template) {
  const grad = ctx.createLinearGradient(0, 0, 0, height)
  grad.addColorStop(0, template.bg[0])
  grad.addColorStop(1, template.bg[1])
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, width, height)
}

/**
 * 单颗装饰粒子。位置是比例坐标，形状由 seed 决定 ——
 * 随机造型下用它，固定模板下退回 DECO_POINTS 的圆点。
 */
function drawParticle(ctx, p, width, height, color) {
  const x = p.x * width
  const y = p.y * height
  ctx.save()
  ctx.globalAlpha = p.alpha == null ? 0.8 : p.alpha

  if (p.kind === 'star') {
    drawStar(ctx, x, y, p.r * 1.7, color)
  } else if (p.kind === 'snow') {
    ctx.strokeStyle = color
    ctx.lineWidth = 1.7
    ctx.lineCap = 'round'
    const arm = p.r * 1.7
    for (let i = 0; i < 3; i++) {
      const a = (Math.PI / 3) * i
      ctx.beginPath()
      ctx.moveTo(x + Math.cos(a) * arm, y + Math.sin(a) * arm)
      ctx.lineTo(x - Math.cos(a) * arm, y - Math.sin(a) * arm)
      ctx.stroke()
    }
  } else {
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(x, y, p.r, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

/** 装饰点用小圆点，不用字符 —— 字符受字体影响，圆点不会 */
function drawDeco(ctx, width, height, template) {
  ctx.save()
  ctx.fillStyle = template.deco

  if (template.particles && template.particles.length) {
    template.particles.forEach((p) => drawParticle(ctx, p, width, height, template.deco))
  } else {
    DECO_POINTS.forEach(([px, py], i) => {
      ctx.beginPath()
      ctx.arc(px * width, py * height, i % 3 === 0 ? 4.5 : 3, 0, Math.PI * 2)
      ctx.fill()
    })
  }

  ctx.restore()
}

function drawHeadline(ctx, L, template, copy, ink) {
  ctx.save()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  // 模板名小标签
  ctx.fillStyle = ink.tag
  ctx.font = fontString(L.tag.size, 600)
  ctx.fillText(`· ${template.tag || template.name} ·`, L.tag.x, L.tag.y)

  // 主标题
  ctx.fillStyle = ink.title
  ctx.font = fontString(L.title.size, 800)
  ctx.fillText(copy.heroTitle || '圣诞快乐', L.title.x, L.title.y)

  ctx.restore()
}

function drawWishPaper(ctx, L, spec) {
  const { wish, greeting, paperStyle } = spec
  const paper = paperStyle || { fill: 'rgba(255,255,255,0.94)', ink: '#2B2118', radius: 28 }

  const innerW = L.paper.w - CARD_PAPER.padX * 2

  /**
   * 称呼行（"致 小明"）：走 fitLine 而不是 fitText
   *
   * 名字单行、只降字号。用 fitText 的话，长名字要么被折成两行
   * 把版面顶乱，要么末行变"张小…" —— 名字被省略号吃掉是不能接受的。
   */
  const greet = greeting
    ? fitLine(ctx, greeting, {
      maxWidth: innerW,
      size: CARD_NAME.size,
      minSize: CARD_NAME.minSize,
      weight: CARD_NAME.weight
    })
    : null
  const greetH = greet ? greet.size * CARD_NAME.lineHeightRatio + CARD_NAME.gap : 0

  const fitted = fitText(ctx, wish, {
    maxWidth: innerW,
    maxLines: CARD_TEXT.maxLines,
    size: CARD_TEXT.size,
    minSize: CARD_TEXT.minSize,
    weight: CARD_TEXT.weight,
    lineHeightRatio: CARD_TEXT.lineHeightRatio
  })

  // 白卡高度要把称呼行算进去，否则称呼会顶出卡片上沿
  const contentH = greetH + fitted.lines.length * fitted.lineHeight + CARD_PAPER.padV * 2
  const box = paperBox(L, contentH)

  // 白色圆角卡。带一点投影：浅色背景上白卡和白底会糊在一起，边界全靠这个阴影
  const r = Math.min(paper.radius || 28, box.h / 2, box.w / 2)
  ctx.save()
  ctx.shadowColor = 'rgba(0, 0, 0, 0.20)'
  ctx.shadowBlur = 26
  ctx.shadowOffsetY = 10
  ctx.beginPath()
  ctx.moveTo(box.x + r, box.y)
  ctx.lineTo(box.x + box.w - r, box.y)
  ctx.arcTo(box.x + box.w, box.y, box.x + box.w, box.y + r, r)
  ctx.lineTo(box.x + box.w, box.y + box.h - r)
  ctx.arcTo(box.x + box.w, box.y + box.h, box.x + box.w - r, box.y + box.h, r)
  ctx.lineTo(box.x + r, box.y + box.h)
  ctx.arcTo(box.x, box.y + box.h, box.x, box.y + box.h - r, r)
  ctx.lineTo(box.x, box.y + r)
  ctx.arcTo(box.x, box.y, box.x + r, box.y, r)
  ctx.closePath()
  ctx.fillStyle = paper.fill
  ctx.fill()
  ctx.restore()

  // 称呼：比正文淡一档，让人一眼看出这是"抬头"而不是祝福语的第一行
  if (greet) {
    ctx.save()
    ctx.globalAlpha = 0.72
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = paper.ink
    ctx.font = fontString(greet.size, CARD_NAME.weight)
    ctx.fillText(
      greet.text,
      box.x + box.w / 2,
      box.y + CARD_PAPER.padV + (greet.size * CARD_NAME.lineHeightRatio) / 2
    )
    ctx.restore()
  }

  // 祝福语
  ctx.save()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = paper.ink
  ctx.font = fontString(fitted.size, CARD_TEXT.weight)
  const startY = box.y + CARD_PAPER.padV + greetH + fitted.lineHeight / 2
  fitted.lines.forEach((line, i) => {
    ctx.fillText(line, box.x + box.w / 2, startY + i * fitted.lineHeight)
  })
  ctx.restore()

  return {
    lines: fitted.lines,
    size: fitted.size,
    truncated: fitted.truncated,
    box,
    greeting: greet ? greet.text : '',
    greetingTruncated: greet ? greet.truncated : false
  }
}

/**
 * 画一整张贺卡
 * @param {CanvasRenderingContext2D} ctx
 * @param {{width?:number, height?:number, template:Object, wish:string, greeting?:string,
 *          footer?:string, copy?:Object, paperStyle?:Object}} spec
 *   greeting 传空串/null 则白卡只有祝福语；footer 优先于 copy.footer
 * @returns {{lines:string[], size:number, truncated:boolean, box:Object, greeting:string}}
 */
export function drawCard(ctx, spec = {}) {
  const width = spec.width || CARD_CANVAS.width
  const height = spec.height || CARD_CANVAS.height
  const template = spec.template
  if (!template || !template.bg) {
    throw new TypeError('drawCard 需要 spec.template（含 bg 渐变两色）')
  }
  const copy = spec.copy || {}
  const ink = inkOf(template)
  const L = computeLayout(width, height)

  drawBackground(ctx, width, height, template)
  drawDeco(ctx, width, height, template)
  drawMotif(ctx, template.motif, L.motif.cx, L.motif.cy, L.motif.r, {
    ink: template.ink,
    accent: template.accent,
    accent2: template.accent2,
    white: template.white,
    blush: template.blush,
    nose: template.nose
  })
  drawHeadline(ctx, L, template, copy, ink)
  const paperInfo = drawWishPaper(ctx, L, spec)

  // 落款：有署名就是"阿花送你的贺卡"，没填就是"送给你的贺卡"（匿名不写"匿名"二字）
  const signText = spec.footer == null ? copy.footer || '' : String(spec.footer)
  if (signText) {
    const fitSign = fitLine(ctx, signText, {
      maxWidth: width * 0.84,
      size: L.footer.size,
      minSize: 16,
      weight: 400
    })
    ctx.save()
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = ink.footer
    ctx.font = fontString(fitSign.size, 400)
    ctx.fillText(fitSign.text, L.footer.x, L.footer.y)
    ctx.restore()
  }

  return paperInfo
}
