# 05 错误与隐私块

**目录** `error-privacy/`　**文件** <code>errors.js</code> · <code>privacy.js</code>

统一错误码与错误对象，加上隐私协议状态查询。页面只 <code>catch (e) { e.message }</code>，不关心平台。

## 对外接口

<code>ErrCode</code> · <code>ApiError</code> · <code>toApiError(e, fallback)</code> · <code>unwrap(result)</code> · <code>checkPrivacy()</code> · <code>requirePrivacyAuthorize()</code>

## 依赖

09 存储块（隐私记录要落本地）

## 要点

- 云函数统一返回信封 <code>{ code, msg, data }</code>。<code>unwrap</code> 是全工程唯一的解包点，别在页面里自己读 <code>res.data.data</code>。
- 隐私这块是被动触发：<code>checkPrivacy</code> 只查询，真正拉弹窗要用户点按钮时才调 <code>requirePrivacyAuthorize</code>，否则审核会挑"未授权就采集"。
- 2023-10-17 之后 chooseAvatar / 相册 / 剪贴板等接口都受隐私协议约束，先授权再调用，顺序反了会静默失败。

## 坑位

- H5 端没有平台隐私弹窗，只有本地记录版本号；别以为 H5 也需要 <code>wx.requirePrivacyAuthorize</code>。
