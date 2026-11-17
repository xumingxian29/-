# 03 排序与槽位块

**目录** `rank-slots/`　**文件** <code>rank.js</code> · <code>rank.cloud.js</code>

纯函数，零平台依赖：算分、排序、找名次、把节点分配到主题槽位。

## 对外接口

<code>computeScore(node, sortMode)</code> · <code>sortNodes(nodes, sortMode)</code> · <code>findMyRank(sorted, myId)</code> · <code>makeGridSlots(count, rows)</code> · <code>assignSlots(sortedNodes, layout)</code>

## 依赖

无

## 要点

- 算分口径用"主键 × 1000 + 次键"压成单值：<code>invite × 1000 + bless</code> 或 <code>bless × 1000 + invite</code>。这样数据库只按一个字段排序就能表达两级优先级，避免多字段 orderBy 的兼容坑。
- 同分时按 createdAt 升序，先来的靠前——不这么做，榜单会在每次刷新时抖动。
- <code>assignSlots</code> 的槽位顺序约定 index 0 = 树顶。主题给的槽位不够时自动补栅格，所以节点数不需要和槽位数对齐。
- <code>rank.cloud.js</code> 是云函数侧的副本，只保留算分，不参与排序（排序交给数据库索引）。

## 坑位

- 前端与云函数两份算分代码必须同步改，否则海报上的名次和榜单对不上——这是最容易漏的一致性点。
- sortMode 只认 invite / bless / display 三个值，传错要回落到 invite，不能在数据库里出现未知值。
