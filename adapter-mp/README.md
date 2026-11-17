# 08 小程序云实现块

**目录** `adapter-mp/`　**文件** <code>mp.js</code>

走 <code>wx.cloud.callFunction</code> 调 tree 云函数，头像走云存储。

## 对外接口

<code>TreeApi 全量实现，mode = "cloud"</code>

## 依赖

02 契约 / 04 存储 / 01 配置

## 要点

- 文件顶部和整体包在 <code>// #ifdef MP-WEIXIN</code> 里。<code>wx.*</code> 只允许出现在函数体内，绝不能在模块顶层取 <code>wx.cloud</code>——否则 H5 产物一旦误引用就是运行时崩溃。
- 头像先 <code>uploadFile</code> 拿 fileID，再随 joinTree 一起提交；展示时用 <code>getTempFileURL</code> 批量换临时链接，单次上限 50 个，按 90 分钟缓存（官方链接有效期 2 小时）。
- 上传后先用本地临时路径顶上，省掉一次网络往返，用户挂上去的瞬间就能看到自己的头像。

## 坑位

- 临时链接会过期，缓存时间必须留出余量，否则用户挂机会看到裂图。
- 真机首次调用云函数前必须先 <code>wx.cloud.init</code>，且只能 init 一次（用 inited 标记）。
