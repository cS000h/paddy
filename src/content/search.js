// 走图翻找：路边的树、竹、苇、花、灌木、蕨丛、石头、荷叶，院里的草垛、稻草人、瓜棚，每处每天能翻一回。
// 不是处处都有东西：每天清早全村只有几处有「动静」（叶子一晃、草里一闪），翻那几处多半翻得出东西，
// 偶尔碰上一件小事；别处翻了多半只冒一句话，连着几处没翻到，机会慢慢加。
// 名单和翻到时那句照 Gemini 的 G-08 回稿。只有数据；怎么抽在 sim/plugins/search.js。

/** 地图上的物件 → 翻找的哪一类。院里那一类只认自家小院（杂货铺门口的草垛是人家的）。 */
export const SEARCH_KINDS = Object.freeze({
  'tree.peach': 'peach',
  'tree.camphor': 'camphor',
  'tree.broad': 'broad',
  'tree.pine': 'pine',
  'tree.willow': 'willow',
  bamboo: 'bamboo',
  flowers: 'flowers',
  reeds: 'reeds',
  bush: 'bush',
  fern: 'fern',
  rock: 'rock',
  rockPile: 'rock',
  lotus: 'lotus',
  haystack: 'yard',
  scarecrow: 'yard',
  trellis: 'yard',
});

/** 只在自家小院这张图上才翻得的类：院里的草垛、稻草人、瓜棚是自家的，杂货铺门口的草垛是人家的。 */
export const HOME_ONLY = Object.freeze(['yard']);
export const OWN_MAP = 'yard';

/** 一天里的时段：清早（九点前）、白天、傍晚（五点到七点）、夜里（天黑以后）。 */
export const PERIODS = Object.freeze(['dawn', 'day', 'dusk', 'night']);

/**
 * 数都是游戏尺度，先粗，玩过再调。
 *   minutes 翻一处花的工夫；cues 每天清早有动静的处数（最少、最多），雨后再多 wetCues 处；
 *   odds 常见、少见、稀罕各占几份；luck 没动静的地方翻出东西的机会（百分数：底子、连着没翻到每一回加多少、
 *   最少、最多），走计算管道 'search.chance'；event 有动静的地方碰上一件小事的机会（百分数）。
 */
export const SEARCH = Object.freeze({
  minutes: 3,
  cues: [5, 8],
  wetCues: 1,
  odds: Object.freeze({ common: 6, uncommon: 2, rare: 0.6 }),
  luck: Object.freeze({ base: 3, miss: 2, min: 2, max: 20 }),
  event: 15,
});

// 一条：翻出什么、多常见、哪几季有（null 是四季）、翻到时那句；more 里 wet 是雨后才有，
// when 是只在哪几个时段有，n 是一回翻出几份（不写是一份）。
const e = (item, odds, seasons, line, more = {}) =>
  Object.freeze({ item, odds, seasons, line, n: 1, wet: false, when: null, ...more });

