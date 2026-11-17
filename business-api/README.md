# 12 业务 API 块

**目录** `business-api/`　**文件** <code>tree.js</code> · <code>track.js</code>

页面唯一该 import 的一层。注入当前主题、补默认参数、把平台异常转成人话。

## 对外接口

<code>fetchWall</code> · <code>submitJoin</code> · <code>sendBless</code> · <code>recordInvite</code> · <code>fetchMine</code> · <code>fetchRank</code> · <code>track</code> · <code>EVENTS</code>

## 依赖

10 分叉 / 06 主题 / 04 存储

## 要点

- 页面永远不 import <code>@/core</code>，只 import 这里。所以"以后改用云开发"对页面是透明的。
- <code>tid(treeId)</code> 统一补树种，调用方不传就用当前主题的 treeId，避免各处硬编码 "christmas"。
- 埋点只采产品判断真正用得上的 7 个事件（曝光、挂树、祝福、海报、分享…），本地留最近 100 条环形队列，失败静默不影响主流程。

## 坑位

- 埋点不能 await 在主链路上，否则网络抖动会拖慢挂树按钮。
