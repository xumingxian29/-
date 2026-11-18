/**
 * 前端数值口径（与 cloud-function/lib/limits.js 必须一致）
 *
 * scripts/verify.js 会断言两边同名常量数值相同，
 * 防止再出现"心愿 30 写死两处、头像 160/200/256 四种说法"的漂移。
 */

export const WISH_MAX = 30 // 心愿字数（按码点算，emoji 记 1 个）
export const NICK_MAX = 12 // 昵称字数（同上）

export const WALL_PAGE_SIZE = 60 // 一屏节点数，与云端 PAGE_SIZE 对齐
export const AVATAR_TARGET_PX = 160 // H5 压缩后的长边像素
export const AVATAR_QUALITY = 0.72 // H5 JPEG 质量
export const AVATAR_CLIENT_MAX_BYTES = 40960 // 本地校验上限 40KB，低于云端 200KB 硬限
