// 成就登记表：只声明听哪件事、如何计数；规则引擎统一结算，不散落在各玩法中。
// where是事实字段匹配，amount是累加字段；没有amount时每次记一次。
// when 是事实以外的条件（G-31 的暗成就）：wet 下着雨，hours [从, 到) 分钟，perDay 只数当天的（第二天从头数），
// prefix 是某个字段以这几个字开头（送的是鱼）。hidden 是暗成就，没得之前只露 clue 那一句线索。
// 每个成就的话、对口的村民、大成的称号在 content/achievement-text.js。
import { CALENDAR } from './calendar.js';

/** 住满一整年要过几个清早：跟着日历走，季节天数改了这里也跟着变（G-31 回稿按 60 天写的）。 */
const YEAR_DAYS = CALENDAR.seasonDays * CALENDAR.seasons.length;

/** 图鉴和收集的成就：听图鉴插件发的 catalog.got。 */
const book = (id, name, where, goal) => ({ id, name, event: 'catalog.got', where, goal });
/** 暗成就：没得之前册子里只有「？？」和 clue。 */
const hide = (id, name, event, more, clue) => ({
  id,
  name,
  event,
  goal: 1,
  ...more,
  hidden: true,
  clue,
});

export const ACHIEVEMENTS = [
  { id: 'soil1', name: '第一锄', event: 'plot.tilled', goal: 1 },
  { id: 'soil20', name: '一方良田', event: 'plot.tilled', goal: 20 },
  { id: 'seed1', name: '春种', event: 'plot.sown', goal: 1 },
  { id: 'seed30', name: '种下盼头', event: 'plot.sown', goal: 30 },
  { id: 'water20', name: '细水长流', event: 'plot.watered', goal: 20 },
  { id: 'harvest1', name: '第一把青菜', event: 'crop.harvested', amount: 'n', goal: 1 },
  { id: 'harvest30', name: '满筐新鲜', event: 'crop.harvested', amount: 'n', goal: 30 },
  { id: 'cook1', name: '灶火初燃', event: 'meal.cooked', goal: 1 },
  { id: 'cook10', name: '十顿家常', event: 'meal.cooked', goal: 10 },
  { id: 'servings30', name: '一桌好饭', event: 'meal.cooked', amount: 'servings', goal: 30 },
  { id: 'recipes5', name: '五味入册', event: 'meal.cooked', where: { first: true }, goal: 5 },
  { id: 'great1', name: '火候正好', event: 'meal.cooked', where: { quality: 'great' }, goal: 1 },
  { id: 'seasonal5', name: '不时不食', event: 'meal.cooked', where: { seasonal: true }, goal: 5 },
  { id: 'eat10', name: '好好吃饭', event: 'meal.eaten', where: { snack: false }, goal: 10 },
  { id: 'forage1', name: '山野有味', event: 'forage.finished', goal: 1 },
  { id: 'forage20', name: '熟悉的竹径', event: 'forage.finished', goal: 20 },
  {
    id: 'fish1',
    name: '浮漂一沉',
    event: 'fish.caught',
    where: { thing: false },
    amount: 'n',
    goal: 1,
  },
  {
    id: 'fish10',
    name: '鱼篓渐满',
    event: 'fish.caught',
    where: { thing: false },
    amount: 'n',
    goal: 10,
  },
  { id: 'weave1', name: '一压一挑', event: 'home.worked', where: { id: 'weave' }, goal: 1 },
  { id: 'pickle1', name: '留住时鲜', event: 'home.worked', where: { id: 'pickle' }, goal: 1 },
  { id: 'coop1', name: '院里咕咕', event: 'home.worked', where: { id: 'buildCoop' }, goal: 1 },
  { id: 'eggs6', name: '六枚温蛋', event: 'eggs.collected', amount: 'n', goal: 6 },
  { id: 'gift1', name: '端给邻居', event: 'gift.given', goal: 1 },
  { id: 'gift10', name: '有来有往', event: 'gift.given', goal: 10 },
  { id: 'talk10', name: '街坊旧识', event: 'person.talked', where: { gained: true }, goal: 10 },
  { id: 'days7', name: '住熟了', event: 'day.started', goal: 7 },
  { id: 'level5', name: '手上见真章', event: 'skill.leveled', goal: 5 },
  // 开局给的性情记在人物档案里，不再算「得了特质」；剩下做出来的六个历练，得两个就算（原先是开局两个加做出来两个）
  { id: 'trait4', name: '活出本色', event: 'trait.gained', goal: 2 },
  // 图鉴和收集（Gemini G-10）：都听图鉴插件发的 catalog.got，只有还东西听 gift.given
  book('book.fish3', '初识水色', { page: 'fish', first: true }, 3),
  book('book.fresh1', '鲜货入篓', { river: 'fresh' }, 1),
  book('book.snag3', '挂底也有趣', { snag: true }, 3),
  book('book.wild5', '路边有眼', { page: 'wild', first: true }, 5),
  book('book.rain1', '雨后寻鲜', { rainFind: true }, 1),
  book('book.fine1', '头一茬极品', { wildFine: true }, 1),
  book('book.haul8', '满载而归', { haul: true }, 1),
  book('book.garden1', '一畦金光', { page: 'garden', fine: true }, 1),
  book('book.fish8', '水色熟客', { page: 'fish', first: true }, 8),
  book('book.huge1', '大家伙上钩', { grade: 'huge' }, 1),
  book('book.grades', '大小通吃', { allGrades: true }, 1),
  book('book.wild18', '山野行家', { page: 'wild', first: true }, 18),
  book('book.river7', '河底摸宝', { page: 'river', first: true }, 7),
  book('book.garden7', '七菜齐熟', { page: 'garden', first: true }, 7),
  book('book.fish13', '鱼谱满册', { page: 'fish', first: true }, 13),
  book('book.wild25', '四季山货', { page: 'wild', first: true }, 25),
  book('book.gold7', '满畦金穗', { page: 'garden', fineFirst: true }, 7),
  {
    id: 'book.shuttle',
    name: '物归原主',
    event: 'gift.given',
    where: { item: 'shuttle', to: 'gui' },
    goal: 1,
  },
  // G-31 补的：每类一个大成，人情一条线加厚
  { id: 'harvest120', name: '岁稔年丰', event: 'crop.harvested', amount: 'n', goal: 120 },
  { id: 'recipes25', name: '灶台百味', event: 'meal.cooked', where: { first: true }, goal: 25 },
  { id: 'forage80', name: '踏遍青峰', event: 'forage.finished', goal: 80 },
  { id: 'days60', name: '四季安居', event: 'day.started', goal: YEAR_DAYS },
  { id: 'gift40', name: '满村热面', event: 'gift.given', goal: 40 },
  { id: 'passer1', name: '四海皆邻', event: 'passer.picked', where: { end: 'ok' }, goal: 1 },
  { id: 'passer5', name: '留客一程', event: 'passer.picked', where: { end: 'ok' }, goal: 5 },
  { id: 'guest5', name: '蓬荜生辉', event: 'yard.guest', goal: 5 },
  { id: 'aroma5', name: '循香而来', event: 'aroma.served', where: { ok: true }, goal: 5 },
  // 暗成就（G-31 的九个里八个；「滴水不漏」要数连着几天，先不做；「掌柜的偏爱」照回稿的替代，给小乔送鱼）
  hide(
    'h.rainHuge',
    '雨中巨物',
    'catalog.got',
    { where: { grade: 'huge' }, when: { wet: true } },
    '大雨淋湿斗笠，鱼竿弯了',
  ),
  hide(
    'h.sixGifts',
    '六户跑遍',
    'gift.given',
    { goal: 6, when: { perDay: true } },
    '一天之内，六扇院门全敲遍',
  ),
  hide(
    'h.snagDay',
    '空钩见旧物',
    'catalog.got',
    { where: { snag: true }, goal: 3, when: { perDay: true } },
    '今天河神不给鱼，只给破烂',
  ),
  hide(
    'h.lateMeal',
    '深夜一碗面',
    'meal.eaten',
    { where: { snack: false }, when: { hours: [1320, 1440] } },
    '全村熄灯后，灶火还亮着',
  ),
  hide(
    'h.qiaoFish',
    '掌柜的偏爱',
    'gift.given',
    { where: { to: 'qiao' }, goal: 3, when: { prefix: { item: 'fish.' } } },
    '杂货铺那只猫，冲你摇了尾巴',
  ),
  hide(
    'h.rainTill',
    '冒雨挖土',
    'plot.tilled',
    { goal: 5, when: { wet: true } },
    '雨点打在泥块上，你没停手',
  ),
  hide(
    'h.firstGreat',
    '一锅出极品',
    'meal.cooked',
    { where: { first: true, quality: 'great' } },
    '头一回试手，便恰到好处',
  ),
  hide(
    'h.dawnFish',
    '晨雾头一竿',
    'fish.caught',
    { where: { thing: false }, when: { hours: [360, 420] } },
    '河面还浮着白雾，漂先动了',
  ),
  { id: 'festival1', name: '赶上一回好日子', event: 'festival.finished', goal: 1, future: true },
  { id: 'festival4', name: '四时相聚', event: 'festival.finished', goal: 4, future: true },
];

