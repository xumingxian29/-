<template>
  <view class="page" :style="vars">
    <view class="hd">
      <text class="hd__title">{{ card.copy.title }}</text>
      <text class="hd__sub">{{ card.copy.sub }}</text>
    </view>

    <view class="steps">
      <text
        v-for="(s, i) in stepLabels"
        :key="i"
        class="steps__item"
        :class="{ 'steps__item--on': i <= step }"
      >{{ i + 1 }} {{ s }}</text>
    </view>

    <!-- 第一步：随机造型。不再让用户挑模板，直接抽一张，不喜欢就换 -->
    <view class="sec">
      <view class="sec__hd">
        <text class="sec__title">{{ card.copy.artHeading }}</text>
        <text class="sec__hint">{{ card.copy.artHint }}</text>
      </view>

      <view class="preview">
        <image v-if="previewUrl" class="preview__img" :src="previewUrl" mode="widthFix" />
        <view v-else class="preview__skel">
          <text class="preview__skel-txt">{{ card.copy.drawingTip }}</text>
        </view>
      </view>

      <button class="reroll" :disabled="drawing || busy" @click="onReroll">
        {{ drawing ? card.copy.drawingTip : card.copy.rerollCta }}
      </button>
    </view>

    <!-- 第二步：祝福语也是抽出来的，不用挑。只想换这一句就单独换，画面留着 -->
    <view class="sec">
      <view class="sec__hd">
        <text class="sec__title">{{ card.copy.wordHeading }}</text>
        <text class="sec__hint">{{ card.copy.wordHint }}</text>
      </view>

      <view class="wishbox">
        <text class="wishbox__mark">“</text>
        <text class="wishbox__txt">{{ wishText }}</text>
      </view>

      <button class="reroll reroll--ghost" :disabled="drawing || busy" @click="onNextWish">
        {{ card.copy.wishCta }}
      </button>
    </view>

    <view class="footnote">
      <text>{{ card.copy.footnote }}</text>
    </view>

    <view class="points">
      <view v-for="(p, i) in card.copy.points" :key="i" class="point">
        <text class="point__dot"></text>
        <text class="point__txt">{{ p }}</text>
      </view>
    </view>

    <view class="bar">
      <button class="gen" :disabled="busy || drawing" @click="generate">
        {{ busy ? '生成中…' : card.copy.genCta }}
      </button>
    </view>

    <view v-if="resultUrl" class="mask" @click="closeResult">
      <view class="result" @click.stop>
        <image class="result__img" :src="resultUrl" mode="widthFix" />
        <text class="result__tip">{{ saveTip }}</text>
        <view class="result__row">
          <button class="rbtn rbtn--ghost" @click="restart">{{ card.copy.againCta }}</button>
          <button class="rbtn rbtn--main" @click="saveImage">{{ card.copy.saveCta }}</button>
        </view>
        <!-- #ifdef H5 -->
        <button class="rbtn rbtn--link" @click="onShare">{{ card.copy.shareCta }}</button>
        <!-- #endif -->
        <!-- #ifndef H5 -->
        <!-- 小程序里必须用 open-type="share" 才能拉起原生转发面板 -->
        <button class="rbtn rbtn--link" open-type="share">{{ card.copy.shareCta }}</button>
        <!-- #endif -->
      </view>
    </view>

    <!-- #ifndef H5 -->
    <!-- 小程序没有 document.createElement，画布必须是页面里真实存在的节点；
         放到屏幕外即可，Canvas 2D 不要求可见 -->
    <canvas
      :id="canvasId"
      type="2d"
      class="card-canvas"
      :style="canvasStyle"
    />
    <!-- #endif -->
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
// #ifdef H5
import { onLoad, onReady, onUnload } from '@dcloudio/uni-app'
// #endif
// #ifndef H5
import { onLoad, onReady, onUnload, onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app'
// #endif
import { tokensToVars } from '@/utils/style'
import { setupShare } from '@/core/jssdk'
import {
  CARD_CANVAS,
  CARD_CANVAS_ID,
  CARD_FILE_PREFIX,
  pickCardTheme,
  createState,
  loadState,
  saveState,
  reroll,
  nextWish,
  resolveSelection,
  renderCardBlob,
  downloadBlob,
  releaseUrl,
  isWechatIOS,
  encodeSeed,
  buildCardShareUrl,
  parseCardEntry,
  shareCard
} from '@/card'

// 主题与卡片配置在初始化时定死：贺卡页不支持运行中切主题
const picked = pickCardTheme()
const card = picked.card
const vars = tokensToVars(picked.theme.tokens)

const state = ref(createState(card))
const step = ref(0)
/** 生成大图时用；换造型时用 drawing，两者分开，按钮才不会互相卡住 */
const busy = ref(false)
const drawing = ref(false)
const previewUrl = ref('')
const previewBlob = ref(null)
const resultUrl = ref('')
const resultBlob = ref(null)

const stepLabels = computed(() => [
  card.copy.stepArt,
  card.copy.stepWord,
  card.copy.stepGen
])

/**
 * 当前这一句祝福
 *
 * 走 resolveSelection 而不是自己取 presets[i]：那里还有内容安全闸，
 * 页面上显示的必须和画进图里的是同一句（含兜底替换后的结果）。
 */
const wishText = computed(() => resolveSelection(state.value, card).wish)

/** 小程序端离屏画布的 id，与 <canvas> 绑定，必须和 config 里保持一致 */
const canvasId = CARD_CANVAS_ID

/** 画布 CSS 尺寸与像素尺寸保持 1:1，导出时不用再乘 dpr */
const canvasStyle = `width:${CARD_CANVAS.width}px;height:${CARD_CANVAS.height}px;`

/** 保存提示两端不一样：H5 只能长按，小程序有真正的保存按钮 */
const saveTip = computed(() => {
  // #ifdef H5
  return card.copy.saveTip
  // #endif
  // #ifndef H5
  return card.copy.saveTipMp || card.copy.saveTip
  // #endif
})

// #ifndef H5
// 小程序转发：path 已经是 '/pages/card/card?s=xxx'（buildUrl 的非 H5 分支）
onShareAppMessage(() => ({
  title: card.copy.title,
  path: buildCardShareUrl({ seed: state.value.seed, wishIndex: pinnedWishIndex() }),
  imageUrl: resultUrl.value || previewUrl.value || ''
}))

onShareTimeline(() => ({
  title: card.copy.title,
  query: 's=' + encodeSeed(state.value.seed) + (pinnedWishIndex() == null ? '' : '&w=' + pinnedWishIndex()),
  imageUrl: resultUrl.value || previewUrl.value || ''
}))
// #endif

/** 祝福语被「换一句」钉住过才需要进链接；null 表示由 seed 决定，不用带 */
function pinnedWishIndex() {
  const i = state.value.presetIndex
  return Number.isInteger(i) && i >= 0 ? i : undefined
}

onLoad((options) => {
  const entry = parseCardEntry(options || {})
  let next = loadState(card)
  // 分享链接里带了 seed 就用它 —— 朋友点开看到的是同一张
  if (entry.seed) next = { ...next, seed: entry.seed }
  // 连同祝福语一起还原，否则"同一张"只对了一半
  if (entry.wishIndex != null) next = { ...next, presetIndex: entry.wishIndex }
  state.value = next
  saveState(next)
  syncShare()
})

/**
 * 首屏就要出图，所以放在 onReady：
 * 小程序端 selectQuery 必须等节点渲染完才能拿到 canvas
 */
onReady(() => {
  renderPreview()
})

onUnload(() => {
  releaseUrl(previewUrl.value)
  releaseUrl(resultUrl.value)
})

/**
 * 画一张预览
 *
 * 为什么预览也走完整的 750×1000 渲染，而不是画个小图：
 * 所见即所得。小图和大图两套排版，迟早会不一致。
 */
let previewToken = 0
async function renderPreview() {
  const token = ++previewToken
  drawing.value = true
  try {
    const { template, wish } = resolveSelection(state.value, card)
    const res = await renderCardBlob({
      width: CARD_CANVAS.width,
      height: CARD_CANVAS.height,
      template,
      wish,
      copy: card.copy,
      paperStyle: card.paper
    })

    // 连点"换一张"时，只认最后一次的结果，否则会出现"点了三下停在第二张"
    if (token !== previewToken) {
      releaseUrl(res.url)
      return
    }
    releaseUrl(previewUrl.value)
    previewUrl.value = res.url
    previewBlob.value = res.blob
    step.value = Math.max(step.value, 1)
  } catch (e) {
    if (token === previewToken) {
      uni.showToast({ title: card.copy.drawFail, icon: 'none' })
    }
  } finally {
    if (token === previewToken) drawing.value = false
  }
}

function onReroll() {
  if (drawing.value || busy.value) return
  state.value = reroll(state.value)
  saveState(state.value)
  renderPreview()
}

function onNextWish() {
  if (drawing.value || busy.value) return
  state.value = nextWish(state.value, card)
  saveState(state.value)
  step.value = Math.max(step.value, 2)
  // 祝福语印在图上，换了就必须重画，否则"预览"和"成图"说的不是一件事
  renderPreview()
}

async function generate() {
  if (busy.value || drawing.value) return
  busy.value = true
  try {
    const { template, wish } = resolveSelection(state.value, card)

    const res = await renderCardBlob({
      width: CARD_CANVAS.width,
      height: CARD_CANVAS.height,
      template,
      wish,
      copy: card.copy,
      paperStyle: card.paper
    })

    releaseUrl(resultUrl.value)
    resultUrl.value = res.url
    resultBlob.value = res.blob
    step.value = 3
  } catch (e) {
    uni.showToast({ title: e && e.message ? e.message : '生成失败', icon: 'none' })
  } finally {
    busy.value = false
  }
}

async function saveImage() {
  if (!resultBlob.value) return
  // #ifdef H5
  // 微信 + iOS 的 a[download] 基本无效，直接引导长按，避免"点了没反应"
  if (isWechatIOS()) {
    uni.showToast({ title: card.copy.saveUnsupported, icon: 'none' })
    return
  }
  // #endif
  // 小程序端 downloadBlob 是异步的（要等系统写相册），必须 await 才能拿到真实结果
  const ok = await downloadBlob(resultBlob.value, `${CARD_FILE_PREFIX}-${encodeSeed(state.value.seed)}.png`)
  uni.showToast({ title: ok ? card.copy.savedTip : card.copy.saveFail, icon: 'none' })
}

async function onShare() {
  const url = buildCardShareUrl({ seed: state.value.seed, wishIndex: pinnedWishIndex() })
  const r = await shareCard({ url, title: card.copy.title, text: card.copy.sub })
  if (r === 'copied') {
    uni.showToast({ title: card.copy.shareCopied, icon: 'none' })
  } else if (r === 'failed') {
    uni.showToast({ title: '分享失败，请稍后再试', icon: 'none' })
  }
}

function closeResult() {
  releaseUrl(resultUrl.value)
  resultUrl.value = ''
  resultBlob.value = null
}

function restart() {
  closeResult()
  step.value = 1
}

function syncShare() {
  // #ifdef H5
  setupShare({
    title: card.copy.title,
    desc: card.copy.sub,
    link: buildCardShareUrl({ seed: state.value.seed, wishIndex: pinnedWishIndex() }),
    imgUrl: ''
  })
  // #endif
}
</script>

<style scoped>
.page {
  width: 100%;
  max-width: 100vw;
  box-sizing: border-box;
  overflow-x: hidden;
  min-height: 100vh;
  background: linear-gradient(180deg, var(--ft-bg-top), var(--ft-bg) 62%);
  padding-bottom: 120px;
}

.hd {
  padding: 16px 20px 10px;
  /* 页面隐藏了系统导航栏（navigationStyle: custom），刘海屏要自己让出安全区 */
  padding-top: calc(16px + env(safe-area-inset-top));
}
.hd__title {
  display: block;
  font-size: 22px;
  font-weight: 800;
  color: var(--ft-text);
}
.hd__sub {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--ft-text-sub);
}

