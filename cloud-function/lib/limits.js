/**
 * 数值口径：前后端必须一致的限制值都放这里
 *
 * 对应前端 config-env/limits.js —— scripts/verify.js 会断言两边数值相同，
 * 避免再次出现"心愿 30 写死两处、头像四种口径"的漂移。
 */

exports.WISH_MAX = 30 // 心愿字数（按码点算，emoji 记 1 个）
exports.NICK_MAX = 12 // 昵称字数（同上）

exports.PAGE_SIZE = 60 // 一屏节点数（H5 与小程序统一）
exports.PAGE_SIZE_MAX = 100 // 服务端硬上限

exports.AVATAR_MAX_BYTES = 204800 // 单条头像字段硬上限 200KB（dataURL 字符≈字节）

exports.BLESS_DAILY = 20 // 每人每天可送祝福数
exports.INVITE_DAILY = 50 // 每人每天可被记邀请数
exports.JOIN_PER_HOUR = 10 // 每 IP 每小时最多挂几个节点
exports.BURST_PER_MIN = 30 // 每 IP 每分钟操作上限
