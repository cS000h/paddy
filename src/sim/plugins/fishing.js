// 钓鱼：下竿、看漂、遛鱼。数据和说的话在 content/fishing.js。
//   fish.cast {at, bait}  → fish.cast {who, spot, bait}
//       下竿。这一竿钓到什么鱼、多长、浮漂怎么动、遛的时候冲几回，当场就定好了。
//   fish.hook {at, t}     → fish.hooked {who, size, leap} | fish.spooked {who, line}
//                         | fish.missed {who, line, junk}
//       看漂时第 t 毫秒提竿；t 为 -1 是一直没提。提晚了，钩子偶尔倒挂上水草、石头（junk 是那样东西）。
//   fish.land {at, log}   → fish.caught {who, item, fish, thing, name, folk, len, lenText, grade, gradeWord,
//                                          n, fine, record, first, line, cheer}
//                         | fish.lost {who, why, line}
//       遛鱼：照按下、松开的记录 [[毫秒, 1 按着 | 0 松开]] 结算。folk 是这条鱼按大小的叫法（板鲫、大翘）；
//       thing 为真是拉上来的不是鱼（河虾、瓷片……），不量长短。
//   fish.quit {at}        → fish.missed（看漂时）| fish.lost（遛鱼时）
// 查询 fishing(at) 给画面看钓点、饵、这一竿怎么动；fish.fight(log, t) 是遛到第 t 毫秒的样子。
// 遛鱼的结算和画面用的是同一个 simulate，画面上看到的就是结果。
import { is } from '../../kernel/schema.js';
import { refuse } from '../../kernel/dispatch.js';
import { ITEMS } from '../../content/items.js';
import { CALENDAR, dateOf } from '../../content/calendar.js';
import { FIRST_FINE } from '../../content/quality.js';
import { fill } from '../../content/text.js';
import {
  FISH,
  FISH_SPOTS,
  FISH_BITE,
  FISHING,
  FIGHT,
  FISH_FINE,
  FISH_LINES,
  FISH_NAMES,
  FISH_THINGS,
  WORM_ODDS,
  ZHOU_FISH_LINES,
  FISH_GRADES,
  FOUND_OWNERS,
} from '../../content/fishing.js';
import { makeBout, junkTable } from '../fishing-bout.js';
import { atStation } from '../stations.js';
import { lenText, sizeOf, wellLog, simulate, personOk, noise } from '../fishing-fight.js';
import { gradeOf, cheerFor, fightView } from '../fishing-fight.js';
import { registerResidentOptions } from '../resident-options.js';

