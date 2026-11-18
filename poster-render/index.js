/**
 * 海报出口：唯一分叉点（与 core/index.js 同构）
 * 调用方统一 await makePoster({...})
 *
 * 2026-11 修复：原来两个分支各写一次 `export { makePoster } from ...`，
 * 没有条件编译时就是同名重复导出。改成"条件导入 + 赋值 + 单次导出"。
 */

// #ifdef H5
import { makePoster as h5MakePoster } from './poster.h5'
// #endif

// #ifdef MP-WEIXIN
import { makePoster as mpMakePoster } from './poster.mp'
// #endif

let makePoster = null

// #ifdef H5
makePoster = h5MakePoster
// #endif

// #ifdef MP-WEIXIN
makePoster = mpMakePoster
// #endif

export { makePoster }
