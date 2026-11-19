/**
 * 块 4 · 矢量图形
 *
 * 全部用路径画，不用 emoji、不用图片、不依赖任何字体。
 * 原因：canvas 画 emoji 走系统字体，安卓微信常出黑白或缺字方块，
 * 同一份代码在不同机型上长得不一样 —— 线上不可接受的不可控因素。
 *
 * 只用标准 canvas 子集：beginPath/moveTo/lineTo/arc/quadraticCurveTo/fill/stroke
 * 椭圆一律用 arc + scale 实现，不用 ellipse()（老内核兼容性更好）。
 */

import { drawMascot } from './mascots'

function ellipse(ctx, x, y, rx, ry, rotation = 0) {
  ctx.save()
  ctx.translate(x, y)
  if (rotation) ctx.rotate(rotation)
  ctx.scale(rx, ry)
  ctx.beginPath()
  ctx.arc(0, 0, 1, 0, Math.PI * 2)
  ctx.restore()
}

function fillEllipse(ctx, x, y, rx, ry, rotation = 0) {
  ctx.save()
  ctx.translate(x, y)
  if (rotation) ctx.rotate(rotation)
  ctx.scale(rx, ry)
  ctx.beginPath()
  ctx.arc(0, 0, 1, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

/** 五角星 */
export function drawStar(ctx, cx, cy, r, color) {
  ctx.save()
  ctx.beginPath()
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 === 0 ? r : r * 0.44
    const angle = (Math.PI / 5) * i - Math.PI / 2
    const x = cx + Math.cos(angle) * radius
    const y = cy + Math.sin(angle) * radius
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
  ctx.fillStyle = color
  ctx.fill()
  ctx.restore()
}

/** 雪花：六向主枝 + 每枝两组侧枝 */
export function drawSnowflake(ctx, cx, cy, r, opt = {}) {
  const color = opt.ink || '#FFFFFF'
  const lw = Math.max(2, r * 0.052)

  ctx.save()
  ctx.translate(cx, cy)
  ctx.strokeStyle = color
  ctx.lineWidth = lw
  ctx.lineCap = 'round'

  for (let i = 0; i < 6; i++) {
    ctx.save()
    ctx.rotate((Math.PI / 3) * i)
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(0, -r)
    // 外层侧枝
    ctx.moveTo(0, -r * 0.64)
    ctx.lineTo(-r * 0.24, -r * 0.84)
    ctx.moveTo(0, -r * 0.64)
    ctx.lineTo(r * 0.24, -r * 0.84)
    // 内层侧枝
    ctx.moveTo(0, -r * 0.40)
    ctx.lineTo(-r * 0.16, -r * 0.54)
    ctx.moveTo(0, -r * 0.40)
    ctx.lineTo(r * 0.16, -r * 0.54)
    ctx.stroke()
    ctx.restore()
  }

  ctx.beginPath()
  ctx.arc(0, 0, r * 0.1, 0, Math.PI * 2)
  ctx.fillStyle = color
  ctx.fill()
  ctx.restore()
}

/**
 * 麋鹿头（正面）
 *
 * 造型要点（第一版画成"倒心形"的教训）：
 *   - 脸不能太宽，否则读成盾牌/心形；上圆下收，底部留平段
 *   - 眼睛必须有浅色眼白，纯深色瞳在深色脸上等于没画
 *   - 鼻子单独用 nose 色（亮红），不要借用 accent 装饰金
 *   - 鹿角用 accent 色且要有粗细与分叉，细线贴在背景上会消失
 *
 * @param {number} s 缩放，s=1 时头高约 0.9 单位
 */
export function drawDeer(ctx, cx, cy, s, opt = {}) {
  const ink = opt.ink || '#1F0B06'
  const nose = opt.nose || '#E0353A'
  const accent = opt.accent || '#F2C14E'

  ctx.save()
  ctx.translate(cx, cy)
  ctx.scale(s, s)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  // 鹿角：先画，压在头后面
  ctx.strokeStyle = accent
  ctx.lineWidth = 0.055
  const antler = (dir) => {
    ctx.beginPath()
    ctx.moveTo(dir * 0.17, -0.32)
    ctx.lineTo(dir * 0.33, -0.9)
    // 上分叉
    ctx.moveTo(dir * 0.27, -0.71)
    ctx.lineTo(dir * 0.58, -0.84)
    // 下分叉
    ctx.moveTo(dir * 0.23, -0.54)
    ctx.lineTo(dir * 0.5, -0.5)
    // 顶尖小叉
    ctx.moveTo(dir * 0.3, -0.8)
    ctx.lineTo(dir * 0.41, -1.0)
    ctx.stroke()
  }
  antler(1)
  antler(-1)

  // 耳朵：向外伸出，带浅色内耳
  ctx.fillStyle = ink
  fillEllipse(ctx, 0.44, -0.24, 0.2, 0.095, 0.42)
  fillEllipse(ctx, -0.44, -0.24, 0.2, 0.095, -0.42)
  ctx.fillStyle = 'rgba(255, 198, 190, 0.4)'
  fillEllipse(ctx, 0.47, -0.24, 0.105, 0.045, 0.42)
  fillEllipse(ctx, -0.47, -0.24, 0.105, 0.045, -0.42)

  // 头部：上圆下收，底部留一小段平底
  ctx.fillStyle = ink
  ctx.beginPath()
  ctx.moveTo(0, -0.47)
  ctx.quadraticCurveTo(0.31, -0.47, 0.3, -0.08)
  ctx.quadraticCurveTo(0.3, 0.25, 0.12, 0.39)
  ctx.quadraticCurveTo(0.06, 0.44, 0, 0.44)
  ctx.quadraticCurveTo(-0.06, 0.44, -0.12, 0.39)
  ctx.quadraticCurveTo(-0.3, 0.25, -0.3, -0.08)
  ctx.quadraticCurveTo(-0.31, -0.47, 0, -0.47)
  ctx.closePath()
  ctx.fill()

  // 眼睛：眼白 + 深瞳，眼白是深色脸上唯一的高光
  ctx.fillStyle = 'rgba(255, 248, 240, 0.95)'
  fillEllipse(ctx, -0.14, -0.19, 0.062, 0.068)
  fillEllipse(ctx, 0.14, -0.19, 0.062, 0.068)
  ctx.fillStyle = '#120704'
  fillEllipse(ctx, -0.135, -0.185, 0.033, 0.038)
  fillEllipse(ctx, 0.135, -0.185, 0.033, 0.038)

  // 红鼻子
  ctx.fillStyle = nose
  fillEllipse(ctx, 0, 0.16, 0.11, 0.095)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)'
  fillEllipse(ctx, -0.035, 0.13, 0.028, 0.022)

  ctx.restore()
}

/**
 * 圣诞树：连续折线轮廓 + 树干 + 顶星
 * @param {number} s 缩放，s=1 时树高约 1.5 个单位
 */
export function drawTree(ctx, cx, cy, s, opt = {}) {
  const ink = opt.ink || '#0E3F2C'
  const accent = opt.accent || '#E8B84B'

  ctx.save()
  ctx.translate(cx, cy)
  ctx.scale(s, s)

  // 树干（结构色，不随主题变，故不放到 theme 里）
  ctx.fillStyle = '#2A1708'
  ctx.fillRect(-0.06, 0.52, 0.12, 0.22)

  // 树身：三段收窄的锯齿轮廓，一笔画完
  ctx.beginPath()
  ctx.moveTo(0, -0.78)
  ctx.lineTo(0.15, -0.32)
  ctx.lineTo(0.06, -0.32)
  ctx.lineTo(0.3, 0.06)
  ctx.lineTo(0.16, 0.06)
  ctx.lineTo(0.46, 0.54)
  ctx.lineTo(-0.46, 0.54)
  ctx.lineTo(-0.16, 0.06)
  ctx.lineTo(-0.3, 0.06)
  ctx.lineTo(-0.06, -0.32)
  ctx.lineTo(-0.15, -0.32)
  ctx.closePath()
  ctx.fillStyle = ink
  ctx.fill()

  // 顶星
  drawStar(ctx, 0, -0.9, 0.13, accent)

  // 三只挂饰，给树一点层次
  ctx.fillStyle = accent
  const balls = [
    [-0.16, 0.1, 0.045],
    [0.2, 0.28, 0.04],
    [-0.03, 0.42, 0.038]
  ]
  balls.forEach(([x, y, r]) => {
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  })

  ctx.restore()
}

/**
 * 统一调度：按 template.motif 画对应图形
 *
 * 老的三套（雪花 / 麋鹿 / 树）留在这里，保证旧链接与旧主题仍然能画；
 * 新增的可爱角色全部在块 5（mascots.js），本文件只负责转发。
 *
 * @param {number} r 视觉半径基准（约为画布短边 15%）
 */
export function drawMotif(ctx, motif, cx, cy, r, opt = {}) {
  if (motif === 'snow') {
    drawSnowflake(ctx, cx, cy, r, opt)
    return
  }
  if (motif === 'deer') {
    drawDeer(ctx, cx, cy, r * 1.25, opt)
    return
  }
  if (motif === 'tree') {
    drawTree(ctx, cx, cy, r * 1.1, opt)
    return
  }
  // 可爱角色：交给块 5 的调度器，命中就结束
  if (drawMascot(ctx, motif, cx, cy, r * 1.2, opt)) return
  // 未知 motif 兜底：画个星，不留白
  drawStar(ctx, cx, cy, r * 0.8, opt.accent || '#FFFFFF')
}
