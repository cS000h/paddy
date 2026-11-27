// 数量和概率沿用0.12；售价仍沿用本工程统一的物品价。
export const STAPLES = {
  rice: [6, 10],
  bean: [3, 6],
  egg: [3, 6],
  salt: [3, 5],
  soy: [2, 4],
  vinegar: [2, 4],
  sugar: [2, 3],
  chili: [2, 4],
  scallion: [2, 4],
  ginger: [2, 4],
  wood: [4, 8],
  tofu: [3, 5],
};
export const SOMETIMES = { wine: 0.6, umbrella: 0.8, flask: 0.5 };
export const FRESH = ['tofu', 'bun', 'pork', 'wholeChicken', 'lambLeg', 'porkSlab'];
export const TEAS = [
  ['粗茶', '一碗粗茶，苦里带甜'],
  ['凉茶', '井水湃过的凉茶，一口下去暑气全消'],
  ['菊花茶', '菊花茶，清清的'],
  ['姜茶', '一碗滚烫的姜茶，辣得人冒汗'],
];

// 茶摊上能做的事。规则按这里的数结算，面板也照着这里写说明，两边不会说法不一。
//   coins 花钱（负）或挣钱、water 解渴、mood 心情、relation 和陪你的人熟悉多少、
//   minutes 花掉的时辰；hawk 的 until 是阿满收摊的钟点。
export const TEA_DEEDS = Object.freeze({
  drink: { label: '要一碗{tea}', act: '喝茶', coins: -1, water: 40, mood: 2 },
  chess: { label: '和老人下盘棋', act: '坐下', minutes: 180, mood: 4, relation: 1 },
  hawk: {
    label: '帮阿满吆喝',
    act: '坐下',
    minutes: 180,
    coins: 3,
    mood: 2,
    relation: 1,
    until: 12 * 60,
  },
  listen: { label: '听茶客闲聊', act: '坐下', note: '不花时辰，每天一回' },
});

// 铺子收东西（规则在 sim/plugins/market.js）：钱从铺子的钱匣出，钱匣不够就收不了。
// 每天每一类收几份照原价（TAKES），再多就只给半价，收满两倍就不收了。
// 铺子收进的货第二天清早转手卖到外头，按当初给的钱多一成回到钱匣（RESALE）。
// 茶摊只卖不收。
export const TAKES = Object.freeze({ fish: 5, food: 8, snack: 4, craft: 3, whole: 2, other: 4 });
export const RESALE = 1.1;
export const TAKE_WORDS = Object.freeze({
  tea: '茶摊只卖茶点，不收东西。卖东西去村口杂货铺',
  broke: '铺子钱匣里没那么多现钱了，今儿收不动',
  full: '这样东西今天铺子收够了，明天再来',
  half: '今天收得多了，只给半价',
});
