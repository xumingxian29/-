# 06 主题配置块

**目录** `theme-config/`　**文件** <code>themes.index.js</code> · <code>christmas.js</code> · <code>newyear.js</code>

一个 theme 对象装下所有会随节日变的东西：元信息、槽位布局、颜色字体、文案、业务规则、广告位、隐私版本。

## 对外接口

<code>resolveTheme({ forcedId, treeId, date })</code> · <code>getTheme(id)</code> · <code>listThemes()</code>

## card 段（2026-11 新增）

<code>christmas.js</code> 里多了一个 <code>card</code> 段，供 18 号块（贺卡线）使用：
<code>canvas</code> / <code>paper</code> / <code>copy</code> / <code>presets</code> / <code>templates</code>。

- 它是贺卡视觉的**唯一来源**：18 号块的绘制层只按这些参数画，不允许出现颜色字面量。
- <code>newyear.js</code> 故意不提供 <code>card</code> 段，<code>card-line/theme.js</code> 会自动回退到 christmas。
  新年档要做贺卡时补一份同结构即可，页面与绘制层不用改。
- 加一个贺卡模板 = 在 <code>card.templates</code> 加一项；若要新图形，再去 18 号块 <code>motifs.js</code> 注册绘制函数。

## 依赖

01 配置块（读 FORCED_THEME_ID / DEFAULT_TREE_ID）

## 要点

- 换皮动作 = 复制 christmas.js 改 <code>tokens</code> + <code>copy</code> + <code>meta</code>。<code>newyear.js</code> 就是 <code>{ ...christmas, ... }</code> 覆盖写法，一个文件 70 行搞定春节版。
- <code>tokens</code> 的字段名和 CSS 变量一一对应（<code>colorBg</code> → <code>--ft-bg</code>），由 <code>tokensToVars()</code> 注入到根节点，组件里只写 <code>var(--ft-bg)</code>。
- 规则也在这里：<code>rules.sortMode</code> 决定圣诞档按邀请排、春节档按祝福排；<code>rules.showInviteCount</code> 恒为 false，规避诱导分享红线。
- <code>resolveTheme</code> 优先级：强制 ID &gt; URL 里的 treeId &gt; 日期落在 startAt~endAt &gt; 默认主题。

## 坑位

- 组件里出现任何颜色字面量或中文文案，换皮就失效——这条要靠 code review 守住，工具查不出来。
- <code>assets</code> 里的图片路径全部留空是故意的：G0 阶段用 CSS 和内联绘制代替素材，规避版权风险。
