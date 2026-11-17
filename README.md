# 节日换皮小程序核心代码块

一套 **uni-app（Vue 3 + Vite）** 代码，同时编译**微信小程序**与 **H5**；换一个节日，只改一份主题配置。

仓库存放的是从真实项目中抽出、跑通过的核心代码，按职责切成 **17 个块**。编号即阅读顺序，也基本等于依赖方向（编号小的被编号大的依赖）。

```
底座层   01-06   零平台依赖，可单独单测
适配层   07-11   所有"平台差异"都关在这里
能力层   12-15   业务语义、海报、分享
端实现   16-17   云函数、Vue 组件
```

## 块索引

| 编号 | 块名 | 目录 | 一句话职责 |
|---|---|---|---|
| 01 | 环境配置块 | `config-env/` | 唯一可配置面：云环境 ID、后端地址、主题开关、分享文案 |
| 02 | 数据契约块 | `data-contract/` | 只有类型定义没有运行时：TreeNode / TreeApi 三个实现共用的形状 |
| 03 | 排序与槽位块 | `rank-slots/` | 纯函数：算分、排序、找名次、把节点分配到主题槽位 |
| 04 | 存储与身份块 | `storage-identity/` | 版本化本地存储 + 客户端身份（H5 没有 openid 时的身份根基） |
| 05 | 错误与隐私块 | `error-privacy/` | 统一错误码与信封解包，加上隐私协议状态查询 |
| 06 | 主题配置块 | `theme-config/` | 换皮的全部落点：颜色、文案、布局、排序规则、广告位 |
| 07 | 本地实现块 | `adapter-local/` | 数据全在浏览器本地，不依赖后端，G0 验证交互的主力 |
| 08 | 小程序云实现块 | `adapter-mp/` | 走 wx.cloud.callFunction 调云函数，头像走云存储 |
| 09 | H5 远程实现块 | `adapter-remote/` | H5 用 fetch 打同一个云函数，与小程序共用一棵树 |
| 10 | 平台分叉块 | `platform-switch/` | 全工程唯一知道"现在是哪个端"的文件，编译期三选一 |
| 11 | 启动装配块 | `app-bootstrap/` | 选主题 → 初始化 api → 查隐私，串成一次启动 |
| 12 | 业务 API 块 | `business-api/` | 页面唯一该 import 的一层：补默认参数、转人话、埋点 |
| 13 | 海报绘制块 | `poster-render/` | 纯 Canvas2D 绘制一份，两端各一个拿画布导出的薄壳 |
| 14 | 图片选择块 | `image-picker/` | 选图 → 取尺寸 → H5 压成 200px dataURL，小程序只拿临时路径 |
| 15 | 分享参数块 | `share-params/` | 两端进入参数与分享链接统一编解码，外加 JS-SDK 分享卡片 |
| 16 | 云函数块 | `cloud-function/` | 单入口 action 路由，callFunction 与 HTTP 进同一份业务逻辑 |
| 17 | 渲染组件块 | `view-components/` | 舞台 / 头像挂件 / 挂树面板 / 海报弹窗，全部吃 theme |

## 三条架构铁律

这是整套代码能不能"换皮、换端、换后端"的成本所在，三条都守住才成立：

**1. 页面只认一个契约。** 页面和组件只 import `api/tree.js`（12 号块），永远不碰平台 API。三个实现（本地 / 小程序云 / H5 远程）塞进同一个 `TreeApi` 形状，页面完全无感。

**2. 只有一个文件知道"现在是哪个端"。** 10 号块用 `#ifdef` 在编译期三选一，把另外两个端的实现从产物里剪掉。实测 H5 产物中 `wx.cloud` 出现 **0 次**。

**3. 组件里不出现颜色字面量和中文文案。** 全部来自 06 号块的 theme 对象，通过 CSS 变量注入。换节日 = 复制一份 christmas.js 改 tokens 和 copy，组件零改动。

## 怎么把这些块用起来

块内的相对 import 路径按原工程的目录结构书写（例如 07 号块里是 `../storage`）。把块放回下列路径，import 不需要任何修改：

| 块 | 放回路径 |
|---|---|
| 01 | `src/core/env.js` |
| 02 | `src/core/contract.js` |
| 03 | `src/core/rank.js` + `cloudfunctions/tree/lib/rank.js` |
| 04 | `src/core/storage.js` |
| 05 | `src/core/errors.js` + `src/core/privacy.js` |
| 06 | `src/themes/` |
| 07 | `src/core/impl/local.js` + `mockSeed.js` |
| 08 | `src/core/impl/mp.js` |
| 09 | `src/core/impl/remote.js` |
| 10 | `src/core/index.js` |
| 11 | `src/core/bootstrap.js` |
| 12 | `src/api/` |
| 13 | `src/core/poster/` |
| 14 | `src/core/image.js` |
| 15 | `src/core/share.js` + `jssdk.js` |
| 16 | `cloudfunctions/tree/` |
| 17 | `src/components/` |

最小可跑集：**01 + 02 + 03 + 04 + 05 + 06 + 07 + 12 + 17** 就能在 H5 跑起一棵能挂头像的树（本地模式，数据不跨设备）。
接云端再加 **08 + 10 + 16**；接 H5 公网再加 **09**。

## 已验证过的结论

- H5 与 `mp-weixin` 双端编译通过，小程序主包 244KB（限额 2MB）
- 条件编译生效：H5 产物中 `wx.cloud` 出现 0 次，本地实现与内联 SVG 头像正常保留
- 核心数据流 8 组自测全过：排序、挂载幂等、祝福去重、邀请去重、空值与超长拒绝
- 海报绘制 4 组自测全过：不抛异常、文案正确、长文本折行截断
- 端到端 9 项通过：A 挂树 → B 可见（且非"我的"）→ B 祝福去重 → A 见计数 +1 → 邀请落地 → 邀请数 +1

## 十个真踩过的坑

1. `project.config.json` 会被 uni-app 编译覆盖 —— 用 `project.prod.config.json` 另存，别直接改产物。
2. canvas 实例进 reactive 后被 Vue3 代理，`canvasToTempFilePath` 拿到 undefined，且不报错。
3. H5 画布跨域污染后 `toDataURL` 抛 SecurityError —— 头像一律 dataURL。
4. H5 分享链接丢掉 `?sharecode=` 就打不开 —— 拼链接必须保留 `location.search`。
5. 未认证订阅号没有 JS-SDK 分享权限，卡片只能是白的。
6. `inset: 0` 与 `:nth-child` 在小程序端不稳，改四边声明 + class 绑定。
7. 云函数里 H5 来源拿不到 openid，云调用内容安全接口直接不可用。
8. `nodes` 集合不建复合索引，数据一多 listNodes 就超时。
9. 云开发免费环境**上线后 15 天到期**，之后 19.9 元/月起 —— "现金 0 元"不成立。
10. ICP 备案 1–20 个工作日，是唯一的长周期项，要挂在开发排期之前。

## 声明

个人项目沉淀的代码，供参考与二次开发。涉及微信平台规则（诱导分享、内容安全、隐私协议）的部分，请按当前官方文档复核后再上线。
