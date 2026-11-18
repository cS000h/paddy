// 乱玩全部命令的“玩家”（L4 用，tools/chaos.mjs 跑长局也用它）。和 replay.test.js 里
// 只会种田说话的那个不同：
//   1. 它在七张地图之间走动，走到灶台、橱柜、采集点、柜台、茶桌、水边、床边，像外壳那样拼输入；
//   2. 它把“给玩家的拒绝”和“程序出错”（端口的 onError）分开记，后者一律算 bug；
//   3. 可以混进一定比例的乱填输入（类型不对、越界、原型上的名字），看端口挡不挡得住。
// 只通过端口发命令、问查询；content 只用来挑输入。
import { createGame } from '../src/port/game.js';
import { MAPS, actAt, walkable, farmable, waterSource } from '../src/content/maps/index.js';
import { ITEMS } from '../src/content/items.js';
import { BASKET_WARES } from '../src/content/pantry.js';
import { OUTDOOR, HOMEWORK } from '../src/content/activities.js';
import { TEA_DEEDS } from '../src/content/market.js';
import { ORIGINS } from '../src/content/growth.js';
import { ON_MAP } from '../src/content/people.js';
import { CUTS, METHODS } from '../src/content/recipes.js';

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DIRS = ['up', 'down', 'left', 'right'];
const CARE = ['weed', 'bugs', 'drain', 'manure'];

// 每张地图算一次：能站的格、能互动的物件、菜地、水边，各带上旁边能站的格。
const layouts = new Map();
function layout(mapId) {
  if (layouts.has(mapId)) return layouts.get(mapId);
  const map = MAPS[mapId];
  const around = (x, y) => {
    const out = [];
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++)
        if (walkable(map, x + dx, y + dy)) out.push({ x: x + dx, y: y + dy });
    return out;
  };
  const stand = [];
  const fields = [];
  const waters = [];
  for (let y = 0; y < map.height; y++)
    for (let x = 0; x < map.width; x++) {
      if (walkable(map, x, y)) stand.push({ x, y });
      if (farmable(map, x, y)) fields.push({ x, y, around: around(x, y) });
      if (waterSource(map, x, y)) waters.push({ x, y, around: around(x, y) });
    }
  const things = map.objects
    .map(([, x, y]) => actAt(map, x, y))
    .filter(Boolean)
    .map(t => ({ ...t, around: around(t.x, t.y) }));
  const usable = list => list.filter(s => s.around.length);
  const result = { stand, things: usable(things), fields: usable(fields), waters: usable(waters) };
  layouts.set(mapId, result);
  return result;
}

// 乱填的值：类型不对、越界、原型链上的名字、超长字符串。端口经 JSON 复制，NaN 会变成 null。
const JUNK = [
  ...[undefined, null, '', 'constructor', '__proto__', 'toString', 'hasOwnProperty'],
  ...[-1, 0, 0.5, 7.25, 1e9, -1e9, true, false, NaN, Infinity],
  ...[[], {}, [1, 2], { x: 1 }, 'x'.repeat(500), '1', 'all'],
];
const KEYS = ['x', 'y', 'item', 'n', 'id', 'to', 'kind', 'shop', 'items', 'spices', 'method'];
const MORE_KEYS = ['cut', 'heat', 'value', 'minutes', 'route', 'reply', 'seed', 'dish', 'dir'];

/**
 * 开一局乱玩的游戏。
 * @param {number} seed
 * @param {object} [options]
 * @param {number} [options.hostile] 每一步里乱填输入的比例（0–1）
 * @param {object} [options.saved]   从这份存档接着玩
 * @param {boolean} [options.debug] 写入检查开不开（开着慢很多，长局可以关掉）
 */
