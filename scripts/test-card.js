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
 *       版面不重叠、随机确定性、角色覆盖、脏数据收敛、内容安全、主题回退、分享参数。
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

const { drawCard } = await load('render.js')
const { wrapText, fitText, fitLine, fontString } = await load('text.js')
const { computeLayout, validateLayout, paperBox } = await load('layout.js')
const { normalizeState, createState, resolveSelection, reroll, nextWish, resolveWishIndex, saveState, loadState } = await load('state.js')
const { pickCardTheme } = await load('theme.js')
const { drawMotif } = await load('motifs.js')
const { buildArtwork, createRng, encodeSeed, decodeSeed, normalizeSeed, pickWishIndex } = await load('random.js')
const { scanText, sanitizeText, sanitizeName, clampName, scanAll, MAX_NAME_LEN } = await load('safety.js')
const { buildCardShareUrl, parseCardEntry } = await load('share.js')
const { createMusic, noteFreq, MELODY, melodyBeats } = await load('music.h5.js')

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
    globalAlpha: 1,
    shadowColor: '',
    shadowBlur: 0,
    shadowOffsetY: 0,
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
    fillText: (t) => calls.push(['fillText', t, ctx.fillStyle]),
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

/* ---------- 随机造型 ---------- */
console.log('\n[6] 随机造型：确定性')
const { card } = pickCardTheme()
const SEED = 20261225
const artA = buildArtwork(SEED, card)
const artB = buildArtwork(SEED, card)
ok(JSON.stringify(artA) === JSON.stringify(artB), '同一颗 seed 两次生成完全一致')
ok(Array.isArray(artA.bg) && artA.bg.length === 2, '画稿带背景渐变两色')
ok(!!artA.motif && !!artA.tag, '画稿带 motif 与标签')

let toneOk = true
for (let i = 0; i < 200; i++) {
  const a = buildArtwork(1000 + i * 7919, card)
  const p = card.palettes.find((x) => x.id === a.paletteId)
  const m = card.mascots.find((x) => x.id === a.motif)
  if (!p || !m || (m.fit !== 'any' && m.fit !== p.bgTone)) {
    toneOk = false
    break
  }
}
ok(toneOk, '200 次抽样：角色明度始终匹配背景')

const seen = new Set()
for (let i = 0; i < 40; i++) seen.add(buildArtwork(100 + i * 104729, card).id)
ok(seen.size >= 15, '40 次生成至少 15 种不同画面', `实际 ${seen.size}`)

ok(reroll({ seed: SEED, presetIndex: 0 }).seed !== SEED, '换一张会换 seed')
ok(decodeSeed(encodeSeed(SEED)) === SEED, 'seed 编解码可往返')
ok(decodeSeed('') === null && decodeSeed('不合法') === null && decodeSeed('zzzzzzzz') === null, '非法短码一律返回 null')
ok(normalizeSeed(-5) > 0 && normalizeSeed(0) > 0, '非法 seed 收敛成正数')
ok(createRng(1)() === createRng(1)(), 'PRNG 同 seed 同首值')

