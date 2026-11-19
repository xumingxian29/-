# 变更记录

## 2026-11-19 — 新增 18 号块：贺卡线（v3）

把另一条产品线（单人圣诞贺卡）接进同一套骨架。它不是"又一个页面"，而是与许愿树并列的独立链路，
所以单独成块，根目录仍是每块一个目录。

### 新增

**18 号块 `card-line/`** —— 11 个文件 + 1 个页面，按单一职责切分：

| 文件 | 职责 |
|---|---|
| `config.js` | 画布尺寸、排版规则、存储 key |
| `theme.js` | 从 `themes/*.js` 的 `card` 段取配置，缺失自动回退 |
| `text.js` | 字体串拼装、折行、避头点、自动降字号 |
| `motifs.js` | 雪花 / 麋鹿 / 圣诞树，全矢量路径 |
| `layout.js` | 版面比例计算 + 不重叠自检 |
| `render.js` | `drawCard(ctx, spec)` 纯绘制，零平台 API |
| `state.js` | 选择状态、本地记忆、脏数据收敛 |
| `export.h5.js` | blob 导出 + 下载 + 微信长按兜底 |
| `export.js` | 导出壳选择（唯一条件编译点） |
| `share.js` | 分享链接、分享动作、入口参数解析 |
| `index.js` | 对外唯一出口 |
| `card.vue` | 三步交互页面，只 import `@/card` |

**主题块扩展**：`theme-config/christmas.js` 新增 `card` 段（画布 / 白卡 / 全部文案 / 6 条预设祝福语 / 3 套模板）。
加一个模板只改这一处，页面与 CSS 零改动。`newyear.js` 不提供 `card` 段，由 `card-line/theme.js` 回退到 christmas。

**分享块扩展**：`share-params/share.js` 新增 `buildUrl(path, params)` —— 通用深链，
保留 `location.search`（托管平台靠 `?sharecode=` 做访问鉴权）。与 `buildH5ShareUrl` 的区别是不预设业务字段、不做参数剔除。

### 相对原始原型修掉的 3 个问题

原型是 257 行单文件 HTML，可跑但有硬伤：

1. **祝福语渲染成一列竖排单字**。`wrap(g, text, 26, 500)` 把 `maxWidth` 和 `font` 传反了，
   `g.font = 500` 是非法值被静默忽略，`measureText` 沿用上一行的 72px，于是每个字都超过 26px 上限 → 每字一行。
   现在 `text.js` 强制走 `fontString(size)` 拼完整简写，并加了专门的回归用例。
2. **emoji 当主视觉**（190px 的 ❄️/🦌/🎄）。Canvas 画 emoji 依赖系统字体，安卓微信常渲染成黑白或缺字。
   改为全矢量路径绘制。
3. **`toDataURL` + 长按保存**。iOS 微信里长按 `data:` URI 图片经常不出保存菜单。
   改为 blob + objectURL，微信 + iOS 直接提示长按，不再"点了没反应"。

另外补了原型没有的：避头点（标点不落行首）、自动降字号（长祝福不砍成省略号）、版面不重叠自检、
脏数据收敛（模板被删/索引越界不白屏）、分享链接带 `tpl` 且保留 `sharecode`。

### 验证

```bash
npm run check
```

- `verify`：61 个块文件、113 条 import，0 未解析
- `test:card`：**45 项全过**（新增）
- `test`：22 项、`test:cloud`：29 项，无回归

`test:card` 的做法值得一提：它先按 `manifest.json` 把块**铺成真实工程目录**（临时目录里重写 `@/` 别名与
无扩展名 import），再 import 目标路径跑测试。所以验证的是"放回工程后的样子"，且**零依赖**，不需要 esbuild。
canvas 用 mock ctx，`font` 做成存取器（非法值静默忽略）—— 只有这样才能复现第 1 条那个线上事故。

### 已知边界

- 仅实现 H5 端。小程序端只差 `export.mp.js`（`canvasToTempFilePath` + `saveImageToPhotosAlbum`），
  改 `export.js` 一个分支，绘制层一行不用动。
- `tpl` 分享参数只在页面首次 `onLoad` 生效；SPA 内仅切 hash 不会重跑组件（真实用户从分享链接进来是新加载）。

## 2026-11-18 — 缺陷修复与安全加固（v2）

对全仓 17 个块做了一次逐行审查，修掉 3 个阻断级问题、9 个逻辑缺陷、6 个安全/合规问题。
下面按严重程度排列，每条都写了「原来怎样 / 现在怎样 / 怎么验证」。

