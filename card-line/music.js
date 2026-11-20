/**
 * 块 16 · 背景音乐壳
 *
 * 与 export.js 同一个套路：整条贺卡线只有两处平台分叉，
 * 一处在"怎么把画存下来"，另一处在这里 —— "怎么发声"。
 * 页面永远只 import 这一个文件，不关心底下是振荡器还是音频文件。
 */

// #ifdef H5
import { createMusic } from './music.h5'
// #endif

// #ifndef H5
import { createMusic } from './music.mp'
// #endif

export { createMusic }
