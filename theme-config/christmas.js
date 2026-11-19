/**
 * 圣诞主题（G0 主主题）
 * 所有视觉、文案、规则都在这里，组件里不允许出现颜色字面量与中文文案
 */

/** 按行生成树形槽位：index 0 = 树顶（最高位），依次向下 */
function buildTreeSlots() {
  const rows = [
    { y: 0.205, count: 1, half: 0.03, scale: 0.72 },
    { y: 0.275, count: 2, half: 0.075, scale: 0.8 },
    { y: 0.345, count: 3, half: 0.12, scale: 0.86 },
    { y: 0.415, count: 4, half: 0.165, scale: 0.9 },
    { y: 0.485, count: 5, half: 0.205, scale: 0.94 },
    { y: 0.555, count: 6, half: 0.245, scale: 0.98 },
    { y: 0.625, count: 7, half: 0.285, scale: 1.0 },
    { y: 0.695, count: 8, half: 0.325, scale: 1.02 },
    { y: 0.765, count: 9, half: 0.36, scale: 1.04 }
  ]
  const slots = []
  rows.forEach((r) => {
    for (let i = 0; i < r.count; i++) {
      const t = r.count === 1 ? 0.5 : i / (r.count - 1)
      const x = 0.5 + (t - 0.5) * 2 * r.half
      slots.push({
        x: Number(x.toFixed(4)),
        y: r.y,
        scale: r.scale,
        rotate: 0,
        layer: 3
      })
    }
  })
  return slots
}

