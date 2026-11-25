// 钓鱼：六种鱼、三处钓点、鱼口、遛鱼的手感，和钓鱼时说的话。只有数据，规则在 sim/plugins/fishing.js。
// 长短的单位是寸（十寸一尺）。看漂、遛鱼用毫秒；花掉的工夫用游戏里的分钟。

/**
 * 六种鱼。
 *   item   物品编号（见 content/pantry.js，各种鱼下锅、送人都算「鱼」）
 *   len    长短（寸）：[最短, 最长]，多半偏短
 *   window 咬钩后留给你提竿的工夫（毫秒），本事好的再宽一点
 *   nods   咬钩前浮漂轻点几下：[最少, 最多]
 *   drag   咬钩时不往下沉，拖着浮漂往一边走
 *   runs   遛的时候本来就爱冲几回；再加上个头，每五寸多冲一回
 *   season 各季多不多：[春, 夏, 秋, 冬] 的倍数
 *   dusk   清早和傍晚的倍数（白天照 1 算）
 */
export const FISH = Object.freeze({
  bleak: {
    id: 'bleak',
    item: 'fish.bleak',
    name: '白条',
    len: [2, 5],
    window: 380,
    nods: [2, 4],
    drag: false,
    runs: 0,
    season: [1, 1.4, 1, 0.3],
    dusk: 1,
  },
  crucian: {
    id: 'crucian',
    item: 'fish.crucian',
    name: '鲫鱼',
    len: [3, 9],
    window: 450,
    nods: [1, 3],
    drag: false,
    runs: 0,
    season: [1, 1, 1, 0.8],
    dusk: 1,
  },
  yellowcat: {
    id: 'yellowcat',
    item: 'fish.yellowcat',
    name: '昂刺鱼',
    len: [3, 8],
    window: 500,
    nods: [0, 2],
    drag: false,
    runs: 1,
    season: [0.8, 1.2, 1, 0.3],
    dusk: 3,
  },
  carp: {
    id: 'carp',
    item: 'fish.carp',
    name: '鲤鱼',
    len: [6, 22],
    window: 750,
    nods: [0, 1],
    drag: true,
    runs: 1,
    season: [1, 1, 1, 0.5],
    dusk: 1,
  },
  grass: {
    id: 'grass',
    item: 'fish.grass',
    name: '草鱼',
    len: [8, 28],
    window: 550,
    nods: [0, 1],
    drag: false,
    runs: 1,
    season: [0.3, 1, 1, 0.2],
    dusk: 1,
  },
  mandarin: {
    id: 'mandarin',
    item: 'fish.mandarin',
    name: '鳜鱼',
    len: [6, 16],
    window: 320,
    nods: [0, 0],
    drag: false,
    runs: 1,
    season: [1, 0.4, 0.4, 0],
    dusk: 1,
  },
});

