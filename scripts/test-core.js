/**
 * 纯逻辑自测（不需要浏览器 / 小程序 / 云环境）
 *
 * 覆盖：本地存储容错、会话读写、分享链接参数、海报折行、数值口径
 *
 * 用法：node scripts/test-core.js
 */

import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.dirname(HERE)
const mod = (p) => import(pathToFileURL(path.join(ROOT, p)).href)

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

/* ---------- uni 存储替身 ---------- */
const mem = new Map()
globalThis.uni = {
  getStorageSync: (k) => (mem.has(k) ? mem.get(k) : ''),
  setStorageSync: (k, v) => mem.set(k, v),
  removeStorageSync: (k) => mem.delete(k),
  showToast: () => {},
  setClipboardData: ({ success }) => success && success()
}

/* ---------- 浏览器替身（share.js 的 H5 分支会读 window） ---------- */
globalThis.window = {
  location: {
    origin: 'https://x.example.com',
    pathname: '/',
    search: '?sharecode=ABC123&inviter=n_old',
    hash: '#/pages/index/index'
  }
}

const storage = await mod('storage-identity/storage.js')
const share = await mod('share-params/share.js')
const draw = await mod('poster-render/draw.js')
const limits = await mod('config-env/limits.js')

console.log('\n=== 纯逻辑自测 ===')

/* ---------- 存储容错 ---------- */
storage.writeJSON('probe', { a: 1 })
ok(storage.readJSON('probe', null).a === 1, 'JSON 读写往返')

mem.set(storage.key('broken'), '{not json')
const recovered = storage.readJSON('broken', 'fallback')
ok(recovered === 'fallback', '坏数据返回 fallback')
ok(!mem.has(storage.key('broken')), '坏数据被清掉（否则每次都读失败）')

const id1 = storage.getClientId()
const id2 = storage.getClientId()
ok(!!id1 && id1 === id2, 'clientId 稳定复用')
ok(id1.startsWith('c_'), 'clientId 有前缀', id1)

/* ---------- 会话 ---------- */
ok(storage.readSession() === null, '无会话时返回 null')
storage.writeSession({ uid: 'u_abc', token: 'tk' })
ok(storage.readSession().uid === 'u_abc', '会话读写')
storage.writeSession({ uid: '' })
ok(storage.readSession() === null, '残缺会话视为无效')
storage.writeSession({ uid: 'u_x', token: 't' })
storage.clearSession()
ok(storage.readSession() === null, '会话可清除')

/* ---------- 分享参数 ---------- */
const qs = share.buildQuery({ treeId: 'christmas', inviter: 'n_中文', empty: '' })
ok(qs.indexOf('treeId=christmas') > -1, 'buildQuery 保留有效参数')
ok(qs.indexOf('empty') === -1, 'buildQuery 丢弃空值')
ok(decodeURIComponent(qs).indexOf('n_中文') > -1, 'buildQuery 正确编码中文')

const url = share.buildH5ShareUrl({ treeId: 'christmas', inviter: 'n_abc' })
ok(url.indexOf('sharecode=ABC123') > -1, '分享链接保留平台鉴权参数 sharecode')
ok(url.indexOf('inviter=n_old') === -1, '分享链接剔除 search 里的旧 inviter（防串味）')
ok(url.indexOf('#/pages/join/join?treeId=christmas&inviter=n_abc') > -1, '分享路由参数正确', url)

globalThis.window.location.hash = '#/pages/join/join?inviter=n_fromhash&treeId=christmas'
const entry = share.parseEntry({})
ok(entry.inviter === 'n_fromhash', 'parseEntry 从 hash 取到邀请人', JSON.stringify(entry))

const entryWithScene = share.parseEntry({ scene: encodeURIComponent('inviter=n_scene&treeId=christmas') })
ok(entryWithScene.inviter === 'n_scene', 'parseEntry 支持小程序扫码 scene')

/* ---------- 海报折行 ---------- */
const fakeCtx = { measureText: (t) => ({ width: String(t).length * 10 }) }
const short = draw.wrapText(fakeCtx, '一句话心愿', 200, 3)
ok(short.length === 1 && short[0] === '一句话心愿', '短文本不折行')

const longText = '这是一段非常非常长的心愿文字用来验证折行是否会在超出宽度时正确换行并且最后用省略号收尾'
const lines = draw.wrapText(fakeCtx, longText, 100, 3)
ok(lines.length <= 3, '最多 3 行', 'lines=' + lines.length)
ok(lines[lines.length - 1].indexOf('…') > -1, '末行以省略号收尾', lines[lines.length - 1])

/* ---------- 数值口径 ---------- */
ok(limits.WISH_MAX > 0 && limits.NICK_MAX > 0, 'limits 已定义')
ok(
  limits.AVATAR_CLIENT_MAX_BYTES < 200 * 1024,
  '客户端头像上限低于云端硬限（否则会被服务端拒）',
  String(limits.AVATAR_CLIENT_MAX_BYTES)
)

console.log(`\n通过 ${pass} 项${fails.length ? `，失败 ${fails.length} 项` : ''}`)
if (fails.length) {
  fails.forEach((f) => console.log('  ✗ ' + f))
  process.exit(1)
}
