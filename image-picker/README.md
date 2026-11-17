# 14 图片选择块

**目录** `image-picker/`　**文件** <code>image.js</code>

平台边界文件：选图 → 取尺寸 → H5 压成 200px 的 dataURL，小程序只拿临时路径。

## 对外接口

<code>pickAvatar()</code> · <code>getImageInfo(path)</code> · <code>makeFallbackAvatar(text, bg)</code>

## 依赖

无

## 要点

- 页面只调 <code>pickAvatar()</code>，永远不直接碰 <code>uni.chooseImage</code> / <code>document</code> / <code>Image</code>。
- H5 必须转 dataURL：选图拿到的是 blob URL，刷新即失效，存进 localStorage 也读不出来。
- 压到 200px、JPEG 0.78，一张头像约 8–15KB，60 个节点能塞进 1MB 的存储预算。
- <code>makeFallbackAvatar</code> 用一个内联 SVG 现画首字母头像，零网络、零素材版权。

## 坑位

- 小程序端 <code>dataUrl</code> 恒为空字符串是设计如此（那边走云存储），不要指望它跨端通用。
