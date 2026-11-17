# 02 数据契约块

**目录** `data-contract/`　**文件** <code>contract.js</code>

只有 JSDoc、没有运行时代码。定义 <code>TreeNode</code>、<code>TreeMeta</code>、<code>TreeApi</code> 三个形状。

## 对外接口

<code>TreeApi.init / getTree / listNodes / joinTree / blessNode / recordInvite / getMyNode / resolveUrls / track</code> · <code>SORT_KEYS</code>

## 依赖

无

## 要点

- 这个文件是"以后能不能换端"的关键：三个实现（本地 / 小程序云 / H5 远程）只要满足同一份 TreeApi，页面就完全不用改。
- 之所以单独成块而不是写进 README，是因为它同时被编辑器和 IDE 当类型提示用，写错字段名当场标红。
- 新增字段的代价：本地、云函数、远程三处都要补，漏一处就是线上字段缺失。改之前先想清楚能不能不加。

## 坑位

- <code>mine</code>、<code>wishStatus</code> 这类"派生字段"由实现层算好，页面不要自己推导，否则换端就错。
