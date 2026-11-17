<template>
  <view class="stage" :style="stageStyle">
    <view class="stage__sky"></view>
    <view class="stage__ground"></view>

    <!-- 树：用 border 三角形绘制，H5 与小程序表现一致（不用 svg，小程序不支持） -->
    <view class="tree">
      <text class="tree__star">★</text>
      <view
        v-for="(t, i) in tiers"
        :key="i"
        class="tier"
        :class="{ 'tier--dark': i === 2 }"
        :style="t"
      ></view>
      <view class="trunk" :style="trunkStyle"></view>
    </view>

    <FtAvatarPin
      v-for="item in items"
      :key="item.node.id"
      :item="item"
      :size="pinSize"
      @select="$emit('select', $event)"
    />

    <view v-if="!items.length" class="stage__empty">
      <text>{{ theme.copy.rankEmpty }}</text>
    </view>
  </view>
</template>

<script setup>
import { computed, getCurrentInstance, onMounted, ref } from 'vue'
import { tokensToVars } from '@/utils/style'

const props = defineProps({
  theme: { type: Object, required: true },
  items: { type: Array, default: () => [] }
})
defineEmits(['select'])

const instance = getCurrentInstance()
const width = ref(0)

onMounted(() => {
  const query = uni.createSelectorQuery().in(instance.proxy)
  query
    .select('.stage')
    .boundingClientRect((rect) => {
      if (rect && rect.width) width.value = rect.width
    })
    .exec()
})

const height = computed(() => {
  const ratio = props.theme.layout.canvasRatio || 1.3
  return width.value ? Math.round(width.value * ratio) : 0
})

const pinSize = computed(() => Math.max(34, Math.round(width.value * 0.085)))

const stageStyle = computed(() => ({
  ...tokensToVars(props.theme.tokens),
  height: height.value ? height.value + 'px' : '70vh'
}))

const tiers = computed(() => {
  const W = width.value || 375
  const H = height.value || 495
  const pts = [
    { apex: 0.17, base: 0.43, half: 0.24 },
    { apex: 0.3, base: 0.59, half: 0.32 },
    { apex: 0.43, base: 0.77, half: 0.4 }
  ]
  return pts.map((t, i) => {
    const halfW = W * t.half
    const h = (t.base - t.apex) * H
    return {
      borderLeftWidth: halfW + 'px',
      borderRightWidth: halfW + 'px',
      borderBottomWidth: h + 'px',
      left: W / 2 - halfW + 'px',
      top: t.apex * H + 'px',
      zIndex: 10 + i
    }
  })
})

const trunkStyle = computed(() => {
  const W = width.value || 375
  const H = height.value || 495
  return {
    width: Math.round(W * 0.075) + 'px',
    height: Math.round(H * 0.1) + 'px',
    left: W / 2 - Math.round(W * 0.0375) + 'px',
    top: Math.round(H * 0.74) + 'px'
  }
})
</script>

<style scoped>
.stage {
  position: relative;
  width: 100%;
  overflow: hidden;
  background: linear-gradient(180deg, var(--ft-bg-top), var(--ft-bg));
}

.stage__sky {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 70%;
  background: radial-gradient(circle at 50% 32%, var(--ft-accent-soft), transparent 62%);
}

.stage__ground {
  position: absolute;
  left: -10%;
  right: -10%;
  bottom: -6%;
  height: 26%;
  border-radius: 50% 50% 0 0;
  background: rgba(255, 255, 255, 0.06);
}

.tree {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
}

.tree__star {
  position: absolute;
  left: 50%;
  top: 13.2%;
  transform: translate(-50%, -50%);
  font-size: 26px;
  line-height: 1;
  color: var(--ft-accent);
  z-index: 20;
}

.tier {
  position: absolute;
  width: 0;
  height: 0;
  border-left-style: solid;
  border-left-color: transparent;
  border-right-style: solid;
  border-right-color: transparent;
  border-bottom-style: solid;
  border-bottom-color: var(--ft-tree);
}

.tier--dark {
  border-bottom-color: var(--ft-tree-dark);
}

.trunk {
  position: absolute;
  background: var(--ft-tree-dark);
  border-radius: 6px;
  z-index: 9;
}

.stage__empty {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 12%;
  text-align: center;
  font-size: 13px;
  color: var(--ft-text-sub);
}
</style>
