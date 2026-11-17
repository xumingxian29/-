/**
 * G0 演示数据：20 个节点
 * 头像全部用内联 SVG 生成，不依赖网络与第三方素材（合规要求：不用原页面美术）
 */

import { makeFallbackAvatar } from '../image'

const SEED = [
  ['阿朴', '希望今年能顺利毕业', '#2F6B52'],
  ['小满', '愿家人身体健康', '#3C6E8F'],
  ['Lemon', '想去看一次雪', '#7A5AA8'],
  ['老陈', '少加班，多睡觉', '#A7563C'],
  ['柚子', '考研上岸', '#2E7D6B'],
  ['阿七', '把想做的事做完', '#8A6A3B'],
  ['Momo', '希望被温柔对待', '#4C5F8A'],
  ['林一', '攒够一万块', '#5C7A3B'],
  ['小鹿', '想和喜欢的人一起跨年', '#A65C7A'],
  ['大熊', '身体好，心情好', '#3B6E6E'],
  ['橙子', '顺利找到实习', '#B06B2F'],
  ['Nina', '今年要早睡', '#6A5C8A'],
  ['阿福', '家人平安顺遂', '#2F6B52'],
  ['廿廿', '学会做一桌菜', '#7A6A3B'],
  ['子非', '把房间收拾干净', '#3C6E8F'],
  ['小舟', '去看海', '#2E7D6B'],
  ['Echo', '把歌写完', '#8A5C3B'],
  ['圆子', '不再焦虑', '#4C6A5F'],
  ['阿明', '希望今年有点小惊喜', '#6B3F5C'],
  ['豆子', '和朋友们常见面', '#3B5F6E']
]

export function seedNodes(treeId) {
  const now = Date.now()
  return SEED.map(([nickname, wish, color], i) => ({
    id: `seed_${treeId}_${i}`,
    nickname,
    wish,
    avatar: makeFallbackAvatar(nickname, color),
    avatarUrl: makeFallbackAvatar(nickname, color),
    blessCount: Math.max(0, 12 - i + ((i * 7) % 5)),
    inviteCount: Math.max(0, 6 - Math.floor(i / 3)),
    createdAt: now - (SEED.length - i) * 60000,
    mine: false,
    wishStatus: 1
  }))
}
