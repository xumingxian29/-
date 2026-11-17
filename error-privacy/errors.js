/**
 * 统一错误类型与错误码
 * 页面层只需 catch 后展示 err.message，不需要关心平台差异
 */

export const ErrCode = {
  PARAM: 4001,
  FREQ: 4003,
  CONTENT: 4009,
  AUTH: 4010,
  NOT_FOUND: 4004,
  NET: 5000,
  UNKNOWN: 5999
}

export class ApiError extends Error {
  constructor(code = ErrCode.UNKNOWN, message = '操作失败，请稍后重试') {
    super(message)
    this.name = 'ApiError'
    this.code = code
  }
}

/**
 * 把任意异常规整为 ApiError
 * @param {unknown} e
 * @param {string} [fallbackMsg]
 * @returns {ApiError}
 */
export function toApiError(e, fallbackMsg = '网络异常，请稍后重试') {
  if (e instanceof ApiError) return e
  const msg = e && (e.errMsg || e.message) ? e.errMsg || e.message : fallbackMsg
  return new ApiError(ErrCode.NET, msg)
}

/** 拆云函数信封 { code, msg, data } */
export function unwrap(result) {
  if (!result || typeof result !== 'object') {
    throw new ApiError(ErrCode.UNKNOWN, '服务返回异常')
  }
  if (result.code !== 0) {
    throw new ApiError(result.code || ErrCode.UNKNOWN, result.msg || '服务返回异常')
  }
  return result.data
}
