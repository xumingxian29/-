/**
 * 唯一分叉点
 *
 * 整个工程里只有这一个文件知道"现在是 H5 还是小程序"。
 * 页面、组件、api 层都只 import 这里的 api 单例。
 *
 * 三种模式：
 *   mp-weixin        → impl/mp.js      （wx.cloud.callFunction）
 *   h5 + API_BASE    → impl/remote.js  （HTTP 打到同一个云函数）
 *   h5 无 API_BASE    → impl/local.js   （纯本地，只适合自己演示）
 *
 * 2026-11 修复：
 *   原来两个分支各写一次 `const impl = ...`，靠 #ifdef 保证只剩一个；
 *   出了 uni-app 编译器（node --check / 单测 / 其他构建）就是重复声明，直接语法错。
 *   改成先声明一次再赋值：条件编译照旧能剪掉另一端，文件本身始终是合法 JS。
 */

// #ifdef MP-WEIXIN
import mpImpl from './impl/mp.js'
// #endif

// #ifdef H5
import localImpl from './impl/local.js'
import remoteImpl from './impl/remote.js'
import { API_BASE } from './env.js'
// #endif

let impl = null

// #ifdef H5
impl = API_BASE ? remoteImpl : localImpl
// #endif

// #ifdef MP-WEIXIN
impl = mpImpl
// #endif

if (!impl) {
  // 走到这里说明构建目标既不是 H5 也不是微信小程序（例如 App / 支付宝小程序）
  throw new Error('[core] 当前平台没有适配实现，请在 platform-switch/index.js 补一个分支')
}

export const api = impl
export default api
