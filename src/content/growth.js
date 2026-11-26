// 0.12的技能等级与十二个特质；获得条件由成长插件判断。
// 前六个原是开局两选给的，现在挂在性情和出身线上（content/traits.js 的 OLD_TRAITS），后六个叫「历练」。
export const LEVELS = [0, 4, 10, 18, 30, 45];
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
    perks: { 1: '每级让每份饭多2饱腹', 2: '三样食材能做出3份', 4: '食物增益多管用1次' },
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
    need: '做出8份饭',
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
