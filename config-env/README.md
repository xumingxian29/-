# 01 环境配置块

**目录** `config-env/`　**文件** <code>env.js</code> · <code>limits.js</code>

全工程唯一的可配置面：云开发环境 ID、H5 后端地址、主题开关、分享文案。

<code>limits.js</code> 是前后端必须一致的数值口径（心愿 30 / 昵称 12 / 分页 60 / 头像 40KB），
对应的云端副本是 <code>cloud-function/lib/limits.js</code>，<code>npm run verify</code> 会对拍两边数值。

## 对外接口

<code>CLOUD_ENV_ID</code> · <code>API_BASE</code> · <code>DEFAULT_TREE_ID</code> · <code>FORCED_THEME_ID</code> · <code>ENABLE_JSSDK</code> · <code>SHARE_TITLE / SHARE_DESC / SHARE_IMG</code>

## 依赖

无（最底层，所有块都可能读它）

## 要点

- <code>API_BASE</code> 是 10 号块分叉的判据：为空走本地实现，有值走远程实现。改一个字符串就换后端。
- <code>CLOUD_ENV_ID</code> 为空时，小程序端不会白屏，而是抛 AUTH 错误并提示"请填写 CLOUD_ENV_ID"——这是刻意留的引导，别改成静默失败。
- 公众号相关的四项（<code>WX_OA_APPID</code> / <code>ENABLE_JSSDK</code> / <code>WX_SIGN_URL</code> / <code>SHARE_IMG</code>）留空即可，15 号块会自动降级，不影响主流程。

## 坑位

- 别把密钥类东西放这里：前端包会被完整下载，任何常量都是公开的。
