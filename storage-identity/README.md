# 04 存储与身份块

**目录** `storage-identity/`　**文件** <code>storage.js</code>

版本化的本地存储封装 + 客户端身份。<code>uni.*</code> 保证两端同源。

## 对外接口

<code>readJSON(name, fallback)</code> · <code>writeJSON(name, value)</code> · <code>removeKey(name)</code> · <code>getClientId()</code> · <code>uuid()</code>

## 依赖

无

## 要点

- 所有 key 统一前缀 <code>ft:v1:</code>。将来结构变了升 v2 并写迁移，而不是清空用户数据。
- <code>getClientId()</code> 是 H5 端的身份根基：没有 openid，就用本机生成的一次性 ID 做"我是谁"和"祝福去重"。
- 写入满了会抛异常（小程序单 key 1MB、总 10MB），这里 catch 掉只打日志，不让一次存储失败打断主流程。

## 坑位

- clientId 存在本地 → 换设备就是另一个人，原来的节点不再属于你。这是产品边界，不是 bug，UI 上要讲清楚。
- 不要在渲染函数里调 <code>getClientId()</code>，它有写操作；启动时取一次放进状态。
