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

/** 生成/复用本机客户端 ID（H5 无 openid，用它在本地模式做身份与祝福去重） */
export function getClientId() {
  const existing = readJSON('clientId', '')
  if (existing) return existing
  const id = 'c_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
  writeJSON('clientId', id)
  return id
}

export function uuid() {
  return (
    Date.now().toString(36) +
    '-' +
    Math.random().toString(36).slice(2, 10) +
    Math.random().toString(36).slice(2, 6)
  )
}
