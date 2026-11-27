// 家底：每户一份钱、一个年景、一池大开销。只有数据；怎么进出、怎么定年景在 sim/plugins/purse.js。
// 玩家家里的钱照旧在 households.home 里，这里是村里另外几户和杂货铺的钱匣。
// 数先粗（执行方案 M8 第 6 步），用村志工具（tools/village-sim.mjs）跑着看再调。
// 题目和各户的话照 G-20（各户的家底和开销，Gemini 2026-11-27 交回）。

/**
 * 每户：name 叫法，members 户里的人，trade 营生，coins 开局的钱。
 * 铺子不是人，没有成员；玩家在杂货铺买卖，钱从这只钱匣进出。
 */
// prettier-ignore
export const HOUSES = Object.freeze({
  shi:  { name: '石伯家', members: ['shi'], trade: 'farm', coins: 60 },
  gui:  { name: '桂嫂家', members: ['gui'], trade: 'pickle', coins: 45 },
  aman: { name: '阿满家', members: ['aman'], trade: 'cart', coins: 22 },
  qiao: { name: '小乔', members: ['qiao'], trade: 'clerk', coins: 14 },
  zhou: { name: '老周家', members: ['zhou'], trade: 'ferry', coins: 40 },
  yun:  { name: '云姑家', members: ['yun'], trade: 'tea', coins: 32 },
  shop: { name: '铺子', members: [], trade: 'shop', coins: 120 },
});

/**
 * 营生：每天进多少、出多少（年景每好一档多进 swing 文，差一档少进 swing 文，最少进 0）。
 * 年景跟什么挂钩：wet 一季里下雨的日子最好是几天，差得越多年景越差（每差 4 天一档）；
 * heavy 一季里每有一天大雨、雷雨扣几档（四舍五入以后才算）；seasons 换到这一季时加减几档（茶在春秋两季好卖）；
 * fair 每个集日多进几文。
 */
// prettier-ignore
export const TRADES = Object.freeze({
  farm:   { name: '种地', earn: 3, spend: 2, swing: 1, wet: 5 },
  pickle: { name: '腌菜养鸡', earn: 2, spend: 2, swing: 1, fair: 3 },
  cart:   { name: '拉板车送菜', earn: 3, spend: 2, swing: 1, heavy: 0.25 },
  clerk:  { name: '铺子帮工', earn: 2, spend: 1, swing: 0 },
  ferry:  { name: '撑渡船', earn: 3, spend: 2, swing: 1, heavy: 0.25, fair: 2 },
  tea:    { name: '种茶卖茶', earn: 2, spend: 1, swing: 2, seasons: [1, -1, 1, -1], fair: 4 },
  shop:   { name: '卖杂货收山货', earn: 4, spend: 3, swing: 1, fair: 6 },
});

/** 年景的说法，从 −2 到 +2。 */
export const FORTUNE_WORDS = Object.freeze([
  '年景很差',
  '年景不好',
  '年景平常',
  '年景不错',
  '年景很好',
]);
export const fortuneWord = (/** @type {number} */ n) => FORTUNE_WORDS[n + 2];

/** 大开销的大小：要多少文。 */
export const EXPENSE_SIZE = Object.freeze({ small: 8, mid: 20, big: 45 });

/**
 * 每户每天碰上一笔大开销的把握；年景每差一档加 bad，碰上的那笔从这户的池子和通用的池子里按权重挑。
 * 一户手里还欠着一笔（钱不够付）时，不再碰上新的。
 */
export const EXPENSE_ODDS = Object.freeze({ base: 0.025, bad: 0.015 });

/**
 * 大开销池（G-20 的题目，石伯的「耕牛瘸了」村里没有牛，换成了田埂塌方）：house 是哪一户的
 * （null 是谁家都可能碰上），title 题目，size 大小，seasons 只在这几季出（不写就是四季），
 * wet 下雨天更容易出（权重翻倍），poor 只在年景很差时出。开口借钱的话、没借到怎么办、事后的痕迹
 * 在 content/purse-lines.js。钱不够的那一截记成「手头紧」，下一段（借、还）里就是他开口借钱的缘由。
 */
