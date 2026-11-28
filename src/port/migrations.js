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
  38(state) {
    // 阿满进县城：多记托捎的货、县城大单，旧档从没托过、没接过单子记起。
    const w = state.world;
    w.meta.version = 39;
    w.town = { errands: [], order: null, last: 0, done: 0 };
    return state;
  },
  37(state) {
    // 小屋里六处摆设能换：多记买下了哪几样、每处摆的哪样，旧档全是原样。
    const w = state.world;
    w.meta.version = 38;
    w.decor = { owned: [], on: {} };
    return state;
  },
  36(state) {
    // 集日摊子上的小玩意（猜斤两、比大瓜）：多记今天玩过哪几个，旧档从没玩过记起。
    const w = state.world;
    w.meta.version = 37;
    w.fairPlay = { day: 0, done: [] };
    return state;
  },
  35(state) {
    // 集场路南摆摊：铺子多记今天三个摊位上是谁、每个摊子收了几份。旧档今天摊位空着，明早摆出来。
    const w = state.world;
    w.meta.version = 36;
    w.shops.out = [null, null, null];
    w.shops.stallTook = {};
    return state;
  },
  34(state) {
    // 「四季安居」从 60 个清早改成一年的天数（那时是 14×4=56）。旧档已经过满 56 个清早还没得的，
    // 当场补上（记在今天，第二天照常有人道喜），不用再等一个清早。
    const w = state.world;
    w.meta.version = 35;
    for (const a of Object.values(w.achievements || {}))
      if (!a.earned.days60 && (a.counts.days60 || 0) >= 56) {
        a.counts.days60 = 56;
        a.earned.days60 = w.clock.day;
      }
    return state;
  },
  33(state) {
    // 收菜筐拆掉：筐里还没收走的东西、已经付了钱还没捎到的货，都收进自家橱柜。
    // 铺子多记今天每类收了几份、给出去多少钱（转手卖的本钱），旧档从零记起。
    const w = state.world;
    w.meta.version = 34;
    const QTY = { salt: 4, soy: 3, vinegar: 3, sugar: 3, chili: 3, scallion: 2, wine: 3 };
    const items = w.households.home.items;
    // 橱柜里一样东西最多 9999 份（household 的校验），满了就不再往上加
    const add = (id, n) => (items[id] = Math.min(9999, (items[id] || 0) + n));
    for (const [id, n] of Object.entries(w.basket?.goods || {})) add(id, n);
    for (const [id, n] of Object.entries(w.basket?.order || {})) add(id, n * (QTY[id] || 1));
    delete w.basket;
    w.shops.took = {};
    w.shops.paid = 0;
    // 乡邻今天想要什么照这颗种子挑，一整天不变（清早再换）
    w.deals = { day: w.clock.day, seed: w.meta.seed, n: {} };
    return state;
  },
  32(state) {
    // 第 3 块：借、还、帮、传、拿。旧档里谁也不欠谁，也没人在院门口等着借钱。
    const w = state.world;
    w.meta.version = 33;
    w.debts = { seq: 0, debts: [], ask: null, asked: {} };
    return state;
  },
  31(state) {
    // 食为天：每人记近几天吃了哪几类、吃过哪些菜、哪几样状态已经说过。旧档从空的记起。
    const w = state.world;
    w.meta.version = 32;
    w.diet = Object.fromEntries(
      Object.keys(w.packs).map(id => [id, { log: [], tasted: [], seen: [] }]),
    );
    return state;
  },
  30(state) {
    // 成就分档、贺喜、称号（G-31）：每人多记只数当天的那几样从哪天数起、哪件提过了、今天贺哪件、戴哪个称号。
    // 旧档里已经得了的都算提过了，读档后不会一下子冒出一串道喜。
    const w = state.world;
    w.meta.version = 31;
    const day = w.clock.day;
    for (const a of Object.values(w.achievements)) {
      a.daily = {};
      a.told = Object.fromEntries(Object.keys(a.earned).map(id => [id, day]));
      a.herald = null;
      a.title = null;
    }
    return state;
  },
  29(state) {
    // 第 4 块：做事攒性情、天时年景和节令、村民的盼头、局面池。旧档的主角已经有落脚单上挑的两个性情，
    // 第三个照新规矩攒；过了头半个月的档，下个清早按攒得的落定（多半空着）。年景从平常起，盼头都还没起念头。
    const w = state.world;
    w.meta.version = 30;
    w.leaning = {
      tally: {},
      wait: {},
      offer: null,
      heard: [],
      seen: null,
      pulled: 0,
      settled: false,
    };
    w.almanac = { year: 'plain', told: [], last: null, joined: 0 };
    const idle = () => ({ state: 'idle', n: 0, stage: 0, told: -1, side: false, since: 0, at: 0 });
    w.hopes = Object.fromEntries(
      ['shi', 'aman', 'qiao', 'gui', 'zhou', 'yun'].map(id => [id, idle()]),
    );
    w.scenes = { live: [], done: {}, echo: [] };
    return state;
  },
  28(state) {
    // 本事的升级曲线拉长、经验改成按出力给并且当天边际递减（每门本事记一份今天长了多少）。
    // 旧档的经验照级换算到新曲线上：同一级、级内同样的进度，升上来不掉级。两张表都写死。
    const w = state.world;
    w.meta.version = 29;
    const OLD = [0, 4, 10, 18, 30, 45],
      NEW = [0, 20, 80, 200, 420, 760];
    const rescale = xp => {
      const lv = OLD.filter(n => xp >= n).length - 1;
      if (lv >= OLD.length - 1) return NEW[lv] + Math.round((xp - OLD[lv]) * 10);
      const part = (xp - OLD[lv]) / (OLD[lv + 1] - OLD[lv]);
      return NEW[lv] + Math.floor(part * (NEW[lv + 1] - NEW[lv]));
    };
    for (const g of Object.values(w.growth)) {
      for (const k of Object.keys(g.xp)) g.xp[k] = rescale(g.xp[k]);
      g.today = Object.fromEntries(Object.keys(g.xp).map(k => [k, 0]));
    }
    // 吃腻了：每户记最近吃的几道菜，旧档从空的记起
    for (const k of Object.values(w.kitchens)) k.recent = [];
    return state;
  },
  27(state) {
    // 集日收尾、小院翻修、满院飘香：钓客第二天上门答过没有、院里修好了哪几处、飘香的记录。
    // 比鱼的回响多记一样「为什么上门」，旧档里的回响都当没什么特别的来由。
    const w = state.world;
    w.meta.version = 28;
    if (w.match.echo) w.match.echo.how = null;
    w.matchVisit = { day: 0 };
    w.yardFix = { fixed: {}, trim: false, gifts: {} };
    w.aroma = { today: null, echo: null, count: 0 };
    return state;
  },
  26(state) {
    // 人心的底子后半段：村里六户和铺子的家底（sim/plugins/purse.js）、见闻、心烦的记账、村民做事的记录。
    // 各户开局的钱写死在这里；年景都从平常起，换季那天才定。心烦的数原来就在人物档案里，不动。
    const w = state.world;
    w.meta.version = 27;
    const COINS = { shi: 60, gui: 45, aman: 22, qiao: 14, zhou: 40, yun: 32, shop: 120 };
    w.purses = {
      houses: Object.fromEntries(
        Object.entries(COINS).map(([id, coins]) => [id, { coins, fortune: 0, short: null }]),
      ),
      tally: { wet: 0, heavy: 0 },
      spent: [],
    };
    w.witness = { seq: 0, list: [] };
    const fresh = () => ({ day: 0, n: {}, quiet: 0, coped: 0, snap: null });
    w.vexes = Object.fromEntries(
      ['hero', 'shi', 'gui', 'aman', 'qiao', 'zhou', 'yun'].map(id => [id, fresh()]),
    );
    // 读档这一段算已经打过分（清晨 6 点、午前 9 点、午后 12 点、傍晚 15 点各一段），下一段起村民才做事
    const slot = [540, 720, 900].filter(m => w.clock.minute >= m).length;
    w.deeds = { at: w.clock.day * 4 + slot, day: 0, done: {} };
    return state;
  },
  25(state) {
    // 开局两选换成落脚单（content/settle.js）：选过两选的，落脚单五项都记成空的，不补发好处
    const w = state.world;
    w.meta.version = 26;
    const blank = { reason: null, keepsake: null, family: null, own: null, friend: null };
    for (const g of Object.values(w.growth)) if (g.origin) g.origin = { ...blank };
    return state;
  },
  24(state) {
    // 外乡过客（sim/plugins/passers.js）：谁都还没来过，明天清早起才有人路过
    const w = state.world;
    w.meta.version = 25;
    w.passers = { today: [], met: {}, echo: [] };
    return state;
  },
  23(state) {
    // 彩头留下的痕迹（sim/plugins/prizes.js）：每个有行囊的人一份，什么都还没摆
    const w = state.world;
    w.meta.version = 24;
    w.prizes = Object.fromEntries(Object.keys(w.packs).map(id => [id, { since: {} }]));
    return state;
  },
  22(state) {
    // 集日比鱼（sim/plugins/fair-match.js）：一份比鱼的记录，从零起。今天要是集日，钓客下个集日才来。
    const w = state.world;
    w.meta.version = 23;
    const host = () => ({ met: 0, last: null, caught: false });
    w.match = { fairs: 0, wins: 0, hosts: { he: host(), qian: host() }, today: null, echo: null };
    return state;
  },
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
