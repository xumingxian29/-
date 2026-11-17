/**
 * 埋点：G0 只落地在本地/控制台，G2 走云函数
 * 采集的是产品判断需要的最小集：曝光、挂树、祝福、分享、海报
 */

import api from '@/core'
import { readJSON, writeJSON } from '@/core/storage'

const QUEUE_KEY = 'trackQueue'
const MAX_QUEUE = 100

export function track(name, props = {}) {
  const event = { name, props, ts: Date.now() }
  try {
    api.track(event)
  } catch (e) {
    /* 静默 */
  }
  const queue = readJSON(QUEUE_KEY, [])
  queue.push(event)
  writeJSON(QUEUE_KEY, queue.slice(-MAX_QUEUE))
  return event
}

export const EVENTS = {
  PAGE_VIEW: 'page_view',
  JOIN_SUBMIT: 'join_submit',
  JOIN_SUCCESS: 'join_success',
  BLESS: 'bless',
  POSTER_MAKE: 'poster_make',
  SHARE_CLICK: 'share_click',
  RANK_VIEW: 'rank_view'
}