### 阻断级（照原样复制，云函数起不来）

**1. 云函数缺 3 个被 require 的模块**

- 原来：`index.js` require `./lib/secH5`，`joinTree` require `../lib/sec`，`blessNode` require `../lib/guard`——三个文件都不在仓库里。`handlers` 是模块顶层 require，任一个缺失都会让 `exports.main` 根本加载不到，**7 个接口全挂**。
- 现在：补 `lib/sec.js`、`lib/secH5.js`、`lib/guard.js`，另加 `config.json`（声明 openapi 权限，否则 `msgSecCheck` 报 -604101）。
- 验证：`npm run test:cloud` 直接加载 `cloud-function/index.js` 并跑通全部接口。

**2. 仓库没有任何可运行/可验证的入口**

- 现在：根 `package.json` + `manifest.json` + 三个脚本。
  - `npm run verify`：49 个块文件的映射完整性、每条 import 在目标路径能否解析、前后端 limits 对拍
  - `npm test`：22 项纯逻辑
  - `npm run test:cloud`：29 项端到端（内存假数据库，跑真实业务代码）

**3. 块之间不能互相引用，且有两处需要改名**

- 现在：`manifest.json` 逐文件写明目标路径，`renames` 标注 `themes.index.js → index.js`、`rank.cloud.js → lib/rank.js`；`verify` 会检查漏映射。

### 逻辑缺陷（会算错数 / 显示错）

**4. 祝福榜的分数永远按 invite 口径算**

- 原来：`blessNode.js` 读 `node.sortMode`，但 `joinTree` 写库时**从未写入该字段**，于是永远回落 `'invite'`。春节切 bless 榜后 score 仍是邀请权重。
- 现在：`joinTree` 落库 `sortMode`；`blessNode` 改为 `node.sortMode || theme.getSortMode(ctx, treeId)`；新增 `lib/theme.js` 统一读 `configs/app.themes[treeId].sortMode`（60s 缓存）。
- 验证：`test:cloud` 断言 `doc.sortMode === 'bless'` 且榜单按 blessCount 排序。

**5. `listNodes` 的 `sort` 参数完全无效**

- 原来：解构出 `sort` 却没用，一律 `orderBy('score','desc')`。
- 现在：按 `inviteCount` / `blessCount` / `createdAt` 真正排序；**排序口径以服务端主题配置为准，客户端传的 `sort` 一律忽略**（防前端刷榜）。

**6. 加权分 `primary*1000+secondary` 计数过千会串味**

- 原来：1500 邀请 = 1 祝福×1000，两个维度互相污染。
- 现在：`compareNodes` 比较器（主维度 → 次维度 → createdAt），前后端同源；`score` 降级为兼容字段，文档明确「不要用它排序」。
- 验证：`test:cloud` 用 1500/2 的极端用例断言前后端排序一致。

**7. 祝福并发不安全**

- 原来：先查重再写入；`nextBless` 用旧值 +1 算分，落库却用 `_.inc(1)`，返回值与库不一致。
- 现在：祝福日志用确定性 `_id = nodeId__openid`，靠主键唯一性去重；冲突即视为已送过；更新后**回读**再返回。
- 验证：并发双请求只计一次；库里 `blessCount` 与日志条数一致。

**8. 槽位溢出的兜底会叠回树顶**

- 原来：`makeGridSlots(剩余数)` 从 `y=0.22` 重新开始，第 21 个人开始盖住树顶。
- 现在：从「最后一个主题槽位下方」起排，限制在 `[top, 0.94]`；横向占位随每行个数收缩。
- 验证：10 个节点 + 3 个主题槽位，断言溢出槽位 y 全部 ≥ 最后一个主题槽位。

**9. 头像挂件的三个显示问题**

- `transform: rotate()` 加在容器上 → 徽标和"我"字跟着歪：改为只转内层头像环。
- `nickname.slice(0,1)` → emoji 昵称截成半个代理对显示乱码：改 `Array.from(...)[0]`。
- 头像加载失败留空圈：加 `@error` 退回「首字占位」。
- 硬编码的 `#2b1a17` 改为 `var(--ft-on-accent)`，主题里新增 `colorOnAccent`。

**10. H5 海报用 PNG**

- 750×1000 PNG 约 1–2MB；改 JPEG(0.92) 约 150KB。

### 安全与合规

