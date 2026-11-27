// 家底：每户一份钱、一个年景、一池大开销。只有数据；怎么进出、怎么定年景在 sim/plugins/purse.js。
// 玩家家里的钱照旧在 households.home 里，这里是村里另外几户和杂货铺的钱匣。
// 数先粗（执行方案 M8 第 6 步），用村志工具（tools/village-sim.mjs）跑着看再调。
// 大开销的题目先由 Claude 占位写着，等 G-20（各户的家底和开销）交回来照它换。

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
 * 大开销池：house 是哪一户的（null 是谁家都可能碰上），title 题目，size 大小，
 * seasons 只在这几季出（不写就是四季），wet 下雨天更容易出（权重翻倍）。
 * 钱不够的那一截记成「手头紧」，下一段（借、还）里就是他开口借钱的缘由。
 */
// prettier-ignore
export const EXPENSES = Object.freeze({
  plowCrack:   { house: 'shi', title: '犁铧裂了', size: 'mid' },
  ridgeSlip:   { house: 'shi', title: '田埂塌了', size: 'mid', wet: true },
  oxSick:      { house: 'shi', title: '耕牛病了', size: 'big' },
  seedMold:    { house: 'shi', title: '种子受潮发霉', size: 'small', wet: true },
  henSick:     { house: 'gui', title: '鸡瘟了几只', size: 'mid' },
  jarCrack:    { house: 'gui', title: '腌菜缸裂了', size: 'small' },
  kinGift:     { house: 'gui', title: '娘家办事随礼', size: 'mid' },
  guiRoof:     { house: 'gui', title: '灶屋漏雨', size: 'mid', wet: true },
  axleBroke:   { house: 'aman', title: '板车轴断了', size: 'mid' },
  backHurt:    { house: 'aman', title: '扭了腰抓药', size: 'mid' },
  vegRot:      { house: 'aman', title: '一车菜淋烂了', size: 'small', wet: true },
  newWheel:    { house: 'aman', title: '换一副车轮', size: 'big' },
  paints:      { house: 'qiao', title: '买画纸颜料', size: 'small' },
  tuition:     { house: 'qiao', title: '镇上学画的束脩', size: 'big' },
  brokeWare:   { house: 'qiao', title: '赔打碎的货', size: 'small' },
  sendHome:    { house: 'qiao', title: '给家里捎钱', size: 'mid' },
  hullLeak:    { house: 'zhou', title: '船底漏了', size: 'big', wet: true },
  newPole:     { house: 'zhou', title: '换一根新篙', size: 'small' },
  netTorn:     { house: 'zhou', title: '渔网破了', size: 'small' },
  jointAche:   { house: 'zhou', title: '风湿犯了抓药', size: 'mid', seasons: [2, 3] },
  basketWorn:  { house: 'yun', title: '茶篓坏了', size: 'small' },
  frostBite:   { house: 'yun', title: '茶苗冻了', size: 'mid', seasons: [3] },
  wokCrack:    { house: 'yun', title: '炒茶锅裂了', size: 'mid' },
  pathSlip:    { house: 'yun', title: '山路塌了一段', size: 'mid', wet: true },
  overstock:   { house: 'shop', title: '进货压了本', size: 'mid' },
  dampGoods:   { house: 'shop', title: '货受了潮', size: 'mid', wet: true },
  ratBags:     { house: 'shop', title: '老鼠咬破米袋', size: 'small' },
  illness:     { house: null, title: '病了抓药', size: 'mid' },
  leakyRoof:   { house: null, title: '房子漏雨', size: 'mid', wet: true },
  kinBorrow:   { house: null, title: '亲戚上门借钱', size: 'mid' },
  feast:       { house: null, title: '人情随礼', size: 'small' },
  winterWear:  { house: null, title: '置办冬衣', size: 'small', seasons: [2, 3] },
  stoveFix:    { house: null, title: '灶塌了要重砌', size: 'small' },
});

/** 存档里留几笔最近的大开销（借钱的缘由、事后的痕迹从这里找）。 */
export const SPENT_KEEP = 24;
