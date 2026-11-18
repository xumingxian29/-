/**
 * 云函数块端到端自测（不需要真实云开发环境）
 *
 * 做法：把 wx-server-sdk 换成内存假数据库，直接调用 exports.main，
 * 完整走一遍 register → joinTree → blessNode → listNodes 的真实代码路径。
 *
 * 用法：node scripts/test-cloud.js
 */

import Module, { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.dirname(HERE)
const MOCK = path.join(HERE, '_wx-server-sdk.cjs')

// 必须在 require 云函数之前设好密钥，session.js 在模块加载时读它
process.env.FT_SESSION_SECRET = 'test-secret-do-not-use-in-prod'
process.env.FT_ALLOWED_ORIGIN = '*'

const origResolve = Module._resolveFilename
Module._resolveFilename = function (request, parent, ...rest) {
  if (request === 'wx-server-sdk') return MOCK
  return origResolve.call(this, request, parent, ...rest)
}

const require = createRequire(import.meta.url)
const sdk = require('./_wx-server-sdk.cjs')
const api = require(path.join(ROOT, 'cloud-function', 'index.js'))
const cloudRank = require(path.join(ROOT, 'cloud-function', 'lib', 'rank.js'))
const L = require(path.join(ROOT, 'cloud-function', 'lib', 'limits.js'))

const STORE = sdk.__store__

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

function seed(collection, rows) {
  STORE[collection] = rows
}

function http(body, opts = {}) {
  return api
    .main({
      httpMethod: 'POST',
      headers: { origin: opts.origin || 'https://a.example.com', 'x-forwarded-for': opts.ip || '1.1.1.1' },
      body: JSON.stringify(body)
    })
    .then((res) => ({ status: res.statusCode, json: JSON.parse(res.body), headers: res.headers }))
}

async function register() {
  const r = await http({ action: 'register' })
  return r.json.data
}

const TREE = 'christmas'

async function main() {
  console.log('\n=== 云函数块端到端 ===')

  // 主题配置：bless 档（顺便验证 hideInvite 与排序口径）
  seed('configs', [{ _id: 'app', themes: { christmas: { sortMode: 'bless' } } }])
  seed('nodes', [])
  seed('bless_logs', [])
  seed('invite_logs', [])

  /* ---------- 会话 ---------- */
  const A = await register()
  ok(!!A.uid && !!A.token, 'register 签发 uid/token', JSON.stringify(A).slice(0, 60))

  const forged = await http({ action: 'listNodes', payload: { treeId: TREE }, uid: A.uid, token: 'deadbeef' })
  ok(forged.json.code === 4010, '伪造 token 被拒（4010）', 'code=' + forged.json.code)

  const noSession = await http({ action: 'listNodes', payload: { treeId: TREE } })
  ok(noSession.json.code === 4010, '无会话被拒（4010）', 'code=' + noSession.json.code)

  /* ---------- 挂树 ---------- */
  const joinA = await http({
    action: 'joinTree',
    payload: { treeId: TREE, nickname: '小明', wish: '希望明年顺利', avatarFileId: '' },
    uid: A.uid,
    token: A.token,
    ip: '1.1.1.1'
  })
  ok(joinA.json.code === 0, 'A 挂树成功', joinA.json.msg)
  const nodeA = joinA.json.data && joinA.json.data.node
  ok(nodeA && nodeA.mine === true, '返回 mine=true')
  ok(nodeA && nodeA.inviteCount === undefined, 'bless 档不返回 inviteCount（规避诱导分享）')

  const docA = STORE.nodes.find((n) => n._id === nodeA.id)
  ok(docA && docA.sortMode === 'bless', 'sortMode 已落库（原来该字段不存在）', docA && docA.sortMode)
  ok(docA && docA.ip === '1.1.1.1', '节点记录了来源 IP（供频控用）')

  const joinAgain = await http({
    action: 'joinTree',
    payload: { treeId: TREE, nickname: '小明', wish: '改一下心愿', avatarFileId: '' },
    uid: A.uid,
    token: A.token
  })
  ok(joinAgain.json.code === 0 && STORE.nodes.length === 1, '重复提交是更新不是新增')
  ok(STORE.nodes[0].wish === '改一下心愿', '心愿被更新')

  const tooLong = await http({
    action: 'joinTree',
    payload: { treeId: TREE, nickname: 'x', wish: '一'.repeat(L.WISH_MAX + 1), avatarFileId: '' },
    uid: A.uid,
    token: A.token,
    ip: '2.2.2.2'
  })
  ok(tooLong.json.code === 4001, `超长心愿被拒（>${L.WISH_MAX}）`, tooLong.json.msg)

  const bigAvatar = await http({
    action: 'joinTree',
    payload: { treeId: TREE, nickname: 'x', wish: 'ok', avatarFileId: 'a'.repeat(L.AVATAR_MAX_BYTES + 1) },
    uid: A.uid,
    token: A.token,
    ip: '2.2.2.3'
  })
  ok(bigAvatar.json.code === 4001, '超限头像被明确拒绝（不再静默丢弃）', bigAvatar.json.msg)

  /* ---------- 祝福 ---------- */
  const B = await register()
  const C = await register()

  const b1 = await http({ action: 'blessNode', payload: { treeId: TREE, nodeId: nodeA.id }, uid: B.uid, token: B.token })
  ok(b1.json.code === 0 && b1.json.data.blessCount === 1, 'B 第一次祝福 → 1', JSON.stringify(b1.json))

  const b2 = await http({ action: 'blessNode', payload: { treeId: TREE, nodeId: nodeA.id }, uid: B.uid, token: B.token })
  ok(b2.json.code === 0 && b2.json.data.already === true && b2.json.data.blessCount === 1, 'B 重复祝福不计数')

  // 并发：同一身份同时打两次，只能成立一次
  const concurrent = await Promise.all([
    http({ action: 'blessNode', payload: { treeId: TREE, nodeId: nodeA.id }, uid: C.uid, token: C.token }),
    http({ action: 'blessNode', payload: { treeId: TREE, nodeId: nodeA.id }, uid: C.uid, token: C.token })
  ])
  const counted = concurrent.filter((r) => r.json.data && r.json.data.already === false).length
  ok(counted === 1, '并发双击只计一次（确定性 _id 兜住）', 'counted=' + counted)
  ok(STORE.bless_logs.length === 2, '祝福日志按 (node,身份) 唯一', 'logs=' + STORE.bless_logs.length)
  ok(STORE.nodes.find((n) => n._id === nodeA.id).blessCount === 2, '库里的 blessCount 与日志一致')

  const selfBless = await http({
    action: 'blessNode',
    payload: { treeId: TREE, nodeId: nodeA.id },
    uid: A.uid,
    token: A.token
  })
  ok(selfBless.json.code === 4003, '自己给自己送祝福被明确拒绝（4003）', selfBless.json.msg)

  /* ---------- 榜单 ---------- */
  const list = await http({
    action: 'listNodes',
    payload: { treeId: TREE, sort: 'invite', page: 1, size: 10 },
    uid: A.uid,
    token: A.token
  })
  ok(list.json.code === 0 && list.json.data.total === 1, 'listNodes 返回总数')
  ok(list.json.data.myRank === 1, 'myRank 按 bless 口径算出 1', 'myRank=' + list.json.data.myRank)

  // 造第三个人，验证排序真的按 blessCount（而不是被忽略）
  const D = await register()
  await http({
    action: 'joinTree',
    payload: { treeId: TREE, nickname: '小红', wish: '我也来', avatarFileId: '' },
    uid: D.uid,
    token: D.token,
    ip: '3.3.3.3'
  })
  const nodeD = STORE.nodes.find((n) => n.openid === D.uid)
  await http({ action: 'blessNode', payload: { treeId: TREE, nodeId: nodeD._id }, uid: A.uid, token: A.token })
  await http({ action: 'blessNode', payload: { treeId: TREE, nodeId: nodeD._id }, uid: B.uid, token: B.token })
  await http({ action: 'blessNode', payload: { treeId: TREE, nodeId: nodeD._id }, uid: C.uid, token: C.token })

  const ranked = await http({
    action: 'listNodes',
    payload: { treeId: TREE, page: 1, size: 10 },
    uid: A.uid,
    token: A.token
  })
  const order = ranked.json.data.list.map((n) => n.id)
  ok(order[0] === nodeD._id, '按 blessCount 降序（小红 3 条排第一）', order.join(','))
  ok(ranked.json.data.myRank === 2, 'A 降到第 2 名', 'myRank=' + ranked.json.data.myRank)

  /* ---------- 频控 ---------- */
  const oldBurst = L.BURST_PER_MIN
  L.BURST_PER_MIN = 2
  const E = await register()
  const F = await register()
  const G = await register()
  await http({ action: 'blessNode', payload: { treeId: TREE, nodeId: nodeD._id }, uid: E.uid, token: E.token, ip: '9.9.9.9' })
  await http({ action: 'blessNode', payload: { treeId: TREE, nodeId: nodeD._id }, uid: F.uid, token: F.token, ip: '9.9.9.9' })
  const burst = await http({
    action: 'blessNode',
    payload: { treeId: TREE, nodeId: nodeD._id },
    uid: G.uid,
    token: G.token,
    ip: '9.9.9.9'
  })
  ok(burst.json.code === 4003, '同 IP 超过分钟配额被拒（挡换身份刷）', burst.json.msg)
  L.BURST_PER_MIN = oldBurst

  /* ---------- 前后端排序对拍 ---------- */
  const fe = await import(pathToFileURL(path.join(ROOT, 'rank-slots', 'rank.js')).href)
  const cases = [
    { id: 'a', inviteCount: 1500, blessCount: 0, createdAt: 1 },
    { id: 'b', inviteCount: 0, blessCount: 2, createdAt: 2 },
    { id: 'c', inviteCount: 3, blessCount: 1, createdAt: 3 }
  ]
  for (const mode of ['invite', 'bless', 'display']) {
    const feOrder = fe.sortNodes(cases, mode).map((n) => n.id).join(',')
    const beOrder = cases
      .slice()
      .sort((x, y) => cloudRank.compareNodes(x, y, mode))
      .map((n) => n.id)
      .join(',')
    ok(feOrder === beOrder, `前后端排序一致（${mode}）`, `fe=${feOrder} be=${beOrder}`)
  }
  ok(
    fe.sortNodes(cases, 'bless')[0].id === 'b',
    '计数值过千不再串味（1500 邀请不会压过 2 祝福）',
    fe.sortNodes(cases, 'bless').map((n) => n.id).join(',')
  )

  /* ---------- 槽位溢出 ---------- */
  const layout = { slots: [{ x: 0.5, y: 0.2 }, { x: 0.4, y: 0.35 }, { x: 0.6, y: 0.5 }] }
  const many = Array.from({ length: 10 }, (_, i) => ({ id: 'n' + i, createdAt: i }))
  const assigned = fe.assignSlots(many, layout)
  const maxThemeY = 0.5
  const overflow = assigned.slice(3).map((a) => a.slot.y)
  ok(
    overflow.every((y) => y >= maxThemeY && y <= 0.95),
    '溢出槽位排在最后一个主题槽位下方（不再叠回树顶）',
    overflow.map((y) => y.toFixed(2)).join(',')
  )
  const xs = assigned.map((a) => a.slot.x)
  ok(xs.every((x) => x > 0.05 && x < 0.95), '槽位横向不越界', xs.map((x) => x.toFixed(2)).join(','))

  /* ---------- 汇总 ---------- */
  console.log(`\n通过 ${pass} 项${fails.length ? `，失败 ${fails.length} 项` : ''}`)
  if (fails.length) {
    fails.forEach((f) => console.log('  ✗ ' + f))
    process.exit(1)
  }
}

main().catch((e) => {
  console.error('\n自测崩溃：', e)
  process.exit(1)
})
