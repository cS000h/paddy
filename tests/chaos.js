// 乱玩全部命令的“玩家”（L4 用，tools/chaos.mjs 跑长局也用它）。和 replay.test.js 里
// 只会种田说话的那个不同：
//   1. 它在七张地图之间走动，走到灶台、橱柜、采集点、柜台、茶桌、水边、床边，像外壳那样拼输入；
//   2. 它把“给玩家的拒绝”和“程序出错”（端口的 onError）分开记，后者一律算 bug；
//   3. 可以混进一定比例的乱填输入（类型不对、越界、原型上的名字），看端口挡不挡得住。
// 只通过端口发命令、问查询；content 只用来挑输入。
import { createGame } from '../src/port/game.js';
import { MAPS, actAt, walkable, farmable, waterSource, isHome } from '../src/content/maps/index.js';
import { ITEMS } from '../src/content/items.js';
import { BASKET_WARES } from '../src/content/pantry.js';
import { OUTDOOR, HOMEWORK } from '../src/content/activities.js';
import { TEA_DEEDS } from '../src/content/market.js';
import { REASONS, KEEPSAKES, FAMILY, OLD_TIES } from '../src/content/settle.js';
import { TEMPERS } from '../src/content/traits.js';
import { ON_MAP } from '../src/content/people.js';
import { CUTS, METHODS } from '../src/content/recipes.js';
import { bestLog } from '../src/sim/cook-fire.js';
import { COATS, HAIR } from '../src/content/wardrobe.js';
import { PRIZE_TRACES, RELEASE_MAPS } from '../src/content/prizes.js';

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
const MORE_KEYS = [
  'cut',
  'log',
  'value',
  'minutes',
  'reason',
  'keepsake',
  'family',
  'own',
  'friend',
  'seed',
  'dish',
  'dir',
];
const WEAR_KEYS = ['coat', 'hair'];

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
    if (t.station === 'fish') return fishing(at);
    const ids = Object.values(OUTDOOR).filter(a => a.station === t.station);
    if (ids.length) send('gather', { id: pick(ids).id, at });
  }

  // 钓鱼：下竿（有时挂饵），提竿的时刻有准有不准，遛鱼乱按一气；也会半路收竿、走开不管
  function fishing(at) {
    const bait = chance(0.3) ? 'worm' : null;
    const cast = send('fish.cast', { at, bait });
    if (!cast.ok && !chance(0.3)) return;
    if (chance(0.1)) return void send('fish.quit', { at });
    const bout = game.ask('fishing', at)?.bout;
    const bite = bout?.float?.events.find(e => e.kind === 'bite');
    const t = chance(0.1) ? -1 : bite && chance(0.7) ? bite.at + int(0, bite.dur) : int(0, 6000);
    const hook = send('fish.hook', { at, t });
    if (!hook.ok || !hook.facts.some(f => f.type === 'fish.hooked')) return;
    if (chance(0.15)) return void send('fish.quit', { at });
    const presses = [];
    let ms = 0;
    for (let k = int(0, 12); k > 0; k--) {
      ms += int(0, 1500);
      presses.push([ms, presses.length % 2 === 0 ? 1 : 0]);
    }
    send('fish.land', { at, log: chance(0.05) ? [[5, 7]] : presses });
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
    send('cook', { items, spices, method, cut, log: fireLog({ items, spices, method, cut }), at });
  }

  /** 掌火：多半照这一锅的节拍按，手有早有晚、偶尔漏按；有时稳稳做（不掌火），偶尔按出一份乱的记录。 */
  function fireLog(meal) {
    if (meal.method === 'mix' || chance(0.3)) return null;
    if (chance(0.05))
      return pick([
        [
          [5, 'flip'],
          [3, 'serve'],
        ],
        [
          [1, 'add'],
          [2.5, 'serve'],
        ],
        'x',
      ]);
    const plan = game.ask('cook.preview', { ...meal, log: null }).plan;
    if (!plan) return null;
    const spread = pick([0, 150, 400, 900, 2500]);
    let t = 0;
    return bestLog(plan)
      .filter(e => e[1] === 'serve' || !chance(0.1))
      .map(([at, key]) => {
        t = Math.max(t, Math.min(60000, at + int(-spread, spread)));
        return [t, key];
      });
  }

  function kitchenWork(at) {
    const k = game.ask('kitchen', at);
    const roll = r();
    // 身上端着饭回到灶前：多半先收回灶台
    if (k.carried.length && chance(0.6)) return send('dish.store', { id: pick(k.carried).id, at });
    // 灶台上的饭端走或吃掉，身上的饭收回灶台或吃掉，否则做一锅
    if (k.dishes.length && roll < 0.5) {
      if (chance(0.4)) return send('dish.eat', { id: pick(k.dishes).id, at });
      // 行囊满了就先从行囊里拿几样放回家，腾出地方再端饭（汤要两格；竹篮里装着山货时篮子拿不走，拿别的）
      for (let i = 0; i < 4 && game.ask('pack', at).room < 2; i++) {
        const items = game.ask('pack', at).items.filter(x => x.id !== 'basket');
        if (!items.length) break;
        send('pack.take', { item: pick(items).id, n: 'all', at });
      }
      const id = pick(k.dishes).id;
      const out = send('dish.pack', { id, at });
      // 端错了一份，又放回灶台
      if (out.ok && chance(0.2)) send('dish.store', { id, at });
      return out;
    }
    // 身上的饭多半收回灶台（路上饿了还会吃掉，收回的机会本来就少）
    if (k.carried.length && roll < 0.75)
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
    // 集上有竹筒水壶、自己还没有：多半买下（行囊满了先卖掉一样腾地方），不然一年也喝不上一口水壶里的水
    const owned = [...goods(at), ...game.ask('home').items].some(x => x.id === 'flask');
    if (!owned && wares.some(x => x.item === 'flask') && chance(0.8)) {
      const extra = goods(at).filter(x => x.sell > 0 && x.n > 0);
      if (game.ask('pack', at).room < 1 && extra.length)
        send('market.sell', { shop, item: pick(extra).id, at });
      return send('market.buy', { shop, item: 'flask', at });
    }
    if (chance(0.5) && wares.length) send('market.buy', { shop, item: pick(wares).item, at });
    else {
      const it = pick(goods(at).filter(x => x.sell > 0 && x.n > 0));
      if (it) send('market.sell', { shop, item: it.id, at });
    }
  }

  const tea = at => send('tea.do', { kind: pick(Object.keys(TEA_DEEDS)), at });

  // 布摊：挑一样买（钱不够、已经有了，规则会拒绝）
  function cloth(at) {
    const ware = pick(game.ask('wardrobe', at).stall.wares);
    if (ware) send('wardrobe.buy', { kind: ware.kind, id: ware.id, at });
  }

  // 衣镜：多半换衣箱里有的，偶尔试一样还没有的
  function dress(at) {
    const box = game.ask('wardrobe');
    const one = kind => pick(chance(0.8) ? box[kind].filter(p => p.owned) : box[kind]).id;
    send('wardrobe.wear', { coat: one('coat'), hair: one('hair'), at });
  }

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
    else if (t.act === 'cloth') cloth(at);
    else if (t.act === 'wardrobe') dress(at);
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
    // 约定：碰上约好的人就赴约；有时约人明天茶摊坐坐，偶尔托人带话作罢
    const date = game.ask('visits');
    if (date.active?.due && date.active.npc === p.id) return send('visit.meet', { at });
    // 约下了还没到日子，偶尔托人带话作罢（不然约定多半赴了，带话作罢一年也碰不上一回）
    if (date.active && !date.active.due && chance(0.1)) return send('visit.cancel', { at });
    if (chance(0.08)) return send('invite', { to: p.id, at });
    // 见面聊日常；有时再问问近况、安排、天色（问过的、天黑了问安排，规则会拒绝）
    if (chance(0.6))
      return send('talk', {
        to: p.id,
        topic: chance(0.5) ? 'life' : pick(['news', 'plan', 'sky']),
        at,
      });
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
      // 行囊里有彩头，偶尔摆出来、放生；多半先走到院里、水边，偶尔就地试（该被拒绝）
      const prizes = game.ask('pack', at).items.filter(x => x.id.startsWith('prize.'));
      const usable = prizes.filter(x => PRIZE_TRACES[x.id.slice(6)]?.how !== 'gift');
      const prize = pick(usable.length && chance(0.8) ? usable : prizes);
      if (prize && chance(0.3)) {
        const how = PRIZE_TRACES[prize.id.slice(6)]?.how;
        const to = how === 'keep' ? 'yard' : how === 'release' ? pick(RELEASE_MAPS) : null;
        if (to && to !== hero().map && chance(0.8)) send('travel.to', { to, at: here() });
        // 摆彩头要站进院里（进院门那一格还在院外），多半站到屋前那一块
        const inside = layout('yard').stand.filter(p => isHome(MAPS.yard, p.x, p.y));
        const spot =
          how === 'keep' && hero().map === 'yard' && chance(0.8)
            ? { ...pick(inside), dir: pick(DIRS) }
            : here();
        send('prize.use', { item: prize.id, at: spot });
      }
    } else if (roll < 0.6) send('sip', { at });
    else if (roll < 0.75) send('sky.look', { at });
    else {
      const d = pick(game.ask('kitchen', at).carried);
      if (d) send('dish.eat', { id: d.id, at });
    }
  }

  function time() {
    // 憋不住了就挑头一个解闷的法子。不抽随机数：别的稀有命令（彩头）靠的那串随机序列不跟着变；
    // 没憋着时乱挑由 rough() 的乱填去试
    const snap = game.ask('stress').snap;
    if (snap) send('stress.cope', { coping: snap.choices[0].id });
    if (chance(0.25)) send('sleep', { at: here() });
    else send('clock.advance', { minutes: pick([10, 10, 10, 30, 60, 120]) });
  }

  function wander() {
    if (hero().map === 'cottage') dress({ x: 8, y: 5, dir: 'up' });
    else send('wardrobe.wear', { coat: 'plain', hair: 'plain' });
    const p = pick(layout(hero().map).stand);
    send('person.place', { x: p.x, y: p.y, dir: pick(DIRS) });
  }

  function origin() {
    // 照落脚单的样子填：旧交情跟着缘由走，自己的性子和家里那个不在同一对里（偶尔撞上，被拒绝也好）
    const reason = pick(Object.keys(REASONS));
    send('origin.settle', {
      reason,
      keepsake: pick(Object.keys(KEEPSAKES)),
      family: pick(Object.keys(FAMILY)),
      // 正式开局不挑自己的性子（头半个月做出来）；测试开局才给，一半给一半不给
      own: chance(0.5) ? pick(Object.keys(TEMPERS)) : undefined,
      friend: REASONS[reason].friend ?? pick(Object.keys(OLD_TIES)),
    });
  }

  // 乱填：随便一条命令，每个字段一半填像样的值、一半填乱七八糟的值。
  const VALID = {
    item: () => pick(Object.keys(ITEMS)),
    to: () => pick(ON_MAP),
    id: () => pick([...Object.keys(OUTDOOR), ...Object.keys(HOMEWORK), 1, 2]),
    kind: () => pick([...CARE, ...Object.keys(TEA_DEEDS), 'coat', 'hair']),
    coat: () => pick(Object.keys(COATS)),
    hair: () => pick(Object.keys(HAIR)),
    shop: () => pick(['market', 'tea']),
    method: () => pick(Object.keys(METHODS)),
    cut: () => pick(Object.keys(CUTS)),
    items: () => some(Object.keys(ITEMS), int(1, 3)),
    spices: () => ['salt'],
    reason: () => pick(Object.keys(REASONS)),
    keepsake: () => pick(Object.keys(KEEPSAKES)),
    family: () => pick(Object.keys(FAMILY)),
    own: () => pick(Object.keys(TEMPERS)),
    friend: () => pick(Object.keys(OLD_TIES)),
    seed: () => 'seed.qingcai',
  };
  function rough() {
    const input = {};
    for (const key of [...KEYS, ...MORE_KEYS, ...WEAR_KEYS])
      if (chance(0.35)) input[key] = chance(0.5) || !VALID[key] ? pick(JUNK) : VALID[key]();
    if (chance(0.7))
      input.at = pick([undefined, null, {}, { x: -1, y: 0 }, { x: 1e9, y: 1 }, { x: 'a' }, here()]);
    send(pick(game.commands()), input, true);
  }

  function pulseAndVisitors() {
    const map = hero().map;
    const ev = game.ask('events').active;
    if (ev && ev.map === map) {
      const ok = ev.choices.filter(c => !c.disabled);
      const pickChoice = ok.length ? pick(ok) : pick(ev.choices);
      return send('event.choose', {
        choice: pickChoice.index,
        at: { x: ev.x, y: ev.y, dir: 'down' },
      });
    }
    // 路过的外乡过客：在跟前随手挑一样（带不够、钱不够的会被拒）
    const ps = game.ask('passers').filter(p => p.map === map && !p.done);
    if (ps.length && chance(0.5)) {
      const p = pick(ps);
      const at = { x: p.x + pick([-1, 1]), y: p.y, dir: 'down' };
      const rows = game.ask('passer.options', p.id);
      if (rows.length) return send('passer.pick', { id: p.id, key: pick(rows).key, at });
    }
    const vs = game.ask('visitors').active.filter(v => v.map === map);
    if (!vs.length) return;
    const v = pick(vs);
    const spots = layout(map).stand.filter(
      s => Math.abs(s.x - v.x) <= 1 && Math.abs(s.y - v.y) <= 1,
    );
    const at = spots.length ? { ...pick(spots), dir: pick(DIRS) } : { x: v.x, y: v.y, dir: 'down' };
    if (!v.talkedToday && chance(0.6)) return send('visitor.talk', { id: v.id, at });
    if (!v.done) {
      if (v.need.kind === 'dish') {
        const k = game.ask('kitchen', at);
        const d = k.carried[0] || k.dishes[0];
        if (d) return send('visitor.fulfill', { id: v.id, dish: d.id, at });
      } else {
        return send('visitor.fulfill', { id: v.id, at });
      }
    }
    return send('visitor.talk', { id: v.id, at });
  }

  // 路边翻一翻：多半挑有动静的地方，有时随手翻一处，偶尔站得太远（该被拒绝）
  function rummage() {
    const spots = game.ask('search.spots');
    if (!spots.length) return travel();
    const fresh = spots.filter(x => !x.done);
    const cued = fresh.filter(x => x.cue);
    const s = pick(cued.length && chance(0.6) ? cued : fresh.length ? fresh : spots);
    const near = layout(hero().map).stand.filter(
      p => Math.abs(p.x - s.x) + Math.abs(p.y - s.y) === 1,
    );
    const at = near.length && chance(0.9) ? { ...pick(near), dir: pick(DIRS) } : here();
    send('search', { at, spot: { x: s.x, y: s.y } });
  }

  // 捡地上冒出来的野货：多半站到旁边或踩上去捡，偶尔隔得远（该被拒绝），偶尔捡没东西的地方
  function glean() {
    const list = game.ask('ground');
    if (!list.length) return rummage();
    const g = pick(list);
    const close = layout(hero().map).stand.filter(
      p => Math.abs(p.x - g.x) + Math.abs(p.y - g.y) <= 1,
    );
    const at = close.length && chance(0.9) ? { ...pick(close), dir: pick(DIRS) } : here();
    const spot = chance(0.95) ? g : { x: g.x + 3, y: g.y };
    send('ground.pick', { at, x: spot.x, y: spot.y });
  }

  // 集日比鱼：钓客在渡口就走过去，按眼下这一局到了哪一步做下一步；比的三竿就在渡口下
  function fairMatch() {
    const m = game.ask('match');
    if (!m || m.done) return travel();
    if (hero().map !== m.map) return send('travel.to', { to: m.map, at: here() });
    const close = layout(m.map).stand.filter(
      p => Math.abs(p.x - m.x) <= 1 && Math.abs(p.y - m.y) <= 1,
    );
    // 偶尔站得远远地喊（该被拒绝）
    const at = close.length && chance(0.9) ? { ...pick(close), dir: pick(DIRS) } : here();
    if (m.phase === 'open') return send('match.join', { at, stake: chance(0.5) });
    if (m.phase === 'fishing') {
      const spots = layout(m.map).things.filter(t => t.station === 'fish');
      return spots.length ? fishing(standBy(pick(spots))) : undefined;
    }
    if (m.phase === 'ready') return send('match.measure', { at });
    if (m.phase === 'suspect') return send('match.inspect', { at, look: chance(0.6) });
    if (m.phase === 'after')
      return send('match.after', { at, choice: pick(['again', 'tea', 'leave', 'x']) });
  }

  // 院里的事：门口有闻香来的人就端菜，钓客上门就答他，不然随手修一处（材料不够、站错地方的会被拒）
  function yard() {
    const at = here();
    const gate = game
      .ask('residents')
      .filter(p => p.map === hero().map && p.doing.includes('香味'));
    if (gate.length) {
      const p = pick(gate);
      const how = pick(['share', 'sell', 'one', 'keep', 'x']);
      return send('aroma.serve', { how, to: p.id, at: { x: p.x + 1, y: p.y - 1, dir: 'down' } });
    }
    const v = game.ask('match.visit');
    if (v && !v.done) {
      if (hero().map !== v.map) return send('travel.to', { to: v.map, at });
      const rows = game.ask('match.visit.options');
      const choice = rows.length ? pick(rows).input.choice : 'x';
      return send('match.visit', { at: { x: v.x, y: v.y - 1, dir: 'down' }, choice });
    }
    // 修院子得在自家院里：多半先走回去
    if (hero().map !== 'yard' && chance(0.8)) return send('travel.to', { to: 'yard', at });
    const rows = game.ask('yard.fix', at);
    send('yard.fix', { id: pick(rows).id, help: chance(0.3), at });
  }

  // 眼前的事：村里有人问认不认那个性情就答；挂着的局面去找演的那位，挑一个选项（偶尔乱挑，被拒也好）
  function scene() {
    if (game.ask('leaning').offer)
      return send('leaning.answer', { take: chance(0.6) ? true : pick([false, 'x']) });
    const live = game.ask('scenes').filter(e => e.now);
    if (!live.length) return;
    const e = pick(live);
    const p = game.ask('residents').find(x => x.id === e.a);
    if (!p?.visible) return;
    if (hero().map !== p.map) return send('travel.to', { to: p.map, at: here() });
    const rows = game.ask('scene.options', e.a, here());
    const pickKey = rows.length && chance(0.9) ? pick(rows).input.pick : 'x';
    return send('scene.choose', { id: e.id, pick: pickKey, at: here() });
  }

  // 钱和人情：门口有人开口就答，不然找个在同一张图上的村民借、还、讨、接济，或说件听来的事
  function money() {
    const ask = game.ask('debts').ask;
    const people = game.ask('residents').filter(p => p.visible && p.map === hero().map);
    const to =
      ask && people.some(p => p.id === ask.who) ? ask.who : people.length ? pick(people).id : null;
    if (!to) {
      const any = game.ask('residents').filter(p => p.visible && p.map);
      return any.length ? send('travel.to', { to: pick(any).map, at: here() }) : undefined;
    }
    if (chance(0.25)) return send('gossip.tell', { to: chance(0.9) ? to : 'x' });
    const rows = game.ask('debts.options', to);
    if (!rows.length || chance(0.05)) return send('debt.do', { kind: 'x', to });
    return send('debt.do', pick(rows).input);
  }

  const PLANS = [
    [4, travel],
    [3, rummage],
    [2, glean],
    [14, useThing],
    [8, farm],
    [3, folk],
    [3, body],
    [4, time],
    [1, wander],
    [3, pulseAndVisitors],
    [1, fairMatch],
    [1, yard],
    [1, scene],
    [1, money],
  ];
  const total = PLANS.reduce((sum, [w]) => sum + w, 0);
  let steps = 0;

  // 有约的那天午前：多半去茶摊赴约
  function date() {
    const a = game.ask('visits').active;
    if (hero().map !== 'tea') return send('travel.to', { to: 'tea', at: here() });
    const p = game.ask('residents').find(x => x.id === a.npc);
    return send('visit.meet', { at: { x: p.x, y: p.y + 1, dir: 'up' } });
  }

  function step() {
    if (steps++ === 0 && chance(0.8)) return origin();
    if (game.ask('visits').active?.due && chance(0.5)) return date();
    // 比到一半的那一局多半接着比完（钓客申时就走，拖久了就作罢）
    const phase = game.ask('match')?.phase;
    if (['fishing', 'ready', 'suspect', 'after'].includes(phase) && chance(0.5)) return fairMatch();
    // 集日渡口立着木牌：偶尔过去接一局（不然一年也比不上几回，验鱼那一步碰不上）
    if (phase === 'open' && chance(0.05)) return fairMatch();
    // 钓客上门、院门口有闻香来的人：多半先去应一声（午时、两个钟头就散）
    const v = game.ask('match.visit');
    const gate = game.ask('residents').some(p => p.doing.includes('香味'));
    if (((v && !v.done) || gate) && chance(0.5)) return yard();
    // 有人问认不认性情、眼前挂着局面：有时先去应（局面一挂好几天，太勤了别的事就做不成）
    if ((game.ask('leaning').offer || game.ask('scenes').some(e => e.now)) && chance(0.1))
      return scene();
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
      ['forage', at],
      ['wood', at],
    ],
    fishing: [[at], []],
    'fish.fight': [
      [[[0, 1]], 500],
      [[], 0],
      ['乱', -1],
    ],
    'fish.mood': [['river'], ['nowhere']],
    search: [[]],
    'search.spots': [...Object.keys(MAPS).map(m => [m]), ['nowhere'], []],
    'search.why': [[{ x: at.x, y: at.y }, at], [{}], []],
    ground: [...Object.keys(MAPS).map(m => [m]), ['nowhere'], []],
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
