# 10 平台分叉块

**目录** `platform-switch/`　**文件** <code>index.js</code>

全工程唯一知道"现在是哪个端"的文件。三行条件编译，导出同一个 api 单例。

## 对外接口

<code>export const api</code> · <code>export default api</code>

## 依赖

07 本地 / 08 小程序云 / 09 H5 远程

## 要点

- 三条路径：<code>MP-WEIXIN</code> → mp.js；<code>H5 + API_BASE</code> → remote.js；<code>H5 无 API_BASE</code> → local.js。
- import 必须写在 <code>#ifdef</code> 里，让打包器在编译期就剪掉另一个端的实现。实测 H5 产物里 <code>wx.cloud</code> 出现 0 次——这就是这个块存在的意义。
- 不要在运行时写 <code>if (typeof wx !== "undefined")</code> 来分叉：代码虽然能跑，但另一个端的实现会被打进包里，体积和风险都白留。

## 坑位

- 这是唯一允许出现平台判断的地方。一旦别处也开始 ifdef，换端成本就会指数上升。
