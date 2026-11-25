// 钓鱼：十三种鱼、三处钓点、鱼口、遛鱼的手感。只有数据，规则在 sim/plugins/fishing.js。
// 长短的单位是寸（十寸一尺）。看漂、遛鱼用毫秒；花掉的工夫用游戏里的分钟。
// 说的话在 content/fish-text.js，钓上来的不是鱼在 content/fish-catch.js，这里一并转出去。
export { FISH_LINES, FISH_BOOK, FISH_NAMES, FISH_CHEERS, ZHOU_FISH_LINES } from './fish-text.js';
export { FISH_THINGS, FISH_JUNK, FOUND_OWNERS } from './fish-catch.js';

/**
 * 十三种鱼。头六种是原有的，后七种出自 Gemini G-09（查了江南溪河里浮漂钓得上来的）。
 *   item    物品编号（见 content/pantry.js，各种鱼下锅、送人都算「鱼」）
 *   len     长短（寸）：[最短, 最长]，多半偏短
 *   window  咬钩后留给你提竿的工夫（毫秒），本事好的再宽一点
 *   nods    咬钩前浮漂轻点几下：[最少, 最多]；gap 点得多急（两下之间隔多久的倍数）
 *   first   浮漂落下后多久头一回有动静（倍数；翘嘴漂还没站稳就来抢）
 *   bite    咬钩时浮漂怎么动：sink 沉下去，drag 拖着走，lift 往上送（鳊鱼）
 *   runs    遛的时候本来就爱冲几回；再加上个头，每五寸多冲一回；leap 冲的时候跃出水面
 *   season  各季多不多：[春, 夏, 秋, 冬] 的倍数
 *   dusk    清早和傍晚的倍数（白天照 1 算）
 *   weather 什么天气多（倍数，没写的照 1 算）
 */
const fish = (id, name, d) => ({
  id,
  item: 'fish.' + id,
  name,
  gap: 1,
  first: 1,
  bite: 'sink',
  leap: false,
  dusk: 1,
  weather: {},
  ...d,
});

