/**
 * 新年许愿树主题（G2 预置）
 * 与圣诞版共用同一套组件与槽位算法，只换配置——这就是"技术复用 70%"的落点
 */

import christmas from './christmas'

export default {
  ...christmas,
  id: 'newyear',
  version: 1,

  meta: {
    treeId: 'newyear',
    title: '新年许愿树',
    subtitle: '写下新年目标，看有多少人陪你',
    startAt: '2027-01-18',
    endAt: '2027-02-12',
    shareTitle: '我把新年愿望挂上了这棵树',
    sharePath: '/pages/join/join?treeId=newyear&inviter={uid}'
  },

  layout: {
    ...christmas.layout,
    canvasRatio: 1.28,
    treeAnchor: { x: 0.5, y: 0.88 }
  },

  assets: {
    ...christmas.assets,
    base: '/static/themes/newyear/'
  },

  tokens: {
    ...christmas.tokens,
    colorBg: '#3A0C13',
    colorBgTop: '#5A1119',
    colorTree: '#7C1D2B',
    colorTreeDark: '#5E131F',
    colorPrimary: '#5A1119',
    colorAccent: '#F0C75E',
    colorAccentSoft: 'rgba(240, 199, 94, 0.22)',
    colorText: '#FFF6E8',
    colorTextSub: 'rgba(255, 246, 232, 0.7)',
    colorPinRing: '#F0C75E',
    colorCard: 'rgba(58, 12, 19, 0.86)'
  },

  copy: {
    ...christmas.copy,
    homeTitle: '新年许愿树',
    homeSub: '已有 {n} 个愿望挂上树',
    joinCta: '挂上我的愿望',
    alreadyCta: '我的愿望已在树上',
    wishPlaceholder: '写一句新年愿望（30 字内）',
    blessCta: '为他祝福',
    blessedCta: '已祝福',
    rankTitle: '祝福墙',
    rankEmpty: '还没有人挂愿望，来当第一个',
    posterTitle: '我的新年愿望挂上了树',
    posterSubtitle: '来写下你的，看有多少人陪你',
    localModeTip: '体验版：数据只存在本机，换设备看不到别人的愿望'
  },

  // 贺卡线（18 号块）本主题暂不提供 card 段：card-line/theme.js 会回退到 christmas.card。
  // 新年档要做贺卡时，在这里补一份同结构的 card 段即可，页面与绘制层不用改。
  rules: {
    ...christmas.rules,
    // 春节档：按"被祝福次数"排序，且不设邀请解锁门槛
    sortMode: 'bless',
    allowInviteRank: false,
    showInviteCount: false,
    needReview: true
  }
}