.steps {
  display: flex;
  gap: 6px;
  padding: 6px 20px 0;
}
.steps__item {
  font-size: 11px;
  padding: 3px 10px;
  border-radius: 99px;
  background: rgba(255, 255, 255, 0.1);
  color: var(--ft-text-sub);
}
.steps__item--on {
  background: var(--ft-accent);
  color: #0B3D2E;
  font-weight: 700;
}

.sec {
  padding: 16px 20px 0;
}
.sec__hd {
  margin-bottom: 10px;
}
.sec__title {
  font-size: 15px;
  font-weight: 700;
  color: var(--ft-text);
}
.sec__hint {
  display: block;
  margin-top: 3px;
  font-size: 11px;
  color: var(--ft-text-sub);
}

/* 预览：给一张真图，所见即所得 */
.preview {
  width: 100%;
  max-width: 214px;
  margin: 0 auto;
  border-radius: 14px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-sizing: border-box;
}
.preview__img {
  width: 100%;
  display: block;
}
.preview__skel {
  height: 250px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.preview__skel-txt {
  font-size: 12px;
  color: var(--ft-text-sub);
}

.reroll {
  width: 100%;
  margin-top: 12px;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.22);
  background: rgba(255, 255, 255, 0.07);
  color: var(--ft-text);
  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;
}
/* uni 的 button 会用一个 ::after 画边框，不去掉会在按钮外圈留一条线 */
.reroll::after {
  border: none;
}
.reroll[disabled] {
  opacity: 0.5;
}