export const fishing = {
  id: 'sim.fishing',
  provides: ['fishing'],
  requires: [
    'schema',
    'commands',
    'queries',
    'reactions',
    'compute',
    'core',
    'clock',
    'people',
    'body',
    'pack',
    'weather',
    'quality',
    'residents',
  ],
  writes: ['fishing'],
  install(ctx) {
    const { schema, commands, queries, reactions, compute, core, clock, people, body, pack } =
      ctx.services;
    const { weather, quality, residents } = ctx.services;

    schema.slice('fishing', {
      initial: (env, w) =>
        Object.fromEntries(
          Object.keys(w.packs).map(id => [id, { bout: null, records: {}, spots: {} }]),
        ),
      validate: (all, w) =>
        (is.keyedBy(all, Object.keys(w.packs)) && Object.values(all).every(personOk)) || 'fishing',
    });

    const mine = w => w.fishing[people.who(w)];
    const now = w => w.clock.day * 1440 + w.clock.minute;
    const dusk = w => w.clock.minute < CALENDAR.morningEnd || w.clock.minute >= FISHING.duskFrom;

    /** 站在哪处钓点旁边（地图编号）；不在钓点旁边是 null。 */
    function spotHere(w, at = null) {
      const map = people.me(w).map;
      return Object.hasOwn(FISH_SPOTS, map) && atStation(w, people, 'fish', at) ? map : null;
    }

    /** 钓点刚钓上几条还没缓过来（每 FISHING.calm 分钟缓一条）；piped 再走 'fish.scare'（集日比鱼）。 */
    function scared(w, id, spot, piped = false) {
      const s = w.fishing[id]?.spots[spot];
      const n = s ? Math.max(0, s.n - Math.floor((now(w) - s.at) / FISHING.calm)) : 0;
      return piped ? compute.run('fish.scare', { w, who: id, spot }, { value: n }).value : n;
    }

    /** 这一竿有鱼来咬的把握：天气、清早傍晚、挂没挂饵、这儿惊没惊着，再走计算管道 'fish.bite'。 */
    function biteRate(w, id, spot, bait) {
      let p = (FISH_BITE[w.weather.now] ?? 0.6) + FISHING.base;
      if (dusk(w)) p += FISHING.dusk;
      if (bait) p += FISHING.bait;
      p -= FISHING.scare * scared(w, id, spot, true);
      p = compute.run('fish.bite', { w, who: id, spot }, { value: p, parts: [] }).value;
      return Math.max(FISHING.min, Math.min(FISHING.max, p));
    }

    function moodOf(w, id, spot) {
      if (scared(w, id, spot, true) >= FISHING.spooked)
        return { mood: 'spooked', moodWord: '惊了' };
      return biteRate(w, id, spot, false) >= FISHING.good
        ? { mood: 'good', moodWord: '鱼口好' }
        : { mood: 'fair', moodWord: '一般' };
    }

    /** 为什么下不了竿；能下返回 null。只读：命令用它拒绝，画面用它提示。 */
    function whyCast(w, id, at, bait) {
      if (!spotHere(w, at)) return '走到钓点旁边再下竿';
      if (w.fishing[id].bout) return '浮漂还在水里';
      if (weather.has(w, 'storm')) return '打雷了，别在水边待着';
      if (w.clock.minute >= CALENDAR.dark) return '天黑了，明天再来钓';
      if (people.me(w).energy < people.quote(w, 'fish').value) return '太累了，先歇歇';
      // 鱼都进鱼篓：身上已经有鱼就放得下，否则要空出一格
      if (!pack.fits(w, id, 'fish.crucian') && !people.atHome(w, id, at))
        return '行囊满了，腾个地方再钓';
      if (bait && !pack.has(w, id, bait)) return '身上没有' + ITEMS[bait].name;
      return null;
    }

    /** 此刻的季节、早晚、天气、近来下没下过雨：挑鱼、挑杂物都看它。 */
    const nowOf = w => ({
      season: dateOf(w.clock.day).season,
      dusk: dusk(w),
      weather: w.weather.now,
      wet: weather.wetLately(w),
    });

    /** 下竿时把这一竿定好（见 sim/fishing-bout.js）。身上揣着的失物不会再钓上来一件。 */
    function boutFor(w, id, spot, bait) {
      const tools = {
        rand: () => core.random(w),
        pick: table => core.weighted(w, table),
        windowOf: (fish, ms) =>
          Math.round(
            compute.run('fish.window', { w, who: id, fish }, { value: ms, parts: [] }).value,
          ),
      };
      const skip = Object.keys(FOUND_OWNERS).filter(item => pack.reach(w, id, item) > 0);
      const rate = biteRate(w, id, spot, bait);
      return makeBout(tools, spot, nowOf(w), { bait, rate, skip, day: w.clock.day });
    }

    /** 提晚了钩上来的杂物：抽中了而且拿得了就收下，返回那一样；没有就是 null。 */
    function snag(w, id, spot) {
      const table = junkTable(spot, nowOf(w));
      if (!table.length || core.random(w) >= FISHING.junk) return null;
      const j = core.weighted(w, table);
      if (!pack.fits(w, id, j.item) && !people.atHome(w, id)) return null;
      pack.receive(w, id, j.item, 1, '钓鱼钩上来的');
      return j;
    }

    /** 清爽、身边风物这类「多得一份」的好处，钓鱼也认。 */
    function yieldOf(w, id) {
      const r = compute.run(
        'action.yield',
        { w, who: id, action: { id: 'fish', kind: 'fish' } },
        { value: 1, parts: [] },
      );
      if (r.parts.some(p => p.id === 'buff.fresh')) body.useBuff(w, id, 'fresh');
      return Math.max(1, r.value);
    }

    // 遛得稳（线一直没绷太紧），出极品的把握多一点
    compute.tap(
      'quality.chance',
      (r, { kind, clean }) => {
        if (kind === 'fish' && clean) compute.part(r, 'fish.clean', '遛得稳', FISH_FINE.clean);
      },
      { priority: 30 },
    );

    commands.register('fish.cast', ({ draft, input, fact }) => {
      const w = draft.world;
      people.place(w, input.at);
      const id = people.who(w);
      const bait = input.bait ?? null;
      if (bait !== null && bait !== 'worm') refuse('没有这种饵');
      const reason = whyCast(w, id, null, bait);
      if (reason) refuse(reason);
      const spot = spotHere(w);
      if (bait) pack.use(w, id, bait, 1, '挂上钩');
      people.spend(w, draft, 'fish', fact);
      w.fishing[id].bout = boutFor(w, id, spot, bait);
      fact('fish.cast', { who: id, spot, bait });
    });

    commands.register('fish.hook', ({ draft, input, fact }) => {
      const w = draft.world;
      people.place(w, input.at);
      const id = people.who(w);
      const b = w.fishing[id].bout;
      if (!b || b.phase !== 'float') refuse('浮漂不在水里');
      if (!is.int(input.t, -1, 600000)) refuse('没看清浮漂');
      clock.elapse(w, b.bait ? FISHING.minutes - 2 : FISHING.minutes, fact);
      const bite = b.float.events.find(e => e.kind === 'bite');
      const t = input.t;
      if (bite && t >= bite.at && t <= bite.at + bite.dur) {
        b.phase = 'fight';
        fact('fish.hooked', { who: id, size: sizeOf(b.len), leap: !!FISH[b.fish]?.leap });
        return;
      }
      w.fishing[id].bout = null;
      if (bite && t >= 0 && t < bite.at)
        return void fact('fish.spooked', { who: id, line: FISH_LINES.spooked });
      // 提晚了：鱼跑了，钩子偶尔倒挂上来一团水草、一块石头（行囊放得下、或者人在院里才拿）
      const junk = bite && t > bite.at + bite.dur ? snag(w, id, b.spot) : null;
      const line = bite ? FISH_LINES.missed : FISH_LINES.none;
      fact('fish.missed', {
        who: id,
        line: junk ? line + junk.line : line,
        junk: junk?.item || null,
      });
    });

    commands.register('fish.land', ({ draft, input, fact }) => {
      const w = draft.world;
      people.place(w, input.at);
      const id = people.who(w);
      const b = w.fishing[id].bout;
      if (!b || b.phase !== 'fight') refuse('鱼还没上钩');
      if (!wellLog(input.log)) refuse('没看清钓线');
      const r = simulate(b, input.log, FIGHT.max);
      w.fishing[id].bout = null;
      clock.elapse(w, FISHING.fightMinutes + 2 * b.runs.length, fact);
      if (r.done !== 'landed') {
        fact('fish.lost', { who: id, why: r.done, line: FISH_LINES[r.done] });
        return;
      }
      const clean = r.peak < FIGHT.clean;
      if (FISH_THINGS[b.fish]) return void landThing(w, id, FISH_THINGS[b.fish], clean, fact);
      const f = FISH[b.fish];
      const got = quality.roll(w, id, 'fish', { clean }, f.item);
      const n = yieldOf(w, id);
      if (pack.fits(w, id, got.item) || people.atHome(w, id))
        pack.receive(w, id, got.item, n, '钓上来的');
      else pack.deliver(w, id, got.item, n, '钓上来的');
      const rec = w.fishing[id].records[b.fish] || { n: 0, best: 0 };
      const first = rec.n === 0;
      const record = !first && b.len > rec.best;
      w.fishing[id].records[b.fish] = {
        n: Math.min(1e6, rec.n + 1),
        best: Math.max(rec.best, b.len),
      };
      w.fishing[id].spots[b.spot] = { n: Math.min(99, scared(w, id, b.spot) + 1), at: now(w) };
      const name = ITEMS[got.item].name;
      const text = lenText(b.len);
      const grade = gradeOf(b.fish, b.len);
      // 照大小叫：钓上一条板鲫；大家伙另有一句
      const folk = FISH_NAMES[b.fish].names[FISH_GRADES.indexOf(grade)];
      // 头一回那句没提鱼名的（虎头鲨、彩鳞鱼），括号里补上，好认得是哪种；多长小窗上已经写了，不再重复
      const firstLine = FISH_LINES.first[b.fish];
      let line = first
        ? firstLine + (firstLine.includes(f.name) ? '' : '（' + f.name + '）')
        : grade.id === 'huge'
          ? FISH_NAMES[b.fish].huge
          : fill(FISH_LINES.caught, { name: folk, len: text });
      if (record) line += fill(FISH_LINES.record, { name: f.name });
      if (got.first) line += fill(FIRST_FINE, { name });
      const proud = record || grade.id === 'big' || grade.id === 'huge';
      fact('fish.caught', {
        who: id,
        item: got.item,
        fish: b.fish,
        thing: false,
        name,
        folk,
        len: b.len,
        lenText: text,
        grade: grade.id,
        gradeWord: grade.word,
        n,
        fine: got.fine,
        record,
        first,
        line,
        cheer: proud ? cheerFor(b.fish, people.me(w), residents.positions(w)) : null,
      });
    });

    /** 拉上来的不是鱼：收下，说一句。不量长短、不记纪录，钓点也不算惊了一回。 */
    function landThing(w, id, thing, clean, fact) {
      const got = quality.roll(w, id, 'fish', { clean }, thing.item);
      if (pack.fits(w, id, got.item) || people.atHome(w, id))
        pack.receive(w, id, got.item, thing.n, '钓上来的');
      else pack.deliver(w, id, got.item, thing.n, '钓上来的');
      const name = ITEMS[got.item].name;
      fact('fish.caught', {
        who: id,
        item: got.item,
        fish: thing.id,
        thing: true,
        name,
        folk: name,
        len: 0,
        lenText: '',
        grade: null,
        gradeWord: '',
        n: thing.n,
        fine: got.fine,
        record: false,
        first: false,
        line: thing.line + (got.first ? fill(FIRST_FINE, { name }) : ''),
        cheer: null,
      });
    }

    commands.register('fish.quit', ({ draft, input, fact }) => {
      const w = draft.world;
      people.place(w, input.at);
      const id = people.who(w);
      const b = w.fishing[id].bout;
      if (!b) refuse('浮漂不在水里');
      w.fishing[id].bout = null;
      if (b.phase === 'fight') fact('fish.lost', { who: id, why: 'slack', line: FISH_LINES.slack });
      else fact('fish.missed', { who: id, line: FISH_LINES.quit });
    });

    // 新的一天：昨天没收的竿算了，各处钓点都缓过来了
    reactions.on(
      'day.started',
      s => {
        for (const p of Object.values(s.world.fishing)) {
          p.bout = null;
          p.spots = {};
        }
      },
      { priority: 20 },
    );

    // 锄地时有时翻出蚯蚓（近来下过雨多一些），钓鱼当饵
    reactions.on('plot.tilled', (s, e, emit) => {
      const w = s.world;
      const id = people.who(w);
      const odds = weather.wetLately(w) ? WORM_ODDS.wet : WORM_ODDS.dry;
      // 有没有蚯蚓只看这一格、这一刻，不动存档里的随机数：锄一回地，后面收菜出不出极品不跟着变
      const roll = noise(w.meta.seed, w.clock.day, w.clock.minute, e.data.x, e.data.y);
      if (roll >= odds || !(pack.fits(w, id, 'worm') || people.atHome(w, id))) return;
      pack.receive(w, id, 'worm', 1, '锄地翻出来的');
      emit('worm.found', { who: id, line: FISH_LINES.worm });
    });

    // 在渡口问老周鱼口
    registerResidentOptions(ctx, 'zhou', ({ ask, person }) =>
      person.place === 'river'
        ? [{ key: 'fishing.mood', label: '今天鱼口怎么样？', line: ask('fish.mood', 'river') }]
        : [],
    );

    queries.define('fish.mood', (w, spot) => {
      if (!Object.hasOwn(FISH_SPOTS, spot)) return null;
      if (weather.has(w, 'storm')) return ZHOU_FISH_LINES.storm;
      return ZHOU_FISH_LINES[moodOf(w, people.who(w), spot).mood];
    });

    queries.define('fishing', (w, at) => {
      const id = people.who(w);
      const p = w.fishing[id];
      const spot = spotHere(w, at);
      const b = p.bout;
      const worms = pack.reach(w, id, 'worm', at);
      return {
        spot: spot ? { id: spot, name: FISH_SPOTS[spot].name, ...moodOf(w, id, spot) } : null,
        reason: whyCast(w, id, at, null),
        cost: people.quote(w, 'fish'),
        bait: worms ? [{ item: 'worm', name: ITEMS.worm.name, n: worms }] : [],
        bout: !b
          ? null
          : b.phase === 'float'
            ? {
                phase: 'float',
                float: { events: b.float.events.map(e => ({ ...e })), end: b.float.end },
              }
            : { phase: 'fight', fight: { size: sizeOf(b.len) } },
        records: Object.fromEntries(
          Object.entries(p.records).map(([k, r]) => [
            k,
            { name: FISH[k].name, n: r.n, best: r.best, bestText: lenText(r.best) },
          ]),
        ),
      };
    });

    queries.define('fish.fight', (w, log, t) => {
      const b = mine(w).bout;
      if (!b || b.phase !== 'fight' || !wellLog(log) || !is.int(t, 0, 1e9)) return null;
      return fightView(b, log, t);
    });

    ctx.provide(
      'fishing',
      Object.freeze({ simulate, lenText, mood: (w, spot) => moodOf(w, people.who(w), spot).mood }),
    );
  },
};
