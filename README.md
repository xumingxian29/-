# 节日换皮小程序核心代码块

一套 **uni-app（Vue 3 + Vite）** 代码，同时编译**微信小程序**与 **H5**；换一个节日，只改一份主题配置。

仓库存放的是从真实项目中抽出、跑通过的核心代码，按职责切成 **18 个块**。编号即阅读顺序，也基本等于依赖方向（编号小的被编号大的依赖）。

```
底座层   01-06   零平台依赖，可单独单测
适配层   07-11   所有"平台差异"都关在这里
能力层   12-15   业务语义、海报、分享
端实现   16-17   云函数、Vue 组件
产品线   18      贺卡线：第二条独立链路，只依赖 06 + 15 + 17
```

## 块索引

| 编号 | 块名 | 目录 | 一句话职责 |
|---|---|---|---|
| 01 | 环境配置块 | `config-env/` | 唯一可配置面：云环境 ID、后端地址、主题开关、分享文案；`limits.js` 是与云端对拍的数值口径 |
| 02 | 数据契约块 | `data-contract/` | 只有类型定义没有运行时：TreeNode / TreeApi 三个实现共用的形状 |
| 03 | 排序与槽位块 | `rank-slots/` | 纯函数：比较器排序、找名次、把节点分配到主题槽位（不再用加权分） |
| 04 | 存储与身份块 | `storage-identity/` | 版本化本地存储 + clientId + 远程会话（uid/token） |
| 05 | 错误与隐私块 | `error-privacy/` | 统一错误码与信封解包，加上隐私协议状态查询 |
| 06 | 主题配置块 | `theme-config/` | 换皮的全部落点：颜色、文案、布局、排序规则、广告位 |
| 07 | 本地实现块 | `adapter-local/` | 数据全在浏览器本地，不依赖后端，G0 验证交互的主力 |
| 08 | 小程序云实现块 | `adapter-mp/` | 走 wx.cloud.callFunction 调云函数，头像走云存储（先校验后上传） |
| 09 | H5 远程实现块 | `adapter-remote/` | H5 用 fetch 打同一个云函数，带会话验签，与小程序共用一棵树 |
| 10 | 平台分叉块 | `platform-switch/` | 全工程唯一知道"现在是哪个端"的文件，编译期三选一 |
| 11 | 启动装配块 | `app-bootstrap/` | 选主题 → 初始化 api → 查隐私，串成一次启动 |
| 12 | 业务 API 块 | `business-api/` | 页面唯一该 import 的一层：补默认参数、转人话、埋点 |
| 13 | 海报绘制块 | `poster-render/` | 纯 Canvas2D 绘制一份，两端各一个拿画布导出的薄壳 |
| 14 | 图片选择块 | `image-picker/` | 选图 → 取尺寸 → H5 逐档压到 160px dataURL，小程序只拿临时路径 |
| 15 | 分享参数块 | `share-params/` | 两端进入参数与分享链接统一编解码，外加 JS-SDK 分享卡片 |
| 16 | 云函数块 | `cloud-function/` | 单入口 action 路由 + 会话签发 + 频控 + 内容安全，两端共用 |
| 17 | 渲染组件块 | `view-components/` | 舞台 / 头像挂件 / 挂树面板 / 海报弹窗，外加 `style.js`（tokens → CSS 变量）|
| 18 | 贺卡线块 | `card-line/` | 单人贺卡：随机造型 + 随机祝福 + 署名 → 出图，零上传零账号；画面与祝福语各用一颗种子，互不牵连；名字只进画布；H5 合成背景音乐；内部再分 18 个小块 + 页面 |

## 三条架构铁律

这是整套代码能不能"换皮、换端、换后端"的成本所在，三条都守住才成立：

**1. 页面只认一个契约。** 页面和组件只 import `api/tree.js`（12 号块），永远不碰平台 API。三个实现（本地 / 小程序云 / H5 远程）塞进同一个 `TreeApi` 形状，页面完全无感。

**2. 只有一个文件知道"现在是哪个端"。** 10 号块用 `#ifdef` 在编译期三选一，把另外两个端的实现从产物里剪掉。实测 H5 产物中 `wx.cloud` 出现 **0 次**。

