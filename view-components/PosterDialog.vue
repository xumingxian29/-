<template>
  <view v-if="visible" class="mask" @click="close">
    <view class="dialog" :style="vars" @click.stop>
      <!-- #ifdef MP-WEIXIN -->
      <canvas type="2d" id="posterCanvas" class="canvas-hidden"></canvas>
      <!-- #endif -->

      <view v-if="loading" class="hint">正在生成海报…</view>
      <image
        v-else-if="imgSrc"
        class="poster"
        :src="imgSrc"
        mode="widthFix"
        :show-menu-by-longpress="true"
      />
      <view v-else class="hint">{{ err || '海报生成失败' }}</view>

      <view class="actions">
        <button class="btn btn--ghost" @click="close">关闭</button>
        <button class="btn btn--primary" @click="save">{{ saveText }}</button>
      </view>
      <text class="tip">{{ theme.copy.savedTip }}</text>
    </view>
  </view>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { makePoster } from '@/core/poster'
import { tokensToVars } from '@/utils/style'
import { track, EVENTS } from '@/api/track'

// #ifdef MP-WEIXIN
import { saveImage } from '@/core/poster/poster.mp'
// #endif

const props = defineProps({
  visible: { type: Boolean, default: false },
  theme: { type: Object, required: true },
  node: { type: Object, default: null },
  total: { type: Number, default: 0 },
  rank: { type: Number, default: null }
})
const emit = defineEmits(['close'])

const loading = ref(false)
const imgSrc = ref('')
const err = ref('')

const vars = computed(() => tokensToVars(props.theme.tokens))
const saveText = computed(() => {
  // #ifdef MP-WEIXIN
  return '保存到相册'
  // #endif
  // #ifndef MP-WEIXIN
  return '长按上图保存'
  // #endif
})

watch(
  () => props.visible,
  async (v) => {
    if (!v) return
    imgSrc.value = ''
    err.value = ''
    await generate()
  }
)

async function generate() {
  if (!props.node) {
    err.value = '还没有你的节点'
    return
  }
  loading.value = true
  try {
    const res = await makePoster({
      theme: props.theme,
      node: props.node,
      total: props.total,
      rank: props.rank
    })
    imgSrc.value = res.dataUrl || res.tempFilePath || ''
    track(EVENTS.POSTER_MAKE)
  } catch (e) {
    err.value = e && e.message ? e.message : '海报生成失败'
  } finally {
    loading.value = false
  }
}

async function save() {
  // #ifdef MP-WEIXIN
  if (!imgSrc.value) return
  try {
    await saveImage(imgSrc.value)
    uni.showToast({ title: '已保存到相册', icon: 'none' })
  } catch (e) {
    uni.showToast({ title: e.message || '保存失败', icon: 'none' })
  }
  // #endif

  // #ifndef MP-WEIXIN
  uni.showToast({ title: '长按图片即可保存或转发', icon: 'none' })
  // #endif
}

function close() {
  emit('close')
}
</script>

<style scoped>
.mask {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  background: rgba(0, 0, 0, 0.72);
  z-index: 950;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.dialog {
  width: 100%;
  max-width: 340px;
  background: var(--ft-card);
  border-radius: 18px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  border: 1px solid var(--ft-accent-soft);
}

.poster {
  width: 100%;
  border-radius: 12px;
  display: block;
}

.canvas-hidden {
  position: fixed;
  left: -9999px;
  top: -9999px;
  width: 375px;
  height: 500px;
}

.hint {
  padding: 60px 0;
  font-size: 13px;
  color: var(--ft-text-sub);
}

.actions {
  display: flex;
  gap: 10px;
  width: 100%;
  margin-top: 14px;
}

.btn {
  flex: 1;
  height: 42px;
  line-height: 42px;
  border-radius: 21px;
  font-size: 14px;
  font-weight: 600;
  border: none;
}

.btn--ghost {
  background: rgba(255, 255, 255, 0.1);
  color: var(--ft-text);
}

.btn--primary {
  background: var(--ft-accent);
  color: #2b1a17;
}

.tip {
  margin-top: 10px;
  font-size: 11px;
  color: var(--ft-text-sub);
}
</style>
