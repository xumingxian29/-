/**
 * 启动流程：主题装载 → api.init → 隐私检查
 * App.vue 的 onLaunch 调用一次，页面通过 useAppState() 读取
 */

import { reactive } from 'vue'
import api from './index'
import { resolveTheme } from '@/themes'
import { setTheme } from '@/api/tree'
import { checkPrivacy } from './privacy'
import { DEFAULT_TREE_ID } from './env'

export const state = reactive({
  ready: false,
  loading: false,
  error: '',
  theme: null,
  treeId: DEFAULT_TREE_ID,
  mode: '',
  needPrivacy: false
})

export function useAppState() {
  return state
}

/**
 * @param {{treeId?:string, forcedId?:string}} [opts]
 */
export async function bootstrap(opts = {}) {
  if (state.ready) return state

  const theme = resolveTheme({ treeId: opts.treeId, forcedId: opts.forcedId })
  state.theme = theme
  state.treeId = theme.meta.treeId
  state.mode = api.mode
  setTheme(theme)

  state.loading = true
  try {
    await api.init({ treeId: state.treeId })
    const p = await checkPrivacy()
    state.needPrivacy = p.needAuthorization
    state.ready = true
  } catch (e) {
    state.error = e && e.message ? e.message : '初始化失败'
  } finally {
    state.loading = false
  }
  return state
}

/** 换主题（调试用：改这里即可验证"换皮只改配置"） */
export async function switchTheme(id) {
  const theme = resolveTheme({ forcedId: id })
  state.theme = theme
  state.treeId = theme.meta.treeId
  setTheme(theme)
  await api.init({ treeId: state.treeId })
  return theme
}
