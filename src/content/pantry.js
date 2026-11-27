// 物品总表：能拿在手里的每一样东西。取自《稻间》0.12 的 pantry.js，键名沿用 0.12，方便对照移植；
// 只有青菜和青菜种在开工时已经另起了名字（veg.qingcai、seed.qingcai），0.12 里叫 veg、seed。
//   season 时令：在哪几季当季（0 春 1 夏 2 秋 3 冬）；null = 一年到头都有（干货、存粮）
//   nature 性味：cool 凉 | neutral 平 | warm 温，决定做出来的菜有什么好处
//   tags   风味：staple 主食、green 青菜、wild 山野、herb 香草、fragrant 香、umami 鲜、sweet 甜、
//          sour 酸、crisp 脆、spicy 辣、alert 提神、raw 能生吃、meat 肉、fishy 腥、cured 腌腊、soft 软
//   snack  直接吃的效果 {full 饱腹, energy 体力, mood 心情, buff 增益, why 一句话, water 解渴(负数是口干)}
//   keep   会放坏的东西能放几天（M5 之后才用）；size 在行囊里占几格；qty 买一回是几份
// price 是 0.12 的基准价。买价按 4 倍折算，种子照原价；卖价鱼虾蟹按 1.5 倍、别的按 2 倍（SELL_RATE），
// 勤快一天大约挣 30–50 文，村里人家一天才进三四文。
// 数值都是游戏尺度，不是营养建议。
import { PEOPLE } from './people.js';
import { FINE_ITEMS, FINE_PRICE, fineId } from './quality.js';
import { FOUND_OWNERS } from './fish-catch.js';
import { PRIZES, PRIZE_PRICE, prizeId } from './prizes.js';

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
  // 钓上来的六种鱼（见 content/fishing.js）。kin：下锅配菜名、送人看合不合心意时都算「鱼」
  'fish.bleak': food('白条', 2, 8, 'neutral', ['umami', 'fishy'], { keep: 1, kin: 'fish', ...NO }),
  'fish.crucian': food('鲫鱼', 4, 12, 'neutral', ['umami', 'fishy'], { keep: 1, kin: 'fish', ...NO }),
  'fish.yellowcat': food('昂刺鱼', 5, 12, 'neutral', ['umami', 'fishy'], { keep: 1, kin: 'fish', short: '昂刺', ...NO }),
  'fish.carp': food('鲤鱼', 6, 16, 'neutral', ['umami', 'fishy'], { keep: 1, kin: 'fish', ...NO }),
  'fish.grass': food('草鱼', 7, 18, 'neutral', ['umami', 'fishy'], { keep: 1, kin: 'fish', ...NO }),
  'fish.mandarin': food('鳜鱼', 12, 16, 'neutral', ['umami', 'fishy'], { keep: 1, kin: 'fish', ...NO }),
  // G-09 新加的七种鱼
  'fish.sleeper': food('塘鳢鱼', 6, 10, 'neutral', ['umami', 'fishy'], { keep: 1, kin: 'fish', short: '塘鳢', ...NO }),
  'fish.bitterling': food('鳑鲏', 1, 4, 'neutral', ['umami', 'fishy'], { keep: 1, kin: 'fish', ...NO }),
  'fish.topmouth': food('麦穗鱼', 1, 4, 'neutral', ['umami', 'fishy'], { keep: 1, kin: 'fish', short: '麦穗', ...NO }),
  'fish.bream': food('鳊鱼', 6, 14, 'neutral', ['umami', 'fishy'], { keep: 1, kin: 'fish', ...NO }),
  'fish.culter': food('翘嘴', 8, 14, 'neutral', ['umami', 'fishy'], { keep: 1, kin: 'fish', ...NO }),
  'fish.yellowtail': food('黄尾鲴', 5, 12, 'neutral', ['umami', 'fishy'], { keep: 1, kin: 'fish', short: '黄尾', ...NO }),
  'fish.catfish': food('鲶鱼', 6, 16, 'neutral', ['umami', 'fishy', 'soft'], { keep: 1, kin: 'fish', ...NO }),
  // 钓鱼时拉上来的河鲜：跟鱼一起装进鱼篓（creel），下锅不算「鱼」
  shrimp: food('河虾', 4, 5, 'warm', ['umami', 'sweet'], { season: [0, 1], keep: 1, creel: true, ...NO }),
  crab: food('毛蟹', 8, 8, 'cool', ['umami', 'fishy'], { season: [2], keep: 1, creel: true, ...NO }),
  tea: food('茶叶', 4, 0, 'cool', ['fragrant', 'alert'], { season: [0, 2], short: '茶' }),
  // 走图翻找、路边捡到的野货（见 content/search.js；名单照 G-08）
  wildPeach: food('野桃', 2, 6, 'warm', ['sweet', 'crisp', 'raw'], { season: [1], ...NO }),
  peachGum: food('桃胶', 3, 4, 'neutral', ['sweet', 'soft'], { season: [1, 2], ...NO, text: '泡发了熬甜汤；路边的胶不干净，别生吃' }),
  mugwort: food('艾草', 2, 2, 'warm', ['herb', 'fragrant'], { season: [0], ...NO, text: '捣出汁来和糯米粉，就是青团' }),
  malan: food('马兰头', 2, 5, 'cool', ['wild', 'green', 'fragrant'], { season: [0], ...NO }),
  berry: food('野莓', 2, 3, 'neutral', ['sweet', 'sour', 'raw'], { season: [1], keep: 1, ...NO }),
  brake: food('蕨菜', 2, 5, 'cool', ['wild', 'green', 'crisp'], { season: [0], ...NO }),
  snail: food('螺蛳', 3, 6, 'cool', ['umami', 'fishy'], { season: [0, 1], keep: 1, ...NO }),
  mussel: food('河蚌', 4, 8, 'cool', ['umami', 'fishy', 'soft'], { season: [0, 1], keep: 1, ...NO }),
  lotusPod: food('莲蓬', 3, 5, 'neutral', ['sweet', 'crisp', 'raw'], { season: [1, 2], ...NO }),
  caltrop: food('菱角', 3, 10, 'cool', ['sweet', 'soft', 'staple'], { season: [2], ...NO }),
  earthEar: food('地耳', 3, 4, 'cool', ['wild', 'umami', 'soft'], { season: [0, 1, 2], ...NO }),
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
  seedCuke: seed('黄瓜种', 3, [1], { crop: 'cucumber' }),
  seedBean: seed('豆角种', 3, [1], { crop: 'longbean' }),
  seedPumpkin: seed('南瓜种', 4, [0], { crop: 'pumpkin' }),
  seedRadish: seed('萝卜种', 2, [2], { crop: 'radish' }),
  seedCabbage: seed('白菜种', 2, [2, 3], { crop: 'cabbage' }),
  seedChive: seed('韭菜根', 4, [0, 1], { crop: 'chive' }),
  // —— 材料和手艺活
  wood: stuff('柴', 'material', 2),
  log: stuff('木头', 'material', 2, { ...NO, text: '山上砍的，回院劈开就是柴' }),
  ash: stuff('草木灰', 'material', 0, { carry: false, text: '灶膛里掏出来的，撒在菜畦里能肥地、防虫' }),
  compost: stuff('堆肥', 'material', 0, { carry: false, text: '烂菜叶、馊饭沤出来的，最肥地' }),
  strip: stuff('竹篾', 'material', 1, NO),
  basket: stuff('竹篮', 'craft', 8, NO),
  leaf: stuff('箬叶', 'material', 1, { ...NO, season: [1] }),
  parcel: stuff('菜包', 'material', 0, NO),
  camphorWood: stuff('樟木块', 'material', 3, { ...NO, text: '放进衣箱防虫，闻着清香；以后修院子用得上' }),
  pinecone: stuff('松果', 'material', 1, { ...NO, season: [2, 3], text: '松脂多，一点就着；攒着以后修院子' }),
  pineNeedles: stuff('松针', 'material', 1, { ...NO, text: '干松针引火最快，铺在菜畦里也好' }),
  willowTwig: stuff('柳条', 'material', 1, { ...NO, season: [0, 1], text: '柔韧，编筐、扎篱笆都用得上' }),
  cicadaShell: stuff('知了壳', 'material', 5, { ...NO, season: [1], text: '药铺收，晒干了值几个钱' }),
  lotusFlower: stuff('荷花', 'material', 3, { ...NO, season: [1], text: '插在瓶里，满屋清香' }),
  pebble: stuff('鹅卵石', 'material', 1, { ...NO, text: '圆润光滑，攒多了能铺院里的小路' }),
  moss: stuff('青苔', 'material', 1, { ...NO, text: '绒绒的，修院子时点缀在石缝里' }),
  straw: stuff('稻草', 'material', 1, { ...NO, season: [2, 3], text: '编草绳、苫草棚，沤了能肥地' }),
  // 钓鱼时钩上来的（G-09）
  waterweed: stuff('水草团', 'material', 0, { ...NO, text: '湿漉漉一大团。放回家里，给菜地施肥时当肥用' }),
  oldSandal: stuff('破草鞋', 'material', 0, { ...NO, text: '谁家冲下来的。工作台上拆开，还有两把稻草' }),
  shard: stuff('青瓷片', 'material', 5, { ...NO, text: '天青釉的碎瓷，花纹清清楚楚。杂货铺收，小乔见了准喜欢' }),
  oldCoin: stuff('旧铜钱', 'material', 4, { ...NO, text: '带绿锈的老钱，字还认得出。杂货铺按古钱收' }),
  shuttle: stuff('木头梭子', 'material', 0, { ...NO, text: '绕着麻线的织补梭，像是谁家掉的' }),
  // 走图翻找碰上的失物（G-08 小事 1–8）：卖不了，送还给失主
  pipe: stuff('旧铜烟袋', 'material', 0, { ...NO, text: '竹杆铜锅，烟嘴缠着半圈旧红线。像是撑船人的' }),
  kite: stuff('墨猫风筝', 'material', 0, { ...NO, text: '白宣纸糊的燕子风筝，上头画着只歪头小猫' }),
  thimble: stuff('旧银顶针', 'material', 0, { ...NO, text: '磨出深凹痕，还缠着两寸蓝布线' }),
  purse: stuff('粗麻荷包', 'material', 0, { ...NO, text: '打着补丁，里头十几文钱和一张菜账条' }),
  stripKnife: stuff('弯嘴篾刀', 'material', 0, { ...NO, text: '磨得雪亮，木柄包着厚厚一层汗渍' }),
  sachet: stuff('茶花药囊', 'material', 0, { ...NO, text: '淡青粗布，闻着有艾叶薄荷香，角上绣朵小茶花' }),
  bell: stuff('铜铃红绳', 'material', 0, { ...NO, text: '朱红丝头绳系颗小铜铃，像是猫项圈' }),
  tally: stuff('记账木牌', 'material', 0, { ...NO, text: '杉木牌，炭笔记着各家斤两' }),
  // —— 工具
  umbrella: stuff('油纸伞', 'tool', 8, { sell: false }),
  flask: stuff('竹筒水壶', 'tool', 4, { sell: false, text: '装进行囊，渴了随时喝' }),
  // —— 饵
  worm: stuff('蚯蚓', 'bait', 0, { ...NO, text: '挂在钩上钓鱼：咬钩快，大鱼多。锄地、雨后翻石头能翻出来' }),
};