export default {
  id: 'christmas',
  version: 1,

  meta: {
    treeId: 'christmas',
    title: '圣诞树',
    subtitle: '把我挂上这棵树',
    startAt: '2026-12-01',
    endAt: '2026-12-26',
    shareTitle: '我把头像挂上了这棵圣诞树',
    sharePath: '/pages/join/join?treeId=christmas&inviter={uid}'
  },

  layout: {
    canvasRatio: 1.32, // 舞台高宽比
    treeAnchor: { x: 0.5, y: 0.9 },
    slots: buildTreeSlots(),
    slotFallback: 'grid',
    overflow: 'more'
  },

  assets: {
    // 占位素材：G0 阶段用 CSS 渐变与内联绘制代替，正式素材放这里
    base: '/static/themes/christmas/',
    bg: '',
    tree: '',
    treeTop: '',
    pin: '',
    defaultAvatar: '',
    posterBg: '',
    posterFrame: ''
  },

  tokens: {
    colorBg: '#08281D',
    colorBgTop: '#0B3D2E',
    colorTree: '#14543C',
    colorTreeDark: '#0E3F2C',
    colorPrimary: '#0B3D2E',
    colorAccent: '#E8B84B',
    colorAccentSoft: 'rgba(232, 184, 75, 0.22)',
    colorOnAccent: '#2B1A17',
    colorText: '#F5F3EC',
    colorTextSub: 'rgba(245, 243, 236, 0.68)',
    colorPinRing: '#E8B84B',
    colorCard: 'rgba(8, 40, 29, 0.86)',
    fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
    radius: '20rpx',
    shadow: '0 8rpx 24rpx rgba(0, 0, 0, 0.28)'
  },

  copy: {
    homeTitle: '圣诞树',
    homeSub: '已有 {n} 个朋友挂上了头像',
    joinCta: '挂上我的头像',
    alreadyCta: '我已在树上',
    wishPlaceholder: '写一句圣诞心情（30 字内）',
    wishMax: 30,
    nicknamePlaceholder: '你的昵称',
    blessCta: '送祝福',
    blessedCta: '已祝福',
    rankTitle: '谁在树的最高处',
    rankEmpty: '树上还没有人，来当第一个',
    shareTip: '复制链接，发给朋友接力',
    savedTip: '长按图片保存到相册',
    posterTitle: '我被挂上了这棵圣诞树',
    posterSubtitle: '来和我挂在一起',
    disclaimer: '本页面为个人创作，与微信官方无关',
    localModeTip: '体验版：数据只存在本机，换设备看不到别人的头像',
    topSlotLabel: '树顶'
  },

  /**
   * 贺卡线（18 号块 card-line）
   *
   * 与许愿树并列的第二条产品线：单人贺卡，零上传、零键盘、零账号，三步出图。
   * 与许愿树共用本主题的 tokens 与节日定位，但版式、文案、模板全部自成一套。
   *
   * 这里是贺卡视觉的唯一来源：18 号块的绘制层只按这些参数画，
   * 不允许出现颜色字面量。加一个模板只改 `templates`，页面与 CSS 零改动。
   */
  card: {
    canvas: { width: 750, height: 1000 },
    paper: {
      fill: 'rgba(255, 255, 255, 0.94)',
      ink: '#2B2118',
      radius: 28
    },
    copy: {
      title: '圣诞贺卡',
      sub: '选个模板、选句祝福，30 秒生成一张存进相册',
      stepTpl: '选模板',
      stepWord: '选祝福',
      stepGen: '生成',
      tplHeading: '选个模板',
      tplHint: '点一下就换，不用上传任何东西',
      wordHeading: '选句祝福',
      wordHint: '都是现成的，一个字都不用打',
      genCta: '生成我的贺卡',
      againCta: '再做一张',
      saveCta: '保存图片',
      shareCta: '分享给朋友',
      saveTip: '长按图片即可保存到相册',
      savedTip: '已保存，去相册看看',
      saveUnsupported: '当前浏览器不支持直接下载，请长按图片保存',
      saveFail: '保存失败，请长按图片保存',
      shareCopied: '链接已复制，去粘贴给朋友',
      heroTitle: '圣诞快乐',
      footer: '来自一位朋友的圣诞贺卡 · 2026',
      footnote: '全程零上传 · 零键盘 · 零账号',
      backCta: '回到许愿树'
    },
    presets: [
      '圣诞快乐，平安喜乐',
      '冬天很冷，你很暖',
      '愿你被这个世界温柔以待',
      '圣诞快乐，来年好运',
      '平安夜，记得吃苹果',
      'Merry Christmas，心想事成'
    ],
    templates: [
      {
        id: 'snow',
        name: '雪花夜',
        motif: 'snow',
        bg: ['#1A2A5E', '#2E4A9E'],
        ink: '#FFFFFF',
        accent: '#FFFFFF',
        deco: 'rgba(255, 255, 255, 0.72)',
        tag: '雪花夜'
      },
      {
        id: 'deer',
        name: '红鼻麋鹿',
        motif: 'deer',
        bg: ['#B3282D', '#7A1A1E'],
        // 深褐到近黑的头，才压得住深红背景；鼻子单独给亮红，不用装饰金
        ink: '#1F0B06',
        nose: '#E0353A',
        accent: '#F2C14E',
        deco: 'rgba(255, 215, 130, 0.62)',
        tag: '红鼻麋鹿'
      },
      {
        id: 'tree',
        name: '圣诞树下',
        motif: 'tree',
        bg: ['#14532D', '#1F7A3D'],
        ink: '#0A3220',
        accent: '#E8B84B',
        deco: 'rgba(255, 255, 255, 0.50)',
        tag: '圣诞树下'
      }
    ]
  },

  rules: {
    sortMode: 'invite', // 圣诞档历史机制：按邀请人数排位
    allowInviteRank: true,
    showInviteCount: false, // 展示层始终不显示邀请数，规避诱导分享
    needReview: false, // 本地模式不审核；云端模式由 rules.needReview 控制
    dailyBlessLimit: 20
  },

  ads: {
    enable: false, // 未开通流量主前保持关闭
    bannerId: '',
    interstitialId: '',
    rewardedId: '',
    intervalSec: 90
  },

  privacy: {
    contractVersion: '2026-01-01',
    requireGate: true
  }
}
