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

/* ------------------------------------------------------------------ *
 * 名字闸：和祝福语是两套逻辑，别混用
 *
 * 祝福语命中黑名单 → 换成兜底句（"圣诞快乐"），用户看不出来也无所谓。
 * 名字命中黑名单 → **必须拒绝**。用户填"张小明"结果出图写"圣诞快乐"，
 * 这比拒绝荒谬得多。所以这里返回 ok=false + reason，由 UI 去提示。
 *
 * 还有一处刻意放宽：不查 PLACES 和 TITLES。
 * 那两张表是给"生成端硬编码文案"设的闸；用户主动填的称呼本来就
 * 指向一个具体的人（"王老师""妈妈"是正常贺卡，不是事故）。
 * 名字闸真正要防的是**外泄**：电话、证件号、邮箱、账号、国旗。
 * ------------------------------------------------------------------ */

/** 名字长度上限：12 个字符，中文已经是"欧阳建国小朋友"这种长度了 */
export const MAX_NAME_LEN = 12

/**
 * 名字允许的字符：中文、拉丁字母、数字、间隔号、连字符、空白。
 *
 * 用白名单而非黑名单，因为名字要画进 canvas —— 字体不保证有的字符
 * （emoji、国旗、生僻异体）会画成豆腐块。与其事后检测，不如源头不收。
 * 顺带也解决了国旗问题：区域指示符是代理对，天然过不了单字符白名单。
 */
const NAME_CHAR_RE = /^[\u4e00-\u9fa5A-Za-z0-9·\-—\s]$/

/** 零宽与双向控制符：肉眼不可见，却能携带信息，名字里没有存在理由 */
const ZERO_WIDTH_RE = /[\u200B-\u200F\u202A-\u202E\uFEFF]/g

/**
 * 温和归一：只清理不裁决，给"外部数据进来"的场景用（storage、旧链接）
 *
 * 这里的职责是"别让脏数据把页面搞崩"，不是"判断这个名字能不能用"。
 * 所以超长就截断、有零宽就剥掉，绝不返回失败。
 * @returns {string|null} 空则 null（null 表示"没填"，'' 会和"填了空"混淆）
 */
export function clampName(raw) {
  // 只认字符串和数字：对象/数组当成"没填"，否则会得到 "[object Obje" 这种鬼东西
  const t = typeof raw
  if (t !== 'string' && t !== 'number') return null
  const src = String(raw).replace(ZERO_WIDTH_RE, '')
  const text = src.replace(/\s+/g, ' ').trim().slice(0, MAX_NAME_LEN)
  return text || null
}

/**
 * 名字闸：严格裁决，给"用户正在输入"的场景用
 *
 * @returns {{ok:boolean, text:string|null, reason:string|null, hits:string[]}}
 *   reason: 'too-long' | 'bad-char' | 'privacy:xxx' | null
 */
export function sanitizeName(raw) {
  const src = String(raw == null ? '' : raw).replace(ZERO_WIDTH_RE, '')
  const text = src.replace(/\s+/g, ' ').trim()

  // 留空是合法状态：不显示称呼 / 落款写"送给你的贺卡"
  if (!text) return { ok: true, text: null, reason: null, hits: [] }

  /**
   * 顺序有讲究：隐私 → 字符集 → 长度
   *
   * 必须先查隐私再查字符集。邮箱里的 @ 和 . 过不了字符白名单，
   * 如果字符集先判，用户填邮箱会收到"只能写中文、字母、数字"，
   * 而正确答案是"这里不要填联系方式"。同理，18 位身份证是纯数字，
   * 字符集合法，但会先撞上 12 字的长度上限，提示成"名字太长"——
   * 也不对。所以这三类的优先级：隐私最高，长度最低。
   */
  for (const r of PRIVACY_RES) {
    if (r.re.test(text)) {
      return { ok: false, text: null, reason: 'privacy:' + r.id, hits: ['privacy:' + r.id] }
    }
  }

  // 国旗（字符白名单也能挡住，这里再兜一道，防将来有人放宽字符集）
  if (FLAG_RE.test(text)) {
    return { ok: false, text: null, reason: 'flag', hits: ['flag'] }
  }

  const chars = Array.from(text)
  const bad = chars.filter((c) => !NAME_CHAR_RE.test(c))
  if (bad.length) {
    return { ok: false, text: null, reason: 'bad-char', hits: bad }
  }

  if (chars.length > MAX_NAME_LEN) {
    return { ok: false, text: null, reason: 'too-long', hits: ['too-long'] }
  }

  return { ok: true, text, reason: null, hits: [] }
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
