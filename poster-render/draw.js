/**
 * 海报绘制：纯 Canvas2D，零平台 API
 * 小程序与 H5 共用这一份，差异只在"怎么拿到画布、怎么导出"
 *
 * 只用标准 canvas 子集：fillRect / drawImage / fillText / arc / clip / save / restore
 */

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.lineTo(x + w - rr, y)
  ctx.arcTo(x + w, y, x + w, y + rr, rr)
  ctx.lineTo(x + w, y + h - rr)
  ctx.arcTo(x + w, y + h, x + w - rr, y + h, rr)
  ctx.lineTo(x + rr, y + h)
  ctx.arcTo(x, y + h, x, y + h - rr, rr)
  ctx.lineTo(x, y + rr)
  ctx.arcTo(x, y, x + rr, y, rr)
  ctx.closePath()
}

function star(ctx, cx, cy, r, color) {
  ctx.save()
  ctx.beginPath()
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 === 0 ? r : r * 0.45
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

/** 把文字按宽度折行 */
export function wrapText(ctx, text, maxWidth, maxLines = 3) {
  const chars = Array.from(text || '')
  const lines = []
  let line = ''
  for (let i = 0; i < chars.length; i++) {
    const test = line + chars[i]
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line)
      line = chars[i]
      if (lines.length === maxLines - 1) {
        // 最后一行放剩余内容，超出用省略号
        let rest = chars.slice(i).join('')
        while (ctx.measureText(rest + '…').width > maxWidth && rest.length > 0) {
          rest = rest.slice(0, -1)
        }
        lines.push(rest + (rest.length < chars.slice(i).length ? '…' : ''))
        return lines
      }
    } else {
      line = test
    }
  }
  if (line) lines.push(line)
  return lines
}

function drawTree(ctx, W, H, tk) {
  const cx = W / 2
  const tiers = [
    { apex: H * 0.19, base: H * 0.45, half: W * 0.22 },
    { apex: H * 0.33, base: H * 0.6, half: W * 0.3 },
    { apex: H * 0.47, base: H * 0.75, half: W * 0.38 }
  ]

  // 底色柔光
  const halo = ctx.createRadialGradient(cx, H * 0.45, 20, cx, H * 0.45, W * 0.55)
  halo.addColorStop(0, tk.colorAccentSoft)
  halo.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = halo
  ctx.fillRect(0, 0, W, H)

  // 树干
  ctx.fillStyle = tk.colorTreeDark
  roundRect(ctx, cx - 22, H * 0.72, 44, H * 0.09, 10)
  ctx.fill()

  // 三层树冠
  tiers.forEach((t, idx) => {
    ctx.beginPath()
    ctx.moveTo(cx, t.apex)
    ctx.lineTo(cx - t.half, t.base)
    ctx.lineTo(cx + t.half, t.base)
    ctx.closePath()
    ctx.fillStyle = idx === 0 ? tk.colorTree : idx === 1 ? tk.colorTree : tk.colorTreeDark
    ctx.fill()
  })

  // 树顶星
  star(ctx, cx, H * 0.175, 26, tk.colorAccent)

  // 雪点
  const dots = [
    [0.12, 0.2], [0.85, 0.17], [0.2, 0.36], [0.78, 0.42], [0.1, 0.55],
    [0.9, 0.6], [0.25, 0.68], [0.72, 0.72], [0.15, 0.78], [0.86, 0.82]
  ]
  ctx.fillStyle = 'rgba(255,255,255,0.28)'
  dots.forEach(([x, y]) => {
    ctx.beginPath()
    ctx.arc(W * x, H * y, 4, 0, Math.PI * 2)
    ctx.fill()
  })
}

