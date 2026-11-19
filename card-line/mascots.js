/**
 * 块 5 · 可爱角色
 *
 * 为什么不用图片、不用 emoji：
 *   1. 图片要联网加载，首屏会闪一次白，且要维护一堆素材
 *   2. emoji 走系统字体，安卓微信常渲染成黑白或缺字方块
 * 全矢量路径画就没有这两个问题，而且每张图都是"算"出来的，
 * 天然不含任何人名、地名、国旗国徽 —— 画布里只有几何图形。
 *
 * 可爱感的四条硬规则（前三条是画丑过之后总结的）：
 *   1. 头大身小。头占整体高度 40%~50%，这是"幼态"比例
 *   2. 五官只用圆。眼睛必须有白色高光，否则在深色主体上等于没画
 *   3. 必须有腮红，位置在眼睛斜下方、贴着脸的最外缘
 *   4. 轮廓要么全圆，要么带描边；不要出现尖锐直角
 *
 * 坐标约定：以角色中心为原点，主体收在 x ∈ [-0.8, 0.8]、y ∈ [-0.8, 0.8]。
 * 只用基础 canvas 子集（beginPath/moveTo/lineTo/arc/quadraticCurveTo/fill/stroke）。
 */

/* ---------------- 绘制工具 ---------------- */

/** 构造椭圆路径。不用 ctx.ellipse()，老内核兼容性更好 */
function ellPath(ctx, x, y, rx, ry, rot = 0) {
  ctx.save()
  ctx.translate(x, y)
  if (rot) ctx.rotate(rot)
  ctx.scale(rx, ry)
  ctx.beginPath()
  ctx.arc(0, 0, 1, 0, Math.PI * 2)
  ctx.restore()
}

function fillEll(ctx, x, y, rx, ry, color, rot = 0) {
  ctx.fillStyle = color
  ellPath(ctx, x, y, rx, ry, rot)
  ctx.fill()
}

/** 圆角矩形路径（自己写，因为 roundRect 不是所有内核都有） */
function rrectPath(ctx, x, y, w, h, r) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2))
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

/** 圆头粗线：画四肢、树枝、拐杖糖都用它 */
function bar(ctx, x1, y1, x2, y2, w, color) {
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = w
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.stroke()
  ctx.restore()
}

/** 圆弧线（微笑用）。a1/a2 用 π 的倍数，0.15π~0.85π 是向下的嘴 */
function arcLine(ctx, cx, cy, r, a1, a2, w, color) {
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = w
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.arc(cx, cy, r, a1, a2)
  ctx.stroke()
  ctx.restore()
}

/** 黑豆眼 + 白高光。高光偏左上，光就从左上打过来 */
function eye(ctx, x, y, r, ink, white) {
  fillEll(ctx, x, y, r, r * 1.08, ink)
  fillEll(ctx, x - r * 0.32, y - r * 0.42, r * 0.33, r * 0.29, white || 'rgba(255,255,255,0.92)')
}

/** 一对腮红。y 是高度，dx 是离中线的距离 */
function blush(ctx, y, dx, color) {
  const c = color || 'rgba(233,90,125,0.40)'
  fillEll(ctx, -dx, y, 0.078, 0.046, c)
  fillEll(ctx, dx, y, 0.078, 0.046, c)
}

/** 地面投影：没有它角色会像飘在半空 */
function ground(ctx, w) {
  fillEll(ctx, 0, 0.79, w || 0.42, 0.062, 'rgba(0,0,0,0.14)')
}

/* ---------------- 角色 ---------------- */

/**
 * 小雪人：三个球 + 胡萝卜鼻 + 红围巾 + 小礼帽
 * 主体是白的，只能放在深色背景上（fit: dark）
 */
