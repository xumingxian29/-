/**
 * 海报出口：唯一分叉点（与 core/index.js 同构）
 * 调用方统一 await makePoster({...})
 */

// #ifdef H5
export { makePoster } from './poster.h5'
// #endif

// #ifdef MP-WEIXIN
export { makePoster } from './poster.mp'
// #endif
