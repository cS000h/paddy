// 物品总表：能拿在手里的每一样东西。取自《稻间》0.12 的 pantry.js，键名沿用 0.12，方便对照移植；
// 只有青菜和青菜种在开工时已经另起了名字（veg.qingcai、seed.qingcai），0.12 里叫 veg、seed。
//   season 时令：在哪几季当季（0 春 1 夏 2 秋 3 冬）；null = 一年到头都有（干货、存粮）
//   nature 性味：cool 凉 | neutral 平 | warm 温，决定做出来的菜有什么好处
//   tags   风味：staple 主食、green 青菜、wild 山野、herb 香草、fragrant 香、umami 鲜、sweet 甜、
//          sour 酸、crisp 脆、spicy 辣、alert 提神、raw 能生吃、meat 肉、fishy 腥、cured 腌腊、soft 软
//   snack  直接吃的效果 {full 饱腹, energy 体力, mood 心情, buff 增益, why 一句话, water 解渴(负数是口干)}
//   keep   会放坏的东西能放几天（M5 之后才用）；size 在行囊里占几格；qty 买一回是几份
// price 是 0.12 的基准价。这里一格地只收一棵菜，所以卖价按 3 倍、买价按 4 倍折算；种子照原价。
// 数值都是游戏尺度，不是营养建议。
import { PEOPLE } from './people.js';

const food = (name, price, full, nature, tags, more = {}) => ({
  name,
  kind: 'food',
  price,
  full,
  cook: true,
  nature,
  tags,
  ...more,
});
const spice = (name, price, qty, text) => ({ name, kind: 'spice', price, qty, text });
const snack = (name, price, eat, more = {}) => ({
  name,
  kind: 'snack',
  price,
  snack: eat,
  ...more,
});
const seed = (name, price, season, more = {}) => ({ name, kind: 'seed', price, season, ...more });
const stuff = (name, kind, price, more = {}) => ({ name, kind, price, ...more });
const NO = { buy: false };

