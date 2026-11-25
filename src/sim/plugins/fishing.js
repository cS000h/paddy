// 钓鱼：下竿、看漂、遛鱼。数据和说的话在 content/fishing.js。
//   fish.cast {at, bait}  → fish.cast {who, spot, bait}
//       下竿。这一竿钓到什么鱼、多长、浮漂怎么动、遛的时候冲几回，当场就定好了。
//   fish.hook {at, t}     → fish.hooked {who, size} | fish.spooked {who, line} | fish.missed {who, line}
//       看漂时第 t 毫秒提竿；t 为 -1 是一直没提。
//   fish.land {at, log}   → fish.caught {who, item, fish, name, len, lenText, n, fine, record, first, line}
//                         | fish.lost {who, why, line}
//       遛鱼：照按下、松开的记录 [[毫秒, 1 按着 | 0 松开]] 结算。
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
  FLOAT,
  FIGHT,
  FISH_FINE,
  FISH_LINES,
  WORM_ODDS,
  ZHOU_FISH_LINES,
} from '../../content/fishing.js';
import { atStation } from '../stations.js';
import { lenText, sizeOf, wellLog, simulate, personOk, noise } from '../fishing-fight.js';
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
  ],
  writes: ['fishing'],
  install(ctx) {
    const { schema, commands, queries, reactions, compute, core, clock, people, body, pack } =
      ctx.services;
    const { weather, quality } = ctx.services;
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

    /** 这处钓点刚钓上几条还没缓过来：每过 FISHING.calm 分钟缓过来一条。 */
    function scared(w, id, spot) {
      const s = w.fishing[id]?.spots[spot];
      return s ? Math.max(0, s.n - Math.floor((now(w) - s.at) / FISHING.calm)) : 0;
    }

    /** 这一竿有鱼来咬的把握：天气、清早傍晚、挂没挂饵、这儿惊没惊着。 */
    function biteRate(w, id, spot, bait) {
      let p = (FISH_BITE[w.weather.now] ?? 0.6) + FISHING.base;
      if (dusk(w)) p += FISHING.dusk;
      if (bait) p += FISHING.bait;
      p -= FISHING.scare * scared(w, id, spot);
      return Math.max(FISHING.min, Math.min(FISHING.max, p));
    }

    function moodOf(w, id, spot) {
      if (scared(w, id, spot) >= FISHING.spooked) return { mood: 'spooked', moodWord: '惊了' };
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

    /** 下竿时把这一竿定好：钓什么、多长、浮漂怎么动、遛的时候冲几回。 */
    function makeBout(w, id, spot, bait) {
      /** @param {readonly number[]} r 从 r[0] 到 r[1] 之间抽一个整数 */
      const between = r => Math.round(r[0] + (r[1] - r[0]) * core.random(w));
      const season = dateOf(w.clock.day).season;
      /** @type {[string, number][]} */
      const table = Object.entries(FISH_SPOTS[spot].fish).map(([k, n]) => [
        k,
        n * FISH[k].season[season] * (dusk(w) ? FISH[k].dusk : 1),
      ]);
      const kind = core.weighted(
        w,
        table.filter(([, n]) => n > 0),
      );
      const f = FISH[kind];
      const lean = bait ? FISHING.baitLen : FISHING.plainLen;
      const len = Math.round(f.len[0] + (f.len[1] - f.len[0]) * core.random(w) ** lean);
      const bites = core.random(w) < biteRate(w, id, spot, bait);
      const wait = bait ? FISHING.baitWait : 1;
      const nods = between(f.nods);
      const events = [];
      let at = Math.round(between(FLOAT.first) * wait);
      for (let k = 0; k < nods; k++) {
        const dur = between(FLOAT.nod);
        events.push({ at, kind: 'nod', dur });
        at += dur + Math.round(between(k === nods - 1 ? FLOAT.bite : FLOAT.gap) * wait);
      }
      let end;
      if (bites) {
        const window = Math.round(
          compute.run('fish.window', { w, who: id, fish: kind }, { value: f.window, parts: [] })
            .value,
        );
        events.push({ at, kind: 'bite', dur: window, drag: f.drag });
        end = at + window;
      } else end = at + between(FLOAT.idle);
      const runs = [];
      let from = between(FIGHT.firstRun);
      const long = Math.min(FIGHT.run[2], FIGHT.run[0] + len * FIGHT.run[1]);
      for (let k = 0; k < f.runs + Math.floor(len / FIGHT.perRun); k++) {
        runs.push([from, long]);
        from += long + between(FIGHT.gap);
      }
      return {
        spot,
        fish: kind,
        len,
        bait: !!bait,
        phase: 'float',
        float: { events, end },
        runs,
        day: w.clock.day,
      };
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
      w.fishing[id].bout = makeBout(w, id, spot, bait);
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
        fact('fish.hooked', { who: id, size: sizeOf(b.len) });
        return;
      }
      w.fishing[id].bout = null;
      if (bite && t >= 0 && t < bite.at)
        fact('fish.spooked', { who: id, line: FISH_LINES.spooked });
      else fact('fish.missed', { who: id, line: bite ? FISH_LINES.missed : FISH_LINES.none });
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
      const f = FISH[b.fish];
      const got = quality.roll(w, id, 'fish', { clean: r.peak < FIGHT.clean }, f.item);
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
      let line = first
        ? FISH_LINES.first[b.fish] + '（' + text + '）'
        : fill(FISH_LINES.caught, { name, len: text });
      if (record) line += fill(FISH_LINES.record, { name: f.name });
      if (got.first) line += fill(FIRST_FINE, { name });
      fact('fish.caught', {
        who: id,
        item: got.item,
        fish: b.fish,
        name,
        len: b.len,
        lenText: text,
        n,
        fine: got.fine,
        record,
        first,
        line,
      });
    });

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
      const r = simulate(b, log, Math.min(t, FIGHT.max));
      return {
        t: r.t,
        distance: r.distance,
        tension: r.tension,
        running: r.running,
        holding: r.holding,
        done: r.done,
      };
    });

    ctx.provide('fishing', Object.freeze({ simulate, lenText }));
  },
};
