/**
 * 版本化本地存储封装
 * 所有 key 统一前缀 ft:v1:，结构变更时升 v2 并在 migrate 中处理
 */

const NS = 'ft:v1:'

export function key(name) {
  return NS + name
}

/**
 * @param {string} name
 * @param {any} fallback
 */
export function readJSON(name, fallback = null) {
  try {
    const raw = uni.getStorageSync(key(name))
    if (raw === '' || raw === null || raw === undefined) return fallback
    return typeof raw === 'string' ? JSON.parse(raw) : raw
  } catch (e) {
    // 解析失败说明这条数据坏了：直接删掉，否则每次读都失败、永远回不到正常态
    try {
      uni.removeStorageSync(key(name))
    } catch (err) {
      /* ignore */
    }
    return fallback
  }
}

/**
 * @param {string} name
 * @param {any} value
 */
export function writeJSON(name, value) {
  try {
    uni.setStorageSync(key(name), JSON.stringify(value))
    return true
  } catch (e) {
    // 存储满了会抛异常，不阻断主流程
    console.warn('[storage] write failed', name, e)
    return false
  }
}

export function removeKey(name) {
  try {
    uni.removeStorageSync(key(name))
  } catch (e) {
    /* ignore */
  }
}

/** 生成/复用本机客户端 ID（仅用于本地模式与回落身份，不是远程模式的凭证） */
export function getClientId() {
  const existing = readJSON('clientId', '')
  if (existing) return existing
  const id = 'c_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
  writeJSON('clientId', id)
  return id
}

/**
 * 远程会话（H5 用）：服务端签发的 { uid, token }
 * uid 是不可猜的随机串，token 是 HMAC 签名——换机器/清缓存就换身份，
 * 但别人无法用你的 clientId 冒充你。
 */
export function readSession() {
  const s = readJSON('session', null)
  return s && s.uid && s.token ? s : null
}

export function writeSession(session) {
  return writeJSON('session', session || null)
}

export function clearSession() {
  removeKey('session')
}

export function uuid() {
  return (
    Date.now().toString(36) +
    '-' +
    Math.random().toString(36).slice(2, 10) +
    Math.random().toString(36).slice(2, 6)
  )
}
