/**
 * 隐私协议检查
 * 小程序：2023-10-17 起 __usePrivacyCheck__ 生效，chooseAvatar / 相册等接口需先授权
 * H5    ：仅记录本地同意的协议版本，用于展示与埋点
 */

import { readJSON, writeJSON } from './storage'

const CONTRACT_VERSION = '2026-01-01'

/** 是否已经同意当前版本的协议（本地记录） */
export function hasAgreedLocally() {
  const rec = readJSON('privacy', null)
  return !!(rec && rec.version === CONTRACT_VERSION && rec.agreedAt)
}

export function agreeLocally() {
  writeJSON('privacy', { version: CONTRACT_VERSION, agreedAt: Date.now() })
}

/**
 * 查询平台侧的隐私授权状态
 * @returns {Promise<{needAuthorization:boolean}>}
 */
export function checkPrivacy() {
  return new Promise((resolve) => {
    // #ifdef MP-WEIXIN
    if (typeof wx !== 'undefined' && wx.getPrivacySetting) {
      wx.getPrivacySetting({
        success: (res) => resolve({ needAuthorization: !!res.needAuthorization }),
        fail: () => resolve({ needAuthorization: false })
      })
      return
    }
    // #endif
    resolve({ needAuthorization: false })
  })
}

/** 主动拉起平台隐私弹窗（小程序） */
export function requirePrivacyAuthorize() {
  return new Promise((resolve) => {
    // #ifdef MP-WEIXIN
    if (typeof wx !== 'undefined' && wx.requirePrivacyAuthorize) {
      wx.requirePrivacyAuthorize({
        success: () => {
          agreeLocally()
          resolve(true)
        },
        fail: () => resolve(false)
      })
      return
    }
    // #endif
    agreeLocally()
    resolve(true)
  })
}

export function contractVersion() {
  return CONTRACT_VERSION
}
