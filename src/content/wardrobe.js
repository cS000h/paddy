// 衣装和发式：在小屋的衣镜跟前换。不是一开始全有：开局只有身上这一套和自己梳得来的几样，
// 别的去村口集上的布摊买，或者到野外做活时碰上，怎么得到写在 GET 里。
// 规则是单独的一个插件（sim/plugins/wardrobe.js）：拿掉它，人人都穿回原衣，别的玩法照常。
export const COATS = Object.freeze({
  plain: '原衣',
  hoodie: '鼠尾草绿卫衣',
  stripe: '海军条纹衫',
  denim: '水洗牛仔外套',
  dungarees: '焦糖背带裤',
  field: '麦白短褂',
  tea: '青竹采茶衫',
  cook: '靛蓝围裙',
  rain: '芦黄蓑衣',
  winter: '柿红夹袄',
  feast: '藕荷长衫',
  bamboo: '竹青长衫',
  lotus: '荷粉衣裙',
  ink: '墨青短衫',
  harvest: '稻黄暖袄',
  cloud: '云白茶衫',
  plum: '朱红冬衣',
});
export const HAIR = Object.freeze({
  plain: ['原发', 0],
  crop: ['层次碎发', 0],
  bob: ['内扣直发', 1],
  pony: ['高马尾', 3],
  knot: ['松丸子头', 2],
  loose: ['披发', 3],
  tail: ['束发', 2],
  bun: ['盘髻', 2],
  braid: ['垂辫', 3],
  twins: ['双结', 2],
  topknot: ['束顶高髻', 2],
  sidebun: ['侧梳小髻', 2],
  short: ['清爽短发', 0],
  doublebun: ['双小髻', 2],
  cap: ['青布包头', 1],
});
export function outfitLook(base, coat, hair) {
  return coat === 'plain' && hair === 'plain' ? base : [base, coat, hair, HAIR[hair][1]].join('/');
}

/**
 * 一样衣装或发式怎么得到：
 *   start   开局就有；
 *   buy     布摊上卖，几文钱。seasons 只在这几季摆（0 春 1 夏 2 秋 3 冬），fair 只在赶集那天摆
 *           （城里来的成衣）；with 是发式附带的小东西或手艺，写在布摊上；
 *   find    到野外做这件活（content/activities.js 的 OUTDOOR）时，有 chance 的几率碰上一回；
 *           where 写在衣镜上，告诉人去哪儿找；line 是碰上时的那段话。
 * @typedef {{start?: boolean, buy?: number, seasons?: number[], fair?: boolean, with?: string,
 *   find?: string, chance?: number, where?: string, line?: string}} Way
 */
/** @type {Readonly<{coat: Readonly<Record<string, Way>>, hair: Readonly<Record<string, Way>>}>} */
export const GET = Object.freeze({
  coat: Object.freeze({
    plain: { start: true },
    field: { start: true },
    cook: { buy: 36 },
    ink: { buy: 72 },
    cloud: { buy: 80 },
    feast: { buy: 96 },
    lotus: { buy: 88, seasons: [0, 1] },
    harvest: { buy: 96, seasons: [2] },
    winter: { buy: 108, seasons: [2, 3] },
    plum: { buy: 120, seasons: [3] },
    hoodie: { buy: 128, fair: true },
    stripe: { buy: 112, fair: true },
    denim: { buy: 144, fair: true },
    dungarees: { buy: 120, fair: true },
    rain: {
      find: 'fish',
      chance: 0.2,
      where: '渡口钓鱼',
      line: '收竿时看见岸边芦苇丛里勾着一件旧蓑衣，像是哪年涨水冲下来的。抖掉泥晒一晒，还能穿。',
    },
    tea: {
      find: 'tea',
      chance: 0.3,
      where: '后山采茶',
      line: '茶垄那头的竹篱上搭着一件采茶衫。云姑说是去年帮工的姑娘落下的，让你拿去穿。',
    },
    bamboo: {
      find: 'bamboo',
      chance: 0.25,
      where: '竹林劈篾',
      line: '竹林里的旧草棚下压着一只布包，里头一件竹青长衫，叠得整整齐齐。问了一圈没人认，就留着穿吧。',
    },
  }),
  hair: Object.freeze({
    plain: { start: true },
    short: { start: true },
    tail: { start: true },
    loose: { start: true },
    crop: { buy: 12, with: '请大娘修一修' },
    bob: { buy: 12, with: '请大娘修一修' },
    pony: { buy: 12, with: '一根红头绳' },
    braid: { buy: 12, with: '一对头绳' },
    knot: { buy: 16, with: '一根发绳' },
    twins: { buy: 16, with: '一对红头绳' },
    doublebun: { buy: 20, with: '一对头花' },
    bun: { buy: 24, with: '一把小木梳' },
    cap: {
      find: 'mushroom',
      chance: 0.3,
      where: '松林采菌',
      line: '松林里的枝上挂着一块青布。石伯说山里人采菌子都这么包着头，顺手教了你。',
    },
    sidebun: {
      find: 'forage',
      chance: 0.15,
      where: '溪边找菜',
      line: '溪边石缝里卡着一把小木梳，梳背上刻着一朵花。照着水面比了比，梳了个侧梳小髻。',
    },
    topknot: {
      find: 'sticks',
      chance: 0.25,
      where: '林中捡柴',
      line: '枯枝堆里拣到一截光溜溜的细木棍，正好别住头发，束成个高髻。',
    },
  }),
});
