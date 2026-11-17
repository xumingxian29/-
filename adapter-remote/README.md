# 09 H5 远程实现块

**目录** `adapter-remote/`　**文件** <code>remote.js</code>

H5 用 <code>fetch(API_BASE)</code> 打同一个 tree 云函数，和小程序共用一棵树。

## 对外接口

<code>TreeApi 全量实现，mode = "remote"</code>

## 依赖

02 契约 / 04 存储 / 01 配置

## 要点

- 与 08 号块的差别只有两处：传输方式（callFunction → fetch）、头像通道（云存储 → 直接存压缩后的 dataURL）。业务逻辑一行都没重写。
- 带 15 秒超时的 AbortController，避免弱网下按钮一直转圈。
- <code>credentials: "omit"</code> 是刻意的：托管平台的 cookie 鉴权和后端无关，带上反而会污染请求。
- 头像按 200KB 上限放行，超了由后端丢弃而不是报错——避免"传了张 3MB 的图，整个提交失败"。

## 坑位

- 跨域必须由后端回 <code>Access-Control-Allow-Origin</code> 且处理 OPTIONS 预检，缺一个就是浏览器直接拦住、控制台看不到业务错误。
- 头像存 dataURL 只是 G0 的过渡方案：60 个节点约 0.5MB，量再大就要换成真云存储直传。
