// 图鉴（Gemini G-10）：鱼谱、河里、山货、菜园四页，每一样一句话和没找到时的线索。只有数据。
// 规则在 sim/plugins/catalog.js：收到一样东西就记一笔（第几回、头一回哪天、见没见过极品、鱼见过哪几档）。
// 彩头一页等 G-06 做彩头时再加。两边都有的东西只收一处：螺蛳、河蚌在「河里」，柳条、鹅卵石在「山货」。
import { FISH, FISH_BOOK } from './fishing.js';
import { CROPS } from './items.js';

const e = (item, line, clue) => Object.freeze({ item, line, clue });

// 鱼按「溪湾 → 竹影 → 渡口」由浅入深排；一句话用鱼谱已有的（fish-text.js），这里只写线索
const FISH_CLUES = [
  ['bleak', '溪湾、竹影，夏天多'],
  ['crucian', '三处水边，一年到头'],
  ['yellowcat', '三处水边，清早傍晚'],
  ['carp', '渡口深水，爱拖漂走'],
  ['grass', '渡口深水，夏秋常见'],
  ['mandarin', '渡口深水，春天少见'],
  ['sleeper', '溪湾石边，春秋阴雨'],
  ['bitterling', '溪湾、竹影，晴天多'],
  ['topmouth', '溪湾浅水，晴天午后'],
  ['bream', '渡口早晚，阴天爱送漂'],
  ['culter', '渡口夏秋傍晚，抢漂急'],
  ['yellowtail', '竹影、渡口，阴雨清早'],
  ['catfish', '渡口傍晚，阴雨天最多'],
];

// 河里按「鲜货 → 物件 → 杂物」排；kind 给成就用（钓上来鲜货、挂上来物件杂物各算各的）
const RIVER = [
  ['shrimp', 'fresh', '半透明的小青虾，下锅一焯就红。', '溪湾、竹影，春夏早晚'],
  ['crab', 'fresh', '稻黄时节最肥，两只绒钳夹得紧。', '渡口、竹影，秋雨傍晚'],
  ['snail', 'fresh', '清明前最嫩，剪尾爆炒下饭又下酒。', '溪湾石缝，春夏雨后'],
  ['mussel', 'fresh', '老壳沉甸甸的，慢炖一锅汤头极鲜。', '渡口、溪湾，春夏水底'],
  ['shard', 'thing', '河底冲出的碎瓷，釉色清亮花纹还在。', '渡口、竹影，雨后稀罕'],
  ['oldCoin', 'thing', '带一层绿锈的老铜钱，字迹还能辨认。', '渡口深水，四季碰运气'],
  ['shuttle', 'thing', '枣木磨得油亮，桂嫂漂线时掉进水里的。', '溪湾、竹影，晴天午后'],
  ['waterweed', 'junk', '缠成一团的湿水草，沤进土里倒肥地。', '三处水边，提竿晚易挂'],
  ['oldSandal', 'junk', '不知哪家冲下来的旧草鞋，还能拆稻草。', '渡口、溪湾，雨后涨水'],
];

// 山货按「春 → 夏 → 秋 → 冬 → 四季」排；翻找的 18 样加采集点的 7 样
const WILD = [
  ['mugwort', '带着清苦香的嫩艾叶，和粉能做青团。', '路边草丛，春天翻找'],
  ['malan', '梗带微红的早春野菜，焯水切碎拌香干。', '溪畔草地，春天翻找'],
  ['brake', '拳头卷着的新蕨芽，焯去涩味脆生生的。', '背阴蕨丛，春天翻找'],
  ['shepherd', '贴地长的小锯齿野菜，切碎包馅最鲜。', '沿溪采集点，春天多'],
  ['shoot', '雨后拱出土的嫩春笋，剥壳滚汤极鲜。', '竹林采集点，春雨后'],
  ['willowTwig', '细长柔韧的新柳条，编筐扎篱笆都顺手。', '溪边柳树，春夏翻找'],
  ['tea', '带着露水的新芽尖，炒干泡水清苦回甘。', '后山茶园，春末秋初'],
  ['herb', '溪边清香的野草，入菜烤鱼都提味。', '沿溪采集点，春夏多'],
  ['wildPeach', '树上落的毛桃，个小带酸，闻着清甜。', '桃树底下，夏天翻找'],
  ['berry', '灌木里藏着的小红果，咬开酸酸甜甜。', '路边灌木，夏天翻找'],
  ['cicadaShell', '蜕在树干上的干蝉衣，药铺肯出钱收。', '夏天午后，大树干上'],
  ['lotusFlower', '粉白带露的一枝荷花，插瓶满屋清香。', '苇丛水边，夏天翻找'],
  ['leaf', '宽大清香的青竹叶，留着端午包粽子。', '竹林采集点，夏天多'],
  ['peachGum', '树干渗出的琥珀胶，泡发熬甜汤最润。', '老桃树干，夏秋翻找'],
  ['lotusPod', '剥出嫩白莲子生嚼，满嘴清甜带点苦芯。', '苇边水塘，夏秋翻找'],
  ['caltrop', '两头尖尖的水菱角，煮熟粉糯香甜。', '溪湾水边，秋天翻找'],
  ['mushroom', '松针底下撑起的小伞，炖汤满屋山林香。', '松林采集点，夏秋雨后'],
  ['chestnut', '裂开刺苞掉下来的油栗，炖肉烤着都甜。', '栗子林，秋天采集'],
  ['pinecone', '裹着松脂的硬松果，引火一点就着。', '后山松树下，秋冬多'],
  ['straw', '干爽柔韧的稻草束，编绳苫棚沤肥都行。', '草垛柴边，秋冬翻找'],
  ['camphorWood', '老樟树落下的香木块，放衣箱能防虫。', '老樟树下，四季翻找'],
  ['pineNeedles', '干松针铺菜畦保水，丢灶膛引火最快。', '松树底下，四季都有'],
  ['pebble', '溪水磨圆的石头，攒多了能铺院中小路。', '溪边石堆，四季都有'],
  ['moss', '背阴石缝里的绒绿青苔，摸着凉丝丝的。', '湿润石缝，四季都有'],
  ['earthEar', '雨后草地冒出的墨绿软片，洗净炒蛋鲜。', '雨后草地石头边'],
];

