<template>
  <view class="page" :style="vars">
    <view class="hd">
      <view class="hd__txt">
        <text class="hd__title">{{ card.copy.title }}</text>
        <text class="hd__sub">{{ card.copy.sub }}</text>
      </view>
      <!-- 音乐开关：默认开着，曲目是《圣诞快乐》。小程序没配音频源时整块不显示 -->
      <view v-if="musicSupported" class="music" :class="{ 'music--on': musicPlaying }" @click="toggleMusic">
        <view class="music__bars">
          <text class="music__bar"></text>
          <text class="music__bar"></text>
          <text class="music__bar"></text>
        </view>
        <text class="music__txt">{{ musicPlaying ? card.copy.musicOn : card.copy.musicOff }}</text>
      </view>
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

    <!-- 第三步：署名。名字只画进图里 —— 不进链接、不落盘，所以两个框都可以空着 -->
    <view class="sec">
      <view class="sec__hd">
        <text class="sec__title">{{ card.copy.nameHeading }}</text>
        <text class="sec__hint">{{ card.copy.nameHint }}</text>
      </view>

      <view class="fields">
        <view class="field">
          <text class="field__label">{{ card.copy.toLabel }}</text>
          <input
            class="field__input"
            type="text"
            :value="toDraft"
            :maxlength="maxNameLen"
            :placeholder="card.copy.toPlaceholder"
            placeholder-class="field__ph"
            @input="onToInput"
            @blur="onNameBlur"
            @confirm="onNameBlur"
          />
        </view>
        <view class="field">
          <text class="field__label">{{ card.copy.fromLabel }}</text>
          <input
            class="field__input"
            type="text"
            :value="fromDraft"
            :maxlength="maxNameLen"
            :placeholder="card.copy.fromPlaceholder"
            placeholder-class="field__ph"
            @input="onFromInput"
            @blur="onNameBlur"
            @confirm="onNameBlur"
          />
        </view>
      </view>

      <text v-if="nameError" class="nameerr">{{ nameError }}</text>
      <text v-else class="nametip">{{ signPreview }}</text>
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
        <!-- 名字不进链接，所以发链接对方看不到名字 —— 有名字时必须说清楚 -->
        <text v-if="hasName" class="result__notice">{{ card.copy.shareNameTip }}</text>
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
  CARD_MUSIC,
  MAX_NAME_LEN,
  pickCardTheme,
  createState,
  loadState,
  saveState,
  reroll,
  nextWish,
  resolveSelection,
  sanitizeName,
  renderCardBlob,
  downloadBlob,
  releaseUrl,
  isWechatIOS,
  encodeSeed,
  buildCardShareUrl,
  parseCardEntry,
  shareCard,
  createMusic
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

/**
 * 输入框草稿，刻意与 state 分开
 *
 * 因为"用户正在打的字"和"能画进图的字"不是一回事：
 * 打到一半的"张电话138…"必须留在框里让用户改，但绝不能进 state。
 * 合成一个字段就会在"拒绝非法输入"时把用户正在打的内容清空。
 */
const toDraft = ref('')
const fromDraft = ref('')
const nameError = ref('')

/** 名字长度上限，与清洗闸同一个来源，不在页面里写死 */
const maxNameLen = MAX_NAME_LEN

/* ---------------- 背景音乐 ---------------- */

/**
 * 「想播」和「真在响」是两件事，必须分开存
 *
 * 浏览器的自动播放策略：没有用户手势，AudioContext 建出来就是 suspended。
 * 所以默认状态是 musicPlaying=false 但"想播"—— 页面先尝试一次，
 * 被拦下就等第一次触摸接上，用户看到的是"点了就响"，而不是一个假装在响的喇叭。
 */
const musicSupported = ref(false)
const musicPlaying = ref(false)
let music = null

function musicConfig() {
  return card.music || CARD_MUSIC
}