/** 卖价是基准价的几倍：鱼虾蟹好钓、一钓一串，压低一些。 */
export const SELL_RATE = Object.freeze({ fish: 1.5, other: 2 });
const watery = (id, d) => id === 'fish' || d.kin === 'fish' || !!d.creel;

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
      fine: null,
      prize: null,
      kin: null,
      ...d,
      tags: Object.freeze([...(d.tags || [])]),
      buy: buyable ? (d.kind === 'seed' ? d.price : d.price * 4) : 0,
      sell: sellable
        ? Math.max(1, Math.round(d.price * SELL_RATE[watery(id, d) ? 'fish' : 'other']))
        : 0,
    }),
  ];
};

// 极品（见 content/quality.js）：样样照着寻常的那份，名字前加「极品」，价钱翻倍，买不到；fine 记着原来是哪样。
const FINE = FINE_ITEMS.map(id => {
  const d = RAW[id];
  const fine = { ...d, name: '极品' + d.name, short: '极品' + (d.short || d.name), fine: id };
  return [fineId(id), { ...fine, price: d.price * FINE_PRICE, buy: false }];
});

// 彩头（见 content/prizes.js）：照着寻常的那份，换个名字，价钱再翻几倍，买不到；也记着原来是哪样，
// 下锅、送人都照原来那样算，火候也跟极品一样好拿捏。
const PRIZE = Object.entries(PRIZES).map(([id, d]) => {
  const base = RAW[d.item];
  const more = { name: d.name, short: d.name, fine: d.item, prize: id, buy: false };
  return [prizeId(id), { ...base, ...more, price: base.price * PRIZE_PRICE }];
});

