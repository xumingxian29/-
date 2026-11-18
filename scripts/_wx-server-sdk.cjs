/**
 * wx-server-sdk 的最小替身（只实现本仓库云函数用到的那部分）
 * 由 scripts/test-cloud.js 通过 Module._resolveFilename 注入，不参与发布。
 *
 * 提供的假数据库能力：
 *   collection(name).where().orderBy().skip().limit().get() / .count()
 *   collection(name).doc(id).get() / .update() / .remove()
 *   collection(name).add({ data })
 *   command: inc / gt / gte / lt
 */

const store = (globalThis.__FT_STORE__ = globalThis.__FT_STORE__ || {})

let seq = 0
function genId() {
  seq += 1
  return 'doc_' + seq.toString(36) + Math.random().toString(36).slice(2, 6)
}

const OP = { __ft: true }
function op(kind, value) {
  return Object.assign({}, OP, { kind, value })
}

const command = {
  inc: (n) => op('inc', n),
  gt: (v) => op('gt', v),
  gte: (v) => op('gte', v),
  lt: (v) => op('lt', v)
}

function isOp(v) {
  return v && v.__ft === true && typeof v.kind === 'string'
}

function matchOne(actual, cond) {
  if (isOp(cond)) {
    switch (cond.kind) {
      case 'gt':
        return actual > cond.value
      case 'gte':
        return actual >= cond.value
      case 'lt':
        return actual < cond.value
      default:
        return false
    }
  }
  return actual === cond
}

function matchRow(row, filter) {
  return Object.keys(filter).every((k) => {
    const key = k === '_id' ? '_id' : k
    return matchOne(row[key], filter[k])
  })
}

class Cursor {
  constructor(name) {
    this.name = name
    this.filter = {}
    this.orders = []
    this.skipN = 0
    this.limitN = null
  }

  clone() {
    const c = new Cursor(this.name)
    c.filter = { ...this.filter }
    c.orders = this.orders.slice()
    c.skipN = this.skipN
    c.limitN = this.limitN
    return c
  }

  where(q) {
    const c = this.clone()
    c.filter = { ...c.filter, ...(q || {}) }
    return c
  }

  orderBy(field, dir) {
    const c = this.clone()
    c.orders.push([field, dir === 'desc' ? -1 : 1])
    return c
  }

  skip(n) {
    const c = this.clone()
    c.skipN = n || 0
    return c
  }

  limit(n) {
    const c = this.clone()
    c.limitN = n
    return c
  }

  rows() {
    const all = store[this.name] || []
    let out = all.filter((r) => matchRow(r, this.filter))
    // 多字段排序：从最后一个键开始做稳定排序
    for (let i = this.orders.length - 1; i >= 0; i--) {
      const [field, dir] = this.orders[i]
      out.sort((a, b) => {
        const av = a[field]
        const bv = b[field]
        if (av === bv) return 0
        return (av > bv ? 1 : -1) * dir
      })
    }
    if (this.skipN) out = out.slice(this.skipN)
    if (this.limitN != null) out = out.slice(0, this.limitN)
    return out
  }

  async get() {
    return { data: this.rows().map((r) => ({ ...r })) }
  }

  async count() {
    const all = store[this.name] || []
    return { total: all.filter((r) => matchRow(r, this.filter)).length }
  }

  doc(id) {
    const name = this.name
    return {
      async get() {
        const found = (store[name] || []).find((r) => r._id === id)
        if (!found) {
          const e = new Error('document not exists')
          e.errCode = -502004
          throw e
        }
        return { data: { ...found } }
      },
      async update({ data }) {
        const rows = store[name] || []
        const idx = rows.findIndex((r) => r._id === id)
        if (idx < 0) {
          const e = new Error('document not exists')
          e.errCode = -502004
          throw e
        }
        for (const k of Object.keys(data)) {
          const v = data[k]
          if (isOp(v) && v.kind === 'inc') rows[idx][k] = (rows[idx][k] || 0) + v.value
          else rows[idx][k] = v
        }
        return { stats: { updated: 1 } }
      },
      async remove() {
        const rows = store[name] || []
        const idx = rows.findIndex((r) => r._id === id)
        if (idx > -1) rows.splice(idx, 1)
        return { stats: { removed: idx > -1 ? 1 : 0 } }
      }
    }
  }

  async add({ data }) {
    const rows = (store[this.name] = store[this.name] || [])
    const id = data._id || genId()
    if (data._id && rows.some((r) => r._id === id)) {
      // 模拟主键冲突（真实云数据库返回 duplicate key）
      const e = new Error('duplicate key: ' + id)
      e.errCode = -502001
      throw e
    }
    rows.push({ ...data, _id: id })
    return { _id: id }
  }
}

const fakeCloud = {
  DYNAMIC_CURRENT_ENV: 'test-env',
  init() {},
  database() {
    return {
      command,
      collection(name) {
        return new Cursor(name)
      }
    }
  },
  getWXContext() {
    return { OPENID: globalThis.__FT_OPENID__ || '' }
  },
  openapi: {
    security: {
      async msgSecCheck() {
        return { result: { suggest: 'pass' } }
      },
      async mediaCheckAsync() {
        return { traceId: 'trace_test' }
      }
    }
  }
}

module.exports = fakeCloud
module.exports.__store__ = store
module.exports.__reset__ = () => {
  Object.keys(store).forEach((k) => delete store[k])
  seq = 0
}