function ensureMusic() {
  if (music) return music
  const cfg = musicConfig()
  if (cfg.enabled === false) return null
  music = createMusic({
    tempo: cfg.tempo,
    volume: cfg.volume,
    src: cfg.src,
    /**
     * 状态以回调为准，而不是 start() 的返回值：
     * 浏览器要等用户手势，AudioContext 的 resume 是异步的，
     * start() 当场只能回答"我试了"，回答不了"现在响没响"。
     */
    onChange: (on) => {
      musicPlaying.value = !!on
    }
  })
  musicSupported.value = !!(music && music.supported)
  return music.supported ? music : null
}

function startMusic() {
  const m = ensureMusic()
  if (!m) return false
  return m.start()
}

function stopMusic() {
  if (music) music.stop()
  musicPlaying.value = false
}

function toggleMusic() {
  if (musicPlaying.value) stopMusic()
  else startMusic()
}

// #ifdef H5
/**
 * 等第一次手势
 *
 * 三个事件都挂：手机上一般只有 touchstart，桌面上是 pointerdown 或 keydown。
 * capture 阶段监听，保证在页面里任何按钮的点击之前就接上。
 */
function armMusicGesture() {
  const kick = () => {
    document.removeEventListener('pointerdown', kick, true)
    document.removeEventListener('touchstart', kick, true)
    document.removeEventListener('keydown', kick, true)
    if (!musicPlaying.value) startMusic()
  }
  document.addEventListener('pointerdown', kick, true)
  document.addEventListener('touchstart', kick, true)
  document.addEventListener('keydown', kick, true)
}
// #endif

const stepLabels = computed(() => [
  card.copy.stepArt,
  card.copy.stepWord,
  card.copy.stepName,
  card.copy.stepGen
])

/** 有名字才需要提醒"链接里看不到名字" */
const hasName = computed(() => !!(state.value.toName || state.value.fromName))

/** 署名文案的即时预览：用户不用等重绘就知道图里会写什么 */
const signPreview = computed(() => {
  const { toName, fromName } = state.value
  const fill = (tpl, n) => String(tpl || '').split('{name}').join(n)
  const sign = fromName ? fill(card.copy.signTemplate, fromName) : card.copy.signAnon
  return toName
    ? `图里会写：${fill(card.copy.toTemplate, toName)} · ${sign}`
    : `图里会写：${sign}`
})

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
  path: shareUrl(),
  imageUrl: resultUrl.value || previewUrl.value || ''
}))

onShareTimeline(() => ({
  title: card.copy.title,
  // 查询串从同一条链接里切出来，避免两处各拼一次、早晚拼不一样
  query: shareQuery(),
  imageUrl: resultUrl.value || previewUrl.value || ''
}))
// #endif

/**
 * 分享链接：画面种子、祝福种子、钉住的句子一次带全
 *
 * 三个参数少一个，朋友点开看到的就是"另一张卡"，而不是"同一张"。
 */
function shareUrl() {
  return buildCardShareUrl({
    seed: state.value.seed,
    wishSeed: state.value.wishSeed,
    wishIndex: pinnedWishIndex()
  })
}

function shareQuery() {
  const url = shareUrl()
  const at = url.indexOf('?')
  return at >= 0 ? url.slice(at + 1) : ''
}

/** 祝福语被「换一句」钉住过才需要进链接；null 表示由 wishSeed 决定，不用带 */
function pinnedWishIndex() {
  const i = state.value.presetIndex
  return Number.isInteger(i) && i >= 0 ? i : undefined
}

onLoad((options) => {
  const entry = parseCardEntry(options || {})
  let next = loadState(card)

  /**
   * 分享链接里带了 seed 就用它 —— 朋友点开看到的是同一张。
   * 祝福语种子必须同时定下来：没带 ws 的旧链接，按"wishSeed = s"还原，
   * 这正是旧版的行为，老链接不会突然换一句话。
   */
  if (entry.seed) {
    next = {
      ...next,
      seed: entry.seed,
      wishSeed: entry.wishSeed != null ? entry.wishSeed : entry.seed,
      presetIndex: null
    }
  }
  // 被「换一句」钉住过的，w 的优先级高于 ws
  if (entry.wishIndex != null) next = { ...next, presetIndex: entry.wishIndex }

  state.value = next
  saveState(next)
  // 名字不落盘，正常情况下是空的；旧存储里若残留也不算数，仍走同一道归一
  toDraft.value = next.toName || ''
  fromDraft.value = next.fromName || ''
  syncShare()
})

