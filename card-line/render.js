/**
 * 块 6 · 绘制
 *
 * 纯 Canvas2D，零平台 API、零 DOM、零 uni.*。
 * 输入一个 ctx 和一份 spec，画完就结束 —— 所以它能在浏览器、小程序、
 * Node + mock ctx（自测）三种环境里跑同一份代码。
 */

import { computeLayout, paperBox, DECO_POINTS } from './layout'
import { fitText, fontString } from './text'
import { drawMotif } from './motifs'
import { CARD_CANVAS, CARD_TEXT, CARD_PAPER } from './config'

/**
 * 卡片上的固定白字层：叠在渐变背景上，不随模板变，故不进 theme。
 * 其余颜色（背景 / 图形 / 装饰 / 白卡）全部来自 theme.card.templates[i]。
 */
const CARD_INK = {
  tag: 'rgba(255, 255, 255, 0.78)',
  title: '#FFFFFF',
  footer: 'rgba(255, 255, 255, 0.60)'
}

function drawBackground(ctx, width, height, template) {
  const grad = ctx.createLinearGradient(0, 0, 0, height)
  grad.addColorStop(0, template.bg[0])
  grad.addColorStop(1, template.bg[1])
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, width, height)
}

/** 装饰点用小圆点，不用字符 —— 字符受字体影响，圆点不会 */
function drawDeco(ctx, width, height, template) {
  ctx.save()
  ctx.fillStyle = template.deco
  DECO_POINTS.forEach(([px, py], i) => {
    const x = px * width
    const y = py * height
    ctx.beginPath()
    ctx.arc(x, y, i % 3 === 0 ? 4.5 : 3, 0, Math.PI * 2)
    ctx.fill()
  })
  ctx.restore()
}

function drawHeadline(ctx, L, template, copy) {
  ctx.save()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  // 模板名小标签
  ctx.fillStyle = CARD_INK.tag
  ctx.font = fontString(L.tag.size, 600)
  ctx.fillText(`· ${template.tag || template.name} ·`, L.tag.x, L.tag.y)

  // 主标题
  ctx.fillStyle = CARD_INK.title
  ctx.font = fontString(L.title.size, 800)
  ctx.fillText(copy.heroTitle || '圣诞快乐', L.title.x, L.title.y)

  ctx.restore()
}

function drawWishPaper(ctx, L, spec) {
  const { wish, paperStyle } = spec
  const paper = paperStyle || { fill: 'rgba(255,255,255,0.94)', ink: '#2B2118', radius: 28 }

  const innerW = L.paper.w - CARD_PAPER.padX * 2

  const fitted = fitText(ctx, wish, {
    maxWidth: innerW,
    maxLines: CARD_TEXT.maxLines,
    size: CARD_TEXT.size,
    minSize: CARD_TEXT.minSize,
    weight: CARD_TEXT.weight,
    lineHeightRatio: CARD_TEXT.lineHeightRatio
  })

  const contentH = fitted.lines.length * fitted.lineHeight + CARD_PAPER.padV * 2
  const box = paperBox(L, contentH)

  // 白色圆角卡
  const r = Math.min(paper.radius || 28, box.h / 2, box.w / 2)
  ctx.save()
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

  // 祝福语
  ctx.save()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = paper.ink
  ctx.font = fontString(fitted.size, CARD_TEXT.weight)
  const startY = box.y + CARD_PAPER.padV + fitted.lineHeight / 2
  fitted.lines.forEach((line, i) => {
    ctx.fillText(line, box.x + box.w / 2, startY + i * fitted.lineHeight)
  })
  ctx.restore()

  return { lines: fitted.lines, size: fitted.size, truncated: fitted.truncated, box }
}

/**
 * 画一整张贺卡
 * @param {CanvasRenderingContext2D} ctx
 * @param {{width?:number, height?:number, template:Object, wish:string, copy?:Object, paperStyle?:Object}} spec
 * @returns {{lines:string[], size:number, truncated:boolean, box:Object}}
 */
export function drawCard(ctx, spec = {}) {
  const width = spec.width || CARD_CANVAS.width
  const height = spec.height || CARD_CANVAS.height
  const template = spec.template
  if (!template || !template.bg) {
    throw new TypeError('drawCard 需要 spec.template（含 bg 渐变两色）')
  }
  const copy = spec.copy || {}
  const L = computeLayout(width, height)

  drawBackground(ctx, width, height, template)
  drawDeco(ctx, width, height, template)
  drawMotif(ctx, template.motif, L.motif.cx, L.motif.cy, L.motif.r, {
    ink: template.ink,
    accent: template.accent,
    nose: template.nose
  })
  drawHeadline(ctx, L, template, copy)
  const paperInfo = drawWishPaper(ctx, L, spec)

  // 落款
  ctx.save()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = CARD_INK.footer
  ctx.font = fontString(L.footer.size, 400)
  ctx.fillText(copy.footer || '', L.footer.x, L.footer.y)
  ctx.restore()

  return paperInfo
}
