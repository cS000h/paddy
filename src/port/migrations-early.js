// 存档早年的升级（v1 → v16）：M1 到衣箱布摊那一段。新的升级写在 migrations.js。
// 升级里的数值一律写死，不引用 content 里“现在”的数。
export const EARLY = {
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
  14(state) {
    state.world.meta.version = 15;
    state.world.basket.receipt = null;
    return state;
  },
  13(state) {
    // 衣装和发式成了单独的插件（sim/plugins/wardrobe.js）：身上穿的从人身上挪进 wardrobe.worn；
    // 衣箱里放开局那几样，再加上身上正穿着的，原先的样子不丢。
    const w = state.world;
    w.meta.version = 14;
    const worn = {};
    for (const [id, p] of Object.entries(w.people)) {
      worn[id] = { coat: p.coat || 'plain', hair: p.hair || 'plain' };
      delete p.coat;
      delete p.hair;
    }
    const owned = {};
    for (const [id, home] of Object.entries(w.households)) {
      const coat = ['plain', 'field'];
      const hair = ['plain', 'short', 'tail', 'loose'];
      for (const m of home.members) {
        if (worn[m] && !coat.includes(worn[m].coat)) coat.push(worn[m].coat);
        if (worn[m] && !hair.includes(worn[m].hair)) hair.push(worn[m].hair);
      }
      owned[id] = { coat, hair };
    }
    w.wardrobe = { worn, owned };
    return state;
  },
  12(state) {
    // M9 进世界：过客带外观与实景坐标，随机小事带发生地坐标
    const w = state.world;
    w.meta.version = 13;
    const roleLook = {
      peddler: ['hero/field/crop/0', 'market'],
      healer: ['hero/tea/knot/2', 'tea'],
      scholar: ['hero/feast/tail/2', 'tea'],
      grocer: ['hero/cook/bun/2', 'market'],
      carpenter: ['hero/rain/plain/0', 'river'],
      matchmaker: ['hero/winter/braid/3', 'tea'],
    };
    // 同一张图上的几位按顺序各站一格，不叠在一起
    const spots = {
      tea: [
        [11, 12, 'down'],
        [14, 13, 'left'],
        [10, 13, 'right'],
      ],
      market: [
        [11, 13, 'down'],
        [17, 13, 'down'],
        [14, 13, 'down'],
      ],
      river: [
        [13, 11, 'down'],
        [15, 16, 'left'],
        [11, 12, 'right'],
      ],
    };
    if (w.pulse?.active) {
      w.pulse.active = { map: 'yard', x: 8, y: 14, ...w.pulse.active };
    }
    if (w.visitors?.active) {
      const used = {};
      for (const v of w.visitors.active) {
        const [look, map] = roleLook[v.role] || roleLook.scholar;
        used[map] = (used[map] || 0) + 1;
        const [x, y, dir] = spots[map][(used[map] - 1) % spots[map].length];
        Object.assign(v, { look, map, x, y, dir });
      }
    }
    return state;
  },
  11(state) {
    // M9：时限修正、随机小事与流动过客
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