/** 成就的七类（G-10）：成就页顶上按这几类筛，每类一个图标（art/achievement-icons.js）。 */
export const ACHIEVEMENT_KINDS = Object.freeze({
  farm: '种地',
  cook: '做饭',
  fish: '钓鱼',
  forage: '采集翻找',
  social: '人情',
  days: '日子',
  book: '图鉴',
});

// 哪个成就归哪类：G-10 只给了七类的名字，分法是这边定的。图鉴某一页收齐、收到多少样的归「图鉴」，
// 钓鱼、翻找时头一回碰上的归各自那一类。
// prettier-ignore
const KIND_OF = {
  farm: ['soil1', 'soil20', 'seed1', 'seed30', 'water20', 'harvest1', 'harvest30', 'book.garden1',
    'harvest120', 'h.rainTill'],
  cook: ['cook1', 'cook10', 'servings30', 'recipes5', 'great1', 'seasonal5', 'eat10', 'pickle1',
    'recipes25', 'h.lateMeal', 'h.firstGreat'],
  fish: ['fish1', 'fish10', 'book.fish3', 'book.fresh1', 'book.snag3', 'book.haul8', 'book.huge1',
    'book.grades', 'h.rainHuge', 'h.snagDay', 'h.dawnFish'],
  forage: ['forage1', 'forage20', 'book.wild5', 'book.rain1', 'book.fine1', 'forage80'],
  social: ['gift1', 'gift10', 'talk10', 'book.shuttle', 'passer1', 'passer5', 'guest5', 'aroma5',
    'gift40', 'h.sixGifts', 'h.qiaoFish'],
  days: ['days7', 'level5', 'trait4', 'weave1', 'coop1', 'eggs6', 'days60', 'festival1',
    'festival4'],
  book: ['book.fish8', 'book.wild18', 'book.river7', 'book.garden7', 'book.fish13', 'book.wild25',
    'book.gold7'],
};
for (const [kind, ids] of Object.entries(KIND_OF))
  for (const id of ids) {
    const a = ACHIEVEMENTS.find(x => x.id === id);
    if (!a) throw new Error('分类里写了没有的成就：' + id);
    a.kind = kind;
  }

/** 三档（G-31）：头一回只有演出；攒着的第二天有人提起；大成给称号、演得最足。暗成就算攒着那档。 */
export const ACHIEVEMENT_TIERS = Object.freeze({ first: '头一回', grow: '攒着', grand: '大成' });
// prettier-ignore
const TIER_OF = {
  first: ['soil1', 'seed1', 'harvest1', 'cook1', 'great1', 'pickle1', 'forage1', 'book.rain1', 'fish1',
    'book.fish3', 'book.fresh1', 'weave1', 'days7', 'gift1', 'passer1', 'festival1'],
  grand: ['book.grades', 'book.fish13', 'book.wild25', 'book.gold7', 'harvest120', 'recipes25',
    'forage80', 'days60', 'gift40', 'festival4'],
};
for (const a of ACHIEVEMENTS) {
  a.tier = TIER_OF.first.includes(a.id) ? 'first' : TIER_OF.grand.includes(a.id) ? 'grand' : 'grow';
  if (!a.kind) throw new Error('成就没归类：' + a.id);
}
