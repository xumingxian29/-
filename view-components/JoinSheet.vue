<template>
  <view v-if="visible" class="mask" @click="onMask">
    <view class="sheet" :style="vars" @click.stop>
      <view class="sheet__handle"></view>
      <text class="sheet__title">{{ theme.copy.joinCta }}</text>
      <text class="sheet__sub">{{ theme.copy.wishPlaceholder }}</text>

      <view class="sheet__row">
        <view class="picker" @click="choose">
          <image v-if="avatarUrl" class="picker__img" :src="avatarUrl" mode="aspectFill" />
          <text v-else class="picker__plus">+</text>
        </view>
        <input
          v-model="nickname"
          class="sheet__input"
          :placeholder="theme.copy.nicknamePlaceholder"
          placeholder-class="ph"
          :maxlength="NICK_MAX"
        />
      </view>

      <textarea
        v-model="wish"
        class="sheet__textarea"
        :placeholder="theme.copy.wishPlaceholder"
        placeholder-class="ph"
        :maxlength="WISH_MAX"
      />
      <view class="sheet__count">{{ wishCount }}/{{ WISH_MAX }}</view>

      <view class="agree" @click="agreed = !agreed">
        <view class="agree__box" :class="{ 'is-on': agreed }"></view>
        <text class="agree__text">
          我已阅读并同意《隐私说明》，头像与昵称仅用于本页面展示
        </text>
      </view>

      <button class="btn" :disabled="submitting" @click="submit">
        {{ submitting ? '提交中…' : '挂上去' }}
      </button>
    </view>
  </view>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { pickAvatar } from '@/core/image'
import { requirePrivacyAuthorize } from '@/core/privacy'
import { submitJoin } from '@/api/tree'
import { track, EVENTS } from '@/api/track'
import { tokensToVars } from '@/utils/style'
import { WISH_MAX, NICK_MAX } from '@/core/limits'

const props = defineProps({
  visible: { type: Boolean, default: false },
  theme: { type: Object, required: true },
  inviter: { type: String, default: '' },
  initialNickname: { type: String, default: '' }
})
const emit = defineEmits(['close', 'success'])

const avatar = ref(null)
const avatarUrl = ref('')
const nickname = ref('')
const wish = ref('')
const agreed = ref(false)
const submitting = ref(false)

const vars = computed(() => tokensToVars(props.theme.tokens))

// 按码点计数：emoji 记 1 个，与云端 Array.from 口径一致（wish.length 会算 2）
const wishCount = computed(() => Array.from(wish.value || '').length)

watch(
  () => props.visible,
  (v) => {
    if (v && !nickname.value) nickname.value = props.initialNickname || ''
  }
)

function toast(title) {
  uni.showToast({ title, icon: 'none' })
}

async function choose() {
  try {
    const picked = await pickAvatar()
    avatar.value = picked
    avatarUrl.value = picked.dataUrl || picked.path
  } catch (e) {
    // 用户取消选择，不提示
  }
}

function onMask() {
  if (!submitting.value) emit('close')
}

async function submit() {
  if (submitting.value) return
  if (!wish.value.trim()) return toast('写一句心愿再挂上去吧')
  if (!agreed.value) return toast('请先勾选隐私说明')

  submitting.value = true
  try {
    const ok = await requirePrivacyAuthorize()
    if (!ok) {
      toast('需要授权后才能挂上头像')
      return
    }
    const res = await submitJoin({
      avatar: avatar.value,
      wish: wish.value,
      nickname: nickname.value,
      inviter: props.inviter
    })
    track(EVENTS.JOIN_SUCCESS, { hasAvatar: !!avatarUrl.value })
    emit('success', res.node)
    emit('close')
  } catch (e) {
    toast(e && e.message ? e.message : '提交失败，请稍后重试')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.mask {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  background: rgba(0, 0, 0, 0.55);
  z-index: 900;
  display: flex;
  align-items: flex-end;
}

.sheet {
  width: 100%;
  background: linear-gradient(180deg, var(--ft-card), var(--ft-bg));
  border-radius: 24px 24px 0 0;
  padding: 12px 20px calc(20px + env(safe-area-inset-bottom));
  color: var(--ft-text);
  border-top: 1px solid var(--ft-accent-soft);
}

.sheet__handle {
  width: 40px;
  height: 4px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.22);
  margin: 0 auto 14px;
}

.sheet__title {
  display: block;
  font-size: 18px;
  font-weight: 700;
}

.sheet__sub {
  display: block;
  margin-top: 6px;
  font-size: 12px;
  color: var(--ft-text-sub);
}

.sheet__row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
}

.picker {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: 1px dashed var(--ft-ring);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex: none;
}

.picker__img {
  width: 100%;
  height: 100%;
}

.picker__plus {
  font-size: 22px;
  color: var(--ft-ring);
}

.sheet__input {
  flex: 1;
  height: 44px;
  padding: 0 12px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.08);
  font-size: 14px;
  color: var(--ft-text);
}

.sheet__textarea {
  width: 100%;
  height: 88px;
  margin-top: 12px;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.08);
  font-size: 14px;
  color: var(--ft-text);
  box-sizing: border-box;
}

.sheet__count {
  text-align: right;
  font-size: 11px;
  color: var(--ft-text-sub);
  margin-top: 6px;
}

.agree {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin: 10px 0 16px;
}

.agree__box {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  border: 1px solid var(--ft-ring);
  flex: none;
  margin-top: 2px;
}

.agree__box.is-on {
  background: var(--ft-accent);
  border-color: var(--ft-accent);
}

.agree__text {
  font-size: 11px;
  line-height: 1.5;
  color: var(--ft-text-sub);
}

.btn {
  width: 100%;
  height: 46px;
  line-height: 46px;
  border-radius: 23px;
  background: var(--ft-accent);
  color: #2b1a17;
  font-size: 16px;
  font-weight: 700;
  border: none;
}

.btn[disabled] {
  opacity: 0.6;
}

.ph {
  color: rgba(245, 243, 236, 0.4);
}
</style>