const GARDEN_LINES = {
  qingcai: ['院里最先长成的一畦青菜，清炒爽口。', '自家菜园，四季可种'],
  chive: ['割了一茬又冒一茬，切碎炒蛋香满院。', '自家菜园，春夏常收'],
  cucumber: ['顺着竹架爬藤结的脆瓜，带刺咬着多汁。', '自家菜园，夏天搭架种'],
  longbean: ['一串串垂在藤上的长豆角，焖炖最入味。', '自家菜园，夏天收成'],
  pumpkin: ['贴地滚圆的甜南瓜，煮粥软糯暖胃。', '自家菜园，秋天收成'],
  radish: ['半截露在土外的白萝卜，冬日炖汤赛人参。', '自家菜园，秋冬收成'],
  cabbage: ['霜打过才甜的大白菜，冬里存着慢慢吃。', '自家菜园，冬天收成'],
};

/**
 * 图鉴的几页。entries 里每一样：item 物品编号（寻常的那份），line 那一句，clue 没找到时的线索；
 * 鱼另有 fish（鱼的编号），河里的另有 kind（fresh 鲜货、thing 物件、junk 杂物）。
 */
export const CATALOG = Object.freeze([
  Object.freeze({
    id: 'fish',
    name: '鱼谱',
    head: '河溪里的生灵，钓过一回便记入册',
    done: '三处水湾的鱼，你全都摸透了脾气。',
    entries: Object.freeze(
      FISH_CLUES.map(([id, clue]) =>
        Object.freeze({ ...e(FISH[id].item, FISH_BOOK[id], clue), fish: id }),
      ),
    ),
  }),
  Object.freeze({
    id: 'river',
    name: '河里',
    head: '水底沉着的不止鱼，还有村里的旧物件',
    done: '河底藏着的光景，竟被你钩了个遍。',
    entries: Object.freeze(
      RIVER.map(([item, kind, line, clue]) => Object.freeze({ ...e(item, line, clue), kind })),
    ),
  }),
  Object.freeze({
    id: 'wild',
    name: '山货',
    head: '山林路边、溪畔草丛里的时令风物',
    done: '四季山野有什么，你闭着眼都找得出。',
    entries: Object.freeze(WILD.map(([item, line, clue]) => e(item, line, clue))),
  }),
  Object.freeze({
    id: 'garden',
    name: '菜园',
    head: '自家一畦土里，顺着节气长出的菜',
    done: '七样家常菜全收过，小院算真扎下根了。',
    // 按长得快慢排
    entries: Object.freeze(
      Object.values(CROPS)
        .toSorted((a, b) => a.days - b.days)
        .map(c => e(c.produce, ...GARDEN_LINES[c.id])),
    ),
  }),
]);

/** 物品编号 → 它在图鉴里的哪一页、哪一条。 */
export const CATALOG_INDEX = Object.freeze(
  Object.fromEntries(
    CATALOG.flatMap(page => page.entries.map(entry => [entry.item, { page: page.id, entry }])),
  ),
);

/** 一天钓上几条算「满载而归」。 */
export const CATALOG_HAUL = 8;

/** 雨后翻出、采到这几样算「雨后寻鲜」。 */
export const RAIN_FINDS = Object.freeze(['earthEar', 'shoot']);
