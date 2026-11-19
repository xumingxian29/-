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

    <view class="sec">
      <view class="sec__hd">
        <text class="sec__title">{{ card.copy.tplHeading }}</text>
        <text class="sec__hint">{{ card.copy.tplHint }}</text>
      </view>
      <view class="tpls">
        <view
          v-for="t in card.templates"
          :key="t.id"
          class="tpl"
          :class="{ 'tpl--on': t.id === state.templateId }"
          @click="onPickTpl(t.id)"
        >
          <view class="tpl__art" :style="{ background: 'linear-gradient(160deg,' + t.bg[0] + ',' + t.bg[1] + ')' }">
            <view class="tpl__ring" :style="{ borderColor: t.accent }"></view>
          </view>
          <text class="tpl__name">{{ t.name }}</text>
        </view>
      </view>
    </view>

    <view class="sec">
      <view class="sec__hd">
        <text class="sec__title">{{ card.copy.wordHeading }}</text>
        <text class="sec__hint">{{ card.copy.wordHint }}</text>
      </view>
      <view class="words">
        <text
          v-for="(w, i) in card.presets"
          :key="i"
          class="word"
          :class="{ 'word--on': i === state.presetIndex }"
          @click="onPickPreset(i)"
        >{{ w }}</text>
      </view>
    </view>

    <view class="footnote">
      <text>{{ card.copy.footnote }}</text>
    </view>

    <view class="bar">
      <button class="gen" :disabled="busy" @click="generate">
        {{ busy ? '生成中…' : card.copy.genCta }}
      </button>
    </view>

    <view v-if="resultUrl" class="mask" @click="closeResult">
      <view class="result" @click.stop>
        <image class="result__img" :src="resultUrl" mode="widthFix" />
        <text class="result__tip">{{ card.copy.saveTip }}</text>
        <view class="result__row">
          <button class="rbtn rbtn--ghost" @click="restart">{{ card.copy.againCta }}</button>
          <button class="rbtn rbtn--main" @click="saveImage">{{ card.copy.saveCta }}</button>
        </view>
        <button class="rbtn rbtn--link" @click="onShare">{{ card.copy.shareCta }}</button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onLoad, onUnload } from '@dcloudio/uni-app'
import { tokensToVars } from '@/utils/style'
import { setupShare } from '@/core/jssdk'
import {
  CARD_CANVAS,
  CARD_FILE_PREFIX,
  pickCardTheme,
  createState,
  loadState,
  saveState,
  selectTemplate,
  selectPreset,
  resolveSelection,
  renderCardBlob,
  downloadBlob,
  releaseUrl,
  isWechatIOS,
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
const busy = ref(false)
const resultUrl = ref('')
const resultBlob = ref(null)

const stepLabels = computed(() => [
  card.copy.stepTpl,
  card.copy.stepWord,
  card.copy.stepGen
])

onLoad((options) => {
  const entry = parseCardEntry(options || {})
  let next = loadState(card)
  if (entry.tpl) next = selectTemplate(next, card, entry.tpl)
  state.value = next
  saveState(next)
  syncShare()
})

onUnload(() => {
  releaseUrl(resultUrl.value)
})

function onPickTpl(id) {
  state.value = selectTemplate(state.value, card, id)
  saveState(state.value)
  step.value = Math.max(step.value, 1)
}

function onPickPreset(i) {
  state.value = selectPreset(state.value, card, i)
  saveState(state.value)
  step.value = Math.max(step.value, 2)
}

async function generate() {
  if (busy.value) return
  busy.value = true
  try {
    const { template, wish } = resolveSelection(state.value, card)
    if (!template) throw new Error('模板配置缺失')

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

function saveImage() {
  if (!resultBlob.value) return
  // 微信 + iOS 的 a[download] 基本无效，直接引导长按，避免"点了没反应"
  if (isWechatIOS()) {
    uni.showToast({ title: card.copy.saveUnsupported, icon: 'none' })
    return
  }
  const ok = downloadBlob(resultBlob.value, `${CARD_FILE_PREFIX}-${state.value.templateId}.png`)
  uni.showToast({ title: ok ? card.copy.savedTip : card.copy.saveUnsupported, icon: 'none' })
}

async function onShare() {
  const url = buildCardShareUrl({ templateId: state.value.templateId })
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
    link: buildCardShareUrl({ templateId: state.value.templateId }),
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

.tpls {
  /* 用 grid 严格三等分：flex 在父级宽度异常时会被内容撑开，grid 的 1fr 不会 */
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  width: 100%;
  box-sizing: border-box;
}
.tpl {
  width: auto;
  min-width: 0;
  box-sizing: border-box;
  border-radius: 14px;
  overflow: hidden;
  border: 2px solid transparent;
  background: rgba(255, 255, 255, 0.06);
}
.tpl--on {
  border-color: var(--ft-accent);
}
.tpl__art {
  height: 88px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.tpl__ring {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 2px solid #fff;
  opacity: 0.85;
}
.tpl__name {
  display: block;
  text-align: center;
  font-size: 12px;
  padding: 7px 0;
  color: var(--ft-text);
}

.words {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.word {
  padding: 8px 13px;
  border-radius: 99px;
  font-size: 13px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.14);
  color: var(--ft-text);
}
.word--on {
  background: var(--ft-accent);
  border-color: var(--ft-accent);
  color: #0B3D2E;
  font-weight: 700;
}

.footnote {
  padding: 18px 20px 0;
  text-align: center;
  font-size: 11px;
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
</style>
