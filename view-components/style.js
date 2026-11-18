/**
 * 把主题 tokens 转成 CSS 变量，页面根节点绑定一次，组件里统一用 var(--ft-xxx)
 * 好处：换主题不需要改组件样式，也不需要每个组件都接 theme.tokens
 */

export function tokensToVars(tk) {
  if (!tk) return {}
  return {
    '--ft-bg': tk.colorBg,
    '--ft-bg-top': tk.colorBgTop,
    '--ft-tree': tk.colorTree,
    '--ft-tree-dark': tk.colorTreeDark,
    '--ft-primary': tk.colorPrimary,
    '--ft-accent': tk.colorAccent,
    '--ft-accent-soft': tk.colorAccentSoft,
    // accent 上的文字色：深色主题必须能覆盖，否则 #2b1a17 会糊在深色底上
    '--ft-on-accent': tk.colorOnAccent,
    '--ft-text': tk.colorText,
    '--ft-text-sub': tk.colorTextSub,
    '--ft-ring': tk.colorPinRing,
    '--ft-card': tk.colorCard,
    '--ft-radius': tk.radius,
    '--ft-shadow': tk.shadow
  }
}

/** 按码点截断（emoji 不会被劈成半个） */
export function clampText(text, max = 30) {
  const arr = Array.from(text || '')
  return arr.length <= max ? text : arr.slice(0, max).join('') + '…'
}
