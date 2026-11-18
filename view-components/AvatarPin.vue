<template>
  <view class="pin" :style="pinStyle" @click.stop="$emit('select', item)">
    <!-- 旋转只作用在头像环上：徽标和"我"字跟着转就歪了 -->
    <view class="pin__rot" :style="rotStyle">
      <view class="pin__ring" :class="{ 'is-mine': item.node.mine }">
        <image
          v-if="showImg"
          class="pin__img"
          :src="item.node.avatarUrl"
          mode="aspectFill"
          @error="showImg = false"
        />
        <view v-else class="pin__ph">{{ initial }}</view>
      </view>
    </view>

    <view v-if="item.node.mine" class="pin__me">我</view>

    <view v-if="item.node.blessCount > 0" class="pin__badge">
      {{ item.node.blessCount }}
    </view>
  </view>
</template>

<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  item: { type: Object, required: true },
  size: { type: Number, default: 40 }
})
defineEmits(['select'])

// 头像加载失败（临时链接过期 / 云存储 404）时退回首字占位，别留一个空圈
const showImg = ref(!!props.item.node.avatarUrl)
watch(
  () => props.item.node.avatarUrl,
  (v) => {
    showImg.value = !!v
  }
)

// Array.from 按码点取首字：slice(0,1) 会把 emoji 劈成半个代理对，显示成乱码方块
const initial = computed(() => Array.from(String(props.item.node.nickname || '?'))[0] || '?')

const pinStyle = computed(() => {
  const s = props.item.slot || { x: 0.5, y: 0.5, scale: 1, rotate: 0, layer: 3 }
  const d = Math.round(props.size * (s.scale || 1))
  return {
    left: s.x * 100 + '%',
    top: s.y * 100 + '%',
    width: d + 'px',
    height: d + 'px',
    zIndex: 100 + (s.layer || 3) + (props.item.node.mine ? 50 : 0)
  }
})

const rotStyle = computed(() => {
  const s = props.item.slot || {}
  return {
    transform: `translate(-50%, -50%) rotate(${s.rotate || 0}deg)`
  }
})
</script>

<style scoped>
.pin {
  position: absolute;
}

.pin__rot {
  width: 100%;
  height: 100%;
}

.pin__ring {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid var(--ft-ring);
  background: var(--ft-tree-dark);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
}

.pin__ring.is-mine {
  border-width: 3px;
  box-shadow: 0 0 0 3px var(--ft-accent-soft), 0 4px 12px rgba(0, 0, 0, 0.4);
}

.pin__img {
  width: 100%;
  height: 100%;
  display: block;
}

.pin__ph {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ft-text);
  font-size: 12px;
}

.pin__me {
  position: absolute;
  left: 50%;
  bottom: -16px;
  transform: translateX(-50%);
  font-size: 9px;
  line-height: 12px;
  padding: 0 4px;
  border-radius: 6px;
  background: var(--ft-accent);
  /* 深色主题下 accent 可能偏暗，颜色必须能被主题覆盖，不能写死 */
  color: var(--ft-on-accent, #2b1a17);
  white-space: nowrap;
}

.pin__badge {
  position: absolute;
  right: -4px;
  top: -4px;
  min-width: 14px;
  height: 14px;
  padding: 0 3px;
  border-radius: 7px;
  background: var(--ft-accent);
  color: var(--ft-on-accent, #2b1a17);
  font-size: 9px;
  line-height: 14px;
  text-align: center;
}
</style>