/* ---------- 绘制 ---------- */
console.log('\n[7] 绘制全链路')
const art = buildArtwork(SEED, card)
const ctx2 = makeCtx()
const info = drawCard(ctx2, {
  width: 750,
  height: 1000,
  template: art,
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
ok(texts.includes(`· ${art.tag} ·`), '角色标签正确')
ok(info.lines.length === 1, '短祝福一行')
ok(info.box.h < L.paper.maxH, '短祝福白卡不会顶满')

console.log('\n[8] 长祝福语不撞版面')
const ctx3 = makeCtx()
const info3 = drawCard(ctx3, {
  width: 750,
  height: 1000,
  template: art,
  wish: LONG,
  copy: card.copy,
  paperStyle: card.paper
})
ok(info3.lines.length <= 3, '最多 3 行', `实际 ${info3.lines.length}`)
ok(info3.box.h <= L.paper.maxH + 0.001, '白卡不超高')
ok(info3.box.y >= L.title.y, '白卡顶部不低于标题', `${info3.box.y.toFixed(0)} vs ${L.title.y}`)
ok(info3.box.y + info3.box.h <= L.footer.y - L.footer.size, '白卡底部不压落款')

/* ---------- 文字色 ---------- */
console.log('\n[9] 文字色跟着背景明度走')
let lightArt = null
let darkArt = null
for (let i = 0; i < 300 && (!lightArt || !darkArt); i++) {
  const a = buildArtwork(500 + i * 3571, card)
  if (a.bgTone === 'light' && !lightArt) lightArt = a
  if (a.bgTone === 'dark' && !darkArt) darkArt = a
}
ok(!!lightArt && !!darkArt, '抽样中深浅背景都能出现')
ok(lightArt.text.title === card.text.onLight.title, '浅背景用深色标题')
ok(darkArt.text.title === card.text.onDark.title, '深背景用白色标题')

const ctxL = makeCtx()
drawCard(ctxL, { width: 750, height: 1000, template: lightArt, wish: '圣诞快乐', copy: card.copy, paperStyle: card.paper })
const heroCall = ctxL.calls.find((c) => c[0] === 'fillText' && c[1] === card.copy.heroTitle)
ok(heroCall && heroCall[2] === card.text.onLight.title, '浅背景标题真的用了深色', heroCall && heroCall[2])

let textGap = 0
card.palettes.forEach((p) => {
  if (!card.text[p.bgTone === 'dark' ? 'onDark' : 'onLight']) textGap++
})
ok(textGap === 0, `${card.palettes.length} 套配色都有对应文字色`)

/* ---------- 角色覆盖 ---------- */
console.log('\n[10] 角色绘制覆盖')
const missing = []
card.mascots.forEach((m) => {
  const c = makeCtx()
  let drawn = true
  try {
    drawMotif(c, m.id, 375, 370, 108, art)
  } catch (e) {
    drawn = false
  }
  if (!drawn || !c.calls.some((x) => x[0] === 'fill' || x[0] === 'stroke')) missing.push(m.id)
})
ok(missing.length === 0, `全部 ${card.mascots.length} 个角色都能画出内容`, missing.join(','))

let comboFail = 0
card.palettes.forEach((p) => {
  card.mascots.forEach((m) => {
    const c = makeCtx()
    try {
      drawMotif(c, m.id, 375, 370, 108, p)
    } catch (e) {
      comboFail++
    }
  })
})
ok(comboFail === 0, `${card.palettes.length} 套配色 × ${card.mascots.length} 个角色全部可绘制`)

const cu = makeCtx()
drawMotif(cu, 'not-exist', 375, 370, 108, art)
ok(cu.calls.some((x) => x[0] === 'fill'), '未知 motif 兜底画星，不留白')

/* ---------- 状态收敛 ---------- */
console.log('\n[11] 脏数据收敛')
const base = createState(card, SEED)
ok(base.seed === SEED, '可传入种子开局（分享入口需要确定性）')
ok(base.presetIndex === null, '祝福语默认不钉死，跟着 seed 抽')

const dirty = normalizeState(card, { seed: 'abc', presetIndex: 999 })
ok(Number.isFinite(dirty.seed) && dirty.seed > 0, '坏 seed 收敛成合法种子')
ok(dirty.presetIndex === null, '越界索引回到随机，而不是强行给 0')

const dirty2 = normalizeState(card, { seed: SEED, presetIndex: '2' })
ok(dirty2.seed === SEED, '合法 seed 保留')
ok(dirty2.presetIndex === 2, '数字字符串索引被接受（分享参数是字符串）')

const sel = resolveSelection(dirty2, card)
ok(!!sel.template && sel.template.seed === SEED, '选中画稿可解析')
ok(sel.wish === card.presets[2], '钉住的祝福可解析')
ok(sel.template === sel.art, 'template 与 art 是同一对象')

/* ---------- 祝福语随机化 ---------- */
console.log('\n[11b] 祝福语随机化')
ok(pickWishIndex(SEED, 6) === pickWishIndex(SEED, 6), '同一 seed 抽出同一句')
ok(
  resolveSelection({ seed: SEED, presetIndex: null }, card).wish === resolveSelection(createState(card, SEED), card).wish,
  '默认状态与显式 null 抽到同一句'
)

const hit = new Array(card.presets.length).fill(0)
for (let i = 0; i < 200; i++) hit[pickWishIndex(1000 + i * 7919, card.presets.length)]++
ok(hit.filter((n) => n > 0).length >= 12, `200 次抽签覆盖 ${hit.filter((n) => n > 0).length}/${card.presets.length} 句`)
ok(Math.max(...hit) / 200 < 0.25, '没有哪一句被抽到超过 25%（分布没塌）')

let cur = { seed: SEED, presetIndex: null }
let prev = resolveSelection(cur, card).wish
let alwaysDiff = true
for (let i = 0; i < 40; i++) {
  cur = nextWish(cur, card)
  const w = resolveSelection(cur, card).wish
  if (w === prev) alwaysDiff = false
  prev = w
}
ok(alwaysDiff, '「换一句」每次都给不同的句子')

ok(resolveWishIndex({ seed: SEED, presetIndex: 999 }, card) === pickWishIndex(SEED, card.presets.length), '下标非法时退回按种子抽')

/* ---------- 画面与祝福语解耦 ---------- */
console.log('\n[11c] 换画面不换祝福、换祝福不换画面')
const base9 = createState(card, SEED)
ok(base9.wishSeed === SEED, '初次进入时祝福种子跟画面种子同源（老链接行为不变）')

const selBase = resolveSelection(base9, card)
const selRoll = resolveSelection(reroll(base9), card)
ok(selRoll.art.id !== selBase.art.id, '换一张确实画出了另一张')
ok(selRoll.wish === selBase.wish, '换一张后祝福语仍是同一句')
ok(selRoll.wishIndex === selBase.wishIndex, '换一张后祝福下标不变')

let keptState = base9
let stable = true
for (let i = 0; i < 5; i++) {
  keptState = reroll(keptState)
  if (resolveSelection(keptState, card).wish !== selBase.wish) stable = false
}
ok(stable, '连点 5 次「换一张」，祝福语始终是同一句')

const selWish1 = resolveSelection(base9, card)
// nextWish 的步长是随机的，只能调一次再复用，否则两次拿到的是不同句子
const posed = nextWish(base9, card)
const selWish2 = resolveSelection(posed, card)
ok(selWish2.art.id === selWish1.art.id, '换一句后画面与之前完全相同')
ok(selWish2.art.particles.length === selWish1.art.particles.length, '连粒子数量都没变')
ok(selWish2.wish !== selWish1.wish, '换一句确实换了文案')

const late = resolveSelection(reroll(posed), card)
ok(late.wish === selWish2.wish, '先换句再换图，句子仍保留')
ok(late.art.id !== selWish2.art.id, '先换句再换图，画面确实变了')

const legacy = normalizeState(card, { seed: SEED })
ok(legacy.wishSeed === SEED, '旧链接（只有 s）缺省把祝福种子设为 s')
ok(
  resolveSelection(legacy, card).wish === card.presets[pickWishIndex(SEED, card.presets.length)],
  '旧链接的祝福语与旧版算法一致，已发出的链接不会变句子'
)

let altWishSeed = SEED + 1
for (let s2 = SEED + 1; s2 < SEED + 500; s2++) {
  if (pickWishIndex(s2, card.presets.length) !== pickWishIndex(SEED, card.presets.length)) {
    altWishSeed = s2
    break
  }
}
const swap = normalizeState(card, { seed: SEED, wishSeed: altWishSeed })
ok(swap.seed === SEED, '只换祝福种子时画面种子不变')
ok(resolveSelection(swap, card).wish !== resolveSelection(legacy, card).wish, '换祝福种子确实换到另一句')

/* ---------- 背景音乐 ---------- */
console.log('\n[11d] 背景音乐（合成旋律）')
ok(noteFreq('A4') === 440, 'A4 = 440Hz')
ok(Math.abs(noteFreq('A5') - 880) < 0.01, '高八度频率翻倍')
ok(Math.abs(noteFreq('C4') - 261.63) < 0.1, 'C4 ≈ 261.63Hz')
ok(noteFreq('') === 0 && noteFreq('H4') === 0, '坏音名返回 0 而不是 NaN')
ok(MELODY.every((n) => noteFreq(n[0]) > 0), '每个音都能算出频率（没有拼错的音名）')
ok(MELODY.every((n) => Number(n[1]) > 0), '每个音都有正的拍数（没有写坏的节奏）')
ok(melodyBeats() === 32, `一轮 32 拍（实际 ${melodyBeats()}）`)
const silent = createMusic()
ok(silent.supported === true, 'H5 播放器声明自己可用')
ok(silent.start() === false, '拿不到 AudioContext 时 start() 返回 false')
ok(silent.playing === false, '没能起播就不谎报 playing')
silent.stop()
silent.dispose()
ok(true, 'stop / dispose 在未起播状态下可安全调用')

/* ---------- 内容安全 ---------- */
console.log('\n[12] 内容安全')
const copyTexts = [
  card.copy.title,
  card.copy.sub,
  card.copy.heroTitle,
  card.copy.footer,
  card.copy.footnote,
  ...card.copy.points,
  ...card.presets,
  ...card.mascots.map((m) => m.tag),
  ...card.mascots.map((m) => m.name)
]
const allSafe = scanAll(copyTexts)
ok(allSafe.ok, `主题里 ${copyTexts.length} 条文案全部通过扫描`, JSON.stringify(allSafe.bad))
ok(scanText('圣诞快乐').ok, '普通祝福通过')
ok(scanText('一路平安').ok, '「一路平安」不被误杀（路不是地名）')
ok(scanText('北京下雪了').hits.some((h) => h.startsWith('place:')), '具体地名被拦')
ok(scanText('张先生圣诞快乐').hits.some((h) => h.startsWith('title:')), '敬称被拦（会被读成人名）')
ok(scanText('\uD83C\uDDE8\uD83C\uDDF3 圣诞快乐').hits.includes('flag'), '国旗符号被拦')
ok(scanText('打 13800138000').hits.some((h) => h.startsWith('privacy:')), '手机号被拦')
ok(scanText('a@b.com').hits.some((h) => h.startsWith('privacy:')), '邮箱被拦')
ok(scanText('一'.repeat(81)).hits.includes('too-long'), '超长文本被拦')
ok(sanitizeText('张先生圣诞快乐', '圣诞快乐').text === '圣诞快乐', '命中时整段换兜底文案')

/* ---------- 主题回退 ---------- */
console.log('\n[13] 主题回退')
const fb = pickCardTheme({ id: 'fake', tokens: {} })
ok(!!fb.card && fb.fallback === true, '缺 card 段时回退 christmas')
ok(fb.card.palettes.length >= 4, '回退后配色池可用')
ok(fb.card.mascots.length >= 6, '回退后角色池可用')

/* ---------- 分享链接 ---------- */
console.log('\n[14] 分享链接')
globalThis.window = {
  location: {
    origin: 'https://x.example.com',
    pathname: '/',
    search: '?sharecode=ABC123',
    hash: '#/pages/card/card'
  }
}
const url = buildCardShareUrl({ seed: SEED })
ok(url.includes('sharecode=ABC123'), '保留 sharecode', url)
ok(url.includes('#/pages/card/card?s=' + encodeSeed(SEED)), '带 seed 参数', url)
ok(parseCardEntry({ s: encodeSeed(SEED) }).seed === SEED, '显式参数优先且能还原 seed')
ok(parseCardEntry({ s: '不合法' }).seed === null, '坏参数返回 null 而不是抛错')

// 从 hash 路由里读（朋友点开分享链接走的就是这条路）
globalThis.window.location.hash = '#/pages/card/card?s=' + encodeSeed(SEED)
ok(parseCardEntry({}).seed === SEED, '从 location.hash 里读到 seed')

// 祝福语被「换一句」钉住过，必须一起进链接，否则朋友看到的句子和图上不一样
const urlW = buildCardShareUrl({ seed: SEED, wishIndex: 3 })
ok(urlW.includes('&w=3'), '钉住的祝福语进链接', urlW)
ok(buildCardShareUrl({ seed: SEED }).includes('w=') === false, '未钉住时链接不带 w')
ok(parseCardEntry({ s: encodeSeed(SEED), w: '3' }).wishIndex === 3, '解析出祝福语下标')
ok(parseCardEntry({ s: encodeSeed(SEED) }).wishIndex === null, '没带 w 时交给 seed 抽')
ok(parseCardEntry({ s: encodeSeed(SEED), w: '坏值' }).wishIndex === null, 'w 坏值不抛错')

// 画面种子与祝福种子不同时，必须把祝福种子也带过去
const urlWs = buildCardShareUrl({ seed: SEED, wishSeed: SEED + 987654 })
ok(urlWs.includes('ws='), '两颗种子不同时链接带上 ws')
ok(urlWs.includes('s=' + encodeSeed(SEED)), '同时仍带画面种子')
ok(buildCardShareUrl({ seed: SEED, wishSeed: SEED }).includes('ws=') === false, '两颗种子相同时不塞多余的 ws')
ok(parseCardEntry({ s: encodeSeed(SEED), ws: encodeSeed(SEED + 987654) }).wishSeed === SEED + 987654, 'ws 解析成祝福种子')
ok(parseCardEntry({ s: encodeSeed(SEED), ws: '%%%%' }).wishSeed === null, '坏 ws 解析成 null 而不是抛错')
ok(parseCardEntry({ s: encodeSeed(SEED) }).wishSeed === null, '没带 ws 时交给页面按 s 回落')

globalThis.window.location.hash = '#/pages/card/card?s=' + encodeSeed(SEED) + '&w=5'
ok(parseCardEntry({}).wishIndex === 5, '从 location.hash 里读到祝福语下标')

/* ---------- 名字闸 ---------- */
console.log('\n[15] 名字闸（拒绝而不是替换）')
ok(sanitizeName('妈妈').ok && sanitizeName('妈妈').text === '妈妈', '中文称呼通过')
ok(sanitizeName('  Alex  ').text === 'Alex', '两端空白被裁掉')
ok(sanitizeName('小  明').text === '小 明', '连续空格折叠成一个')
ok(sanitizeName('阿依古丽·买买提').ok, '间隔号「·」允许')
ok(sanitizeName('Jean-Luc').ok, '连字符「-」允许')

ok(sanitizeName('   ').ok && sanitizeName('   ').text === null, '纯空白视为没填（null 而非空串）')
ok(sanitizeName(null).ok, 'null 不抛错')
ok(sanitizeName(undefined).ok, 'undefined 不抛错')

ok(sanitizeName('一'.repeat(MAX_NAME_LEN + 1)).reason === 'too-long', `超过 ${MAX_NAME_LEN} 字被拒`)
ok(sanitizeName('小明🎄').reason === 'bad-char', 'emoji 被拒（字体不保证渲染）')
ok(!sanitizeName('\uD83C\uDDE8\uD83C\uDDF3小明').ok, '国旗被拒')
ok(!sanitizeName('小明!!!').ok, '标点被拒')
ok(sanitizeName('13800138000').reason.indexOf('privacy') === 0, '手机号被拒')
ok(sanitizeName('a@b.com').reason.indexOf('privacy') === 0, '邮箱被拒')
ok(sanitizeName('110105199001011234').reason.indexOf('privacy') === 0, '身份证被拒')

// 刻意放宽：这两张表是给"生成端文案"设的闸，用户主动填的称呼不该误杀
ok(sanitizeName('王老师').ok, '「王老师」通过（称呼场景）')
ok(sanitizeName('北京大爷').ok, '「北京大爷」通过（名字闸不查地名表）')

ok(sanitizeName('张\u200B明').text === '张明', '零宽空格被剥掉')
ok(clampName('一'.repeat(30)).length === MAX_NAME_LEN, 'clampName 超长截断而不拒绝')
ok(clampName('   ') === null, 'clampName 空白返回 null')
ok(clampName('张先生') === '张先生', 'clampName 不做安全裁决')
ok(clampName({ a: 1 }) === null, 'clampName 拒绝对象')

/* ---------- 名字单行排版 ---------- */
console.log('\n[16] 名字单行自适应')
const nShort = fitLine(ctx, '妈妈', { maxWidth: 300, size: 26, minSize: 18 })
ok(nShort.text === '妈妈' && nShort.size === 26, '短名字原样、不降字号')

const nFit = fitLine(ctx, '欧阳建国小朋友', { maxWidth: 100, size: 26, minSize: 18 })
ok(nFit.text.indexOf('\n') === -1, '长名字不折行')
ok(nFit.size >= 18 && nFit.size <= 26, `字号落在 18~26（实际 ${nFit.size}）`)
ok(!nFit.text.endsWith('…'), '不加省略号（「张小…」是事故）')

const nHuge = fitLine(ctx, '一'.repeat(12), { maxWidth: 60, size: 26, minSize: 18 })
ok(nHuge.size === 18 && nHuge.truncated === true, '缩到底仍放不下时截字')
ok(!nHuge.text.endsWith('…'), '截断也不补省略号')
ok(nHuge.width <= 60.001, '截断后宽度不超上限')
ok(fitLine(ctx, '', { maxWidth: 300 }).text === '', '空串返回空，不抛错')

/* ---------- 称呼与落款 ---------- */
console.log('\n[17] 称呼与落款文案')
const rNone = resolveSelection({ seed: SEED, presetIndex: null, toName: null, fromName: null }, card)
ok(rNone.greeting === '', '没填收卡人时不画称呼行')
ok(rNone.footer === card.copy.signAnon, `没填署名时落款「${card.copy.signAnon}」`)
ok(rNone.footer.indexOf('匿名') === -1, '匿名不写成"匿名"二字')

const rFrom = resolveSelection({ seed: SEED, presetIndex: null, toName: null, fromName: '阿花' }, card)
ok(rFrom.footer === '阿花送你的贺卡', `有署名时落款「阿花送你的贺卡」（实际 ${rFrom.footer}）`)
ok(rFrom.greeting === '', '只填署名仍无称呼行')

const rBoth = resolveSelection({ seed: SEED, presetIndex: null, toName: '小明', fromName: '阿花' }, card)
ok(rBoth.greeting === '致 小明', `填了收卡人有称呼行（实际 ${rBoth.greeting}）`)
ok(rBoth.footer === '阿花送你的贺卡', '落款不受收卡人影响')

const rTo = resolveSelection({ seed: SEED, presetIndex: null, toName: '小明', fromName: null }, card)
ok(rTo.greeting === '致 小明', '只填收卡人也有称呼行')
ok(rTo.footer === card.copy.signAnon, '没署名仍是匿名落款')

ok(JSON.stringify(rBoth.template) === JSON.stringify(rNone.template), '有无名字，画面完全一致（名字不进随机流）')

const rDirty = resolveSelection({ seed: SEED, toName: 123, fromName: { a: 1 } }, card)
ok(rDirty.greeting === '致 123', '数字名字被接受')
ok(rDirty.footer === card.copy.signAnon, '对象当名字时收敛成匿名')

/* ---------- 名字不外泄 ---------- */
console.log('\n[18] 名字只进画布')
const urlWN = buildCardShareUrl({ seed: SEED, wishIndex: 2 })
ok(urlWN.indexOf('小明') === -1 && urlWN.indexOf('%E5') === -1, '分享链接里没有名字')
ok(urlWN.includes('sharecode=ABC123'), '链接保留 sharecode')

globalThis.window.location.hash = '#/pages/card/card?s=' + encodeSeed(SEED) + '&to=' + encodeURIComponent('小明')
const entryN = parseCardEntry({})
ok(entryN.seed === SEED, 'seed 正常解析')
ok(entryN.toName === undefined && entryN.fromName === undefined, '手塞的 to/from 不被采纳')

let savedRaw = ''
globalThis.uni = {
  setStorageSync: (k, v) => { savedRaw = v },
  getStorageSync: () => savedRaw
}
saveState({ seed: SEED, presetIndex: null, toName: '小明', fromName: '阿花' })
ok(savedRaw.indexOf('小明') === -1 && savedRaw.indexOf('阿花') === -1, '落盘内容不含名字')
const rBack = loadState(card)
ok(rBack.toName === null && rBack.fromName === null, '重新读回来是匿名态')
ok(rBack.seed === SEED, 'seed 正常恢复')

/* ---------- 收尾 ---------- */
fs.rmSync(VFS, { recursive: true, force: true })

if (fails.length) {
  console.log(`\n${fails.length} 项失败：`)
  fails.forEach((f) => console.log('  ✗ ' + f))
  process.exit(1)
}
console.log(`\n贺卡线验证通过 ✅（${pass} 项）`)