**3. 组件里不出现颜色字面量和中文文案。** 全部来自 06 号块的 theme 对象，通过 CSS 变量注入。换节日 = 复制一份 christmas.js 改 tokens 和 copy，组件零改动。

## 怎么把这些块用起来

块内的相对 import 路径按原工程的目录结构书写（例如 07 号块里是 `../storage`）。把块放回下列路径，import 不需要任何修改：

| 块 | 放回路径 |
|---|---|
| 01 | `src/core/env.js` + `src/core/limits.js` |
| 02 | `src/core/contract.js` |
| 03 | `src/core/rank.js` + `cloudfunctions/tree/lib/rank.js`（**必须用 rank.cloud.js，CJS**） |
| 04 | `src/core/storage.js` |
| 05 | `src/core/errors.js` + `src/core/privacy.js` |
| 06 | `src/themes/`（`themes.index.js` **必须改名成 index.js**） |
| 07 | `src/core/impl/local.js` + `mockSeed.js` |
| 08 | `src/core/impl/mp.js` |
| 09 | `src/core/impl/remote.js` |
| 10 | `src/core/index.js` |
| 11 | `src/core/bootstrap.js` |
| 12 | `src/api/tree.js` + `track.js` |
| 13 | `src/core/poster/`（4 个文件） |
| 14 | `src/core/image.js` |
| 15 | `src/core/share.js` + `jssdk.js` |
| 16 | `cloudfunctions/tree/`（含 `lib/` 9 个文件、`actions/` 7 个文件、`config.json`、`package.json`）|
| 17 | `src/components/` + `src/utils/style.js` |
| 18 | `src/card/`（18 个文件）+ `src/pages/card/card.vue` |

完整的「文件 → 目标路径」映射在 `manifest.json` 里，`npm run verify` 就是照着它校验的。

最小可跑集：**01 + 02 + 03 + 04 + 05 + 06 + 07 + 12 + 17** 就能在 H5 跑起一棵能挂头像的树（本地模式，数据不跨设备）。
接云端再加 **08 + 10 + 16**；接 H5 公网再加 **09**。

**贺卡线（18）是一条独立链路**：只需 **06 + 15 + 17 + 18**，不碰数据层、身份层、云函数。
两条产品线同时在一个工程里跑，互不 import。

## 自测与校验（2026-11 新增）

这个仓库不是可直接 `npm install && npm run dev` 的项目（块是零件，不是整机），但**零件本身可以被验证**：

```bash
npm run verify      # 映射完整性 + 每条 import 在目标位置能否解析 + 前后端 limits 对拍
npm test            # 22 项纯逻辑：存储容错、会话读写、分享链接、海报折行
npm run test:card   # 166 项贺卡线：折行、避头点、降字号、版面不撞、随机确定性、画面与祝福解耦、音乐旋律、名字闸、单行排版、称呼落款、名字不外泄
npm run test:cloud  # 29 项端到端：假数据库跑 register → joinTree → blessNode → listNodes
npm run check       # 四个一起跑
```

两个值得一提的做法：

- `test:cloud` 把 `wx-server-sdk` 换成内存假库（`scripts/_wx-server-sdk.cjs`），直接调 `exports.main`，
  走的是**真实业务代码**，不是另写一份 mock 逻辑。
- `test:card` 先按 `manifest.json` 把块**铺成真实工程目录**（临时目录里重写 `@/` 别名与无扩展名 import），
  再 import 目标路径去跑。所以它验证的是"放回工程后的样子"，而且**零依赖**，不需要 esbuild / vite。
  canvas 用 mock ctx：`font` 做成存取器，非法值被静默忽略——这样才抓得住"`ctx.font = 26` 导致每字一行"这类 bug。

## 已验证过的结论

