// 集日和平常日子路过稻乡的外乡过客（G-15 回稿，2–12 号；1 号是集日比鱼的钓客，见 content/fair-match.js）。
// 每位一两步：开场选一样，走到第二步再定输赢。台词在 passer-text-a/b/c.js，这里是规则：
//   need   要带着什么才选得了（dish 热菜、crop 自家菜、wild 野菜草药、fishy 鱼或莲蓬，或物品 id）；
//   cost   要花几文；check 检定哪一项（一项只认一个属性），plus 是把握加项，跟台词里的 why 一条对一条；
//   auto   这一局里先做到了哪一步，检定就不用掷了；test 是赛菜、赛瓜这种比成色的；
//   do / ok / bad  选了（成、砸）以后怎么样：
//     next 进第几步，end 了结（ok 成、bad 砸、mild 和气收场、none 没接），coins 得失几文，mood 心情，
//     fav 这位过客记你几分好，bond 村民熟悉，give 给什么，take 交出要带的那一样，title 称号，
//     note 记一条见闻，rumor 第二天茶摊传什么（bad 坏话；成了默认传好话，把握不到一半算运气），
//     visit 第二天谁上门（断案时受了委屈的那一方，visit 里的第几位），back 下回来时说哪一句，flag 记一笔；
//   burnt  端上的是烧糊的菜时换成这一样。
// 规则在 sim/plugins/passers.js。
import { outfitLook } from './wardrobe.js';
import { PASSER_TEXT_A } from './passer-text-a.js';
import { PASSER_TEXT_B } from './passer-text-b.js';
import { PASSER_TEXT_C } from './passer-text-c.js';

export const PASSER_TEXT = Object.freeze({ ...PASSER_TEXT_A, ...PASSER_TEXT_B, ...PASSER_TEXT_C });

export const PASSER_RULES = Object.freeze({
  from: 8 * 60, // 辰时到村
  until: 17 * 60, // 酉时走；话说到一半的等你说完
  chance: 0.35, // 平常日子来一位的机会；集日来两位
  rest: 6, // 同一位隔几天才再来
  dc: 5, // 检定的坎：五项 5 点对半开，每差一点差 12 成，一条把握加项算一点
  near: 15, // 差不到这么些，告诉你差在哪儿
  tea: 2, // 受委屈的上门，递碗茶赔个不是
});

/** 过客站的地方：不压过客站位、乡邻的去处和比鱼钓客（L1 查）；同一张图来两位，第二位站第二格。 */
export const PASSER_SPOTS = Object.freeze({
  tea: [
    { x: 16, y: 14, dir: 'down' },
    { x: 12, y: 15, dir: 'right' },
  ],
  market: [
    { x: 20, y: 13, dir: 'down' },
    { x: 8, y: 14, dir: 'right' },
  ],
  river: [
    { x: 17, y: 13, dir: 'left' },
    { x: 9, y: 14, dir: 'right' },
  ],
  yard: [
    { x: 11, y: 16, dir: 'left' },
    { x: 6, y: 16, dir: 'right' },
  ],
});

/** 称号（身边风物里的 id），见 content/modifiers.js。 */
const STOVE = 'passer_stove',
  CROP = 'passer_crop',
  EYE = 'passer_eye',
  FAIR = 'passer_fair';

const p = (id, name, title, map, look, steps, more = {}) =>
  Object.freeze({ id, name, title, map, look, steps, he: '他', ...more });