/** 每一类翻得出什么；none 是什么也没翻到时的话。 */
// prettier-ignore
export const SEARCH_FINDS = Object.freeze({
  peach: {
    name: '桃树',
    finds: [
      e('wildPeach', 'common', [1], '拨开桃叶，摘下颗带绒毛的青红小桃子。'),
      e('peachGum', 'uncommon', [1, 2], '树皮裂口凝着块琥珀似的桃胶，轻轻抠了下来。', { wet: true }),
      e('wood', 'common', [0, 2, 3], '树杈底下积着两根干枯桃枝，正好拿回去引火。'),
      e('mushroom', 'rare', [1, 2], '老桃树根窝在湿苔里，竟顶出两朵小伞菌。', { wet: true, n: 2 }),
    ],
    none: ['风一吹，几片碎花瓣沾在袖口上，别的什么也没有。', '绕着树干转了半圈，只看见几只蚂蚁排着队往上爬。'],
  },
  camphor: {
    name: '老樟树',
    finds: [
      e('camphorWood', 'uncommon', null, '树根旁捡到块脱落的老樟木，凑近闻着满手清香。'),
      e('cicadaShell', 'uncommon', [1], '粗糙树皮上牢牢扣着只完整知了壳，小心捏了下来。', { when: ['dawn'] }),
      e('wood', 'common', null, '扫起一把带着樟木香的干枯小枝，捆好带走。'),
      e('mushroom', 'rare', [0, 2], '老树兜背阴的缝里，冒出一小簇嫩生生的野菌。', { wet: true }),
    ],
    none: ['仰头望了望遮天的树冠，只落下两片发黄的老樟叶。', '手往树洞边探了探，里头空荡荡的，只摸到一手干树皮。'],
  },
  broad: {
    name: '大树',
    finds: [
      e('wood', 'common', null, '树下散着几根晒透的枯枝，顺手拢成一小捆。'),
      e('log', 'uncommon', [2, 3], '风雨吹断了根腕粗的树杈，搬回去正好当料用。', { wet: true }),
      e('cicadaShell', 'common', [1], '树干齐肩高处挂着只金黄知了壳，轻轻摘了下来。', { when: ['dawn', 'dusk'] }),
      e('chestnut', 'uncommon', [2], '厚落叶底下藏着两颗滚圆的野栗子，差点踩过去。', { n: 2 }),
    ],
    none: ['摇了摇低垂的枝丫，只掉下来几片枯叶和一点尘土。', '在树根四周拨拉了一圈，除了潮湿的烂叶子什么也没摸着。'],
  },
  pine: {
    name: '松树',
    finds: [
      e('pinecone', 'common', [2, 3], '脚边滚着颗张开鳞片的干松果，拾起来装进篮里。'),
      e('pineNeedles', 'common', null, '树下铺着厚厚一层干松针，抓起一把带着松脂香。'),
      e('mushroom', 'uncommon', [1, 2], '湿漉漉的松针底下顶起个小包，扒开竟是朵肥菌子。', { wet: true }),
      e('wood', 'common', null, '捡到两截带着松油味的干松枝，点灶火准旺。'),
    ],
    none: ['松风呜呜地吹过头顶，地上只有踩上去沙沙响的碎针叶。', '弯腰找了半天，松果全被山雀啄空了，只剩些碎壳。'],
  },
  willow: {
    name: '柳树',
    finds: [
      e('willowTwig', 'common', [0, 1], '顺手折下几根柔韧的嫩柳条，拿回去正好编东西。'),
      e('cicadaShell', 'uncommon', [1], '垂柳老干的纹路里卡着只蝉蜕，一点没碎。', { when: ['dawn'] }),
      e('wood', 'common', [2, 3], '河风刮落了些干柳枝，收拢起来当柴烧。'),
      e('snail', 'rare', [0, 1], '浸在水边的老柳根须里，竟吸住了好几颗肥螺蛳。', { wet: true, n: 2 }),
    ],
    none: ['柳絮扑面飘过，伸手抓了一把，掌心里空落落的。', '柳丝垂进水面荡起一圈圈涟漪，根边什么也没藏着。'],
  },
  bamboo: {
    name: '竹子',
    finds: [
      e('shoot', 'common', [0], '竹根旁的湿土微微拱起，刨开冒出颗嫩生生的竹笋。', { wet: true }),
      e('strip', 'common', null, '竹林边捡到几截干透的裂竹片，削削就能当竹篾使。'),
      e('leaf', 'uncommon', [1, 2], '矮竹丛里长着几片宽大翠绿的箬叶，齐根摘了下来。'),
      e('moss', 'uncommon', [0, 1, 2], '竹兜背阴处铺着一块绒毯似的厚青苔，整片揭了起来。', { wet: true }),
    ],
    none: ['风穿竹林沙沙作响，竹叶落了一肩膀，底下什么也没有。', '扒开干枯的竹壳瞧了瞧，只有几只潮虫慌忙钻进泥里。'],
  },
  flowers: {
    name: '野花',
    finds: [
      e('herb', 'common', [0, 1, 2], '杂花丛里混着一丛清香扑鼻的野香草，掐了一把。'),
      e('mugwort', 'common', [0], '路边野花旁长着几株背面泛白的嫩艾草，顺手割下。'),
      e('malan', 'uncommon', [0], '挂着露水的花丛边藏着一撮红梗马兰头，正嫩呢。', { when: ['dawn'] }),
      e('shepherd', 'uncommon', [0], '拨开几朵小黄花，贴地长着一棵肥实的野荠菜。'),
    ],
    none: ['野花晃了晃脑袋，抖落几粒花粉，下头只剩杂草。', '蹲下来细细翻看，花茎缠得密实，没找到能带走的货。'],
  },
  reeds: {
    name: '芦苇',
    finds: [
      e('snail', 'common', [0, 1], '扒开浅水边的苇根，摸到一把青壳沉甸甸的肥螺蛳。', { when: ['dawn'], n: 2 }),
      e('mussel', 'uncommon', [0, 1], '苇丛淤泥里露出一道黑壳边，伸手拽出只大河蚌。', { wet: true }),
      e('leaf', 'uncommon', [1], '苇塘边混生着几片宽大的青箬叶，洗净就能包粽子。'),
      e('wood', 'common', [2, 3], '割下一把干透发白的枯苇秆，捆好带回去烧灶。'),
    ],
    none: ['苇叶划过手背沙沙响，惊起一只青蛙扑通跳进水里。', '往苇丛深处探了探脚，水凉飕飕的，什么也没踩着。'],
  },
  bush: {
    name: '灌木',
    finds: [
      e('berry', 'common', [1], '带着小刺的枝条间垂着几颗红艳艳的野莓，甜香扑鼻。', { n: 2 }),
      e('tea', 'uncommon', [0, 1], '矮灌木丛里竟藏着几株野茶树，掐了把嫩芽尖。'),
      e('wood', 'common', null, '掰下几根干脆的枯灌木枝，塞进背篓里当柴火。'),
      e('bean', 'rare', [2], '缠在灌木上的野藤结着几串干豆荚，剥出一把野豆子。'),
    ],
    none: ['小刺挂了一下衣角，灌木丛里除了几颗酸涩青果啥也没有。', '拨开密匝匝的枝叶看了一遍，只惊飞了一只小灰雀。'],
  },
  fern: {
    name: '蕨丛',
    finds: [
      e('brake', 'common', [0], '蕨丛里冒出几根毛茸茸的嫩蕨芽，齐根掐了下来。', { wet: true }),
      e('earthEar', 'uncommon', [0, 1, 2], '湿润的蕨根边铺着几片墨绿滑溜的地耳，小心拾起。', { wet: true }),
      e('mushroom', 'uncommon', [1, 2], '拨开宽大的蕨叶，阴影里藏着一朵伞盖圆整的野菌。', { wet: true }),
      e('ginger', 'rare', [2], '刨松蕨丛旁的红土，竟挖出块辛香扑鼻的野姜。'),
    ],
    none: ['蕨叶上的水珠顺着指缝往下滴，草根底下空空的。', '摸了摸卷成小拳头的老蕨茎，都长老了，掐不动。'],
  },
  rock: {
    name: '石头',
    finds: [
      e('pebble', 'common', null, '溪石堆里挑出块圆润光滑的青灰鹅卵石，正好铺院子。'),
      e('snail', 'common', [0, 1], '翻开浅水里的垫脚石，石底密密吸着一撮青螺蛳。', { when: ['dawn'] }),
      e('moss', 'common', [0, 1, 2], '石缝背阴处生着一层厚实翠绿的青苔，轻轻刮下。', { wet: true }),
      e('earthEar', 'uncommon', [0, 2], '雨水刚过，石堆旁的湿草地冒出几片软滑的地耳。', { wet: true }),
      e('potato', 'rare', [2], '田边石堆的浮土下，竟藏着两颗去年漏收的小土豆。', { n: 2 }),
      e('worm', 'common', null, '掀开湿漉漉的石头，底下盘着两条肥蚯蚓，正好挂钩。', { wet: true, n: 2 }),
    ],
    none: ['使劲掀开一块扁石头，底下只爬出两条细红蚯蚓，一扭就钻没了。', '绕着石堆瞧了两眼，石头晒得暖烘烘的，缝里什么也没藏。'],
  },
  lotus: {
    name: '荷叶',
    finds: [
      e('lotusPod', 'common', [1, 2], '探手掰下一只青绿饱满的莲蓬，里头的莲子鼓鼓囊囊。'),
      e('lotusFlower', 'uncommon', [1], '露水未干，折下一枝刚半开的粉白荷花，清香阵阵。', { when: ['dawn'] }),
      e('caltrop', 'uncommon', [2], '拨开漂在水面的老荷叶，拽出几颗紫红发亮的嫩菱角。', { n: 2 }),
      e('snail', 'common', [1], '浸在水里的荷茎上攀着几颗大螺蛳，顺手捋进篮里。', { when: ['dusk'] }),
    ],
    none: ['荷叶一晃，攒在叶心的大水珠骨碌碌滚进了塘里。', '探头往荷叶底下张望半天，只看见几尾小鱼苗一闪而过。'],
  },
  yard: {
    name: '草垛',
    finds: [
      e('straw', 'common', [2, 3], '从草垛边抽出一把晒得金黄干爽的稻草，捆成一束。'),
      e('egg', 'uncommon', null, '暖烘烘的草垛窝里，竟藏着一颗不知谁家母鸡偷下的热鸡蛋！', { when: ['dawn'] }),
      e('compost', 'common', [0, 2], '草垛底角沤出了一小撮黑亮松软的腐草，正好当堆肥。', { wet: true }),
      e('ash', 'uncommon', [3], '瓜棚旧灶脚边扫出半撮细白草木灰，留着肥地正好。'),
      e('bean', 'rare', [2], '瓜棚竹架缝里挂着两串晒干的老豆荚，剥出几粒好豆子。'),
    ],
    none: ['抖了抖稻草人的破草帽，只掉下来几根干草屑。', '手伸进草垛里摸了一圈，暖呼呼的，像是刚有猫在这儿打过盹。'],
  },
});

/**
 * 山货谱：走图翻找才有的新东西（G-08 的 20 样）。头一回找到时说一句，以后图谱里画出来、没找到的留影子。
 * 柴、竹篾、鸡蛋这些家常的，翻到了不另说。
 */
export const SEARCH_BOOK = Object.freeze([
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

/** 翻找的几句话：极品、头一回找到山货谱里的一样、行囊满了、太累、今天翻过了。 */
export const SEARCH_LINES = Object.freeze({
  fine: '细看是{name}！',
  first: '头一回找到{name}。',
  full: '行囊满了，腾个地方再翻',
  tired: '太累了，先歇歇',
  done: '今天翻过了',
  far: '走到跟前再翻',
  nothing: '这儿没什么可翻的',
});
