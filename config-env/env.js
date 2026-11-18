/**
 * 全局环境常量
 *
 * ⚠️ 首次部署时只需改这里：
 *  1. CLOUD_ENV_ID    小程序端云开发环境 ID（开发者工具 → 云开发 → 设置 → 环境ID）
 *  2. API_BASE        H5 端后端地址（云开发 HTTP 访问服务地址，见 docs/h5-launch.md）
 *  3. WX_OA_APPID     公众号 AppID（仅自定义分享用，可后置）
 *  4. src/manifest.json 的 mp-weixin.appid 填你的小程序 AppID
 *  5. 根目录 project.config.json / project.prod.config.json 的 appid 同步改成同一个
 */

// 微信云开发环境 ID，留空表示尚未接入云端（小程序端会走降级提示，H5 端走本地模式）
export const CLOUD_ENV_ID = ''

/**
 * H5 端后端地址（POST，body 为 { action, payload, clientId }）
 * 留空 = H5 走本地模式：数据只在这个浏览器里，换设备/发给别人都是空树
 * 填上 = H5 走真后端：手机、电脑、别人看到的是同一棵树
 *
 * 当前默认 '/api' —— 由 vite 代理到本地后端 server/index.js（跨设备内测用）
 * 正式上线时改成完整地址，例如：
 *   'https://<envId>.service.tcloudbase.com/api'
 * 或者在自有域名下用 Nginx 把 /api 反代到后端，届时这里保持 '/api' 即可。
 */
export const API_BASE = '/api'

// 默认树种 ID，与 themes/*.js 中的 meta.treeId 对应
export const DEFAULT_TREE_ID = 'christmas'

// 强制指定主题（留空则按 themes/index.js 的日期规则自动选择）
export const FORCED_THEME_ID = ''

// 说明：原先这里有个 ALLOW_LOCAL_MODE 开关，全仓没人读取（改了没反应），已删除。
// H5 是否走本地模式只看 API_BASE 是否为空，见 platform-switch/index.js。

// ------- 以下为「挂到公众号」才需要，可先留空 -------

// 公众号 AppID（自定义分享卡片用；不是小程序 AppID）
export const WX_OA_APPID = ''

// 是否启用微信 JS-SDK 自定义分享（需：认证公众号 + 已备案域名 + 后端签名接口）
export const ENABLE_JSSDK = false

// JS-SDK 签名接口地址（POST { url } → { appId, timestamp, nonceStr, signature }）
// 与 API_BASE 可以不是同一个地址，但必须在已备案域名下
export const WX_SIGN_URL = ''

// 分享卡片标题/描述/缩略图（JS-SDK 与微信默认抓取都用这两项）
export const SHARE_TITLE = '来给我的圣诞树挂个头像'
export const SHARE_DESC = '一句话心愿，挂上这棵树'
// 分享缩略图：放一张 300×300 的 jpg 到 src/static/，这里填 /static/share.jpg
// 留空则用微信自动抓取（通常是页面里第一张像样的图，不保证好看）
export const SHARE_IMG = ''

// 是否在 H5 端启用「本地敏感词兜底」（后端未能做内容安全时的最低防线）
export const ENABLE_LOCAL_FILTER = true
