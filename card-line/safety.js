/**
 * 块 13 · 内容安全
 *
 * 这张图是要被转到群里的，一旦带上了人名、具体地名或国旗国徽，
 * 收不回来。所以在**生成端**设三道闸，而不是等审核：
 *
 *   闸一 · 不采集输入：整条线零键盘、零上传、零账号，没有人名可进
 *   闸二 · 只渲染白名单文本：卡片上的字全部来自 theme.card 的文案，
 *          不接受任何外部字符串拼进 canvas
 *   闸三 · 出图前扫描一遍：文案将来会被运营改、分享参数会被手工篡改，
 *          这一道专防"改文案改出事"
 *
 * 扫描器宁可漏一点也不要误杀 —— 误杀会让正常贺卡生成失败。
 * 所以地名只查具体名单，不查"省/市/路"这类通用字（"一路平安"不能被拦）。
 */

/**
 * 国旗与区域符号：U+1F1E6–U+1F1FF 的"区域指示符"两个一组就是国旗，
 * 所以只要出现就拦。用代理对写，避免 \u{...} 在老内核上不被识别。
 */
const FLAG_RE = /\uD83C[\uDDE6-\uDDFF]|\uD83C[\uDFF3\uDFF4]/

/** 具体地名/国名：只列会被读成"指向某个地方"的词，不列通用字 */
const PLACES = [
  '中国', '中华', '北京', '上海', '广州', '深圳', '杭州', '南京',
  '香港', '澳门', '台湾', '美国', '日本', '韩国', '英国', '法国',
  '德国', '俄国', '俄罗斯', '乌克兰', '以色列', '巴勒斯坦', '朝鲜'
]

/** 敬称与身份词：写在贺卡上会被读成"在称呼某个具体的人" */
const TITLES = ['先生', '女士', '小姐', '太太', '夫人', '同志', '同学', '老师']

/**
 * 隐私类：手机号、身份证、邮箱、链接、@账号
 *
 * 不用后行断言 (?<!\d)：iOS 16.4 之前的内核和部分安卓 WebView 不认它，
 * 一个正则会直接抛 SyntaxError，把整个模块带崩。改用捕获边界。
 */
const PRIVACY_RES = [
  { id: 'phone', re: /(^|[^\d])(1[3-9]\d{9})(?=[^\d]|$)/ },
  { id: 'idcard', re: /(^|[^\d])(\d{17}[\dXx])(?=[^\d]|$)/ },
  { id: 'email', re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/ },
  { id: 'url', re: /https?:\/\//i },
  { id: 'mention', re: /@[A-Za-z0-9_\u4e00-\u9fa5]{2,}/ }
]

export const MAX_TEXT_LEN = 80

/**
 * 扫描一段准备上卡的文字
 * @returns {{ok:boolean, hits:string[]}}
 */
export function scanText(text) {
  const s = String(text == null ? '' : text)
  const hits = []

  if (!s.trim()) hits.push('empty')
  if (s.length > MAX_TEXT_LEN) hits.push('too-long')
  if (FLAG_RE.test(s)) hits.push('flag')

  PLACES.forEach((w) => {
    if (s.includes(w)) hits.push('place:' + w)
  })
  TITLES.forEach((w) => {
    if (s.includes(w)) hits.push('title:' + w)
  })
  PRIVACY_RES.forEach((r) => {
    if (r.re.test(s)) hits.push('privacy:' + r.id)
  })

  return { ok: hits.length === 0, hits }
}

/**
 * 兜底替换：命中的文字整段换成安全文案。
 * 这里不抛错 —— 用户点"生成"时因为一句文案失败，体验比看到一句通用祝福更差。
 *
 * @param {string} text
 * @param {string} fallback 命中时用这句顶上
 * @returns {{text:string, replaced:boolean, hits:string[]}}
 */
export function sanitizeText(text, fallback) {
  const res = scanText(text)
  if (res.ok) return { text: String(text), replaced: false, hits: [] }
  return { text: String(fallback || '圣诞快乐'), replaced: true, hits: res.hits }
}

/**
 * 批量校验（供自测与文案上线前巡检用）
 * @param {string[]} list
 * @returns {{ok:boolean, bad:Array<{text:string,hits:string[]}>}}
 */
export function scanAll(list) {
  const bad = []
  ;(list || []).forEach((t) => {
    const r = scanText(t)
    if (!r.ok) bad.push({ text: String(t), hits: r.hits })
  })
  return { ok: bad.length === 0, bad }
}
