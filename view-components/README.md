# 17 渲染组件块

**目录** `view-components/`　**文件** <code>TreeStage.vue</code> · <code>AvatarPin.vue</code> · <code>JoinSheet.vue</code> · <code>PosterDialog.vue</code> · <code>style.js</code>

舞台 + 头像挂件 + 挂树面板 + 海报弹窗。四个组件吃 theme 对象，不写死任何颜色与文案。

<code>style.js</code> 把 theme.tokens 转成 <code>--ft-*</code> CSS 变量（含 <code>--ft-on-accent</code>），放到 <code>src/utils/style.js</code>。

## 对外接口

<code>&lt;TreeStage :theme :items @select&gt;</code> · <code>&lt;AvatarPin :item :size&gt;</code> · <code>&lt;JoinSheet v-model:visible :theme @submit&gt;</code> · <code>&lt;PosterDialog :theme :node :rank&gt;</code>

## 依赖

06 主题 / 03 槽位 / 13 海报

## 要点

- 树用 border 三角形画，不用 SVG：小程序对 SVG 支持不完整，用 CSS 边框三角形两端表现一致。
- 头像按槽位百分比绝对定位（<code>left: x*100%</code> + <code>translate(-50%,-50%)</code>），所以屏幕宽度变化时整棵树等比缩放，不需要重算。
- 尺寸靠 <code>createSelectorQuery().in(instance.proxy)</code> 量一次舞台宽度，再由 <code>canvasRatio</code> 推高度——比写死 vh 稳。
- 所有颜色走 <code>var(--ft-*)</code>，由 <code>tokensToVars(theme.tokens)</code> 注入，换主题时 CSS 自动跟着变。

## 坑位

- <code>inset: 0</code> 简写在部分低版本小程序不生效，写成四个方向各自声明。
- <code>:nth-child</code> 在 scoped 样式下配合条件渲染不稳，改用 class 绑定。
- 组件内部再发请求 = 不可测；数据一律由页面传进来。
