# 18 · 贺卡线块（card-line）

与许愿树并列的**第二条产品线**：单人贺卡。零上传、零键盘、零账号，三步出图。

```
选模板 → 选祝福 → 生成 750×1000 PNG → 保存 / 分享
```

当前实现 **H5 单端**，小程序端的壳已预留（见文末）。

## 为什么是独立的一块

贺卡和许愿树共用主题、共用分享模块、共用条件编译，但**产品形态完全不同**：

| | 许愿树 | 贺卡 |
|---|---|---|
| 数据 | 多人共享一棵树，要后端 | 零数据，纯本地 |
| 身份 | 要 openid / 会话 | 不需要 |
| 交互 | 挂头像 → 看榜 → 拉人 | 选 → 选 → 出图 |
| 后端 | 云函数 + 数据库 | 完全不碰 |

所以它不是一个"页面"，而是一条独立链路。放进 `src/card/`，页面只 import `@/card`。

## 内部 11 块

| 块 | 文件 | 职责 | 什么时候改 |
|---|---|---|---|
| 1 | `config.js` | 画布尺寸、排版规则、存储 key、文件名前缀 | 调画布或字号 |
| 2 | `theme.js` | 从 `themes/*.js` 的 `card` 段取配置，缺失回退 | 几乎不改 |
| 3 | `text.js` | 字体串拼装、折行、避头点、自动降字号 | 调文字规则 |
| 4 | `motifs.js` | 雪花 / 麋鹿 / 圣诞树，全矢量路径 | 加图形 |
| 5 | `layout.js` | 版面比例计算 + 不重叠自检 | 调版式 |
| 6 | `render.js` | `drawCard(ctx, spec)` 纯绘制 | 调画面 |
| 7 | `state.js` | 选择状态、本地记忆、脏数据收敛 | 加状态字段 |
| 8 | `export.h5.js` | H5 导出：blob + 下载 + 微信长按兜底 | 调保存行为 |
| 9 | `export.js` | 导出壳选择（**唯一**条件编译点） | 接小程序时 |
| 10 | `share.js` | 分享链接、分享动作、入口参数解析 | 调分享 |
| 11 | `index.js` | 对外唯一出口 | 加导出项 |

外加 `card.vue`（页面），只 import `@/card`，不碰 canvas，不出现颜色字面量。

## 对外接口

```js
import {
  CARD_PATH, CARD_CANVAS, CARD_FILE_PREFIX,
  pickCardTheme, findTemplate,
  createState, normalizeState, selectTemplate, selectPreset,
  loadState, saveState, resolveSelection,
  drawCard, computeLayout, validateLayout,
  renderCardBlob, downloadBlob, releaseUrl, isWechatIOS,
  buildCardShareUrl, parseCardEntry, shareCard
} from '@/card'
```

## 依赖

- 06 主题块：读 `theme.card`（模板、祝福语、文案、白卡样式）
- 15 分享块：`buildUrl()` / `copyText()`
- 17 组件块：`tokensToVars()`（`src/utils/style.js`）

**不依赖** 02-05、07-14、16 —— 这条线没有数据层、没有身份、没有云函数。

## 三条设计约束

**1. 绘制层零平台 API。** `render.js` 只接收一个 `ctx`，用的全是标准 Canvas2D 子集（`beginPath` / `quadraticCurveTo` / `arc` / `fillText` / `measureText`）。所以它能在浏览器、小程序、Node + mock ctx 三种环境跑同一份代码 —— 这也是自测能覆盖画面的原因。

**2. 图形全矢量，不用 emoji。** canvas 画 emoji 走系统字体，安卓微信常出黑白或方块。雪花、麋鹿、圣诞树全部是路径，跨机型完全一致。

**3. 颜色只在主题里。** `card-line/` 下唯一允许的颜色字面量是 `render.js` 里的固定白字层（`CARD_INK`，叠在渐变背景上、不随模板变）。其余全部来自 `theme.card.templates[i]`。

## 加一个模板

只改 `theme-config/christmas.js` 的 `card.templates`：

```js
{
  id: 'candy',
  name: '糖果屋',
  motif: 'candy',            // 必须已在 motifs.js 注册
  bg: ['#8E3B6E', '#5C2148'],
  ink: '#3A0F26',            // 图形主色
  accent: '#FFD782',         // 装饰色（鹿角、星星、挂饰）
  deco: 'rgba(255,255,255,0.6)',
  tag: '糖果屋'
}
```

若 `motif` 是新图形，再在 `motifs.js` 写 `drawCandy` 并在 `drawMotif` 加一条分支。
**不用改页面、不用改 CSS** —— 这是「换皮不外溢」的验证方式。

## 接小程序端

只动 `export.js`：

1. 新建 `export.mp.js`，实现同名四项：`renderCardBlob` / `downloadBlob` / `releaseUrl` / `isWechatIOS`（返回 `false` 即可）。
   小程序侧对应 `wx.canvasToTempFilePath` + `wx.saveImageToPhotosAlbum`。
2. 把 `export.js` 里 `// #ifndef H5` 的占位实现换成 `import './export.mp.js'`。

`render.js` / `layout.js` / `text.js` / `motifs.js` **一行都不用改** —— 它们只依赖一个 ctx。

## 自测

```bash
npm run test:card
```

覆盖：字体拼装、折行不出现「每字一行」、避头点、自动降字号、版面不重叠、三模板可绘制、脏数据收敛、主题回退。

## 坑位（都是真踩过的）

1. **`ctx.font` 传裸数字会被静默忽略**。`ctx.font = 26` 不是合法 CSS font，浏览器直接不生效，`measureText` 沿用上一个字号 —— 表现为**每个字单独一行**。这个 bug 在原型里真实出现过，现在 `text.js` 强制走 `fontString(size)`，并有专门的回归用例。
2. **`ellipse()` 兼容性**。老内核不认，统一用 `arc + scale` 实现。
3. **iOS 微信长按 `data:` URI 图片不出保存菜单**。所以导出用 blob + objectURL，微信 + iOS 直接提示长按，不再"点了没反应"。
4. **分享链接丢 `?sharecode=` 就打不开**。`buildUrl()` 保留 `location.search`，托管平台靠它做访问鉴权。
5. **`tpl` 参数只在 `onLoad` 生效**。SPA 内仅切 hash 不会重跑组件；真实用户从分享链接进来是新加载，不受影响。
6. **`flex: 1` 三等分在异常父宽下会被内容撑开**。模板卡片改用 `grid-template-columns: repeat(3, minmax(0, 1fr))`。
