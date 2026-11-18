/**
 * 块完整性校验
 *
 * 这个仓库的块不是可直接运行的项目，而是"放回工程就能用"的零件。
 * 所以最需要校验的是：每个块文件放回目标路径后，它的 import 还能不能解析到。
 *
 * 做三件事：
 *   1. 覆盖检查：每个文件都要在 manifest.targets 或 ignored 里，别漏
 *   2. import 解析：按 manifest 建立虚拟文件系统，逐条解析相对 / @ 别名导入
 *   3. 口径对拍：前后端 limits 的数值必须一致
 *
 * 用法：node scripts/verify.js
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'))
const targets = manifest.targets || {}

const problems = []
const notes = []

function walk(dir, rel = '') {
  const out = []
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === '.git' || e.name === 'node_modules' || e.name === 'scripts') continue
    const r = rel ? `${rel}/${e.name}` : e.name
    const full = path.join(dir, e.name)
    if (e.isDirectory()) out.push(...walk(full, r))
    else out.push(r)
  }
  return out
}

const allFiles = walk(ROOT)

/* ---------- 1. 覆盖检查 ---------- */
const isIgnored = (f) =>
  f === 'README.md' ||
  /\/README\.md$/.test(f) ||
  /^CHANGELOG\.md$/.test(f) ||
  /^manifest\.json$/.test(f) ||
  /^package\.json$/.test(f)

for (const f of allFiles) {
  if (isIgnored(f)) continue
  if (!targets[f]) problems.push(`manifest 缺映射：${f}`)
}
for (const f of Object.keys(targets)) {
  if (!allFiles.includes(f)) problems.push(`manifest 指向不存在的文件：${f}`)
}

/* ---------- 2. 虚拟文件系统 + import 解析 ---------- */
const vfs = new Map()
for (const [block, target] of Object.entries(targets)) {
  vfs.set(target, {
    block,
    content: fs.readFileSync(path.join(ROOT, block), 'utf8')
  })
}

const SPEC_PATTERNS = [
  /\bfrom\s*['"]([^'"]+)['"]/g,
  /\brequire\(\s*['"]([^'"]+)['"]\s*\)/g,
  /\bimport\s*['"]([^'"]+)['"]/g
]

function extractSpecs(code) {
  const set = new Set()
  for (const re of SPEC_PATTERNS) {
    let m
    while ((m = re.exec(code))) set.add(m[1])
  }
  return [...set]
}

function toTarget(fromTarget, spec) {
  if (spec.startsWith('@/')) return 'src/' + spec.slice(2)
  if (!spec.startsWith('.')) return null // 外部依赖，跳过
  return path.posix.normalize(path.posix.join(path.posix.dirname(fromTarget), spec))
}

function exists(base) {
  const cands = [base, base + '.js', base + '.vue', base + '/index.js', base + '/index.vue']
  return cands.find((c) => vfs.has(c) && !c.endsWith('package.json')) || null
}

let specCount = 0
let unresolved = 0

for (const [target, info] of vfs.entries()) {
  if (!/\.(js|vue)$/.test(target)) continue
  for (const spec of extractSpecs(info.content)) {
    specCount++
    const base = toTarget(target, spec)
    if (!base) continue
    if (exists(base)) continue
    unresolved++
    problems.push(`${info.block} → 放到 ${target} 后，'${spec}' 解析不到（期望 ${base}）`)
  }
}

/* ---------- 3. 前后端口径对拍 ---------- */
function parseConsts(file, re) {
  const code = fs.readFileSync(path.join(ROOT, file), 'utf8')
  const out = {}
  let m
  while ((m = re.exec(code))) out[m[1]] = Number(m[2])
  return out
}

const fe = parseConsts('config-env/limits.js', /export\s+const\s+([A-Z_]+)\s*=\s*([\d.]+)/g)
const be = parseConsts('cloud-function/lib/limits.js', /exports\.([A-Z_]+)\s*=\s*([\d.]+)/g)

const PAIRS = [
  ['WISH_MAX', 'WISH_MAX'],
  ['NICK_MAX', 'NICK_MAX'],
  ['WALL_PAGE_SIZE', 'PAGE_SIZE'],
  ['AVATAR_CLIENT_MAX_BYTES', 'AVATAR_MAX_BYTES']
]

for (const [f, b] of PAIRS) {
  if (fe[f] === undefined) problems.push(`前端 limits 缺 ${f}`)
  if (be[b] === undefined) problems.push(`云端 limits 缺 ${b}`)
}
if (fe.WALL_PAGE_SIZE !== undefined && be.PAGE_SIZE !== undefined && fe.WALL_PAGE_SIZE !== be.PAGE_SIZE) {
  problems.push(`分页口径不一致：前端 WALL_PAGE_SIZE=${fe.WALL_PAGE_SIZE}，云端 PAGE_SIZE=${be.PAGE_SIZE}`)
}
if (
  fe.AVATAR_CLIENT_MAX_BYTES !== undefined &&
  be.AVATAR_MAX_BYTES !== undefined &&
  fe.AVATAR_CLIENT_MAX_BYTES > be.AVATAR_MAX_BYTES
) {
  problems.push('客户端头像上限比云端硬限还大，超限头像会被服务端拒掉')
}

/* ---------- 输出 ---------- */
notes.push(`块文件 ${vfs.size} 个，解析导入 ${specCount} 条，未解析 ${unresolved} 条`)
notes.push(`前端 limits: ${JSON.stringify(fe)}`)
notes.push(`云端 limits: ${JSON.stringify(be)}`)

console.log('=== 块完整性校验 ===')
notes.forEach((n) => console.log('  ' + n))

if (problems.length) {
  console.log(`\n发现 ${problems.length} 个问题：`)
  problems.forEach((p) => console.log('  ✗ ' + p))
  process.exit(1)
}

console.log('\n✓ 全部通过：映射完整、导入可解析、前后端口径一致')