export const ITEMS = Object.freeze(
  Object.fromEntries([...Object.entries(RAW), ...FINE, ...PRIZE].map(finish)),
);

/** 铺子收东西时算哪一类（每类每天收几份见 content/market.js 的 TAKES）。 */
export const takeKind = id => {
  const d = ITEMS[id];
  if (watery(id, d)) return 'fish';
  return ['food', 'snack', 'craft', 'whole'].includes(d.kind) ? d.kind : 'other';
};

/** 极品认作原来那样（下锅配菜名、送人看合不合心意）；寻常的原样返回。 */
export const plainOf = id => ITEMS[id]?.fine || id;

/** 下锅配菜名、送人看合不合心意时算作哪样：极品照原来那样，各种鱼都算「鱼」（菜谱、各人爱吃的写的是鱼）。 */
export const kindOf = id => ITEMS[plainOf(id)]?.kin || plainOf(id);

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

// 有人正用得上的东西（石伯编筐要竹篾），不是吃的也送得出手；别人掉了的东西也得能还回去。
const WANTED = new Set([
  ...Object.values(PEOPLE).flatMap(person => ('treats' in person ? person.treats : [])),
  ...Object.keys(FOUND_OWNERS),
]);

/** 拿得出手的东西：吃的、零嘴、手艺活，和有人用得上的材料。种子、柴火、工具不好拿去送人。 */
export const giftable = id =>
  !!ITEMS[id] && (['food', 'snack', 'craft'].includes(ITEMS[id].kind) || WANTED.has(id));

/**
 * 带着竹篮出门时装进篮里的东西：路边翻到、采集点采到的野货，和鸡蛋（极品照原来那样算）。
 * 篮子里的连篮子只占行囊一格，跟鱼篓一个道理；没带篮子照旧一样占一格。竹篮在工作台上用竹篾编。
 */
export const BASKET_GOODS = Object.freeze([
  'herb',
  'shepherd',
  'shoot',
  'mushroom',
  'chestnut',
  'tea',
  'leaf',
  'egg',
  'wildPeach',
  'peachGum',
  'camphorWood',
  'pinecone',
  'pineNeedles',
  'willowTwig',
  'mugwort',
  'malan',
  'berry',
  'brake',
  'snail',
  'mussel',
  'cicadaShell',
  'lotusPod',
  'caltrop',
  'lotusFlower',
  'pebble',
  'moss',
  'straw',
  'earthEar',
]);

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