export function drawSnowman(ctx, s, o = {}) {
  const white = o.white || '#FFFFFF'
  const ink = o.ink || '#2E2635'
  const accent = o.accent || '#D9385E'
  const gold = o.accent2 || '#F0B429'

  ctx.save()
  ctx.scale(s, s)
  ground(ctx, 0.44)

  // 树枝手先画，压在身体下面
  const twig = '#7A5230'
  bar(ctx, -0.26, 0.04, -0.64, -0.16, 0.042, twig)
  bar(ctx, -0.55, -0.08, -0.64, -0.26, 0.034, twig)
  bar(ctx, 0.26, 0.04, 0.64, -0.16, 0.042, twig)
  bar(ctx, 0.55, -0.08, 0.64, -0.26, 0.034, twig)

  // 三个球，下大上小
  fillEll(ctx, 0, 0.5, 0.4, 0.35, white)
  fillEll(ctx, 0, 0.06, 0.3, 0.27, white)
  fillEll(ctx, 0, -0.36, 0.245, 0.235, white)

  // 围巾：一条尾巴 + 一圈
  fillEll(ctx, 0.14, -0.01, 0.072, 0.15, accent)
  fillEll(ctx, 0, -0.15, 0.26, 0.062, accent)
  fillEll(ctx, 0, -0.158, 0.26, 0.024, 'rgba(255,255,255,0.30)')

  // 纽扣
  fillEll(ctx, 0, 0.02, 0.026, 0.026, ink)
  fillEll(ctx, 0, 0.14, 0.026, 0.026, ink)
  fillEll(ctx, 0, 0.26, 0.026, 0.026, ink)

  // 脸
  eye(ctx, -0.088, -0.4, 0.031, ink, white)
  eye(ctx, 0.088, -0.4, 0.031, ink, white)
  blush(ctx, -0.305, 0.18, o.blush)

  // 胡萝卜鼻：朝右伸，深橙才在白雪上看得见
  ctx.fillStyle = '#E8813A'
  ctx.beginPath()
  ctx.moveTo(-0.005, -0.366)
  ctx.lineTo(0.215, -0.344)
  ctx.lineTo(-0.005, -0.316)
  ctx.closePath()
  ctx.fill()

  // 微笑：三个点比一条线更像雪人
  fillEll(ctx, -0.042, -0.275, 0.013, 0.013, ink)
  fillEll(ctx, 0, -0.266, 0.013, 0.013, ink)
  fillEll(ctx, 0.042, -0.275, 0.013, 0.013, ink)

  // 小礼帽
  fillEll(ctx, 0, -0.585, 0.19, 0.044, gold)
  fillEll(ctx, 0, -0.652, 0.125, 0.08, accent)
  fillEll(ctx, 0.095, -0.712, 0.046, 0.046, white)

  ctx.restore()
}

/**
 * 小企鹅：白肚黑身 + 橙嘴 + 围巾
 * 主体深色，适合浅背景（fit: light）
 */
export function drawPenguin(ctx, s, o = {}) {
  const ink = o.ink || '#2A2838'
  const white = o.white || '#FFFFFF'
  const accent = o.accent || '#D9385E'
  const beak = o.accent2 || '#F2A03D'
  const pupil = '#17141C'

  ctx.save()
  ctx.scale(s, s)
  ground(ctx, 0.42)

  // 脚
  fillEll(ctx, -0.15, 0.7, 0.115, 0.052, beak)
  fillEll(ctx, 0.15, 0.7, 0.115, 0.052, beak)

  // 翅膀在身后
  fillEll(ctx, -0.36, 0.16, 0.095, 0.25, ink, 0.22)
  fillEll(ctx, 0.36, 0.16, 0.095, 0.25, ink, -0.22)

  // 身体
  fillEll(ctx, 0, 0.06, 0.375, 0.5, ink)
  // 白肚
  fillEll(ctx, 0, 0.18, 0.245, 0.33, white)

  // 眼睛：黑头上必须有白眼圈，否则整只鸟没有五官
  fillEll(ctx, -0.1, -0.34, 0.062, 0.07, white)
  fillEll(ctx, 0.1, -0.34, 0.062, 0.07, white)
  fillEll(ctx, -0.095, -0.335, 0.033, 0.037, pupil)
  fillEll(ctx, 0.095, -0.335, 0.033, 0.037, pupil)
  fillEll(ctx, -0.107, -0.352, 0.012, 0.013, 'rgba(255,255,255,0.9)')
  fillEll(ctx, 0.083, -0.352, 0.012, 0.013, 'rgba(255,255,255,0.9)')

  // 嘴
  ctx.fillStyle = beak
  ctx.beginPath()
  ctx.moveTo(-0.065, -0.245)
  ctx.lineTo(0.065, -0.245)
  ctx.lineTo(0, -0.152)
  ctx.closePath()
  ctx.fill()

  blush(ctx, -0.24, 0.2, o.blush)

  // 围巾
  fillEll(ctx, 0, -0.12, 0.245, 0.052, accent)
  fillEll(ctx, 0.155, -0.035, 0.06, 0.115, accent)
  fillEll(ctx, 0.155, -0.135, 0.06, 0.028, 'rgba(255,255,255,0.28)')

  ctx.restore()
}

