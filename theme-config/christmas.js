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
   * 贺卡线（pages/card）
   * 与许愿树是两条独立产品线，共用本主题的 tokens / 节日定位。
   * 视觉参数全部在这里，src/card/* 只负责按这些参数画，不允许出现颜色字面量。
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
      sub: '抽一张可爱画面、选句祝福，30 秒存进相册',
      stepArt: '随机造型',
      stepWord: '选祝福',
      stepGen: '生成',
      artHeading: '随机造型',
      artHint: '点「换一张」抽一张新的，画面全是画出来的',
      rerollCta: '换一张',
      drawingTip: '正在画…',
      drawFail: '没画出来，再试一次',
      wordHeading: '选句祝福',
      wordHint: '都是现成的，一个字都不用打',
      genCta: '生成我的贺卡',
      againCta: '再做一张',
      saveCta: '保存图片',
      shareCta: '分享给朋友',
      saveTip: '长按图片即可保存到相册',
      saveTipMp: '点下面「保存图片」直接存进相册',
      savedTip: '已保存，去相册看看',
      saveUnsupported: '当前浏览器不支持直接下载，请长按图片保存',
      saveFail: '保存失败，请长按图片保存',
      shareCopied: '链接已复制，去粘贴给朋友',
      heroTitle: '圣诞快乐',
      footer: '来自一位朋友的圣诞贺卡 · 2026',
      footnote: '画面全是几何图形 · 不含任何人名、地名、国旗国徽',
      points: [
        '图片在你的手机里生成，不会上传到任何服务器',
        '不填昵称、不上传头像，图里不会有你的任何信息',
        '每次换一张都是新的；分享链接会带上这张的编号，朋友点开看到同一张'
      ],
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
    /**
     * 背景上的文字色
     *
     * 随机配色里有一半是浅背景，写死白色标题会直接看不见（这条是实测踩到的）。
     * 所以文字色跟着 bgTone 走：深背景用白字，浅背景用深褐字。
     * 故意把三档透明度分开配，不靠 rgba 算 —— 主题文件应该是"抄了就能用"的。
     */
    text: {
      onDark: {
        title: '#FFFFFF',
        tag: 'rgba(255,255,255,0.80)',
        footer: 'rgba(255,255,255,0.62)'
      },
      onLight: {
        title: '#2B2118',
        tag: 'rgba(43,33,24,0.58)',
        footer: 'rgba(43,33,24,0.45)'
      }
    },

    /**
     * 配色池：随机造型的第一维
     *
     * bgTone 不是"背景色深浅"的描述，而是给角色选择用的：
     * light（浅背景）只会抽到深色主体角色，dark（深背景）只会抽到浅色主体角色。
     * 少了这个字段，白雪人就会画在奶油色背景上，整只消失。
     */
    palettes: [
      {
        id: 'candy',
        name: '糖果粉',
        bgTone: 'light',
        bg: ['#FBD3E0', '#F2A2BE'],
        ink: '#5E1B36',
        white: '#FFFAFC',
        accent: '#D9385E',
        accent2: '#F2A03D',
        blush: 'rgba(206,60,100,0.32)',
        deco: 'rgba(255,255,255,0.78)'
      },
      {
        id: 'mint',
        name: '薄荷雪',
        bgTone: 'light',
        bg: ['#E4F7EF', '#A9DDC8'],
        ink: '#1B4C40',
        white: '#FFFFFF',
        accent: '#D94F63',
        accent2: '#E8A33C',
        blush: 'rgba(200,80,110,0.28)',
        deco: 'rgba(255,255,255,0.85)'
      },
      {
        id: 'cream',
        name: '奶油姜饼',
        bgTone: 'light',
        bg: ['#FFF3DF', '#F2D6A8'],
        ink: '#54351F',
        white: '#FFFBF3',
        accent: '#C9303A',
        accent2: '#D99A3C',
        blush: 'rgba(190,100,70,0.30)',
        deco: 'rgba(255,255,255,0.72)'
      },
      {
        id: 'frost',
        name: '霜白清晨',
        bgTone: 'light',
        bg: ['#EAF2FB', '#BCD8EF'],
        ink: '#22415E',
        white: '#FFFFFF',
        accent: '#D6455C',
        accent2: '#E8A33C',
        blush: 'rgba(190,85,115,0.26)',
        deco: 'rgba(255,255,255,0.9)'
      },
      {
        id: 'night',
        name: '午夜蓝',
        bgTone: 'dark',
        bg: ['#16204A', '#39467F'],
        ink: '#161B33',
        white: '#FFFFFF',
        accent: '#E24B5C',
        accent2: '#F2C14E',
        blush: 'rgba(245,150,165,0.38)',
        deco: 'rgba(255,255,255,0.74)'
      },
      {
        id: 'pine',
        name: '松林夜',
        bgTone: 'dark',
        bg: ['#0F3D2E', '#1E6B4A'],
        ink: '#10251C',
        white: '#FDFCF6',
        accent: '#E2483F',
        accent2: '#F0B429',
        blush: 'rgba(245,150,165,0.36)',
        deco: 'rgba(255,255,255,0.62)'
      },
      {
        id: 'berry',
        name: '莓果紫',
        bgTone: 'dark',
        bg: ['#2E1B47', '#5C3A80'],
        ink: '#221331',
        white: '#FFF9FF',
        accent: '#E8407A',
        accent2: '#F5C451',
        blush: 'rgba(250,150,180,0.40)',
        deco: 'rgba(255,255,255,0.70)'
      },
      {
        id: 'cocoa',
        name: '可可棕',
        bgTone: 'dark',
        bg: ['#4A2C21', '#7C4B34'],
        ink: '#2A1712',
        white: '#FFF6E8',
        accent: '#E2A03C',
        accent2: '#F2C14E',
        blush: 'rgba(245,170,150,0.36)',
        deco: 'rgba(255,235,200,0.58)'
      }
    ],

    /**
     * 角色池：随机造型的第二维
     *
     * fit 决定它能出现在哪种背景上：
     *   light  深色主体，只能放浅背景
     *   dark   浅色主体，只能放深背景
     *   any    深浅都行
     * tag 是印在卡片上的小标签，只用通用名词，绝不带人名地名。
     */
    mascots: [
      { id: 'snowman', name: '小雪人', tag: '雪地里的小雪人', fit: 'dark' },
      { id: 'bell', name: '金铃铛', tag: '叮当响的铃铛', fit: 'dark' },
      { id: 'star', name: '小星星', tag: '会笑的小星星', fit: 'dark' },
      { id: 'penguin', name: '小企鹅', tag: '戴围巾的小企鹅', fit: 'light' },
      { id: 'gingerbread', name: '姜饼人', tag: '糖霜姜饼人', fit: 'light' },
      { id: 'bear', name: '小熊', tag: '戴圣诞帽的小熊', fit: 'light' },
      { id: 'wreath', name: '圣诞花环', tag: '挂门口的花环', fit: 'light' },
      { id: 'tree', name: '圣诞树', tag: '亮着灯的圣诞树', fit: 'light' },
      { id: 'deer', name: '红鼻麋鹿', tag: '红鼻子的麋鹿', fit: 'light' },
      { id: 'gift', name: '礼物盒', tag: '会笑的礼物盒', fit: 'any' },
      { id: 'sock', name: '圣诞袜', tag: '装满礼物的袜子', fit: 'any' }
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