// prettier-ignore
export const FISH = Object.freeze({
  bleak: fish('bleak', '白条', { len: [2, 5], window: 380, nods: [2, 4], runs: 0, season: [1, 1.4, 1, 0.3] }),
  crucian: fish('crucian', '鲫鱼', { len: [3, 9], window: 450, nods: [1, 3], runs: 0, season: [1, 1, 1, 0.8] }),
  yellowcat: fish('yellowcat', '昂刺鱼', { len: [3, 8], window: 500, nods: [0, 2], runs: 1, season: [0.8, 1.2, 1, 0.3], dusk: 3 }),
  carp: fish('carp', '鲤鱼', { len: [6, 22], window: 750, nods: [0, 1], bite: 'drag', runs: 1, season: [1, 1, 1, 0.5] }),
  grass: fish('grass', '草鱼', { len: [8, 28], window: 550, nods: [0, 1], runs: 1, season: [0.3, 1, 1, 0.2] }),
  mandarin: fish('mandarin', '鳜鱼', { len: [6, 16], window: 320, nods: [0, 0], runs: 1, season: [1, 0.4, 0.4, 0] }),
  // 伏底猛吸一口：漂先顿一下就死死黑漂；劲沉贴底。春秋、早晚、阴雨多
  sleeper: fish('sleeper', '塘鳢鱼', { len: [3, 6], window: 420, nods: [1, 1], runs: 1, season: [1.4, 0.6, 1.2, 0.2], dusk: 2,
    weather: { overcast: 1.4, drizzle: 1.4, rain: 1.6 } }),
  // 口极轻，细碎点两三下；晴天多
  bitterling: fish('bitterling', '鳑鲏', { len: [1, 3], window: 300, nods: [2, 3], runs: 0, season: [1.2, 1.2, 1, 0.2],
    weather: { sunny: 1.3, cloudy: 1.2, rain: 0.6 } }),
  // 抢食极急，浮漂乱抖后猛拉黑漂；晴天午后最闹窝
  topmouth: fish('topmouth', '麦穗鱼', { len: [1, 3], window: 330, nods: [3, 5], gap: 0.4, runs: 0, season: [1.2, 1.4, 1.2, 0.2],
    dusk: 0.8, weather: { sunny: 1.4 } }),
  // 送漂：先晃一下再稳稳往上顶；侧身横游，力道稳
  bream: fish('bream', '鳊鱼', { len: [6, 13], window: 700, nods: [1, 1], bite: 'lift', runs: 1, season: [0.6, 1.2, 1.2, 0.3],
    dusk: 1.6, weather: { overcast: 1.4 } }),
  // 半水抢食：漂还没站稳就斜拉黑漂；前两下极猛，常跃出水面甩头
  culter: fish('culter', '翘嘴', { len: [5, 18], window: 320, nods: [0, 0], first: 0.35, bite: 'drag', runs: 1, leap: true,
    season: [0.4, 1.3, 1.3, 0.1], dusk: 2.5, weather: { overcast: 1.3 } }),
  // 轻顿一下就干脆斜拉黑漂；个头不大劲极猛
  yellowtail: fish('yellowtail', '黄尾鲴', { len: [5, 12], window: 380, nods: [1, 1], bite: 'drag', runs: 2,
    season: [0.4, 1.2, 1.2, 0.2], dusk: 1.4, weather: { cloudy: 1.3, drizzle: 1.6 } }),
  // 几乎不点漂，沉稳地拖黑走深；贴底打桩。傍晚、阴雨天最多，晴天少
  catfish: fish('catfish', '鲶鱼', { len: [7, 18], window: 850, nods: [0, 0], bite: 'drag', runs: 1, season: [0.5, 1.3, 1, 0],
    dusk: 3, weather: { sunny: 0.4, overcast: 1.8, drizzle: 2, rain: 2.5 } }),
});

/**
 * 三处钓点：地图编号 → 名字和各种鱼有几份。名字照地图上钓点的名牌。
 * 白条、鲫鱼、昂刺这些家常鱼占大半，新来的几种靠季节、早晚、天气分出来：选对了天色才出稀客。
 */
export const FISH_SPOTS = Object.freeze({
  yard: {
    id: 'yard',
    name: '溪湾钓点',
    fish: {
      bleak: 5,
      crucian: 4,
      yellowcat: 2,
      topmouth: 1.5,
      bitterling: 1.2,
      sleeper: 0.8,
      catfish: 0.2,
    },
  },
  creek: {
    id: 'creek',
    name: '竹影钓点',
    fish: {
      bleak: 4,
      crucian: 5,
      yellowcat: 2,
      topmouth: 1.2,
      bitterling: 1.2,
      yellowtail: 1,
      sleeper: 0.4,
      bream: 0.3,
      culter: 0.3,
      catfish: 0.1,
    },
  },
  river: {
    id: 'river',
    name: '渡口钓点',
    fish: {
      crucian: 4,
      carp: 3,
      grass: 3,
      yellowcat: 2,
      bream: 1.5,
      culter: 1.2,
      yellowtail: 1,
      catfish: 0.8,
      mandarin: 0.7,
      topmouth: 0.3,
      bitterling: 0.3,
      sleeper: 0.2,
    },
  },
});

/** 天气的鱼口（这一竿有没有鱼来咬）。打雷不让下竿。 */
export const FISH_BITE = Object.freeze({
  sunny: 0.55,
  cloudy: 0.8,
  overcast: 0.85,
  drizzle: 0.85,
  rain: 0.6,
  storm: 0,
  fog: 0.7,
  snow: 0.4,
});

