/** 统一返回信封：{ code, msg, data } */
exports.ok = (data = null) => ({ code: 0, msg: 'ok', data })

exports.fail = (code = 5000, msg = '服务异常') => ({ code, msg, data: null })

exports.CODE = {
  PARAM: 4001,
  FREQ: 4003,
  NOT_FOUND: 4004,
  CONTENT: 4009,
  AUTH: 4010
}
