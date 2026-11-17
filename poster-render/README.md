# 13 海报绘制块

**目录** `poster-render/`　**文件** <code>draw.js</code> · <code>poster.h5.js</code> · <code>poster.mp.js</code> · <code>index.js</code>

拆成三份：纯绘制逻辑一份，两端各一个"拿画布 + 导出"的薄壳。

## 对外接口

<code>drawPoster(ctx, opts)</code> · <code>wrapText(ctx, text, maxWidth, maxLines)</code> · <code>makePoster({ theme, node, total, rank })</code>

## 依赖

06 主题（取 tokens / copy）

## 要点

- <code>draw.js</code> 只用 Canvas2D 标准子集（fillRect / drawImage / fillText / arc / clip / save / restore），不碰 DOM、不碰 wx，所以两端共用一份，改一次两边都对。
- H5：离屏 <code>document.createElement("canvas")</code> → <code>toDataURL</code>，用户可以长按保存。
- 小程序：<code>createSelectorQuery().in(getCurrentInstance().proxy)</code> 取 canvas 2d 节点 → <code>canvasToTempFilePath</code>，尺寸乘 dpr 否则糊。
- <code>wrapText</code> 按真实 <code>measureText</code> 折行，末行超出加省略号——心愿限 30 字，但中英混排仍然会超宽。

## 坑位

- canvas 实例绝对不能放进 reactive/ref：被 Vue3 代理包一层后传给 <code>canvasToTempFilePath</code> 会变成 undefined，且不报错。
- H5 若头像来自跨域 URL，画布被污染，<code>toDataURL</code> 直接抛 SecurityError。所以头像一律走 dataURL / blob。
- 导出成功后父组件要立刻把画布隐藏、改用 image 展示结果，否则小程序的 canvas 会盖在最上层。