// prettier-ignore
const RAW = {
  // —— 食材
  rice: food('米', 2, 16, 'neutral', ['staple']),
  egg: food('鸡蛋', 3, 12, 'neutral', ['umami'], { short: '蛋' }),
  'veg.qingcai': food('青菜', 2, 8, 'neutral', ['green'], { season: [0, 2, 3] }),
  potato: food('土豆', 2, 14, 'neutral', ['staple'], { season: [0, 1, 2] }),
  herb: food('香草', 2, 3, 'cool', ['herb', 'fragrant', 'raw'], { season: [0, 1, 2] }),
  bean: food('豆子', 3, 12, 'neutral', ['staple']),
  shoot: food('竹笋', 4, 10, 'cool', ['wild', 'umami'], { season: [0, 3], short: '笋' }),
  shepherd: food('荠菜', 2, 6, 'cool', ['wild', 'green'], { season: [0], ...NO }),
  chive: food('韭菜', 2, 6, 'warm', ['fragrant', 'green'], { season: [0, 1] }),
  cucumber: food('黄瓜', 2, 6, 'cool', ['crisp', 'raw'], { season: [1] }),
  tomato: food('番茄', 2, 6, 'cool', ['sour', 'sweet', 'raw'], { season: [1] }),
  longbean: food('豆角', 2, 8, 'neutral', ['green'], { season: [1, 2] }),
  pumpkin: food('南瓜', 3, 16, 'warm', ['sweet', 'staple'], { season: [2] }),
  chestnut: food('栗子', 3, 12, 'warm', ['sweet'], { season: [2] }),
  mushroom: food('菌子', 3, 6, 'neutral', ['umami', 'wild'], { season: [0, 1, 2], ...NO }),
  taro: food('芋头', 2, 14, 'neutral', ['staple'], { season: [2, 3] }),
  radish: food('萝卜', 2, 8, 'cool', ['crisp', 'raw'], { season: [2, 3] }),
  cabbage: food('白菜', 2, 8, 'neutral', ['green', 'sweet', 'raw'], { season: [3] }),
  ginger: food('姜', 2, 2, 'warm', ['spicy']),
  fish: food('鱼', 5, 14, 'neutral', ['umami', 'fishy'], { keep: 1, ...NO }),
  tea: food('茶叶', 4, 0, 'cool', ['fragrant', 'alert'], { season: [0, 2], short: '茶' }),
  tofu: food('豆腐', 3, 10, 'cool', ['umami', 'raw', 'soft'], { keep: 1 }),
  // —— 肉：生的放不住；整只的要先分割（M5 之后）
  pork: food('猪肉', 9, 18, 'neutral', ['meat', 'umami'], { short: '肉', keep: 2 }),
  chicken: food('鸡肉', 8, 16, 'warm', ['meat', 'umami'], { short: '鸡', keep: 2, ...NO }),
  mutton: food('羊肉', 10, 18, 'warm', ['meat', 'fishy'], { season: [2, 3], keep: 2, ...NO }),
  bacon: food('腊肉', 12, 16, 'warm', ['meat', 'umami', 'cured'], NO),
  saltfish: food('咸鱼', 8, 12, 'neutral', ['umami', 'cured'], NO),
  wholeChicken: stuff('整只鸡', 'whole', 16, { keep: 2, cut: { to: 'chicken', n: [1, 3] } }),
  porkSlab: stuff('一刀猪肉', 'whole', 28, { keep: 3, cut: { to: 'pork', n: [3, 4] } }),
  lambLeg: stuff('羊腿', 'whole', 24, { keep: 3, season: [2, 3], cut: { to: 'mutton', n: [2, 3] } }),
  // —— 调料：不占食材的位置，一道菜最多放两勺
  salt: spice('盐', 2, 4, '腌菜、腌腊肉、晒咸鱼都离不开'),
  soy: spice('酱油', 3, 3, '红烧上色，鲜，待客体面'),
  vinegar: spice('醋', 2, 3, '酸，开胃解腻，凉拌放得住些'),
  sugar: spice('糖', 3, 3, '甜，解馋；和醋一起就是糖醋'),
  chili: spice('干辣椒', 2, 3, '辣，驱寒提神'),
  scallion: spice('葱', 1, 2, '葱香，清爽提味'),
  wine: spice('黄酒', 4, 3, '鱼肉去腥，火候更好拿捏'),
  // —— 零嘴：拿起来就能吃，带在身上正好
  cake: snack('米糕', 2, { full: 14, energy: 4, mood: 2, buff: 'treat', why: '软糯微甜', water: -3 }),
  melon: snack('西瓜', 3, { full: 6, energy: 6, mood: 4, buff: 'cool', why: '井水湃过，凉到心里', water: 22 }, { season: [1], size: 2 }),
  pickle: snack('腌菜', 3, { full: 6, energy: 2, mood: 1, buff: 'filling', why: '下饭，扛饿，就是咸', water: -6 }, NO),
  zongzi: snack('粽子', 4, { full: 22, energy: 6, mood: 3, buff: 'filling', why: '糯米实在', water: -4 }, NO),
  mooncake: snack('月饼', 4, { full: 16, energy: 4, mood: 6, buff: 'treat', why: '甜，有团圆的味道' }, NO),
  niangao: snack('年糕', 4, { full: 20, energy: 6, mood: 4, buff: 'hearty', why: '糯，顶饱' }, NO),
  bun: snack('肉包子', 3, { full: 16, energy: 5, mood: 3, buff: 'hearty', why: '早上现蒸的，肉馅流油', water: -3 }, { keep: 1 }),
  yam: snack('烤红薯', 2, { full: 14, energy: 4, mood: 3, buff: 'treat', why: '捂在手里热乎乎的', water: -3 }, { season: [2, 3] }),
  candy: snack('麦芽糖', 2, { full: 2, energy: 1, mood: 5, buff: 'treat', why: '甜得粘牙', water: -4 }),
  // —— 种子（播种的季节）
  'seed.qingcai': seed('青菜种子', 2, [0, 2], { crop: 'qingcai', short: '菜种' }),
  seedCuke: seed('黄瓜种', 3, [1]),
  seedBean: seed('豆角种', 3, [1]),
  seedPumpkin: seed('南瓜种', 4, [0]),
  seedRadish: seed('萝卜种', 2, [2]),
  seedCabbage: seed('白菜种', 2, [2, 3]),
  seedChive: seed('韭菜根', 4, [0, 1]),
  // —— 材料和手艺活
  wood: stuff('柴', 'material', 2),
  log: stuff('木头', 'material', 2, { ...NO, text: '山上砍的，回院劈开就是柴' }),
  ash: stuff('草木灰', 'material', 0, { carry: false, text: '灶膛里掏出来的，撒在菜畦里能肥地、防虫' }),
  compost: stuff('堆肥', 'material', 0, { carry: false, text: '烂菜叶、馊饭沤出来的，最肥地' }),
  strip: stuff('竹篾', 'material', 1, NO),
  basket: stuff('竹篮', 'craft', 8, NO),
  leaf: stuff('箬叶', 'material', 1, { ...NO, season: [1] }),
  parcel: stuff('菜包', 'material', 0, NO),
  // —— 工具
  umbrella: stuff('油纸伞', 'tool', 8, { sell: false }),
  flask: stuff('竹筒水壶', 'tool', 4, { sell: false, text: '装进行囊，渴了随时喝' }),
};