/**
 * 姜饼人：圆头 + 圆角方身 + 糖霜五官
 * 棕色主体，适合浅背景（fit: light）
 */
export function drawGingerbread(ctx, s, o = {}) {
  const body = '#C08050'
  const icing = o.white || '#FFF6EC'
  const accent = o.accent || '#D9385E'

  ctx.save()
  ctx.scale(s, s)
  ground(ctx, 0.4)

  // 四肢先画，压在身体下面
  bar(ctx, -0.17, -0.16, -0.45, 0.04, 0.125, body)
  bar(ctx, 0.17, -0.16, 0.45, 0.04, 0.125, body)
  bar(ctx, -0.1, 0.2, -0.17, 0.5, 0.135, body)
  bar(ctx, 0.1, 0.2, 0.17, 0.5, 0.135, body)

  // 身体
  rrectPath(ctx, -0.215, -0.28, 0.43, 0.54, 0.16)
  ctx.fillStyle = body
  ctx.fill()

  // 头
  fillEll(ctx, 0, -0.47, 0.235, 0.225, body)

  // 糖霜眼睛：白霜底 + 深棕瞳，不然在棕脸上全是糊的
  fillEll(ctx, -0.088, -0.5, 0.04, 0.044, icing)
  fillEll(ctx, 0.088, -0.5, 0.04, 0.044, icing)
  fillEll(ctx, -0.088, -0.498, 0.019, 0.022, '#5A3720')
  fillEll(ctx, 0.088, -0.498, 0.019, 0.022, '#5A3720')

  // 糖霜微笑
  arcLine(ctx, 0, -0.44, 0.082, 0.18 * Math.PI, 0.82 * Math.PI, 0.028, icing)

  blush(ctx, -0.4, 0.152, o.blush)

  // 纽扣
  fillEll(ctx, 0, -0.12, 0.036, 0.036, accent)
  fillEll(ctx, 0, 0.02, 0.036, 0.036, accent)
  fillEll(ctx, 0, 0.16, 0.036, 0.036, accent)

  // 袖口糖霜
  fillEll(ctx, -0.43, 0.02, 0.072, 0.072, icing)
  fillEll(ctx, 0.43, 0.02, 0.072, 0.072, icing)

  ctx.restore()
}

/**
 * 戴圣诞帽的小熊：圆耳 + 大口鼻 + 红帽
 * 亮色系，适合浅背景（fit: light）
 */
