# 18 · 贺卡线块（card-line）

与许愿树并列的**第二条产品线**：单人贺卡。零上传、零键盘、零账号，出图即走。

```
随机一张可爱画面 → 选祝福 → 生成 750×1000 PNG → 保存 / 分享
```

第一步不是"选模板"，而是**直接抽一张**：画面由 seed 决定，全是矢量路径画出来的。
不喜欢就点「换一张」，换的是 seed，不是模板 id。

H5 / 小程序双端都已实现，绘制层完全共用。

## 为什么是独立的一块

贺卡和许愿树共用主题、共用分享模块、共用条件编译，但**产品形态完全不同**：

| | 许愿树 | 贺卡 |
|---|---|---|
| 数据 | 多人共享一棵树，要后端 | 零数据，纯本地 |
| 身份 | 要 openid / 会话 | 不需要 |
| 交互 | 挂头像 → 看榜 → 拉人 | 抽图 → 选句 → 出图 |
| 后端 | 云函数 + 数据库 | 完全不碰 |

所以它不是一个"页面"，而是一条独立链路。放进 `src/card/`，页面只 import `@/card`。

## 为什么是"随机生成"而不是"选模板"

三套模板的寿命只有两天 —— 用户第二次打开就没有新东西可看。而
**配色 × 角色 × 粒子 ≈ 88 种组合**，点上十几次才可能重复，且不需要维护任何素材。

关键约束：**同一颗 seed 必须画出完全相同的图**。分享链接里带的就是 seed，
朋友点开要看到一模一样那一张（连粒子位置都相同）。所以构图里一个 `Math.random()` 都不能有，
全部走 `mulberry32` 确定性 PRNG。

## 两颗种子：画面归画面，文案归文案

`state` 里有三样东西各管一件事：

| 字段 | 管什么 | 谁改它 |
|---|---|---|
| `seed` | 画面（配色 × 角色 × 粒子） | 「换一张」 |
| `wishSeed` | 祝福语 | 进场时定一次，之后不动 |
| `presetIndex` | 手动钉住的那一句 | 「换一句」 |

`reroll()` 只改 `seed`，`nextWish()` 只改 `presetIndex` —— 所以
**换一张不动祝福语，换一句不动画面**。分享链接因此多一个 `ws`（祝福种子），
只在它和 `s` 不同时才带；老链接只有 `s` 时，`wishSeed` 回落成 `s`，句子与改版前一致。

## 内部 18 块

| 块 | 文件 | 职责 | 什么时候改 |
|---|---|---|---|
| 1 | `config.js` | 画布尺寸、排版规则、存储 key、文件名前缀 | 调画布或字号 |
| 2 | `theme.js` | 从 `themes/*.js` 的 `card` 段取配置，缺失回退 | 几乎不改 |
| 3 | `random.js` | 确定性随机：seed ↔ 短码、配色×角色×粒子组合 | 调组合规则 |
| 4 | `safety.js` | 内容安全闸：国旗/地名/敬称/手机号扫描与兜底 | 收紧或放宽口径 |
| 5 | `text.js` | 字体串拼装、折行、避头点、自动降字号 | 调文字规则 |
| 6 | `mascots.js` | 9 个可爱角色：雪人/企鹅/姜饼人/小熊/礼物/铃铛/袜子/花环/星星 | 加角色 |
| 7 | `motifs.js` | 图形调度（含老的雪花/麋鹿/树，保证旧链接仍能画） | 加图形 |
| 8 | `layout.js` | 版面比例计算 + 不重叠自检 | 调版式 |
| 9 | `render.js` | `drawCard(ctx, spec)` 纯绘制 | 调画面 |
| 10 | `state.js` | 选择状态、本地记忆、脏数据收敛 | 加状态字段 |
| 11 | `export.h5.js` | H5 导出：blob + 下载 + 微信长按兜底 | 调保存行为 |
| 12 | `export.mp.js` | 小程序导出：Canvas 2D 节点 + 存相册（含拒权引导） | 调保存行为 |
| 13 | `export.js` | 导出壳选择（平台分叉点之一） | 接新端时 |
| 14 | `share.js` | 分享链接、分享动作、入口参数解析 | 调分享 |
| 15 | `music.h5.js` | H5 背景音乐：Web Audio 现场合成铃铛旋律 | 换曲子或音色 |
| 16 | `music.mp.js` | 小程序背景音乐：InnerAudioContext 播主题里的 `src` | 提供音频源时 |
| 17 | `music.js` | 音乐壳选择（平台分叉点之二） | 接新端时 |
| 18 | `index.js` | 对外唯一出口 | 加导出项 |

外加 `card.vue`（页面），只 import `@/card`，不碰 canvas，不出现颜色字面量。

## 对外接口

```js
import {
  CARD_PATH, CARD_CANVAS, CARD_FILE_PREFIX,
  pickCardTheme, findMascot,
  createRng, encodeSeed, decodeSeed, randomSeed, buildArtwork,
  scanText, sanitizeText, scanAll,
  createState, normalizeState, reroll, selectPreset,
  loadState, saveState, resolveSelection,
  drawCard, computeLayout, validateLayout,
  drawMotif, drawMascot,
  renderCardBlob, downloadBlob, releaseUrl, isWechatIOS,
  buildCardShareUrl, parseCardEntry, shareCard
} from '@/card'
```

