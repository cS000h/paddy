// 存档的格式和升级。存档里写着版本号；读旧存档时，一级一级升到当前版本。
// 改了世界的数据结构，就要：SAVE_VERSION 加一，在 MIGRATIONS 里写上一级怎么升，
// 再往 tests/fixtures/ 里放一份旧版本的样本存档（见 TESTING.md 的 L3）。
import { SAVE_VERSION } from '../sim/index.js';

export const SAVE_FORMAT = 'dao.save';

// MIGRATIONS[n] 把版本 n 的 state 变成版本 n+1 的。
// 升级里的数值一律写死，不引用 content 里“现在”的数：旧档升到某一版的结果不能跟着以后的调整变。
const MIGRATIONS = {
  11(state) {
    // M9：时限修正里、随机随机事件与流动过客
    const w = state.world;
    w.meta.version = 12;
    w.modifiers = Object.fromEntries(Object.keys(w.packs).map(id => [id, []]));
    w.pulse = { active: null, delayed: [], done: {}, lastDay: 0 };
    w.visitors = {
      day: w.clock.day,
      active: [
        {
          id: 'v_1',
          name: '林先生',
          role: 'scholar',
          traits: ['爱茶', '爱吃'],
          until: w.clock.day + 2,
          rel: 0,
          talkedDay: 0,
          done: false,
        },
      ],
      book: [],
    };
    return state;
  },
  10(state) {
    state.world.meta.version = 11;
    for (const p of Object.values(state.world.people))
      Object.assign(p, { coat: 'plain', hair: 'plain' });
    return state;
  },
  9(state) {
    // M7 约定：跟熟人约好明天午前茶摊坐坐
    state.world.meta.version = 10;
    state.world.visits = { active: null, invitedDay: 0, history: [] };
    return state;
  },
  8(state) {
    // M7 乡邻与人情：各人今天的心情、今天问过的话题、说过最爱吃什么
    const w = state.world;
    w.meta.version = 9;
    w.moods = { aman: 70, gui: 66, shi: 55, qiao: 68, zhou: 60, yun: 58 };
    w.bonds.asked = {};
    w.bonds.favs = {};
    return state;
  },
  7(state) {
    state.world.meta.version = 8;
    for (const k of Object.values(state.world.kitchens)) for (const d of k.dishes) d.cut = null;
    for (const p of Object.values(state.world.packs)) for (const d of p.dishes) d.cut = null;
    return state;
  },
  6(state) {
    state.world.meta.version = 7;
    state.world.teaDays = Object.fromEntries(
      Object.keys(state.world.packs).map(id => [id, { chess: 0, hawk: 0, listen: 0 }]),
    );
    for (const id of ['aman', 'qiao', 'zhou', 'yun']) {
      state.world.people[id] = { energy: 100, map: 'yard', x: 0, y: 0, dir: 'down' };
      state.world.bonds.known[id] = 0;
    }
    state.world.shops = { day: 0, wares: { market: [], tea: [] } };
    for (const id of ['cottage', 'creek', 'tea', 'market', 'river', 'hill'])
      state.world.land[id] = { plots: {} };
    return state;
  },
  5(state) {
    const w = state.world;
    w.meta.version = 6;
    Object.assign(w.weather, {
      today: w.weather.now,
      tomorrow: 'cloudy',
      forecast: 'cloudy',
      acc: 50,
      jitter: 0,
      wetDays: 0,
      dryDays: 1,
      looked: 0,
    });
    w.sensations = Object.fromEntries(Object.keys(w.packs).map(id => [id, { chill: null }]));
    for (const m of Object.values(w.land))
      for (const p of Object.values(m.plots))
        Object.assign(p, {
          water: p.wet ? 18 : 0,
          drained: false,
          fert: 6,
          weeds: false,
          bugs: false,
          fed: 0,
          last: null,
        });
    return state;
  },
  4(state) {
    const w = state.world;
    w.meta.version = 5;
    w.growth = Object.fromEntries(
      Object.keys(w.packs).map(id => [
        id,
        {
          xp: { farm: 0, cook: 0, forage: 0, social: 0, sky: 0, craft: 0 },
          traits: [],
          counters: { wetOut: 0, cold: 0, hot: 0, dawn: 0, meals: 0 },
          origin: null,
        },
      ]),
    );
    w.achievements = Object.fromEntries(
      Object.keys(w.packs).map(id => [id, { counts: {}, earned: {} }]),
    );
    return state;
  },
  3(state) {
    const w = state.world;
    w.meta.version = 4;
    w.weather = { now: 'sunny', history: ['sunny'] };
    w.outings = Object.fromEntries(
      Object.keys(w.packs).map(id => [id, { counts: {}, fish: null }]),
    );
    w.homesteads = Object.fromEntries(
      Object.keys(w.households).map(id => [id, { coop: false, hens: 0, fed: 0, eggs: 0 }]),
    );
    return state;
  },
  2(state) {
    const w = state.world;
    w.meta.version = 3;
    w.kitchens = Object.fromEntries(
      Object.keys(w.households).map(id => [id, { dishes: [], known: {}, fires: 0 }]),
    );
    for (const p of Object.values(w.packs)) p.dishes = [];
    return state;
  },
  // 2：身体与行囊（M1）。每个自家人多了饥、渴、心情和一只行囊；原来家里的菜种和菜算作带在身上，
  // 这样升级之后照旧能下地播种、拿菜送人；另外补上 0.12 开局时家里的那点存粮。
  1(state) {
    const w = state.world;
    w.meta.version = 2;
    w.ledger = { seq: 0, list: [] };
    w.vitals = {};
    w.packs = {};
    for (const home of Object.values(w.households))
      for (const id of home.members) {
        w.vitals[id] = { hunger: 60, thirst: 80, mood: 62, stuffed: 0, sweat: 0, buff: null };
        w.packs[id] = { cap: 6, big: false, items: {}, flask: 0 };
      }
    const home = w.households.home;
    w.packs[w.player.controls].items = home.items;
    home.items = { rice: 3, egg: 2, potato: 2, herb: 1, bean: 1, wood: 4, salt: 4, cake: 2 };
    w.notes.list.push({
      id: w.meta.nextId++,
      day: w.clock.day,
      title: '桂嫂来过',
      text: '“光种菜可不行，人是铁饭是钢。”檐下多了一只旧橱柜，里头有米、鸡蛋、土豆、豆子和两块米糕，墙根码着几根柴。饿了渴了，别硬撑。',
    });
    return state;
  },
};

/** 把一份存档变成当前版本的 {revision, world}。认不出来就抛错，不会悄悄开新档。 */
export function loadSave(saved) {
  if (!saved || typeof saved !== 'object' || saved.format !== SAVE_FORMAT)
    throw new Error('这不是《稻》的存档');
  let version = saved.version;
  if (!Number.isInteger(version) || version < 1 || version > SAVE_VERSION)
    throw new Error(`存档版本 ${version} 认不出来（当前是 ${SAVE_VERSION}）`);
  let state = JSON.parse(JSON.stringify(saved.state));
  for (; version < SAVE_VERSION; version++) state = MIGRATIONS[version](state);
  return state;
}

export function makeSave(state) {
  return { format: SAVE_FORMAT, version: SAVE_VERSION, state };
}