// prettier-ignore
export const EXPENSES = Object.freeze({
  waterwheel:  { house: 'shi', title: '水车轴断了', size: 'big', seasons: [0, 1] },
  sluice:      { house: 'shi', title: '田口木闸烂了', size: 'mid', seasons: [0], wet: true },
  ridgeSlip:   { house: 'shi', title: '田埂塌了一截', size: 'mid', wet: true },
  plowChip:    { house: 'shi', title: '旧铁犁崩了口', size: 'small', seasons: [2] },
  jarFrost:    { house: 'gui', title: '腌菜大缸冻裂了', size: 'mid', seasons: [3] },
  coopRoof:    { house: 'gui', title: '鸡窝顶被风掀了', size: 'small', seasons: [1, 2], wet: true },
  kinWedding:  { house: 'gui', title: '娘家侄儿娶亲', size: 'mid', seasons: [2, 3] },
  stoveFall:   { house: 'gui', title: '灶膛塌了', size: 'big' },
  wheelOff:    { house: 'aman', title: '板车轮子散了架', size: 'mid', wet: true },
  basketDrop:  { house: 'aman', title: '半路摔坏菜筐', size: 'small', wet: true },
  motherAche:  { house: 'aman', title: '老娘风湿抓药', size: 'big', seasons: [2, 3] },
  unpaid:      { house: 'aman', title: '垫的菜钱被拖', size: 'mid' },
  tuition:     { house: 'qiao', title: '画师收束脩', size: 'big', seasons: [0, 2] },
  bookShort:   { house: 'qiao', title: '账上短了一笔', size: 'mid' },
  catBone:     { house: 'qiao', title: '掌柜卡了鱼刺', size: 'small' },
  inkDeal:     { house: 'qiao', title: '想囤一批笔墨', size: 'mid' },
  hullLeak:    { house: 'zhou', title: '船底漏了', size: 'big', seasons: [1, 2] },
  poleSnap:    { house: 'zhou', title: '竹篙折了两根', size: 'small' },
  netTorn:     { house: 'zhou', title: '大渔网撕了口', size: 'mid', seasons: [0, 1] },
  conned:      { house: 'zhou', title: '替生人垫钱被骗', size: 'mid' },
  wokCrack:    { house: 'yun', title: '炒茶大锅裂了', size: 'big', seasons: [0, 2] },
  terrace:     { house: 'yun', title: '山洪冲垮石坎', size: 'mid', seasons: [1], wet: true },
  trayMold:    { house: 'yun', title: '竹匾发了霉', size: 'small', wet: true },
  ankle:       { house: 'yun', title: '采药扭了脚', size: 'mid', seasons: [2, 3] },
  bulkBuy:     { house: 'shop', title: '集前大进货', size: 'big' },
  shelfFall:   { house: 'shop', title: '货架塌了一排', size: 'mid', wet: true },
  rats:        { house: 'shop', title: '老鼠咬破粮袋', size: 'small', seasons: [2, 3] },
  creditor:    { house: 'shop', title: '货主催结旧款', size: 'big' },
  fever:       { house: null, title: '着凉发高热', size: 'mid' },
  leakyRoof:   { house: null, title: '屋顶漏雨', size: 'mid', wet: true },
  kinBorrow:   { house: null, title: '远房亲戚借急', size: 'mid' },
  winterWear:  { house: null, title: '冬衣添新棉', size: 'small', seasons: [2, 3] },
  wellFix:     { house: null, title: '水井塌了砖', size: 'big', seasons: [1] },
  emptyJar:    { house: null, title: '米缸见了底', size: 'small', poor: true },
});

/** 存档里留几笔最近的大开销（借钱的缘由、事后的痕迹从这里找）。 */
export const SPENT_KEEP = 24;