function drawAvatar(ctx, img, cx, cy, r, tk, nickname) {
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.closePath()
  ctx.clip()

  if (img) {
    // cover 裁剪
    const iw = img.width || r * 2
    const ih = img.height || r * 2
    const scale = Math.max((r * 2) / iw, (r * 2) / ih)
    const dw = iw * scale
    const dh = ih * scale
    ctx.drawImage(img, cx - dw / 2, cy - dh / 2, dw, dh)
  } else {
    ctx.fillStyle = tk.colorTreeDark
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2)
    ctx.fillStyle = tk.colorText
    ctx.font = `bold ${Math.round(r * 0.9)}px ${tk.fontFamily}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText((nickname || '?').slice(0, 1), cx, cy)
  }
  ctx.restore()

  // 描边
  ctx.beginPath()
  ctx.arc(cx, cy, r + 3, 0, Math.PI * 2)
  ctx.strokeStyle = tk.colorPinRing
  ctx.lineWidth = 6
  ctx.stroke()
}

/**
 * 主绘制入口
 * @param {CanvasRenderingContext2D} ctx
 * @param {{
 *   width:number, height:number, theme:Object, avatar?:Object,
 *   nickname?:string, wish?:string, blessCount?:number, total?:number, rank?:number|null
 * }} opts
 */
export function drawPoster(ctx, opts) {
  const { width: W, height: H, theme, avatar, nickname, wish, blessCount, total, rank } = opts
  const tk = theme.tokens
  const cp = theme.copy

  ctx.clearRect(0, 0, W, H)

  // 背景
  const bg = ctx.createLinearGradient(0, 0, 0, H)
  bg.addColorStop(0, tk.colorBgTop)
  bg.addColorStop(1, tk.colorBg)
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  drawTree(ctx, W, H, tk)

  // 标题
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = tk.colorText
  ctx.font = `bold 42px ${tk.fontFamily}`
  ctx.fillText(cp.posterTitle, W / 2, 78)

  ctx.fillStyle = tk.colorTextSub
  ctx.font = `24px ${tk.fontFamily}`
  ctx.fillText(cp.posterSubtitle, W / 2, 118)

  // 头像（挂在树的上部）
  const cx = W / 2
  const cy = H * 0.365
  const r = 84
  drawAvatar(ctx, avatar, cx, cy, r, tk, nickname)

  // 昵称
  ctx.textAlign = 'center'
  ctx.fillStyle = tk.colorText
  ctx.font = `bold 34px ${tk.fontFamily}`
  ctx.fillText((nickname || '').slice(0, 12), W / 2, cy + r + 62)

  // 心愿卡片
  const cardW = W * 0.76
  const cardX = (W - cardW) / 2
  const cardY = cy + r + 92
  ctx.font = `28px ${tk.fontFamily}`
  const lines = wrapText(ctx, wish || '', cardW - 56, 3)
  const cardH = 44 + lines.length * 42

  ctx.save()
  ctx.fillStyle = tk.colorCard
  roundRect(ctx, cardX, cardY, cardW, cardH, 22)
  ctx.fill()
  ctx.strokeStyle = tk.colorAccentSoft
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.restore()

  ctx.fillStyle = tk.colorText
  ctx.font = `28px ${tk.fontFamily}`
  lines.forEach((line, i) => {
    ctx.fillText(line, W / 2, cardY + 56 + i * 42)
  })

  // 统计
  const statY = cardY + cardH + 70
  ctx.fillStyle = tk.colorAccent
  ctx.font = `bold 30px ${tk.fontFamily}`
  const rankText = rank ? `第 ${rank} 位挂上树` : '已挂上树'
  ctx.fillText(rankText, W / 2, statY)

  ctx.fillStyle = tk.colorTextSub
  ctx.font = `24px ${tk.fontFamily}`
  ctx.fillText(
    `${blessCount || 0} 个祝福 · 全树共 ${total || 0} 人`,
    W / 2,
    statY + 42
  )

  // 页脚
  ctx.fillStyle = 'rgba(245,243,236,0.42)'
  ctx.font = `20px ${tk.fontFamily}`
  ctx.fillText(cp.disclaimer, W / 2, H - 34)
}