`resolveSelection(state, card)` 是核心一句：把 `{ seed, wishSeed, presetIndex, toName, fromName }` 变成
`{ template, art, wish, greeting, footer }`，其中 `art` 就是一份可以直接交给 `drawCard` 的画稿。
文案在这一步过内容安全闸，命中就地换掉，不抛错。

背景音乐不引 mp3：版权与体积都是坑。H5 端合成一段公有领域的铃儿响叮当
（`MELODY` 是纯数据，音色是两个振荡器叠出来的），小程序端没有 Web Audio，
只有 `theme.card.music.src` 填了音频地址才会出现播放按钮。

## 依赖

- 06 主题块：读 `theme.card`（配色池、角色池、文字色、祝福语、文案、白卡样式）
- 15 分享块：`buildUrl()` / `copyText()`
- 17 组件块：`tokensToVars()`（`src/utils/style.js`）

**不依赖** 02-05、07-14、16 —— 这条线没有数据层、没有身份、没有云函数。

## 四条设计约束

**1. 绘制层零平台 API。** `render.js` 只接收一个 `ctx`，用的全是标准 Canvas2D 子集（`beginPath` / `quadraticCurveTo` / `arc` / `fillText` / `measureText`）。所以它能在浏览器、小程序、Node + mock ctx 三种环境跑同一份代码 —— 这也是自测能覆盖画面的原因。

**2. 图形全矢量，不用 emoji、不用图片。** canvas 画 emoji 走系统字体，安卓微信常出黑白或方块；用图片则要联网、要维护素材、首屏会闪。角色全部是路径，跨机型完全一致。

**3. 颜色只在主题里。** `card-line/` 下唯一允许的颜色字面量是 `render.js` 里的兜底白字层（`CARD_INK`，只有老模板没带 `text` 时才会用到）。其余全部来自 `theme.card`。

**4. 画布里不允许出现外部字符串。** 卡片上的字只来自 `theme.card.copy` / `presets` / `mascots[].tag`，
分享参数只接受 seed 短码。这是"图里绝不会有人名地名"的根因，而不是靠事后过滤。

## 加一个角色

1. 在 `theme-config/christmas.js` 的 `card.mascots` 里登记：

```js
{ id: 'snowglobe', name: '雪花球', tag: '晃一晃会下雪', fit: 'any' }
```

2. 在 `mascots.js` 写 `drawSnowglobe(ctx, s, opt)`，加进 `drawMascot` 的映射表与 `MASCOT_SCALE`。

`fit` 决定它能出现在哪种背景上：`light` = 深色主体（只放浅背景）、`dark` = 浅色主体（只放深背景）、`any` = 都行。
漏填的后果很直观：白角色画在奶油色背景上，整只消失。

自测会检查"角色池里每一个 id 都必须能画出东西"，漏实现会直接挂。

## 加一套配色

在 `card.palettes` 里加一项。除 `bg` 外必须给全 `bgTone` / `ink` / `white` / `accent` / `accent2` / `blush` / `deco`。
`bgTone` 还决定标题用什么颜色（`card.text.onDark` / `onLight`）—— 浅背景上写白字等于没写。

## 自测

```bash
npm run test:card
```

覆盖：字体拼装、折行不出现「每字一行」、避头点、自动降字号、版面不重叠、
**随机确定性**、**角色明度匹配背景**、**角色绘制覆盖**、脏数据收敛、**内容安全**、主题回退、分享参数。

## 坑位（都是真踩过的）

1. **`ctx.font` 传裸数字会被静默忽略**。`ctx.font = 26` 不是合法 CSS font，浏览器直接不生效，`measureText` 沿用上一个字号 —— 表现为**每个字单独一行**。这个 bug 在原型里真实出现过，现在 `text.js` 强制走 `fontString(size)`，并有专门的回归用例。
2. **浅背景 + 白字 = 看不见**。早期只有三套深色模板，标题写死白色没问题；加入浅色配色后，白标题直接消失在背景里。现在文字色跟 `bgTone` 走，自测会断言"浅背景的标题 call 用的是深色"。
3. **白卡在浅背景上会糊掉**。给白卡加了 `shadowBlur = 26` 的投影，深浅背景都有边界。
4. **`ellipse()` 兼容性**。老内核不认，统一用 `arc + scale` 实现。
5. **iOS 微信长按 `data:` URI 图片不出保存菜单**。所以导出用 blob + objectURL，微信 + iOS 直接提示长按，不再"点了没反应"。
6. **分享链接丢 `?sharecode=` 就打不开**。`buildUrl()` 保留 `location.search`，托管平台靠它做访问鉴权。
7. **连点「换一张」会停在中间那张**。每次渲染带一个自增 token，回来比对 token 过没过期，过期就丢弃并 `revokeObjectURL`，否则会泄漏 blob。
8. **`flex: 1` 三等分在异常父宽下会被内容撑开**。旧版模板卡片改用 `grid-template-columns: repeat(3, minmax(0, 1fr))`；现在换成单张预览，这个问题随模板一起消失了。
9. **正则里别用后行断言**。`(?<!\d)` 在 iOS 16.4 之前的内核会直接抛 SyntaxError，把整个模块带崩。手机号校验改成捕获边界。
