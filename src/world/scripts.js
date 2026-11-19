// 每件活在世界里怎么演：一步一个动作（art/acts.js 里的名字），times 放几遍，ms 放多久（循环的动作），
// around 是对着的那样东西跟着做的事（灶膛起火、锅上冒汽、木屑飞、水花），sound 是这一步的声音。
// 键是活的 id（content/activities.js）和几件不在那张表里的事（做饭、钓鱼、买卖、打水）。
const once = (act, more = {}) => [{ act, ...more }];

/** 做一顿饭：切菜、蹲下添柴生火、翻炒（凉拌不生火）、盛出来。 */
function cookingScript(method) {
  if (method === 'mix') return [{ act: 'cut', times: 2, sound: 'hoe' }, { act: 'serve' }];
  return [
    { act: 'cut', sound: 'hoe' },
    { act: 'stoke', around: 'fire' },
    { act: 'stir', ms: method === 'stew' ? 1800 : 1400, around: 'steam', sound: 'water' },
    { act: 'serve', sound: 'harvest' },
  ];
}

export const SCRIPTS = Object.freeze({
  // 野外
  forage: [{ act: 'gather:herb', times: 2, sound: 'harvest' }],
  sticks: [{ act: 'gather:wood', times: 2, sound: 'harvest' }],
  logs: [{ act: 'chop', times: 2, around: 'chips', sound: 'hoe' }],
  shoot: [{ act: 'gather:shoot', times: 2, sound: 'hoe' }],
  bamboo: [{ act: 'chop', times: 2, around: 'chips', sound: 'hoe' }],
  mushroom: [{ act: 'gather:mushroom', times: 2, sound: 'harvest' }],
  tea: [{ act: 'gather:tea', times: 2, sound: 'harvest' }],
  chestnut: [{ act: 'gather:nut', times: 2, sound: 'harvest' }],
  // 院里
  split: [{ act: 'chop', times: 2, around: 'chips', sound: 'hoe' }],
  weave: once('weave'),
  bigbasket: once('weave'),
  pickle: once('press'),
  buildCoop: [{ act: 'hammer', times: 2, around: 'chips', sound: 'hoe' }],
  buyHen: once('pay'),
  feedHens: once('feed', { sound: 'seed' }),
  eggs: once('eggs'),
  rest: [{ act: 'sit', times: 2 }],
  stars: [{ act: 'sit', times: 2 }],
  // 打水、喝水
  drink: once('scoop', { around: 'drawWater', sound: 'refill' }),
  refill: once('fillCan', { around: 'drawWater', sound: 'refill' }),
  // 买卖
  trade: once('pay', { sound: 'talk' }),
  // 钓鱼：甩出去以后一直等着，直到收竿那一下换成 reel 或 miss
  cast: [
    { act: 'cast', around: 'splash', sound: 'water' },
    { act: 'wait', ms: 60000 },
  ],
  reel: once('reel', { around: 'splash', sound: 'harvest' }),
  miss: once('miss', { around: 'splash' }),
  // 做饭（按做法）
  'cook:stew': cookingScript('stew'),
  'cook:fry': cookingScript('fry'),
  'cook:roast': cookingScript('roast'),
  'cook:mix': cookingScript('mix'),
  // 茶摊上坐下喝一盏
  sip: [{ act: 'sip', times: 1 }],
});