**11. H5 身份可伪造（最严重）**

- 原来：`h5Openid(clientId)`，clientId 由浏览器自己生成。知道别人的 clientId 就能冒充；清 localStorage 换个 id 还能重刷祝福与邀请。
- 现在：`lib/session.js` 服务端签发随机 `uid` + `HMAC-SHA256` token，每次请求验签；`register` 动作负责签发；`adapter-remote` 存本地并在 4010 时自动重签一次。
- 仍需注意：能防冒充，**不能防批量注册新身份**（Sybil）。那需要公众号网页授权拿真实 openid。未配置 `FT_SESSION_SECRET` 时会退回旧身份并打警告，只能用于本地演示。

**12. CORS 为 `*` 且无频控**

- 现在：`FT_ALLOWED_ORIGIN` 白名单（逗号分隔）；`lib/guard.js` 增加按 IP 的分钟级爆发限制与按 IP 的挂树限额（`JOIN_PER_HOUR`）。

**13. 先上传头像后校验心愿**

- 现在：`adapter-mp` 先本地校验文案再上传；落库失败时 `deleteFile` 补偿删除，不留孤儿文件。

**14. 头像超限被静默丢弃**

- 原来：`pickAvatarPayload` 两个分支返回同一个值（死逻辑），后端超 200KB 直接置空——用户头像凭空消失。
- 现在：H5 逐档压缩（160 → 128 → 96）直到落进 40KB；仍超限就明确报错；服务端超限返回 4001 而不是静默丢弃。

**15. 非 invite 档仍返回 `inviteCount`**

- 现在：`publicNode(doc, openid, {hideInvite})`，bless/display 档不返回 `inviteCount` 与 `score`，与「春节档不展示邀请数」的合规口径一致。

**16. 模块注释承诺的定时审核任务不存在**

- `joinTree` 注释说「命中违规由定时任务置为待审」，仓库里没有这个任务。已在 `lib/sec.js` 顶部改为显式说明「本仓库不含该任务，上线前必须自己补」。

### 一致性 / 文档漂移

- 数值口径统一到 `config-env/limits.js` ↔ `cloud-function/lib/limits.js`，`verify` 对拍：心愿 30、昵称 12、分页 60、头像 40KB vs 200KB。
- `ADAPTER-REMOTE` / `ADAPTER-MP` / `FETCHWALL` 三处分页默认值（200/60/30）统一为 60。
- `data-contract` 的 `ApiMode` 补上 `'remote'`（原来只有 cloud/local）。
- `config-env/env.js` 删除从未被读取的 `ALLOW_LOCAL_MODE`（改了没反应的死开关）。
- `storage.js` 的 `readJSON` 解析失败时**清掉坏 key**，否则每次读都失败、永远回不到正常态。
- `share.js`：分享链接保留 `sharecode` 等平台参数，但剔除 `inviter/treeId`，避免多手转发后邀请人串味。
- `themes.index.js`：`Date.parse('YYYY-MM-DD')` 按 UTC 算会导致东八区窗口偏移 8 小时，改为显式本地时间解析（结束日取 23:59:59.999）。
- `platform-switch/index.js`、`poster-render/index.js`：条件编译分支里各写一次 `const impl` / `export {}`，出了 uni-app 编译器就是重复声明（`node --check` 报错）。改成先声明再赋值，条件编译照旧能剪枝，文件本身始终是合法 JS。
- `image-picker/image.js`：SVG 兜底头像里的昵称未转义（`<` `&` 会打坏图形），加 `escapeXml`；并注明该函数在 MP 端返回空串（`<image>` 不支持 svg），由组件用首字占位兜底。

### 复核过但**没有**改的

- `poster-render/draw.js` 的排版坐标、`JoinSheet` 的交互结构：这部分依赖真机视觉，改代码反而容易改坏，需要看图再调。
- `score` 字段仍写入库（兼容老数据与后台排查），只是不再参与排序。
- `mp.js` 的 `urlCache` 用临时路径缓存 1 小时：小程序重启后临时路径失效，属已知行为，靠 `@error` 兜底而不强改。

### 怎么复核这批修复

```bash
npm run check      # verify(49 文件/86 条导入) + 22 项纯逻辑 + 29 项云端端到端
```

修复后的 `platform-switch` / `poster-render` 尚未跑 uni-app 双端编译（本仓库无构建工程），
放回项目后请先 `npm run build:h5` 与 `npm run build:mp-weixin` 各验一次。
