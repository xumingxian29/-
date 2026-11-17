# 16 云函数块

**目录** `cloud-function/`　**文件** <code>index.js</code> · <code>lib/db.js</code> · <code>lib/resp.js</code> · <code>lib/rank.js</code> · <code>actions/getTree.js</code> · <code>actions/listNodes.js</code> · <code>actions/joinTree.js</code> · <code>actions/blessNode.js</code> · <code>actions/recordInvite.js</code> · <code>actions/getMyNode.js</code> · <code>actions/track.js</code>

单入口 + action 路由。小程序 <code>callFunction</code> 和 H5 的 HTTP 访问服务进同一份业务逻辑。

## 对外接口

<code>exports.main(event)</code> · <code>handlers: getTree / listNodes / joinTree / blessNode / recordInvite / getMyNode / track</code>

## 依赖

03 排序（算分副本）

## 要点

- <code>isHttpEvent()</code> 靠 <code>httpMethod / requestContext / path</code> 三个字段判断来源，是同一个函数服务两种调用的关键。HTTP 入口要自己处理 OPTIONS 204 和 CORS 头。
- H5 没有 openid，用 <code>h5Openid(clientId)</code> 映射成 <code>h5_xxx</code> 的伪 openid。业务层拿到的永远是一个 openid 字符串，不用关心来源。
- <code>publicNode()</code> 是安全边界：绝不把 openid 返回给客户端；<code>wishStatus !== 1</code> 时把心愿替换成"（内容审核中）"。
- joinTree 的幂等：同一 openid 在一棵树上只有一个节点，重复提交是更新不是新增。
- 邀请只记一次：<code>invite_logs</code> 里 (nodeId, openid) 唯一，先查再写，防刷。

## 坑位

- 索引必须手建：<code>nodes(treeId, wishStatus, score desc, createdAt asc)</code>，不建的话数据一多就超时。
- H5 触发下云调用内容安全不可用（拿不到 openid），只能走本地词表兜底——上线前务必换成第三方内容安全。
- 数据库权限要设为"仅创建者可读写"或"所有人不可写"，全部写入只走云函数，否则前端能直接改分数。
