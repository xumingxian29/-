/**
 * 贺卡线自测：node scripts/test-card.js
 *
 * 这个仓库的块不能直接 import —— 它们用了 `@/` 别名、无扩展名的相对路径，
 * 还按原工程的目标路径互相引用。所以先按 manifest.json 把块**铺成真实工程结构**，
 * 在临时目录里重写 import，再跑测试。
 *
 * 好处：测的就是"放回工程后的样子"，而不是另写一份 mock 逻辑。
 * 零依赖，不需要 esbuild / vite / 任何构建工具。
 *
 * 覆盖：字体拼装、折行（防"每字一行"）、避头点、自动降字号、
 *       版面不重叠、三模板可绘制、脏数据收敛、主题回退。
 */

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'))
const targets = manifest.targets

/* ---------- 1. 按 manifest 铺成工程结构 ---------- */

const VFS = fs.mkdtempSync(path.join(os.tmpdir(), 'ft-card-'))
const targetSet = new Set(Object.values(targets))

/** 目标路径补扩展名：块里的 import 是不带扩展名的 */
function resolveTarget(base) {
  const cands = [base, base + '.js', base + '.vue', base + '/index.js', base + '/index.vue']
  return cands.find((c) => targetSet.has(c)) || null
}

const SPEC_RE = /(\bfrom\s*|\brequire\(\s*|\bimport\s*)['"]([^'"]+)['"]/g

/**
 * 把 `@/x` 和 `./x` 改写成铺开后的真实相对路径
 * 解析不到就原样保留，让 import 自己报错 —— 比静默跳过更容易查
 */
function rewriteSpecs(code, target) {
  const dir = path.posix.dirname(target)
  return code.replace(SPEC_RE, (whole, lead, spec) => {
    const isAlias = spec.startsWith('@/')
    if (!isAlias && !spec.startsWith('.')) return whole // 外部依赖

    const base = isAlias
      ? path.posix.normalize('src/' + spec.slice(2))
      : path.posix.normalize(path.posix.join(dir, spec))

    const hit = resolveTarget(base)
    if (!hit) return whole

    let rel = path.posix.relative(dir, hit)
    if (!rel.startsWith('.')) rel = './' + rel
    return `${lead}'${rel}'`
  })
}

for (const [block, target] of Object.entries(targets)) {
  const out = path.join(VFS, target)
  fs.mkdirSync(path.dirname(out), { recursive: true })
  fs.writeFileSync(out, rewriteSpecs(fs.readFileSync(path.join(ROOT, block), 'utf8'), target))
}
fs.writeFileSync(path.join(VFS, 'package.json'), '{"type":"module"}')

/* ---------- 2. 测试环境替身 ---------- */

globalThis.uni = {
  getStorageSync: () => '',
  setStorageSync: () => {}
}

const load = (name) => import(pathToFileURL(path.join(VFS, 'src/card', name)).href)

const {
  drawCard
} = await load('render.js')
const { wrapText, fitText, fontString } = await load('text.js')
const { computeLayout, validateLayout, paperBox } = await load('layout.js')
const { normalizeState, createState, resolveSelection } = await load('state.js')
const { pickCardTheme } = await load('theme.js')
const { drawMotif } = await load('motifs.js')
const { buildCardShareUrl, parseCardEntry } = await load('share.js')

/* ---------- 3. mock canvas ctx ---------- */

/** 合法的 CSS font 简写：必须含 px */
const isLegalFont = (v) => /^(\d+\s+)?[\d.]+px\s+\S/.test(String(v))

function parseSize(font) {
  const m = String(font).match(/([\d.]+)px/)
  return m ? Number(m[1]) : 16
}

function makeCtx() {
  const calls = []
  const grad = { addColorStop: () => {} }
  const noop = (name) => (...args) => calls.push([name, args.length])
  const holder = { value: '16px sans-serif' }

  const ctx = {
    calls,
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    lineCap: 'butt',
    lineJoin: 'miter',
    textAlign: 'start',
    textBaseline: 'alphabetic',
    save: noop('save'),
    restore: noop('restore'),
    translate: noop('translate'),
    scale: noop('scale'),
    rotate: noop('rotate'),
    beginPath: noop('beginPath'),
    closePath: noop('closePath'),
    moveTo: noop('moveTo'),
    lineTo: noop('lineTo'),
    arc: noop('arc'),
    arcTo: noop('arcTo'),
    quadraticCurveTo: noop('quadraticCurveTo'),
    clip: noop('clip'),
    fill: noop('fill'),
    stroke: noop('stroke'),
    fillRect: noop('fillRect'),
    clearRect: noop('clearRect'),
    fillText: (t) => calls.push(['fillText', t]),
    createLinearGradient: () => grad,
    createRadialGradient: () => grad,
    // 宽度 ≈ 字数 × 字号：近似但足以判定折行
    measureText: (t) => ({ width: Array.from(String(t)).length * parseSize(holder.value) })
  }

  // font 用存取器模拟浏览器：非法值被静默忽略
  Object.defineProperty(ctx, 'font', {
    get: () => holder.value,
    set: (v) => {
      if (isLegalFont(v)) holder.value = v
    }
  })

  return ctx
}

/* ---------- 4. 断言 ---------- */

let pass = 0
const fails = []
function ok(cond, label, extra) {
  if (cond) {
    pass++
    console.log('  ✓ ' + label)
  } else {
    fails.push(label + (extra ? ' → ' + extra : ''))
    console.log('  ✗ ' + label + (extra ? ' → ' + extra : ''))
  }
}

const LONG = '这是一段很长很长的祝福语用来验证自动降字号和折行是不是真的生效不要变成一列竖排单字'

console.log('\n=== 贺卡线自测 ===')
console.log(`  （块已铺到 ${VFS}）`)

/* ---------- 字体 ---------- */
console.log('\n[1] 字体拼装')
ok(fontString(34, 600).startsWith('600 34px'), '正常拼装', fontString(34, 600))

let threw = false
try {
  fontString(undefined)
} catch (e) {
  threw = true
}
ok(threw, '拒绝非法 size')

threw = false
try {
  fontString('34')
} catch (e) {
  threw = true
}
ok(!threw, '允许数字字符串（内部转 Number）')

/* ---------- 折行 ---------- */
console.log('\n[2] 折行：防「每字一行」')
const ctx = makeCtx()
const one = wrapText(ctx, '圣诞快乐', 400, { size: 34, maxLines: 3 })
ok(one.lines.length === 1, '短句一行', `实际 ${one.lines.length} 行`)
ok(/34px/.test(ctx.font), 'ctx.font 被设为 34px', ctx.font)

const wrapped = wrapText(ctx, LONG, 400, { size: 34, maxLines: 3 })
ok(wrapped.lines.length === 3, '长句截为 3 行', `实际 ${wrapped.lines.length} 行`)
ok(wrapped.lines[0].length > 1, '首行不是单字', `"${wrapped.lines[0]}"`)
ok(wrapped.truncated, '标记为已截断')
ok(wrapped.lines[2].endsWith('…'), '末行有省略号')

/* ---------- 避头点 ---------- */
console.log('\n[3] 避头点')
const punct = wrapText(ctx, '你好，这是一句测试标点是否会落在行首的话，对吧', 10 * 34, { size: 34, maxLines: 5 })
ok(
  punct.lines.every((l) => !/^[，。、；：！？]/.test(l)),
  '标点不出现在行首',
  punct.lines.join(' | ')
)

/* ---------- 自动降字号 ---------- */
console.log('\n[4] 自动降字号')
const fitted = fitText(ctx, LONG, { maxWidth: 400, maxLines: 3, size: 34, minSize: 24 })
ok(fitted.lines.length <= 3, '不超过 3 行', `实际 ${fitted.lines.length}`)
ok(fitted.size <= 34 && fitted.size >= 24, '字号在 24~34', `实际 ${fitted.size}`)
ok(fitted.lineHeight > fitted.size, '行高大于字号')

/* ---------- 版面 ---------- */
console.log('\n[5] 版面比例与不重叠')
const L = computeLayout(750, 1000)
const issues = validateLayout(L)
ok(issues.length === 0, '750×1000 无重叠', issues.join('; '))
const L2 = computeLayout(1080, 1440)
ok(validateLayout(L2).length === 0, '换尺寸 1080×1440 仍无重叠')
ok(paperBox(L, 99999).h <= L.paper.maxH, '白卡高度受 maxH 约束')
ok(Math.abs(paperBox(L, 120).h - 120) < 0.001, '矮内容按实际高度')

/* ---------- 绘制 ---------- */
console.log('\n[6] 绘制全链路')
const { card } = pickCardTheme()
const template = card.templates[0]
const ctx2 = makeCtx()
const info = drawCard(ctx2, {
  width: 750,
  height: 1000,
  template,
  wish: '圣诞快乐，平安喜乐',
  copy: card.copy,
  paperStyle: card.paper
})
const names = ctx2.calls.map((c) => c[0])
const texts = ctx2.calls.filter((c) => c[0] === 'fillText').map((c) => c[1])
ok(names.includes('fillRect'), '背景已绘制')
ok(names.includes('fill'), '图形已填充')
ok(texts.includes(card.copy.heroTitle), '主标题正确')
ok(texts.includes('圣诞快乐，平安喜乐'), '祝福语正确')
ok(texts.includes(card.copy.footer), '落款正确')
ok(info.lines.length === 1, '短祝福一行')
ok(info.box.h < L.paper.maxH, '短祝福白卡不会顶满')

console.log('\n[7] 长祝福语不撞版面')
const ctx3 = makeCtx()
const info3 = drawCard(ctx3, {
  width: 750,
  height: 1000,
  template,
  wish: LONG,
  copy: card.copy,
  paperStyle: card.paper
})
ok(info3.lines.length <= 3, '最多 3 行', `实际 ${info3.lines.length}`)
ok(info3.box.h <= L.paper.maxH + 0.001, '白卡不超高')
ok(info3.box.y >= L.title.y, '白卡顶部不低于标题', `${info3.box.y.toFixed(0)} vs ${L.title.y}`)
ok(info3.box.y + info3.box.h <= L.footer.y - L.footer.size, '白卡底部不压落款')

/* ---------- 三种图形 ---------- */
console.log('\n[8] 三种 motif')
card.templates.forEach((t) => {
  const c = makeCtx()
  let drawn = true
  try {
    drawMotif(c, t.motif, 375, 370, 108, { ink: t.ink, accent: t.accent, nose: t.nose })
  } catch (e) {
    drawn = false
  }
  ok(drawn && c.calls.some((x) => x[0] === 'fill' || x[0] === 'stroke'), `${t.name}（${t.motif}）可绘制`)
})

/* ---------- 状态收敛 ---------- */
console.log('\n[9] 脏数据收敛')
const base = createState(card)
ok(base.templateId === card.templates[0].id, '默认取第一个模板')
ok(base.presetIndex === 0, '默认第一句祝福')

const dirty = normalizeState(card, { templateId: 'not-exist', presetIndex: 999 })
ok(dirty.templateId === card.templates[0].id, '未知模板回退')
ok(dirty.presetIndex === 0, '越界索引回退')

const dirty2 = normalizeState(card, { templateId: card.templates[1].id, presetIndex: '2' })
ok(dirty2.templateId === card.templates[1].id, '合法模板保留')
ok(dirty2.presetIndex === 2, '数字字符串索引被接受')

const sel = resolveSelection(dirty2, card)
ok(!!sel.template && sel.template.id === card.templates[1].id, '选中模板可解析')
ok(sel.wish === card.presets[2], '选中祝福可解析')

/* ---------- 主题回退 ---------- */
console.log('\n[10] 主题回退')
const fb = pickCardTheme({ id: 'fake', tokens: {} })
ok(!!fb.card && fb.fallback === true, '缺 card 段时回退 christmas')
ok(fb.card.templates.length >= 3, '回退后模板可用')

/* ---------- 分享链接 ---------- */
console.log('\n[11] 分享链接')
globalThis.window = {
  location: {
    origin: 'https://x.example.com',
    pathname: '/',
    search: '?sharecode=ABC123',
    hash: '#/pages/card/card'
  }
}
const url = buildCardShareUrl({ templateId: 'deer' })
ok(url.includes('sharecode=ABC123'), '保留 sharecode', url)
ok(url.includes('#/pages/card/card?tpl=deer'), '带 tpl 参数', url)
ok(parseCardEntry({}).tpl === '' || typeof parseCardEntry({}).tpl === 'string', '入口解析不抛错')
ok(parseCardEntry({ tpl: 'snow' }).tpl === 'snow', '显式参数优先')

/* ---------- 收尾 ---------- */
fs.rmSync(VFS, { recursive: true, force: true })

if (fails.length) {
  console.log(`\n${fails.length} 项失败：`)
  fails.forEach((f) => console.log('  ✗ ' + f))
  process.exit(1)
}
console.log(`\n贺卡线验证通过 ✅（${pass} 项）`)
