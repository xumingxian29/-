# 16 云函数块

**目录** `cloud-function/`　**文件** <code>index.js</code> · <code>config.json</code> · <code>package.json</code> · <code>lib/db.js</code> · <code>lib/resp.js</code> · <code>lib/rank.js</code> · <code>lib/sec.js</code> · <code>lib/secH5.js</code> · <code>lib/guard.js</code> · <code>lib/session.js</code> · <code>lib/theme.js</code> · <code>lib/limits.js</code> · <code>actions/</code> 7 个 action

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

- 索引必须手建：改成按真实计数排序后，需要
  `nodes(treeId, wishStatus, inviteCount desc, createdAt asc)`、
  `nodes(treeId, wishStatus, blessCount desc, createdAt asc)`、
  `nodes(treeId, wishStatus, createdAt asc)` 三组，不建的话数据一多就超时。
- H5 触发下云调用内容安全不可用（拿不到 openid），只能走本地词表兜底——上线前务必换成第三方内容安全。
- 数据库权限要设为"仅创建者可读写"或"所有人不可写"，全部写入只走云函数，否则前端能直接改分数。
- `mediaCheckAsync` 只返回 traceId，**本仓库不含拉取结果的定时任务**；不补的话 `wishStatus=0` 的节点永远停在"审核中"。

## 环境变量（部署时必配）

| 变量 | 作用 | 不配的后果 |
|---|---|---|
| `FT_SESSION_SECRET` | H5 会话签名密钥（32 位以上随机串） | 无法签发身份，H5 退回 clientId 伪身份，**可被冒充** |
| `FT_ALLOWED_ORIGIN` | CORS 白名单，逗号分隔 | 默认 `*`，任何站点都能调你的接口 |

## 自测

```bash
npm run test:cloud   # 内存假数据库跑真实业务代码，29 项
```