/** 三处钓点：地图编号 → 名字和各种鱼有几份。名字照地图上钓点的名牌。 */
export const FISH_SPOTS = Object.freeze({
  yard: { id: 'yard', name: '溪湾钓点', fish: { bleak: 5, crucian: 4, yellowcat: 2 } },
  creek: { id: 'creek', name: '竹影钓点', fish: { bleak: 4, crucian: 5, yellowcat: 2 } },
  river: {
    id: 'river',
    name: '渡口钓点',
    fish: { crucian: 4, carp: 3, grass: 3, yellowcat: 2, mandarin: 0.7 },
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
});

/** 看漂：毫秒。 */
export const FLOAT = Object.freeze({
  first: [1200, 2600], // 浮漂落稳后多久头一回有动静
  nod: [180, 260], // 小啄一下多久
  gap: [500, 1300], // 两下之间隔多久
  bite: [600, 1400], // 最后一下之后多久咬钩
  idle: [3000, 5000], // 没有鱼来，等多久收竿
  skill: 30, // 采集本事每一级，咬钩的工夫宽多少
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

/** 钓鱼时冒的话。{name} 鱼名，{len} 长短。 */
export const FISH_LINES = Object.freeze({
  spooked: '浮漂才点了一下你就提竿，鱼一甩尾吓跑了。',
  missed: '浮漂沉下去又浮上来，钩上的饵没了。',
  none: '等了好一会儿，浮漂一动不动，你收起竿。',
  quit: '你收起钓竿。',
  snap: '线绷得太紧，“嘣”一声断了，鱼带着钩跑了。',
  slack: '线一松，鱼甩掉钩子溜了。',
  caught: '钓上一条{name}，{len}。',
  record: '比以前钓过的{name}都长！',
  worm: '锄起的土里扭着一条蚯蚓，你捏起来收好，钓鱼用得上。',
  // 头一回钓上某种鱼说的一句（Gemini G-08）
  first: {
    bleak: '水面银光一闪，钩上挂了条细长扑腾的小白条。',
    crucian: '浮漂轻轻一点，提竿上来条银亮活泼的巴掌鲫鱼。',
    yellowcat: '刚提上岸就咕咕直叫，原来是条黄肚皮的昂刺鱼。',
    carp: '鱼竿猛地一沉，费了好大劲才拽上来一条大鳞鲤鱼。',
    grass: '水面炸开一大片水花，竟拉上来一条结实的大草鱼！',
    mandarin: '鱼线绷得笔直，拉出条带花斑的肥鳜鱼，真稀罕！',
  },
});

/** 鱼谱上的一句（Gemini G-08），图谱那一页用。 */
export const FISH_BOOK = Object.freeze({
  bleak: '细长银白如柳叶，爱在水面成群窜浪，油煎至酥脆最下酒。',
  crucian: '溪塘最常见的小银鱼，背厚刺细，入冬攒膘熬汤能炖得雪白。',
  yellowcat: '无鳞黄腹、背胸生硬刺，离水常咕咕叫，炖豆腐极鲜嫩。',
  carp: '嘴边生须、鳞大身沉，河湾深水处多见，逢喜事常讨它的好口彩。',
  grass: '青背白腹的河里大个头，专啃水草，鱼尾肉最活嫩鲜香。',
  mandarin: '斑纹如锦、大口细鳞，藏在深石滩边，刺少肉如蒜瓣般细嫩。',
});

/** 钓上一条大的，旁边的人说一句（Gemini G-08）。集日比鱼、有人在旁边看时用。 */
export const FISH_CHEERS = Object.freeze({
  bleak: {
    zhou: '拎起鱼线直乐，“好条大白条！入梅涨水那阵，它们专爱逆着急浪窜。”',
    aman: '拍着板车喊，“这号大白条裹点面油炸酥，连骨头嚼着都喷香！”',
  },
  crucian: {
    zhou: '掂了掂鱼绳点头，“好肥的板鲫！天冷下来，这鱼熬汤最养人。”',
    gui: '凑近瞧了瞧，“背厚肚圆，回家切几片白萝卜一炖，鲜得人直吞口水！”',
  },
  yellowcat: {
    zhou: '提醒你捏稳鱼头，“小心它两根硬刺！这号大昂刺鱼，炖嫩豆腐最绝。”',
    qiao: '探头不敢伸手，“它还在叫唤呢！听说镇上酒楼红烧昂刺鱼可贵啦！”',
  },
  carp: {
    zhou: '抄网一兜笑道，“沉手哩！大夏天的河鲤肉最紧实，红烧最地道。”',
    shi: '估摸着份量点头，“少说三四斤！拎去杂货铺称一称，准能卖个好价钱。”',
  },
  grass: {
    zhou: '扶着鱼篓赞道，“好家伙，大草鱼力气足，亏你竿子稳没叫它跑了。”',
    gui: '连声支招，“草鱼尾巴最嫩！回头切段做个熏鱼，能放好些天呢！”',
  },
  mandarin: {
    zhou: '捋着胡子直夸，“好条大鳜鱼！桃花水发的时候，它最肥最鲜喽。”',
    gui: '双手一拍惊呼，“蒜瓣肉的大鳜鱼！清蒸出来，整张桌子都体面！”',
  },
});

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

/** 问老周鱼口：按渡口那边的鱼口说。 */
export const ZHOU_FISH_LINES = Object.freeze({
  good: '“今儿个水色好，渡口这一片鱼口正旺，下竿吧。”',
  fair: '“鱼口一般，耐着性子等，浮漂点几下别急着提。”',
  spooked: '“这一片刚叫你钓惊了，过一两个时辰再来，或者换个地方。”',
  storm: '“打雷天别在水边待着，鱼也躲到深处去了。”',
});