/* 抽出来的那句祝福：做成一块"引文"，让人一眼看出这是结果而不是待选项 */
.wishbox {
  position: relative;
  padding: 15px 16px 15px 30px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-left: 3px solid var(--ft-accent);
}
.wishbox__mark {
  position: absolute;
  left: 11px;
  top: 8px;
  font-size: 22px;
  line-height: 1;
  color: var(--ft-accent);
  opacity: 0.7;
}
.wishbox__txt {
  font-size: 15px;
  font-weight: 600;
  line-height: 1.55;
  color: var(--ft-text);
}

/* 次要按钮：换一句只动文案，别和"换一张"抢视觉重量 */
.reroll--ghost {
  margin-top: 10px;
  padding: 10px;
  background: transparent;
  border-color: rgba(255, 255, 255, 0.16);
  font-size: 13px;
  font-weight: 500;
  color: var(--ft-text-sub);
}

.footnote {
  padding: 18px 20px 0;
  text-align: center;
  font-size: 11px;
  color: var(--ft-text-sub);
}

.points {
  padding: 14px 20px 0;
  display: flex;
  flex-direction: column;
  gap: 9px;
}
.point {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}
.point__dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--ft-accent);
  margin-top: 6px;
  flex: 0 0 auto;
}
.point__txt {
  flex: 1;
  font-size: 12px;
  line-height: 1.6;
  color: var(--ft-text-sub);
}

.bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 12px 20px 20px;
  background: linear-gradient(to top, var(--ft-bg) 62%, rgba(8, 40, 29, 0));
}
.gen {
  width: 100%;
  padding: 15px;
  border: none;
  border-radius: 14px;
  background: var(--ft-accent);
  color: #0B3D2E;
  font-size: 16px;
  font-weight: 700;
  line-height: 1.4;
}
.gen[disabled] {
  opacity: 0.6;
}
.gen::after {
  border: none;
}

.mask {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  background: rgba(4, 20, 14, 0.78);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  z-index: 20;
}
.result {
  width: 100%;
  max-width: 340px;
  background: #fff;
  border-radius: 18px;
  padding: 14px;
  box-sizing: border-box;
}
.result__img {
  width: 100%;
  border-radius: 10px;
  display: block;
}
.result__tip {
  display: block;
  text-align: center;
  font-size: 12px;
  color: #8A7F72;
  margin: 12px 0 4px;
}
.result__row {
  display: flex;
  gap: 10px;
  margin-top: 8px;
}
.rbtn {
  flex: 1;
  padding: 11px;
  border-radius: 12px;
  border: none;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;
}
.rbtn::after {
  border: none;
}
.rbtn--ghost {
  background: #EFE9DF;
  color: #5A4F42;
}
.rbtn--main {
  background: #B3282D;
  color: #fff;
}
.rbtn--link {
  margin-top: 10px;
  background: transparent;
  color: #8A7F72;
  font-weight: 400;
  font-size: 13px;
}

/* 小程序离屏画布：推到屏幕外，不参与布局、不吃点击 */
.card-canvas {
  position: fixed;
  left: -2000px;
  top: 0;
  pointer-events: none;
  z-index: -1;
}
</style>