export function drawBear(ctx, s, o = {}) {
  const body = '#C08552'
  const muzzle = '#F7E2CA'
  const ink = o.ink || '#3A2A22'
  const accent = o.accent || '#D9385E'
  const white = o.white || '#FFFFFF'

  ctx.save()
  ctx.scale(s, s)
  ground(ctx, 0.44)

  // 耳朵
  fillEll(ctx, -0.28, -0.52, 0.135, 0.13, body)
  fillEll(ctx, 0.28, -0.52, 0.135, 0.13, body)
  fillEll(ctx, -0.28, -0.52, 0.07, 0.068, 'rgba(255,205,195,0.6)')
  fillEll(ctx, 0.28, -0.52, 0.07, 0.068, 'rgba(255,205,195,0.6)')

  // 身体与手。身体必须往上压一点：头太大，头和身只相切会变成"棒棒糖"
  fillEll(ctx, 0, 0.29, 0.345, 0.32, body)
  fillEll(ctx, 0, 0.33, 0.2, 0.185, muzzle)
  fillEll(ctx, -0.32, 0.22, 0.1, 0.088, body)
  fillEll(ctx, 0.32, 0.22, 0.1, 0.088, body)

  // 头
  fillEll(ctx, 0, -0.3, 0.36, 0.325, body)

  // 口鼻
  fillEll(ctx, 0, -0.17, 0.185, 0.14, muzzle)
  fillEll(ctx, 0, -0.215, 0.058, 0.045, ink)
  bar(ctx, 0, -0.175, 0, -0.145, 0.022, ink)
  arcLine(ctx, -0.048, -0.148, 0.046, 0, Math.PI, 0.022, ink)
  arcLine(ctx, 0.048, -0.148, 0.046, 0, Math.PI, 0.022, ink)

  // 眼睛
  eye(ctx, -0.145, -0.38, 0.037, ink, white)
  eye(ctx, 0.145, -0.38, 0.037, ink, white)
  blush(ctx, -0.245, 0.225, o.blush)

  // 圣诞帽：歪着的锥 + 白帽檐 + 白绒球
  ctx.fillStyle = accent
  ctx.beginPath()
  ctx.moveTo(-0.21, -0.55)
  ctx.quadraticCurveTo(0.0, -0.85, 0.27, -0.72)
  ctx.quadraticCurveTo(0.19, -0.62, 0.21, -0.53)
  ctx.closePath()
  ctx.fill()
  fillEll(ctx, 0, -0.542, 0.235, 0.05, white)
  fillEll(ctx, 0.29, -0.715, 0.058, 0.058, white)

  ctx.restore()
}

/**
 * 礼物小怪：盒身 + 盒盖 + 蝴蝶结，盒身拟人化
 * 配色靠 accent / accent2，深浅背景都能放（fit: any）
 */
export function drawGift(ctx, s, o = {}) {
  const accent = o.accent || '#D9385E'
  const accent2 = o.accent2 || '#F0B429'
  const white = o.white || '#FFFFFF'
  const ink = o.ink || '#3A2A22'

  ctx.save()
  ctx.scale(s, s)
  ground(ctx, 0.46)

  // 盒身
  rrectPath(ctx, -0.36, -0.16, 0.72, 0.72, 0.07)
  ctx.fillStyle = accent2
  ctx.fill()

  // 盒盖
  rrectPath(ctx, -0.43, -0.32, 0.86, 0.2, 0.07)
  ctx.fillStyle = accent
  ctx.fill()
  // 盖面高光，让盒子有厚度
  rrectPath(ctx, -0.4, -0.31, 0.8, 0.06, 0.03)
  ctx.fillStyle = 'rgba(255,255,255,0.22)'
  ctx.fill()

  // 拟人化的脸
  eye(ctx, -0.13, 0.1, 0.042, ink, white)
  eye(ctx, 0.13, 0.1, 0.042, ink, white)
  arcLine(ctx, 0, 0.2, 0.07, 0.15 * Math.PI, 0.85 * Math.PI, 0.026, ink)
  blush(ctx, 0.22, 0.245, o.blush)

  // 蝴蝶结（在盒盖上方，白色压红盖才看得清）
  fillEll(ctx, -0.13, -0.445, 0.145, 0.088, white, 0.42)
  fillEll(ctx, 0.13, -0.445, 0.145, 0.088, white, -0.42)
  fillEll(ctx, 0, -0.405, 0.058, 0.058, accent)

  ctx.restore()
}

/**
 * 铃铛 + 冬青：铃身锥形 + 底边 + 铃舌 + 顶上冬青
 * 金色主体，适合深色背景（fit: dark）
 */
