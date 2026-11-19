/**
 * 块 5 · 版面计算
 *
 * 把"审美"翻译成可断言的数字：每个区块的坐标都从 width/height 按比例算出来，
 * 不写死像素。这样换画布尺寸（比如 1080×1440）版式不会散。
 *
 * 分块自测会检查：motif / tag / title / paper / footer 五段互不重叠。
 */

/** 装饰点：固定比例坐标，不用 Math.random —— 每次生成必须完全一致 */
export const DECO_POINTS = [
  [0.075, 0.115], [0.235, 0.085], [0.43, 0.135], [0.615, 0.075],
  [0.795, 0.145], [0.925, 0.10], [0.12, 0.31], [0.885, 0.295],
  [0.045, 0.525], [0.945, 0.505], [0.145, 0.705], [0.855, 0.685],
  [0.30, 0.885], [0.715, 0.90]
]

/**
 * @param {number} width
 * @param {number} height
 */
export function computeLayout(width, height) {
  const W = Number(width)
  const H = Number(height)
  if (!Number.isFinite(W) || !Number.isFinite(H) || W <= 0 || H <= 0) {
    throw new TypeError(`computeLayout 需要正数尺寸，收到 ${width}×${height}`)
  }

  const side = Math.min(W, H)
  const r = side * 0.145

  return {
    width: W,
    height: H,
    /** 主图形：中心 + 半径 */
    motif: { cx: W / 2, cy: H * 0.37, r, top: H * 0.37 - r * 1.05, bottom: H * 0.37 + r * 1.05 },
    /** 模板名小标签 */
    tag: { x: W / 2, y: H * 0.52, size: 27 },
    /** 主标题 */
    title: { x: W / 2, y: H * 0.60, size: 74 },
    /**
     * 祝福白卡：水平内边距 + 垂直中心 + 最大高度
     *
     * 加了称呼行之后白卡要更高（maxH 0.246 → 0.29），
     * 标签、标题跟着上移让位。这组数字是联动的，单独改一个就会撞：
     * 改完请跑 `npm run test:card`，[版面] 那组会把五段两两相撞全验一遍。
     */
    paper: { x: W * 0.12, w: W * 0.76, centerY: H * 0.78, maxH: H * 0.29 },
    /** 落款 */
    footer: { x: W / 2, y: H * 0.952, size: 22 }
  }
}

/**
 * 白卡的实际盒子：高度随文本行数变，垂直居中于 centerY
 * @param {Object} layout computeLayout 的结果
 * @param {number} contentH 文本内容高度（含内边距）
 */
export function paperBox(layout, contentH) {
  const h = Math.min(Math.max(contentH, 0), layout.paper.maxH)
  return {
    x: layout.paper.x,
    y: layout.paper.centerY - h / 2,
    w: layout.paper.w,
    h
  }
}

/**
 * 版面合法性自检，返回问题列表（空数组 = 没问题）
 * 只用于测试与开发期断言，线上不调用。
 */
export function validateLayout(layout) {
  const issues = []
  const { tag, title, paper } = layout
  const paperTop = paper.centerY - paper.maxH / 2
  const paperBottom = paper.centerY + paper.maxH / 2

  if (layout.motif.bottom > tag.y - tag.size) {
    issues.push(`motif 底部 ${layout.motif.bottom.toFixed(1)} 压到标签 ${tag.y}`)
  }
  if (tag.y > title.y - title.size) {
    issues.push(`标签 ${tag.y} 压到标题 ${title.y}`)
  }
  if (title.y > paperTop) {
    issues.push(`标题 ${title.y} 压到白卡顶部 ${paperTop.toFixed(1)}`)
  }
  if (paperBottom > layout.footer.y - layout.footer.size) {
    issues.push(`白卡底部 ${paperBottom.toFixed(1)} 压到落款 ${layout.footer.y}`)
  }
  if (paper.x < 0 || paper.x + paper.w > layout.width) {
    issues.push('白卡超出画布水平范围')
  }
  return issues
}
