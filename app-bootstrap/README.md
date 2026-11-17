# 11 启动装配块

**目录** `app-bootstrap/`　**文件** <code>bootstrap.js</code>

把"选主题 → 初始化 api → 查隐私状态"串成一次启动，并用 reactive 暴露给页面。

## 对外接口

<code>bootstrap({ treeId, forcedId })</code> · <code>useAppState()</code> · <code>switchTheme(id)</code>

## 依赖

10 分叉 / 06 主题 / 05 隐私 / 12 业务 API

## 要点

- <code>state.ready</code> 是防重入的闸门：<code>onLaunch</code> 里调一次，页面靠它决定是否显示骨架屏，避免刚进页面就发请求。
- <code>switchTheme</code> 是"换皮自测"的开关：改 <code>FORCED_THEME_ID</code> 或调一次这个函数，整站配色文案全换，组件零改动。
- 初始化失败不抛到页面，只写进 <code>state.error</code>，页面顶部显示一行提示即可——分享进来的用户不该看到白屏。

## 坑位

- App.vue 的 onLaunch 早于页面 onLoad，页面读 state 时要先判 <code>ready</code>，否则会拿到 null 主题。