export function createChaos(seed, { hostile = 0, saved = null, debug = true } = {}) {
  const errors = [];
  const game = createGame({
    seed,
    saved,
    debug,
    onError: (error, { command, listener }) =>
      errors.push({
        type: command?.type || 'listener:' + listener,
        command: JSON.stringify(command || {}).slice(0, 300),
        message: String(error?.message || error),
        stack: String(error?.stack || '')
          .split('\n')
          .slice(1, 4)
          .join(' | '),
      }),
  });
  const r = rng(seed ^ 0x5bd1e995);
  const pick = list => list[Math.floor(r() * list.length)];
  const chance = p => r() < p;
  const int = (lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
  const tally = {};
  const log = [];
  let hostileErrors = 0;
  let unchangedOnRefusal = true;

  function send(type, input = {}, rough = false) {
    const before = errors.length;
    const revision = game.revision();
    const out = game.dispatch(type, input);
    log.push([type, input]);
    const slot = (tally[type] ||= { ok: 0, no: 0, err: 0, why: {} });
    if (out.ok) slot.ok++;
    else if (errors.length > before) {
      slot.err++;
      if (rough) hostileErrors++;
    } else {
      slot.no++;
      if (!rough) slot.why[out.reason] = (slot.why[out.reason] || 0) + 1;
    }
    if (!out.ok && game.revision() !== revision) unchangedOnRefusal = false;
    return out;
  }

  const hero = () => game.ask('hero');
  const here = () => {
    const h = hero();
    return { x: h.x, y: h.y, dir: h.dir };
  };
  const standBy = spot => ({ ...pick(spot.around), dir: pick(DIRS) });
  const goods = at => game.ask('goods', at);
  const some = (list, n) => {
    const rest = [...list];
    const out = [];
    while (out.length < n && rest.length)
      out.push(rest.splice(Math.floor(r() * rest.length), 1)[0]);
    return out;
  };

  function travel() {
    if (chance(0.3)) return send('travel.to', { to: pick(Object.keys(MAPS)), at: here() });
    const doors = layout(hero().map).things.filter(t => t.to);
    if (doors.length) {
      const d = pick(doors);
      send('travel', { x: d.x, y: d.y, at: standBy(d) });
    }
  }

  function outing(t, at) {
    if (t.station === 'fish') {
      const cast = send('fish.cast', { at });
      // 下了竿也可能走开：浮漂留在水里，下回来了接着收
      if ((cast.ok && chance(0.85)) || chance(0.2)) send('fish.reel', { value: int(0, 100), at });
      return;
    }
    const ids = Object.values(OUTDOOR).filter(a => a.station === t.station);
    if (ids.length) send('gather', { id: pick(ids).id, at });
  }

  function housework(t, at) {
    const ids = Object.values(HOMEWORK).filter(a => a.station === t.station);
    if (ids.length) send('homestead', { id: pick(ids).id, at });
    else if (t.station === 'tea') tea(at);
  }

  function cook(at, kitchen) {
    let items;
    let spices;
    let method;
    let cut = null;
    const g = goods(at).filter(x => x.n > 0);
    const have = new Set(g.map(x => x.id));
    // 多半照着眼下材料够的菜谱做（这样短局里也能出锅），有时乱配
    const ready = kitchen.recipes.filter(
      rec => rec.items.every(i => have.has(i)) && rec.spices.every(s => have.has(s)),
    );
    if (ready.length && chance(0.6)) ({ items, spices, method } = pick(ready));
    else if (chance(0.2) && kitchen.recipes.length) {
      ({ items, spices, method } = pick(kitchen.recipes));
    } else {
      items = some(
        g.filter(x => x.cook).map(x => x.id),
        int(1, 3),
      );
      const sp = g.filter(x => x.kind === 'spice').map(x => x.id);
      spices = sp.length ? Array.from({ length: int(0, 2) }, () => pick(sp)) : [];
      method = pick(Object.keys(METHODS));
      if (chance(0.5)) cut = pick(Object.keys(CUTS));
    }
    const heat = method === 'mix' || chance(0.3) ? null : int(0, 100);
    send('cook', { items, spices, method, cut, heat, at });
  }

  function kitchenWork(at) {
    const k = game.ask('kitchen', at);
    const roll = r();
    // 灶台上的饭端走或吃掉，身上的饭收回灶台或吃掉，否则做一锅
    if (k.dishes.length && roll < 0.35) {
      // 行囊满了就先把一样东西放回家里，腾出地方再端饭
      const pack = game.ask('pack', at);
      const full = pack.room < 1 && pack.items.length;
      if (full) return send('pack.put', { item: pick(pack.items).id, n: 'all', at });
      return send(pick(['dish.pack', 'dish.eat']), { id: pick(k.dishes).id, at });
    }
    // 身上的饭多半收回灶台（路上饿了还会吃掉，收回的机会本来就少）
    if (k.carried.length && roll < 0.55)
      return send(chance(0.7) ? 'dish.store' : 'dish.eat', { id: pick(k.carried).id, at });
    return cook(at, k);
  }

  function store(at) {
    if (chance(0.5)) {
      const it = pick(game.ask('home').items);
      if (it) send('pack.put', { item: it.id, n: chance(0.3) ? 'all' : int(1, it.n), at });
    } else {
      const it = pick(game.ask('pack').items);
      // 外壳从按钮的 data-n 里拿到的是字符串
      if (it) send('pack.take', { item: it.id, n: chance(0.3) ? 'all' : String(int(1, it.n)), at });
    }
  }

  function basket(at) {
    if (chance(0.5)) {
      const it = pick(goods(at).filter(x => x.basket && x.n > 0));
      if (it) send('basket.put', { item: it.id, n: int(1, it.n), at });
    } else send('basket.order', { item: pick(BASKET_WARES), n: int(1, 3), at });
  }

  function market(shop, at) {
    send('market.visit', { shop, at });
    const wares = game.ask('market', shop, at).wares;
    if (chance(0.5) && wares.length) send('market.buy', { shop, item: pick(wares).item, at });
    else {
      const it = pick(goods(at).filter(x => x.sell > 0 && x.n > 0));
      if (it) send('market.sell', { shop, item: it.id, at });
    }
  }

  const tea = at => send('tea.do', { kind: pick(Object.keys(TEA_DEEDS)), at });

  function useThing() {
    const things = layout(hero().map).things.filter(t => !t.to);
    if (!things.length) return;
    const t = pick(things);
    const at = standBy(t);
    if (t.act === 'outing') outing(t, at);
    else if (t.act === 'housework') housework(t, at);
    else if (t.act === 'kitchen') kitchenWork(at);
    else if (t.act === 'store') store(at);
    else if (t.act === 'basket') basket(at);
    else if (t.act === 'market') market(t.shop, at);
    else if (t.act === 'tea') tea(at);
    else if (t.act === 'water') send(pick(['drink', 'farm.refill']), { x: t.x, y: t.y, at });
    else if (t.act === 'sleep') send('sleep', { at });
    else send('person.place', at);
  }

  function farm() {
    const map = hero().map;
    const lay = layout(map);
    if (!lay.fields.length || chance(0.15)) {
      if (!lay.waters.length) return;
      const s = pick(lay.waters);
      send(pick(['drink', 'farm.refill']), { x: s.x, y: s.y, at: standBy(s) });
      return;
    }
    // 一半时候像个上心的人：挑一格有事可做的地做该做的那一步（收、种、拔草捉虫、浇水）；
    // 其余时候挑锄过的地乱做一步，偶尔挑一格新地来锄
    const plots = game.ask('farm.plots', map);
    const todo = plots.filter(p => p.ripe || !p.crop || p.weeds || p.bugs || !p.wet);
    let known = null;
    let task = null;
    if (todo.length && chance(0.5)) {
      known = pick(todo);
      if (known.ripe) task = 'farm.harvest';
      else if (!known.crop) task = 'farm.sow';
      else if (known.weeds || known.bugs) task = 'farm.care';
      else task = 'farm.water';
    } else if (plots.length && chance(0.8)) known = pick(plots);
    const spot =
      (known && lay.fields.find(f => f.x === known.x && f.y === known.y)) || pick(lay.fields);
    const at = standBy(spot);
    const seeds = goods(at).filter(x => x.kind === 'seed' && x.n > 0);
    const seed = seeds.length ? pick(seeds).id : 'seed.qingcai';
    const base = { x: spot.x, y: spot.y, at, seed };
    if (task === 'farm.care') return send(task, { ...base, kind: known.weeds ? 'weed' : 'bugs' });
    if (task) return send(task, base);
    const roll = r();
    if (roll < 0.15) send('farm.till', base);
    else if (roll < 0.35) send('farm.sow', base);
    else if (roll < 0.6) send('farm.water', base);
    else if (roll < 0.8) send('farm.harvest', base);
    else send('farm.care', { ...base, kind: pick(CARE) });
  }

  function folk() {
    const map = hero().map;
    const near = game.ask('residents').filter(p => p.visible && p.map === map);
    if (!near.length) return;
    const p = pick(near);
    const spots = layout(map).stand.filter(
      s => Math.abs(s.x - p.x) <= 1 && Math.abs(s.y - p.y) <= 1,
    );
    const at = spots.length ? { ...pick(spots), dir: pick(DIRS) } : here();
    if (chance(0.6)) return send('talk', { to: p.id, at });
    const dishes = game.ask('kitchen', at).carried;
    if (dishes.length && chance(0.3)) return send('gift', { to: p.id, dish: pick(dishes).id, at });
    const it = pick(goods(at).filter(x => x.gift && x.n > 0));
    return it ? send('gift', { to: p.id, item: it.id, dish: null, at }) : undefined;
  }

  function body() {
    const at = here();
    const roll = r();
    if (roll < 0.4) {
      const it = pick(goods(at).filter(x => x.eat && x.n > 0));
      if (it) send('eat', { item: it.id, at });
    } else if (roll < 0.6) send('sip', { at });
    else if (roll < 0.75) send('sky.look', { at });
    else {
      const d = pick(game.ask('kitchen', at).carried);
      if (d) send('dish.eat', { id: d.id, at });
    }
  }

  function time() {
    if (chance(0.25)) send('sleep', { at: here() });
    else send('clock.advance', { minutes: pick([10, 10, 10, 30, 60, 120]) });
  }

  function wander() {
    const p = pick(layout(hero().map).stand);
    send('person.place', { x: p.x, y: p.y, dir: pick(DIRS) });
  }

  function origin() {
    send('origin.choose', {
      route: pick(ORIGINS.route).id,
      reply: pick(ORIGINS.reply).id,
    });
  }

  // 乱填：随便一条命令，每个字段一半填像样的值、一半填乱七八糟的值。
  const VALID = {
    item: () => pick(Object.keys(ITEMS)),
    to: () => pick(ON_MAP),
    id: () => pick([...Object.keys(OUTDOOR), ...Object.keys(HOMEWORK), 1, 2]),
    kind: () => pick([...CARE, ...Object.keys(TEA_DEEDS)]),
    shop: () => pick(['market', 'tea']),
    method: () => pick(Object.keys(METHODS)),
    cut: () => pick(Object.keys(CUTS)),
    items: () => some(Object.keys(ITEMS), int(1, 3)),
    spices: () => ['salt'],
    route: () => pick(ORIGINS.route).id,
    reply: () => pick(ORIGINS.reply).id,
    seed: () => 'seed.qingcai',
  };
  function rough() {
    const input = {};
    for (const key of [...KEYS, ...MORE_KEYS])
      if (chance(0.35)) input[key] = chance(0.5) || !VALID[key] ? pick(JUNK) : VALID[key]();
    if (chance(0.7))
      input.at = pick([undefined, null, {}, { x: -1, y: 0 }, { x: 1e9, y: 1 }, { x: 'a' }, here()]);
    send(pick(game.commands()), input, true);
  }

  const PLANS = [
    [4, travel],
    [14, useThing],
    [8, farm],
    [3, folk],
    [3, body],
    [4, time],
    [1, wander],
  ];
  const total = PLANS.reduce((sum, [w]) => sum + w, 0);
  let steps = 0;

  function step() {
    if (steps++ === 0 && chance(0.8)) return origin();
    if (hostile && chance(hostile)) return rough();
    if (chance(0.002)) return origin(); // 选过以后再选，应该被拒绝
    let roll = r() * total;
    return PLANS.find(([w]) => (roll -= w) < 0)[1]();
  }

  return {
    game,
    tally,
    errors,
    log,
    step,
    run(n) {
      for (let i = 0; i < n; i++) step();
      return this;
    },
    stats: () => ({ hostileErrors, unchangedOnRefusal }),
  };
}

/** 外壳会问的每个查询，各用外壳会带的参数问一遍。返回答不上来的那些。 */
export function askEverything(game) {
  const h = game.ask('hero');
  const at = { x: h.x, y: h.y, dir: h.dir };
  const plot = game.ask('farm.plots', h.map)[0] || { x: at.x, y: at.y };
  const args = {
    'action.cost': [['hoe'], ['seed'], ['can'], ['hand']],
    'cook.preview': [[{ items: ['rice'], spices: [], method: 'stew', cut: null }], [{}]],
    'drink.why': [[at.x, at.y, at]],
    'farm.detail': [[plot.x, plot.y]],
    'farm.plots': Object.keys(MAPS).map(m => [m]),
    'farm.why': ['hoe', 'seed', 'can', 'hand', 'refill'].map(t => [t, plot.x, plot.y, at]),
    goods: [[at], []],
    hero: [[at], []],
    homestead: [['coop'], ['workbench', at]],
    kitchen: [[at], []],
    ledger: [[0], []],
    market: [
      ['market', at],
      ['tea', at],
    ],
    notes: [[game.ask('clock').day], []],
    outings: [
      ['fish', at],
      ['forage', at],
    ],
    pack: [[at], []],
  };
  const failures = [];
  for (const name of game.queries())
    for (const list of args[name] || [[]]) {
      try {
        JSON.stringify(game.ask(name, ...list));
      } catch (error) {
        failures.push(`${name}(${JSON.stringify(list)}): ${error.message}`);
      }
    }
  return failures;
}