const finish = ([id, d]) => {
  const buyable = d.buy !== false && d.price > 0;
  const sellable = d.sell !== false && d.price > 0 && d.kind !== 'seed';
  return [
    id,
    Object.freeze({
      id,
      cook: false,
      full: 0,
      carry: true,
      size: 1,
      qty: 1,
      season: null,
      nature: null,
      short: d.name,
      snack: null,
      keep: 0,
      text: '',
      ...d,
      tags: Object.freeze([...(d.tags || [])]),
      buy: buyable ? (d.kind === 'seed' ? d.price : d.price * 4) : 0,
      sell: sellable ? d.price * 3 : 0,
    }),
  ];
};

export const ITEMS = Object.freeze(Object.fromEntries(Object.entries(RAW).map(finish)));

/** 这样东西此刻当不当季：有时令、而且现在正是。 */
export const seasonal = (id, season) => !!ITEMS[id].season && ITEMS[id].season.includes(season);
/** 这一季有没有（没有时令的一年到头都有）。 */
export const inSeason = (id, season) => !ITEMS[id].season || ITEMS[id].season.includes(season);

/**
 * 拿起来直接吃是什么效果；不能直接吃返回 null。
 * 零嘴照它自己的写法；带 raw 的食材能生吃，只顶七成饱，脆的、酸的还解一点渴。
 */
export function eatenAs(id) {
  const item = ITEMS[id];
  if (!item) return null;
  if (item.snack) return { water: 0, buff: null, ...item.snack };
  if (!item.tags.includes('raw')) return null;
  const juicy = item.tags.includes('crisp') || item.tags.includes('sour');
  return {
    full: Math.round(item.full * 0.7),
    energy: 1,
    mood: 0,
    buff: null,
    why: juicy ? '洗一洗生着吃，脆生生的' : '洗一洗生着吃，清清淡淡',
    water: juicy ? 5 : 0,
  };
}

// 有人正用得上的东西（石伯编筐要竹篾），不是吃的也送得出手。
const WANTED = new Set(
  Object.values(PEOPLE).flatMap(person => ('treats' in person ? person.treats : [])),
);

/** 拿得出手的东西：吃的、零嘴、手艺活，和有人用得上的材料。种子、柴火、工具不好拿去送人。 */
export const giftable = id =>
  !!ITEMS[id] && (['food', 'snack', 'craft'].includes(ITEMS[id].kind) || WANTED.has(id));

/** 阿满肯收的东西：能卖的吃食和手艺活。 */
export const basketTakes = id =>
  ['food', 'snack', 'craft'].includes(ITEMS[id]?.kind) && ITEMS[id].sell > 0;

// 开局家里有的东西（0.12 的开局存粮），和身上带的。
export const START_STORE = Object.freeze({
  rice: 3,
  'veg.qingcai': 2,
  egg: 2,
  potato: 2,
  herb: 1,
  bean: 1,
  wood: 4,
  salt: 4,
});
export const START_PACK = Object.freeze({ 'seed.qingcai': 12, cake: 2 });

// 托阿满捎得到的东西（村口的杂货铺开张之前，买东西只有这一条路）。
export const BASKET_WARES = Object.freeze([
  'seed.qingcai',
  'rice',
  'egg',
  'potato',
  'bean',
  'tofu',
  'ginger',
  'wood',
  'salt',
  'soy',
  'vinegar',
  'sugar',
  'chili',
  'scallion',
  'wine',
  'cake',
  'candy',
  'flask',
]);
