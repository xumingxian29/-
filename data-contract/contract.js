/**
 * 数据契约（只有 JSDoc，无运行时代码）
 * 页面层看到的世界就到这里为止：一个 TreeApi，两个实现，同一种返回形状。
 */

/** @typedef {'cloud'|'local'} ApiMode */
/** @typedef {'invite'|'bless'|'display'} SortKey */

/**
 * @typedef {Object} TreeNode
 * @property {string}  id           唯一 id
 * @property {string}  nickname     昵称
 * @property {string}  wish         一句话心愿
 * @property {string}  avatar       头像原始值（cloud: fileID；local: dataURL）
 * @property {string}  avatarUrl    可直接用于 <image src> 的地址
 * @property {number}  blessCount   被祝福次数
 * @property {number}  inviteCount  邀请人数（仅圣诞档参与排序，前端不展示）
 * @property {number}  score        排序分（只读）
 * @property {number}  createdAt    创建时间戳
 * @property {boolean} mine         是否本人
 * @property {number}  wishStatus   0 待审 / 1 通过 / 2 拒绝（cloud 模式有效）
 */

/**
 * @typedef {Object} TreeMeta
 * @property {string} id       树种 id
 * @property {string} themeId  主题 id
 * @property {string} title
 * @property {number} total    已挂节点数
 */

/**
 * @typedef {Object} UploadInput
 * @property {string} path    本地临时路径
 * @property {number} width
 * @property {number} height
 * @property {string} [dataUrl] 已压缩小图
 */

/**
 * @typedef {Object} TreeApi
 * @property {ApiMode} mode
 * @property {(opts?:{treeId?:string}) => Promise<void>} init
 * @property {(q:{treeId:string}) => Promise<TreeMeta>} getTree
 * @property {(q:{treeId:string, sort?:SortKey, page?:number, size?:number}) => Promise<{list:TreeNode[], total:number, myRank:number|null, hasMore:boolean}>} listNodes
 * @property {(q:{treeId:string, avatar:UploadInput, wish:string, nickname:string, inviter?:string, clientId:string}) => Promise<{node:TreeNode}>} joinTree
 * @property {(q:{treeId:string, nodeId:string, clientId:string}) => Promise<{blessCount:number, already:boolean}>} blessNode
 * @property {(q:{treeId:string, nodeId:string, inviter:string}) => Promise<{inviteCount:number}>} recordInvite
 * @property {(q:{treeId:string, clientId:string}) => Promise<TreeNode|null>} getMyNode
 * @property {(ids:string[]) => Promise<Record<string,string>>} resolveUrls
 * @property {(e:{name:string, props?:Object, ts:number}) => Promise<void>} track
 */

export const SORT_KEYS = ['invite', 'bless', 'display']