export function drawBell(ctx, s, o = {}) {
  const gold = o.accent2 || '#F0B429'
  const goldDark = '#B9821F'
  const accent = o.accent || '#D9385E'
  const green = '#2E7D53'

  ctx.save()
  ctx.scale(s, s)

  // 铃身：上窄下宽，两侧用二次曲线收出钟形
  ctx.fillStyle = gold
  ctx.beginPath()
  ctx.moveTo(-0.15, -0.5)
  ctx.quadraticCurveTo(-0.17, 0.04, -0.37, 0.16)
  ctx.lineTo(0.37, 0.16)
  ctx.quadraticCurveTo(0.17, 0.04, 0.15, -0.5)
  ctx.closePath()
  ctx.fill()

  // 底边
  rrectPath(ctx, -0.41, 0.12, 0.82, 0.14, 0.07)
  ctx.fillStyle = goldDark
  ctx.fill()

  // 铃舌
  fillEll(ctx, 0, 0.32, 0.072, 0.072, goldDark)
  fillEll(ctx, -0.02, 0.3, 0.024, 0.024, 'rgba(255,255,255,0.45)')

  // 左侧高光：金属感全靠这一条
  fillEll(ctx, -0.16, -0.16, 0.032, 0.16, 'rgba(255,255,255,0.38)', 0.1)

  // 顶上冬青：两片叶 + 三颗果
  fillEll(ctx, -0.19, -0.6, 0.135, 0.058, green, 0.55)
  fillEll(ctx, 0.19, -0.6, 0.135, 0.058, green, -0.55)
  fillEll(ctx, -0.055, -0.6, 0.045, 0.045, accent)
  fillEll(ctx, 0.055, -0.6, 0.045, 0.045, accent)
  fillEll(ctx, 0, -0.52, 0.04, 0.04, accent)

  ctx.restore()
}

/**
 * 圣诞袜：袜形一笔画完 + 白毛边 + 雪花点缀
 * fit: any
 */
export function drawSock(ctx, s, o = {}) {
  const accent = o.accent || '#D9385E'
  const white = o.white || '#FFFFFF'
  const accent2 = o.accent2 || '#F0B429'

  ctx.save()
  ctx.scale(s, s)
  ground(ctx, 0.4)

  // 袜身
  ctx.fillStyle = accent
  ctx.beginPath()
  ctx.moveTo(-0.26, -0.6)
  ctx.lineTo(0.08, -0.6)
  ctx.lineTo(0.08, 0.02)
  ctx.quadraticCurveTo(0.08, 0.1, 0.24, 0.14)
  ctx.quadraticCurveTo(0.44, 0.2, 0.44, 0.38)
  ctx.quadraticCurveTo(0.44, 0.56, 0.22, 0.58)
  ctx.lineTo(-0.02, 0.58)
  ctx.quadraticCurveTo(-0.26, 0.54, -0.26, 0.3)
  ctx.closePath()
  ctx.fill()

  // 袜口白毛边
  rrectPath(ctx, -0.295, -0.68, 0.44, 0.17, 0.08)
  ctx.fillStyle = white
  ctx.fill()
  // 毛边的起伏，别像块白板
  fillEll(ctx, -0.24, -0.6, 0.055, 0.055, white)
  fillEll(ctx, -0.09, -0.6, 0.055, 0.055, white)
  fillEll(ctx, 0.06, -0.6, 0.055, 0.055, white)

  // 袜身雪花点缀（六角小星，不是文字）
  const snow = (x, y, r) => {
    ctx.save()
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'
    ctx.lineWidth = 0.022
    ctx.lineCap = 'round'
    for (let i = 0; i < 3; i++) {
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate((Math.PI / 3) * i)
      ctx.beginPath()
      ctx.moveTo(0, -r)
      ctx.lineTo(0, r)
      ctx.stroke()
      ctx.restore()
    }
    ctx.restore()
  }
  snow(-0.09, -0.34, 0.085)
  snow(0.12, 0.22, 0.07)
  snow(-0.1, 0.1, 0.055)

  // 脚尖补丁
  fillEll(ctx, 0.3, 0.42, 0.085, 0.07, accent2, -0.3)

  ctx.restore()
}

