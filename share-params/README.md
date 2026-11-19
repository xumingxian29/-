# 15 分享参数块

**目录** `share-params/`　**文件** <code>share.js</code> · <code>jssdk.js</code>

统一两端进入参数与分享链接，外加微信 JS-SDK 自定义分享卡片（未配置自动降级）。

## 对外接口

<code>buildQuery</code> · <code>buildH5ShareUrl</code> · <code>buildUrl(path, params)</code> · <code>parseEntry(options)</code> · <code>copyText</code> · <code>setupShare({ title, desc, link })</code>

> <code>buildUrl</code> 是 2026-11 为 18 号块（贺卡线）补的通用深链：参数任意、不预设业务字段，
> 但同样保留 <code>location.search</code>。<code>buildH5ShareUrl</code> 是许愿树专用（会剔除 <code>inviter</code> 防串味），两者不要互相替代。

## 依赖

01 配置块

## 要点

- <code>parseEntry</code> 一份代码吃掉三种来源：小程序 onLoad 的 query、扫码的 <code>scene</code>、H5 的 hash 路由参数。页面只拿 <code>{ inviter, treeId }</code>。
- H5 拼链接时保留 <code>location.search</code>——托管平台常靠 <code>?sharecode=</code> 之类做访问鉴权，丢了它转发出去就是"链接不完整"打不开。
- JS-SDK 的三个前置条件（认证公众号 / 已备案域名 / 后端签名）缺一个就静默降级：不报错、不影响页面，只是分享卡片变白。
- 签名用的 URL 要 <code>location.href.split("#")[0]</code>：hash 路由切页面不改这段，所以一次签名长期有效。

## 坑位

- 未认证的订阅号没有分享接口权限，花不了 300 元认证就别指望自定义卡片。
- 签名必须后端算（要 AppSecret），前端算等于把密钥发出去。
