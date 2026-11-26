// 存档的逐级升级：MIGRATIONS[n] 把版本 n 的 state 变成版本 n+1 的。读档、版本号在 save.js。
// 升级里的数值一律写死，不引用 content 里“现在”的数：旧档升到某一版的结果不能跟着以后的调整变。
// v21 那时图鉴里有的东西（写死，以后图鉴加了东西也不改这一份）
import { EARLY } from './migrations-early.js';

const words = text => text.trim().split(/\s+/);
const CATALOG_V21 = [
  ...words(`
  bleak crucian yellowcat carp grass mandarin sleeper bitterling topmouth bream culter yellowtail
  catfish
`).map(f => 'fish.' + f),
  ...words(`
  shrimp crab snail mussel shard oldCoin shuttle waterweed oldSandal mugwort malan brake shepherd
  shoot willowTwig tea herb wildPeach berry cicadaShell lotusFlower leaf peachGum lotusPod
  caltrop mushroom chestnut pinecone straw camphorWood pineNeedles pebble moss earthEar
  veg.qingcai chive cucumber longbean pumpkin radish cabbage
`),
];

export const MIGRATIONS = {
  21(state) {
    // 地上冒野货（sim/plugins/ground.js）：每个有行囊的人一份今天地上冒在哪儿。旧档今天地上什么也没有，
    // 过一夜就冒出来了。翻找里原先给它留的空位（search 的 ground）去掉。
    const w = state.world;
    w.meta.version = 22;
    w.ground = Object.fromEntries(Object.keys(w.packs).map(id => [id, { items: [] }]));
    for (const s of Object.values(w.search)) delete s.ground;
    return state;
  },
  20(state) {
    // 图鉴（sim/plugins/catalog.js）：每个有行囊的人一份——图鉴里每样收过几回、头一回哪天、见没见过极品、
    // 鱼见过哪几档，加上今天钓上几条。旧档照已有的记录补上：钓过的鱼（条数）、翻到过的东西（算一回）、
    // 出过极品的东西。日子不知道的记成升级这天；鱼见过哪几档、菜园收过什么旧档没记，从这一版起算。
    const w = state.world;
    w.meta.version = 21;
    const book = new Set(CATALOG_V21);
    w.catalog = {};
    for (const id of Object.keys(w.packs)) {
      const items = {};
      const add = (item, n, day) => {
        if (!book.has(item)) return;
        items[item] ??= { n: 0, day };
        items[item].n = Math.min(1e6, items[item].n + n);
        items[item].day = Math.min(items[item].day, day);
      };
      for (const [fish, r] of Object.entries(w.fishing?.[id]?.records || {}))
        if (r.n > 0) add('fish.' + fish, r.n, w.clock.day);
      for (const [item, day] of Object.entries(w.search?.[id]?.found || {})) add(item, 1, day);
      for (const [fine, day] of Object.entries(w.quality?.[id]?.found || {})) {
        const plain = fine.replace(/\.fine$/, '');
        if (!items[plain]) add(plain, 1, day);
        if (items[plain]) items[plain].fine = true;
      }
      w.catalog[id] = { items, haul: { day: 0, n: 0 } };
    }
    return state;
  },
  19(state) {
    // 走图翻找（sim/plugins/search.js）：每个有行囊的人一份——今天哪几处有动静、翻过哪几处、连着几处没翻到、
    // 各样东西头一回找到是哪天、地上冒出来还没捡的、拾到的有主的东西还了没有。
    // 旧档今天没有动静（要照清早的种子挑），过一夜就有了；路边哪儿都还能翻。
    const w = state.world;
    w.meta.version = 20;
    w.search = Object.fromEntries(
      Object.keys(w.packs).map(id => [
        id,
        { cues: [], done: [], miss: 0, found: {}, ground: [], lost: {} },
      ]),
    );
    return state;
  },
  18(state) {
    // 钓鱼重做（sim/plugins/fishing.js）：每个有行囊的人一份钓鱼的记录——眼下这一竿、各种鱼钓过几条最长多少、
    // 各处钓点惊没惊着。旧的钓鱼（outings 里的 fish，下竿时抽好的运气）不要了：没提的那一竿算收了，
    // 今天钓过几竿的次数也一并去掉。以前钓的「鱼」照旧在行囊里，能吃能卖。
    const w = state.world;
    w.meta.version = 19;
    w.fishing = Object.fromEntries(
      Object.keys(w.packs).map(id => [id, { bout: null, records: {}, spots: {} }]),
    );
    for (const o of Object.values(w.outings)) {
      delete o.fish;
      delete o.counts.fish;
    }
    return state;
  },
  17(state) {
    // 收成出彩（sim/plugins/quality.js）：每个有行囊的人记着连着几回没出极品、收到过哪几样极品。
    // 以前收的菜都是寻常的，从零记起。
    const w = state.world;
    w.meta.version = 18;
    w.quality = Object.fromEntries(Object.keys(w.packs).map(id => [id, { miss: {}, found: {} }]));
    return state;
  },
  16(state) {
    // 好感（sim/plugins/opinion.js）：一条条来由存进存档。村民之间开局就有的几条交情照 2026-11-24 定的写进来；
    // 以前送过的东西、说过的话没留来由，从这一版起记。
    const w = state.world;
    w.meta.version = 17;
    const old = (from, to, why, n) => ({ from, to, why, n, until: null });
    w.opinion = {
      notes: [
        old('aman', 'zhou', 'veggies', 10),
        old('zhou', 'aman', 'fed', 10),
        old('aman', 'gui', 'pickles', 8),
        old('gui', 'qiao', 'raised', 8),
        old('yun', 'qiao', 'uphill', 8),
      ],
    };
    return state;
  },
  15(state) {
    // 人物档案（sim/plugins/persona.js）：主角开局两选给的旧特质换成性情和出身线，从成长里拿掉；
    // 做出来的六个历练留在成长里。村民的档案照 2026-11-23 定的写进来。
    const w = state.world;
    w.meta.version = 16;
    const OLD = {
      easygoing: ['content', null],
      handy: ['diligent', null],
      slowwarm: ['calm', null],
      lively: ['gregarious', null],
      solitary: ['shy', null],
      curious: [null, 'scholar'],
    };
    const PAIR = {
      content: 'want',
      diligent: 'work',
      calm: 'temper',
      gregarious: 'social',
      shy: 'social',
    };
    const SKILL_OF = { scholar: 'sky', farmer: 'farm' };
    const skillLevel = xp => [0, 4, 10, 18, 30, 45].filter(n => xp >= n).length - 1;
    const lineLevel = lv => 1 + [2, 4, 5].filter(n => lv >= n).length;
    const one = (tempers, line, innate = []) => ({ tempers, line, innate, coping: [], stress: 0 });
    w.persona = {
      hero: one([], null),
      shi: one(['diligent', 'honest', 'stingy'], { id: 'farmer', lv: 3 }),
      gui: one(['gregarious', 'generous', 'ambitious'], { id: 'cook', lv: 3 }, ['gourmet']),
      aman: one(['gregarious', 'honest', 'hasty'], { id: 'peddler', lv: 2 }),
      qiao: one(['gregarious', 'sly', 'ambitious'], { id: 'teahouse', lv: 2 }),
      zhou: one(['calm', 'content', 'trusting'], { id: 'boatman', lv: 4 }, ['steady']),
      yun: one(['diligent', 'shy', 'paranoid'], { id: 'herbalist', lv: 2 }),
    };
    for (const [id, g] of Object.entries(w.growth)) {
      const p = (w.persona[id] ??= one([], null));
      for (const t of g.traits.filter(t => OLD[t])) {
        const [temper, line] = OLD[t];
        if (line) p.line = { id: line, lv: 1 };
        else if (!p.tempers.some(x => PAIR[x] === PAIR[temper])) p.tempers.push(temper);
      }
      g.traits = g.traits.filter(t => !OLD[t]);
      if (g.origin) p.line ??= { id: 'farmer', lv: 1 };
      if (p.line) p.line.lv = lineLevel(skillLevel(g.xp[SKILL_OF[p.line.id]] || 0));
    }
    return state;
  },
  ...EARLY,
};