/**
 * 首屏就要出图，所以放在 onReady：
 * 小程序端 selectQuery 必须等节点渲染完才能拿到 canvas
 */
onReady(() => {
  renderPreview()

  // #ifdef H5
  // 默认就播：先试着起一次（少数域名允许自动播放），拦下就等第一次手势
  if (musicConfig().enabled !== false) {
    ensureMusic()
    startMusic()
    armMusicGesture()
  }
  // #endif
})

onUnload(() => {
  if (nameTimer) clearTimeout(nameTimer)
  if (music) {
    music.dispose()
    music = null
  }
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
    const { template, wish, greeting, footer } = resolveSelection(state.value, card)
    const res = await renderCardBlob({
      width: CARD_CANVAS.width,
      height: CARD_CANVAS.height,
      template,
      wish,
      greeting,
      footer,
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

/**
 * 换一张：只换画面
 *
 * reroll 只动 seed，wishSeed 与 presetIndex 原样保留 ——
 * 这张卡的祝福语在"换一张"之后必须还是同一句，用户是这么理解的。
 */
function onReroll() {
  if (drawing.value || busy.value) return
  state.value = reroll(state.value)
  saveState(state.value)
  renderPreview()
}

/**
 * 换一句：只换文案
 *
 * 不碰 seed，所以画面一格都不动。这里重绘是必须的 ——
 * 祝福语印在图上，不重画就会出现"页面写着 A、图里印着 B"。
 */
function onNextWish() {
  if (drawing.value || busy.value) return
  state.value = nextWish(state.value, card)
  saveState(state.value)
  step.value = Math.max(step.value, 2)
  renderPreview()
}

/* ---------------- 署名输入 ---------------- */

let nameTimer = null
/** 上一次弹过的错误文案：同一个原因只 toast 一次，否则用户改字时会被连弹 */
let lastErrToast = ''

/** reason → 提示文案。文案在 theme 里，改字不用动这里 */
function errText(reason) {
  if (!reason) return ''
  if (reason === 'too-long') return card.copy.nameErrLong
  if (reason === 'bad-char') return card.copy.nameErrChar
  if (reason.indexOf('privacy') === 0) return card.copy.nameErrPrivacy
  return card.copy.nameErrFlag
}

/**
 * 提交一个字段
 *
 * 失败时**不写 state、不清输入框**：用户正在打的内容要留在框里让他改，
 * 画布保持上一次合法值。这一点和祝福语的 sanitizeText 正好相反 ——
 * 祝福语被替换成兜底句用户看不出来，名字被替换成"圣诞快乐"是荒谬的。
 *
 * 刻意不在这里写 nameError：两个字段是一起提交的，
 * 若各自写同一个错误位，后一个成功就会把前一个的错误清掉（踩过）。
 * 错误由 commitNames 汇总后统一写。
 *
 * @returns {{ok:boolean, changed:boolean, error:string}}
 */
function commitName(which, value) {
  const res = sanitizeName(value)
  if (!res.ok) return { ok: false, changed: false, error: errText(res.reason) }

  const key = which === 'to' ? 'toName' : 'fromName'
  if (state.value[key] === res.text) return { ok: true, changed: false, error: '' }

  state.value = { ...state.value, [key]: res.text }
  return { ok: true, changed: true, error: '' }
}

function commitNames() {
  const a = commitName('to', toDraft.value)
  const b = commitName('from', fromDraft.value)

  // 先报收卡人再报署名：一次只提示一个问题，用户改起来有先后
  const err = !a.ok ? a.error : !b.ok ? b.error : ''
  nameError.value = err

  /**
   * 红字贴在输入框下面，而输入框常常正压在底部固定按钮上 ——
   * 只靠红字，用户会因为看不见而以为"没反应"。所以同一个错误再 toast 一次，
   * 但同一句只弹一次，否则边改边弹会烦人。
   */
  if (err && err !== lastErrToast) {
    lastErrToast = err
    uni.showToast({ title: err, icon: 'none' })
  } else if (!err) {
    lastErrToast = ''
  }

  if (a.changed || b.changed) {
    saveState(state.value)
    step.value = Math.max(step.value, 3)
    renderPreview()
  }
}

/**
 * 防抖 400ms
 *
 * 每按一个键就重绘整张 750×1000 太贵，小程序还要走 canvasToTempFilePath。
 * 400ms 的取舍：打字时不会每个字都触发；中文拼音组字的停顿一般也到不了 400ms，
 * 万一停住了，提交的是拼音（能过字符白名单），组字结束后会被正确的中文覆盖掉。
 */
function scheduleCommit() {
  if (nameTimer) clearTimeout(nameTimer)
  nameTimer = setTimeout(() => {
    nameTimer = null
    commitNames()
  }, 400)
}

function onToInput(e) {
  toDraft.value = e.detail.value
  scheduleCommit()
}

function onFromInput(e) {
  fromDraft.value = e.detail.value
  scheduleCommit()
}

function onNameBlur() {
  if (nameTimer) {
    clearTimeout(nameTimer)
    nameTimer = null
  }
  commitNames()
}

async function generate() {
  if (busy.value || drawing.value) return
  busy.value = true
  try {
    const { template, wish, greeting, footer } = resolveSelection(state.value, card)

    const res = await renderCardBlob({
      width: CARD_CANVAS.width,
      height: CARD_CANVAS.height,
      template,
      wish,
      greeting,
      footer,
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
  const url = shareUrl()
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
    link: shareUrl(),
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
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 20px 10px;
  /* 页面隐藏了系统导航栏（navigationStyle: custom），刘海屏要自己让出安全区 */
  padding-top: calc(16px + env(safe-area-inset-top));
}
.hd__txt {
  flex: 1;
  min-width: 0;
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

/* 音乐开关：默认在播，三根柱子随节奏起伏；静音时压扁、只留轮廓 */
.music {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 3px;
  padding: 6px 12px;
  border-radius: 99px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.16);
}
.music--on {
  border-color: var(--ft-accent);
  background: rgba(255, 255, 255, 0.12);
}
.music__bars {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 12px;
}
.music__bar {
  width: 2px;
  height: 4px;
  border-radius: 1px;
  background: var(--ft-text-sub);
}
.music--on .music__bar {
  background: var(--ft-accent);
  animation: music-beat 1.1s ease-in-out infinite;
}
.music--on .music__bar:nth-child(2) {
  animation-delay: 0.18s;
}
.music--on .music__bar:nth-child(3) {
  animation-delay: 0.36s;
}
@keyframes music-beat {
  0%,
  100% {
    height: 4px;
  }
  50% {
    height: 12px;
  }
}
.music__txt {
  font-size: 11px;
  color: var(--ft-text-sub);
}
.music--on .music__txt {
  color: var(--ft-text);
  font-weight: 600;
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

/* 署名输入：两个字段竖排，标签在左、输入区占满剩余宽度 */
.fields {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.field {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 46px;
  padding: 0 14px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-sizing: border-box;
}
.field__label {
  flex: 0 0 auto;
  font-size: 12px;
  color: var(--ft-text-sub);
}
.field__input {
  flex: 1;
  min-width: 0;
  height: 46px;
  font-size: 15px;
  color: var(--ft-text);
  /* uni 的 input 在 H5 带白色内置背景，不覆盖会在深色页面上开个白窗 */
  background: transparent;
  border: none;
  outline: none;
}
.field__ph {
  font-size: 13px;
  color: var(--ft-text-sub);
  opacity: 0.75;
}
.nametip {
  display: block;
  margin-top: 8px;
  font-size: 11px;
  line-height: 1.6;
  color: var(--ft-text-sub);
}
.nameerr {
  display: block;
  margin-top: 8px;
  font-size: 11px;
  line-height: 1.6;
  color: #FFB3A7;
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
/* 弹层是白底，提示得用浅色块，否则和 tip 混成一段 */
.result__notice {
  display: block;
  font-size: 11px;
  line-height: 1.6;
  color: #A0503A;
  background: #FBEFE9;
  border-radius: 8px;
  padding: 8px 10px;
  margin: 6px 0 2px;
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
