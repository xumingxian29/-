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
 */

// #ifdef MP-WEIXIN
import mpImpl from './impl/mp.js'
// #endif

// #ifdef H5
import localImpl from './impl/local.js'
import remoteImpl from './impl/remote.js'
import { API_BASE } from './env.js'
// #endif

// #ifdef H5
const impl = API_BASE ? remoteImpl : localImpl
// #endif

// #ifdef MP-WEIXIN
const impl = mpImpl
// #endif

export const api = impl
export default api