/**
 * 圣诞花环：一圈叶子 + 红果 + 蝴蝶结，中间留空
 * fit: any
 */
export function drawWreath(ctx, s, o = {}) {
  const green = '#2E7D53'
  const greenL = '#3E9A66'
  const accent = o.accent || '#D9385E'
  const accent2 = o.accent2 || '#F0B429'

  ctx.save()
  ctx.scale(s, s)

  const R = 0.44
  for (let i = 0; i < 14; i++) {
    const a = (Math.PI * 2 / 14) * i - Math.PI / 2
    fillEll(ctx, Math.cos(a) * R, Math.sin(a) * R, 0.145, 0.112, i % 2 ? greenL : green, a)
  }
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI * 2 / 10) * i - Math.PI / 2 + 0.31
    fillEll(ctx, Math.cos(a) * R * 0.7, Math.sin(a) * R * 0.7, 0.1, 0.078, green, a)
  }

  // 红果
  fillEll(ctx, -0.14, 0.22, 0.05, 0.05, accent)
  fillEll(ctx, 0.2, 0.16, 0.045, 0.045, accent)
  fillEll(ctx, 0.05, 0.3, 0.042, 0.042, accent)

  // 蝴蝶结
  fillEll(ctx, -0.13, -0.5, 0.135, 0.085, accent, 0.5)
  fillEll(ctx, 0.13, -0.5, 0.135, 0.085, accent, -0.5)
  fillEll(ctx, 0, -0.46, 0.055, 0.055, accent2)

  ctx.restore()
}

/**
 * 会笑的小星星：五角星 + 五官 + 腮红
 * 浅金色主体，适合深色背景（fit: dark）
 */
export function drawStarPet(ctx, s, o = {}) {
  const gold = o.accent2 || '#F2C14E'
  const ink = o.ink || '#3A2A22'
  const white = o.white || '#FFFFFF'

  ctx.save()
  ctx.scale(s, s)

  // 星身
  ctx.beginPath()
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 === 0 ? 0.62 : 0.62 * 0.46
    const a = (Math.PI / 5) * i - Math.PI / 2
    const x = Math.cos(a) * rr
    const y = Math.sin(a) * rr - 0.02
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
  ctx.fillStyle = gold
  ctx.fill()

  // 五官：星星中间那块够宽，放得下
  eye(ctx, -0.155, -0.1, 0.042, ink, white)
  eye(ctx, 0.155, -0.1, 0.042, ink, white)
  arcLine(ctx, 0, 0.0, 0.075, 0.16 * Math.PI, 0.84 * Math.PI, 0.024, ink)
  blush(ctx, 0.04, 0.26, o.blush)

  ctx.restore()
}

/**
 * 角色缩放补偿
 *
 * 每个角色的造型大小不一样（铃铛天生细长、花环天生圆胖），
 * 统一 s 画出来会一大一小。这里按实测比例补偿，让它们在同一张卡上"视觉重量"一致。
 */
export const MASCOT_SCALE = {
  snowman: 0.98,
  penguin: 1.06,
  gingerbread: 1.12,
  bear: 1.0,
  gift: 1.02,
  bell: 1.34,
  sock: 1.16,
  wreath: 1.24,
  star: 1.3
}

/** 统一调度；未登记的角色返回 false，由上层兜底 */
export function drawMascot(ctx, id, cx, cy, s, opt = {}) {
  const fn = {
    snowman: drawSnowman,
    penguin: drawPenguin,
    gingerbread: drawGingerbread,
    bear: drawBear,
    gift: drawGift,
    bell: drawBell,
    sock: drawSock,
    wreath: drawWreath,
    star: drawStarPet
  }[id]
  if (!fn) return false
  const k = MASCOT_SCALE[id] || 1
  const scaled = s * k
  ctx.save()
  ctx.translate(cx, cy)
  fn(ctx, scaled, opt)
  ctx.restore()
  return true
}