/** 鱼口的加减，和钓点「惊了」。 */
export const FISHING = Object.freeze({
  base: 0.15, // 天气表是 0.12 的（那时提竿准不准也算进去），这里整体抬一点
  dusk: 0.15, // 清早、傍晚
  bait: 0.1, // 挂了蚯蚓
  scare: 0.12, // 这儿每刚钓上一条
  calm: 60, // 过多少分钟缓过来一条
  spooked: 4, // 刚钓上几条就算惊了
  good: 0.75, // 鱼口到这个数算好
  min: 0.1,
  max: 0.95,
  duskFrom: 1020, // 傍晚从几点算起（分钟，17:00）
  baitLen: 1.3, // 挂了饵个头偏大：长短抽签的指数小一些
  plainLen: 1.8,
  baitWait: 0.7, // 挂了饵，等得短一些
  minutes: 8, // 看一回漂过去多少分钟
  fightMinutes: 4, // 遛一回鱼起码过去多少分钟，鱼每冲一回再加 2
  things: 0.1, // 有东西来咬时，拉上来的不是鱼的把握（河虾、毛蟹、瓷片……）
  junk: 0.3, // 提竿晚了，钩子倒挂上水草、石头的把握
});

/** 看漂：毫秒。 */
export const FLOAT = Object.freeze({
  first: [1200, 2600], // 浮漂落稳后多久头一回有动静
  nod: [180, 260], // 小啄一下多久
  gap: [500, 1300], // 两下之间隔多久
  bite: [600, 1400], // 最后一下之后多久咬钩
  idle: [3000, 5000], // 没有鱼来，等多久收竿
  skill: 30, // 采集本事每一级，咬钩的工夫宽多少
  thing: 450, // 拉上来的不是鱼时，咬钩留给你提竿的工夫
  thingNods: [0, 2],
});

/**
 * 遛鱼：每一步 50 毫秒。鱼离岸 100 起，到 0 就上来了；线紧到 100 就断。
 *   按着、鱼不冲：线往回收，每秒拉近 reel ÷ (1 + 寸 ÷ 8)，线每秒紧 hold
 *   按着、鱼正冲：线每秒紧 strain + 寸 × strainLen
 *   松开：线每秒松 ease；鱼正冲的话往外拉 pull + 寸 ÷ 2
 *   一直松着超过 slack 毫秒，鱼脱钩；遛了 max 毫秒还没上来，也脱钩
 */
export const FIGHT = Object.freeze({
  step: 50,
  max: 30000,
  slack: 2000,
  reel: 80,
  hold: 15,
  strain: 160,
  strainLen: 5,
  ease: 100,
  pull: 10,
  perRun: 5, // 每多少寸多冲一回
  run: [300, 30, 1200], // 一回冲多久：300 + 寸 × 30，最多 1200
  gap: [600, 1400], // 两回之间隔多久
  firstRun: [200, 600],
  clean: 60, // 线一直没紧过这个数，算「遛得稳」
  small: 6, // 寸：不到这个是小鱼
  big: 12, // 寸：过了这个是大鱼
});

/** 收得稳，出极品的把握多一点（走 quality.chance 计算管道）。 */
export const FISH_FINE = Object.freeze({ clean: 8 });

/** 锄地时翻出蚯蚓的把握；近来下过雨更多。 */
export const WORM_ODDS = Object.freeze({ dry: 0.15, wet: 0.3 });

/**
 * 同一种鱼按长短分四档（这一种鱼最短到最长之间排第几成）：小个儿、中不溜、大个儿、大家伙。
 * 拉上来那一下照档说、照档演；大个儿以上，身边的村民看见了会说一句（FISH_CHEERS）。
 */
export const FISH_GRADES = Object.freeze([
  Object.freeze({ id: 'small', from: 0, word: '小个儿' }),
  Object.freeze({ id: 'fair', from: 0.35, word: '中不溜' }),
  Object.freeze({ id: 'big', from: 0.7, word: '大个儿' }),
  Object.freeze({ id: 'huge', from: 0.9, word: '大家伙' }),
]);

/** 钓上大个儿时，几格以内的村民看得见、会说一句。 */
export const CHEER_REACH = 8;
