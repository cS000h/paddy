// 0.12的技能等级与十二个特质；获得条件由成长插件判断。
// 前六个原是开局两选给的，现在挂在性情和出身线上（content/traits.js 的 OLD_TRAITS），后六个叫「历练」。
// 升一级要的经验（累计）。照「勤快的人春末到在行、夏天老练、秋天才成行家」定，
// 跑 `node tools/growth-curve.mjs` 看两种玩法下的曲线。
export const LEVELS = [0, 20, 80, 200, 420, 760];
/**
 * 经验怎么给：干活按这件事的基准体力给（出多大力长多少本事），钓鱼按钓上来的给，不按甩竿。
 * 每门本事一天头 fresh 点照给，再往后只给 over 这么多（今天手上已经熟了，再练长进慢）。
 * 收一格菜另给 harvest，下锅做饭给 cook 的几样。rate 是几门不怎么花体力的本事的倍数，
 * 让它们和种地、采集差不多快：聊天、看天一回只给一两点。
 */
export const XP = Object.freeze({
  rate: Object.freeze({ cook: 2, social: 2, sky: 6 }),
  fresh: 12,
  over: 0.2,
  harvest: 3,
  fish: Object.freeze({ small: 2, fair: 2, big: 3, huge: 5, thing: 1 }),
  cook: Object.freeze({ base: 2, great: 2, good: 1, first: 2, shred: 1 }),
});
export const LEVEL_NAMES = ['生疏', '入门', '熟手', '在行', '老练', '行家'];
export const SKILLS = {
  farm: {
    grow: '地种得多了，手上有了分寸',
    name: '农事',
    perks: { 2: '农活少耗1体力', 3: '收菜多1份', 4: '农活再少耗1体力', 5: '收菜再多1份' },
  },
  cook: {
    grow: '灶火生得多了，咸淡心里有数',
    name: '厨艺',
    perks: { 1: '每级火候好拿捏一些', 2: '调味有分寸，滋味多一分', 4: '食物增益多管用1次' },
  },
  forage: {
    grow: '林子走熟了，哪儿有东西，一眼就看得出',
    name: '采集',
    perks: { 2: '更容易找到竹笋', 3: '采集少耗1体力', 4: '每次多找到1份' },
  },
  social: {
    grow: '跟村里人越处越熟，说话也自在了',
    name: '交际',
    perks: { 2: '你的好事传得更快', 3: '聊天时关系多涨1点' },
  },
  sky: {
    grow: '看云看得多了，天色慢慢有了眉目',
    name: '看天',
    perks: { 1: '每级让天气预报准一些' },
  },
  craft: {
    grow: '篾条在手里越来越听话',
    name: '手艺',
    perks: { 2: '编东西少耗1体力', 3: '竹篮卖价多2个钱' },
  },
};
export const TRAITS = {
  easygoing: {
    name: '随和',
    from: '性情知足的人都这样',
    effect: '聊日常时，关系多涨1点',
  },
  handy: { name: '自己动手', from: '性情勤勉的人都这样', effect: '做饭时厨艺经验 +1' },
  slowwarm: {
    name: '慢热',
    from: '性情沉稳的人都这样',
    effect: '歇息时多恢复4体力，心情也好一点',
  },
  lively: { name: '爱热闹', from: '性情热络的人都这样', effect: '聊天、送饭后心情 +2' },
  solitary: {
    name: '独行',
    from: '性情怕生的人都这样',
    effect: '采集多得1点经验，心情 +2',
  },
  curious: {
    name: '好问',
    from: '出身耕读传家的人都这样',
    effect: '问人天色时听得更准，看天经验 +1',
  },

  rainwalker: {
    got: '雨里来雨里去，你已经不太在意鞋子湿不湿了',
    name: '雨中行者',
    need: '在雨雪天里下地、进林子6次',
    effect: '雨天户外少耗1体力，不容易着凉',
  },
  coldproof: {
    got: '冷天里干过几回活，身子骨慢慢扛得住了',
    name: '耐寒',
    need: '在冷天户外干活5次',
    effect: '天冷时体感暖3度',
  },
  heatproof: {
    got: '在日头底下忙过几回，你学会了顺着阴凉干活',
    name: '耐暑',
    need: '在热天户外干活5次',
    effect: '天热时体感凉3度',
  },
  hearth: {
    got: '灶火生得多了，火候心里有了数',
    name: '灶边人',
    need: '做8回饭',
    effect: '食物增益多管用1次',
  },
  earlybird: {
    got: '天刚亮就出门，不知不觉成了习惯',
    name: '早起的人',
    need: '在清晨做事6次',
    effect: '清晨做事少耗1体力',
  },
  familiar: {
    got: '走在村里，招呼你的人越来越多了',
    name: '熟面孔',
    need: '和村里人的熟悉度合计达到20',
    effect: '街坊会主动招呼你，有些事会找上门',
  },
};