- H5 与 `mp-weixin` 双端编译通过，小程序主包 244KB（限额 2MB）
- 条件编译生效：H5 产物中 `wx.cloud` 出现 0 次，本地实现与内联 SVG 头像正常保留
- 云函数块 29 项端到端全过（详情见 `CHANGELOG.md`）：会话验签、并发祝福只计一次、跨口径排序、IP 频控
- 纯逻辑 22 项全过：坏数据自愈、分享链接保留 `sharecode` 且剔除旧 `inviter`、长文本折行截断
- 贺卡线 166 项全过：折行不出「每字一行」、标点不落行首、长祝福自动降字号不撞版面、同 seed 必出同一张图、换一张不动祝福语、换一句不动画面、11 个角色全部可绘制、文案零越界、名字 12 字不折行不省略、分享链接与本地存储里搜不到真名、无 AudioContext 时音乐静默降级
- 全部 65 个块文件的 import 在目标路径下可解析（`npm run verify`，123 条导入 0 未解析）

> 注：2026-11 这批修复之后**没有**再跑过 uni-app 双端编译（本仓库没有构建工程）。
> `platform-switch` 与 `poster-render` 的出口文件改动过写法，重新放回工程后建议先 `npm run build:h5` 验一次。
> 贺卡线在源工程里跑过 `build:h5` 与 `build:mp-weixin`，并用真机视口截图验证过（随机预览 / 换一张 / 生成结果 / 11 个角色逐一渲染 / 四种署名组合）。

## 十九个真踩过的坑

1. `project.config.json` 会被 uni-app 编译覆盖 —— 用 `project.prod.config.json` 另存，别直接改产物。
2. canvas 实例进 reactive 后被 Vue3 代理，`canvasToTempFilePath` 拿到 undefined，且不报错。
3. H5 画布跨域污染后 `toDataURL` 抛 SecurityError —— 头像一律 dataURL。
4. H5 分享链接丢掉 `?sharecode=` 就打不开 —— 拼链接必须保留 `location.search`；但也别把 `inviter` 一起留着，会串味。
5. 未认证订阅号没有 JS-SDK 分享权限，卡片只能是白的。
6. `inset: 0` 与 `:nth-child` 在小程序端不稳，改四边声明 + class 绑定。
7. 云函数里 H5 来源拿不到 openid，云调用内容安全接口直接不可用。
8. `nodes` 集合不建复合索引，数据一多 listNodes 就超时；改成按真实计数排序后，索引也跟着变（见 16 号块注释）。
9. 云开发免费环境**上线后 15 天到期**，之后 19.9 元/月起 —— "现金 0 元"不成立。
10. ICP 备案 1–20 个工作日，是唯一的长周期项，要挂在开发排期之前。
11. **`#ifdef` 里的重复声明**：`const impl = ...` 写两次，出了 uni-app 编译器就是语法错（`node --check` 直接红）。
12. **字段只在读的一侧存在**：`blessNode` 读 `node.sortMode`，但写库时从来没写过这个字段，于是永远走默认分支，榜单静默排错。
13. **"先上传后校验"会留垃圾**：心愿被拒时头像已经进了云存储，没人删。要么先校验，要么失败时补偿删除。
14. **`ctx.font = 26` 不报错，但也不生效**：裸数字不是合法 CSS font，浏览器直接忽略，`measureText` 沿用上一个字号 —— 画出来是**每个字单独一行**。必须用完整简写 `600 34px sans-serif`。
15. **canvas 画 emoji 等于把渲染交给系统字体**：安卓微信常出黑白或方块，同一份代码在不同机型长得不一样。主视觉一律矢量路径。
16. **`flex: 1` 三等分在父级宽度异常时会被内容撑开**：三个模板卡片会挤出视口，且看起来像"样式没生效"。改用 `grid-template-columns: repeat(3, minmax(0, 1fr))`。
17. **浅背景 + 白字 = 什么都没有**：早期三套模板都是深色，标题写死白色没问题；加了浅色配色后白标题直接消失在背景里。文字色必须跟背景明度走。
18. **随机构图里混进 `Math.random()` 就毁掉分享**：同一颗 seed 画不出同一张图，朋友点开看到的是另一张。构图只走确定性 PRNG，`Math.random` 只允许出现在"取新 seed"那一行。
19. **正则里别用后行断言**：`(?<!\d)` 在 iOS 16.4 之前的内核直接抛 SyntaxError，一个校验规则能把整个模块带崩。改成捕获边界。

## 声明

个人项目沉淀的代码，供参考与二次开发。涉及微信平台规则（诱导分享、内容安全、隐私协议）的部分，请按当前官方文档复核后再上线。