// prettier-ignore
export const PASSERS = Object.freeze({
  gourmet: p('gourmet', '老食客', '挑嘴老食客', 'tea', outfitLook('hero', 'feast', 'topknot'), [
    [
      { do: { next: 1 } },
      { check: 'renqing', plus: ['friends', 'near:gui', 'cook'],
        ok: { next: 1, flag: 'probed', mood: 1 }, bad: { next: 1 } },
      { do: { end: 'none' } },
    ],
    [
      { need: 'dish', test: 'dish',
        ok: { end: 'ok', coins: 12, fav: 2, bond: { gui: 1 }, mood: 4, title: STOVE, take: true },
        bad: { end: 'bad', coins: 3, mood: -1, take: true } },
      { cost: 2, do: { end: 'mild', back: 2 } },
    ],
  ], { fill: { dish: '拿手菜' } }),
  melon: p('melon', '赛瓜客', '邻村赛瓜客', 'market', outfitLook('hero', 'harvest', 'crop'), [
    [
      { do: { next: 1 } },
      { check: 'chijia', plus: ['found', 'near:shi', 'met'],
        ok: { next: 1, flag: 'probed' }, bad: { next: 1 } },
      { do: { end: 'none' } },
    ],
    [
      { need: 'crop', test: 'crop',
        ok: { end: 'ok', coins: 6, give: ['seed.qingcai', 2], fav: 2, bond: { aman: 1 }, mood: 3,
          title: CROP },
        bad: { end: 'bad', coins: -1, mood: -1 } },
      { need: 'crop', do: { end: 'mild', take: true, give: ['cabbage', 1], fav: 1, back: 2 } },
    ],
  ], { fill: { item: '菜' } }),
  drummer: p('drummer', '老陈', '摇鼓货郎', 'market', outfitLook('hero', 'dungarees', 'cap'), [
    [
      { need: 'crop|wild', do: { next: 1, take: true, coins: 8, fav: 2 } },
      { cost: 4, do: { end: 'mild', give: ['seedCuke', 1], fav: 1, back: 0 } },
      { check: 'chijia', plus: ['coins', 'near:aman', 'met'],
        ok: { next: 1, fav: 1 }, bad: { fav: -1, flag: 'sour' } },
      { do: { end: 'none' } },
    ],
    [
      { cost: 3, do: { end: 'ok', give: ['seedPumpkin', 1], mood: 3 } },
      { do: { end: 'ok', fav: 1, note: '托货郎老陈打听外乡的消息，他说跑完集就捎话来。' } },
    ],
  ]),
  herbseller: p('herbseller', '药贩', '油嘴草药贩', 'tea', outfitLook('hero', 'stripe', 'short'), [
    [
      { check: 'yueli', plus: ['found', 'near:yun', 'title:' + EYE],
        ok: { next: 1, flag: 'caught' }, bad: { flag: 'fooled' } },
      { cost: 8, do: { end: 'bad', give: ['peachGum', 1], mood: -3, back: 2 } },
      { do: { end: 'none' } },
    ],
    [
      { do: { end: 'ok', bond: { yun: 1, zhou: 1 }, mood: 5, title: EYE, back: 0 } },
      { cost: 3, do: { end: 'mild', give: ['herb', 2], fav: 1, rumor: 'bad', back: 1 } },
    ],
  ]),
  drygoods: p('drygoods', '干货娘子', '水路干货娘子', 'river', outfitLook('hero', 'rain', 'doublebun'), [
    [
      { check: 'chijia', plus: ['cook', 'near:gui', 'fish', 'title:' + EYE],
        ok: { next: 1, flag: 'caught' }, bad: { end: 'bad', coins: -3, give: ['saltfish', 1], mood: -1, back: 2 } },
      { need: 'fishy', do: { end: 'ok', take: true, give: ['wine', 1], fav: 2, rumor: 'luck', back: 0 } },
      { cost: 3, do: { end: 'bad', give: ['saltfish', 1], mood: -1, back: 2 } },
      { do: { end: 'none' } },
    ],
    [
      { cost: 3, do: { end: 'ok', give: ['bacon', 1], fav: 3, bond: { gui: 1 }, back: 0 } },
      { do: { end: 'bad', fav: -3, bond: { gui: 1, qiao: 1 }, rumor: 'bad', back: 1 } },
    ],
  ], { he: '她' }),
  ridge: p('ridge', '大牛', '黑脸大牛', 'tea', outfitLook('hero', 'denim', 'short'), [
    [
      { check: 'yueli', plus: ['found', 'near:shi', 'title:' + FAIR],
        ok: { next: 1, flag: 'probed' }, bad: { next: 1 } },
      { do: { next: 1 } },
      { do: { end: 'none' } },
    ],
    [
      { do: { end: 'ok', give: ['veg.qingcai', 1], fav: 2, bond: { shi: 1 }, mood: 2, title: FAIR,
        visit: 0, back: 0 } },
      { do: { end: 'bad', coins: 3, bond: { shi: -1 }, rumor: 'bad', visit: 1, back: 1 } },
      { check: 'renqing', plus: ['friends', 'near:gui', 'item:pebble', 'flag:probed'],
        ok: { end: 'ok', fav: 2, mood: 5, title: FAIR, back: 0 }, bad: { end: 'bad', mood: -1, back: 1 } },
    ],
  ], { why: { 'item:pebble': '手边正好有块鹅卵石垫界石', 'flag:probed': '先问清了旧沟的水路' } }),
  boat: p('boat', '阿福', '撑篙阿福', 'river', outfitLook('hero', 'rain', 'plain'), [
    [
      { check: 'chijia', plus: ['cook', 'near:zhou', 'title:' + FAIR],
        ok: { next: 1, flag: 'proof' }, bad: { next: 1 } },
      { do: { next: 1 } },
      { do: { end: 'none' } },
    ],
    [
      { check: 'danliang', plus: ['near:zhou', 'friends'], auto: 'proof',
        ok: { end: 'ok', give: ['fish.crucian', 1], fav: 3, bond: { zhou: 2 }, title: FAIR, visit: 0,
          back: 0 },
        bad: { end: 'bad', mood: -2, back: 2 } },
      { need: 'wood', do: { end: 'ok', take: 2, fav: 3, bond: { zhou: 2 }, title: FAIR, back: 1 } },
      { do: { end: 'bad', coins: 2, bond: { zhou: -1 }, rumor: 'bad', visit: 1, back: 2 } },
    ],
  ]),
  kitchen: p('kitchen', '小顺', '急茬徒弟小顺', 'market', outfitLook('hero', 'cook', 'pony'), [
    [
      { check: 'renqing', plus: ['cook', 'near:shi', 'friends'],
        ok: { next: 1, flag: 'probed' }, bad: { next: 1 } },
      { do: { next: 1 } },
      { do: { end: 'none' } },
    ],
    [
      { do: { end: 'bad', give: ['chili', 1], bond: { shi: 1 }, rumor: 'bad', visit: 0, back: 1 } },
      { do: { end: 'bad', coins: 3, fav: 1, rumor: 'bad', visit: 1, back: 1 } },
      { need: 'dish|flag:probed', do: { end: 'ok', take: true, give: ['sugar', 1], fav: 2, mood: 5,
        title: FAIR, back: 0 } },
    ],
  ]),
  doctor: p('doctor', '老郎中', '过路老郎中', 'tea', outfitLook('hero', 'cloud', 'topknot'), [
    [
      { need: 'mugwort|herb', do: { end: 'ok', take: true, mood: 4, fav: 2, bond: { yun: 1 }, back: 0 } },
      { need: 'dish', do: { end: 'ok', take: true, give: ['mugwort', 2], fav: 3, bond: { gui: 1 },
        back: 0 } },
      { check: 'xuewen', plus: ['found', 'near:yun'],
        ok: { end: 'ok', fav: 2, note: '老郎中教了几味山草的采法：艾草端午前后最香，香草要带露采。',
          back: 0 },
        bad: { end: 'mild', mood: 1, back: 1 } },
      { do: { end: 'none', back: 1 } },
    ],
  ]),
  scholar: p('scholar', '采风客', '青衫采风客', 'yard', outfitLook('hero', 'bamboo', 'knot'), [
    [
      { need: 'dish', do: { end: 'ok', take: true, coins: 4, fav: 3, bond: { qiao: 2 }, mood: 5,
        note: '采风客说外头集上近来缺鲜鱼，下个集日鱼好卖。', back: 0 },
        burnt: { end: 'bad', take: true, coins: 1, rumor: 'bad', back: 1 } },
      { check: 'renqing', plus: ['fish', 'friends'],
        ok: { end: 'ok', fav: 2, note: '同采风客聊了半晌稻乡的四季农俗，他都记进了游记。', back: 0 },
        bad: { end: 'mild', back: 1 } },
      { do: { end: 'none', back: 1 } },
    ],
  ]),
  carpenter: p('carpenter', '老鲁', '落脚老木工', 'river', outfitLook('hero', 'stripe', 'cap'), [
    [
      { need: 'wood', do: { end: 'ok', take: 2, coins: 2, fav: 2, bond: { shi: 1 }, back: 0 } },
      { need: 'camphorWood', do: { end: 'ok', take: true, coins: 15, fav: 3, mood: 3, back: 0 } },
      { check: 'tige', plus: ['found', 'friends'],
        ok: { end: 'ok', coins: 3, fav: 2, bond: { zhou: 1 },
          note: '老鲁教了辨木料的窍门：敲着发闷的是空心木，樟木一闻便知。', back: 0 },
        bad: { end: 'mild', mood: -1, back: 1 } },
      { do: { end: 'none', back: 1 } },
    ],
  ]),
});

/** 断案时只在话里出声的那一方，第二天上门时的样子。 */
export const OTHER_LOOK = outfitLook('hero', 'plum', 'short');

export const PASSER_IDS = Object.freeze(Object.keys(PASSERS));

/** 把握加项的来由：台词里没写的那几条（物品、前一步做到的）在这儿补上说法。 */
export const PLUS_NAMES = Object.freeze({
  friends: '村里熟人多',
  cook: '灶上手艺熟',
  found: '常在野外翻找',
  fish: '常年钓鱼',
  coins: '精打细算',
  met: '上回见过他',
});

/** 受委屈的上门那天的两句回话。 */
export const VISIT_WORDS = Object.freeze({
  tea: '递碗茶赔个不是',
  firm: '我没断错',
  teaLine: '对方接过茶碗喝了一口，脸色缓下来，摆摆手走了。',
  firmLine: '对方哼了一声，扭头走了，这笔账怕是记下了。',
});
