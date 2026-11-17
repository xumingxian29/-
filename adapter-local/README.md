# 07 本地实现块

**目录** `adapter-local/`　**文件** <code>local.js</code> · <code>mockSeed.js</code>

数据全在浏览器本地，不依赖任何后端。G0 阶段验证交互与视觉的主力实现。

## 对外接口

<code>按 TreeApi 契约实现全部 9 个方法，mode = "local"</code>

## 依赖

02 契约 / 03 排序 / 04 存储 / 14 图片块

## 要点

- 首次访问写入 20 个种子节点，头像用内联 SVG 现画，不引任何外部图片——既不依赖网络，也没有素材版权问题。
- 祝福用 <code>blessed:{treeId}</code> 数组去重，邀请用 <code>invited:{treeId}:{nodeId}</code> 去重，都是防"同一个人刷次数"。
- 重复提交视为更新自己那个节点（同一 clientId 只保留一个），和云端 joinTree 的行为保持一致。

## 坑位

- 这个实现只能自测：换浏览器、换设备、发给别人，看到的都是空树。UI 上必须显性提示，否则演示时会被当成"数据没通"。
- localStorage 有 5MB 上限，头像存的又是 dataURL，节点攒到几十个就可能写失败。
