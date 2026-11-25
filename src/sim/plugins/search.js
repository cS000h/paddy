// 走图翻找：路边的树、竹、苇、花、石头……每处每天能翻一回（哪几类、翻得出什么见 content/search.js）。
//   search {at, spot: {x, y}} → search.found {who, map, x, y, kind, cued, item, n, fine, first, line}
//                             | search.empty {who, map, x, y, kind, cued, line}
// 每天清早挑几处「有动静」，只看日子和种子算（sim/noise.js），不动存档里的随机数，别处的收成照旧。
// 有动静的地方一定翻得出当季的东西；别处翻出东西的机会走计算管道 'search.chance'（本事、阅历的加减在
// growth-perks.js），连着没翻到一回回加上去，翻到了清零。翻到能吃的野货，再抽一下是不是极品。
// 查询 search.spots(map) 给画面看这张图上哪几处有动静、哪几处今天翻过了；search.why(spot, at) 翻不翻得。
import { is } from '../../kernel/schema.js';
import { refuse } from '../../kernel/dispatch.js';
import { MAPS, walkable } from '../../content/maps/index.js';
import { ITEMS, plainOf } from '../../content/items.js';
import { CALENDAR, dateOf } from '../../content/calendar.js';
import { FIRST_FINE } from '../../content/quality.js';
import { fill } from '../../content/text.js';
import {
  SEARCH,
  SEARCH_KINDS,
  HOME_ONLY,
  OWN_MAP,
  SEARCH_FINDS,
  SEARCH_LINES,
} from '../../content/search.js';
import { noise } from '../noise.js';
import { near } from './people.js';

const idOf = (map, x, y) => `${map}:${x},${y}`;
const SIDES = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

// 各张图上能翻的地方，照地图数据的顺序：站得到跟前的才算（四面得有一格能站人）。
const SPOTS = [];
const BY_ID = new Map();
for (const [map, m] of Object.entries(MAPS))
  for (const [k, x, y] of m.objects) {
    const kind = SEARCH_KINDS[k];
    const id = idOf(map, x, y);
    if (!kind || BY_ID.has(id) || (HOME_ONLY.includes(kind) && map !== OWN_MAP)) continue;
    if (!SIDES.some(([dx, dy]) => walkable(m, x + dx, y + dy))) continue;
    const spot = Object.freeze({ id, map, x, y, kind });
    SPOTS.push(spot);
    BY_ID.set(id, spot);
  }
export const SEARCH_SPOTS = Object.freeze(SPOTS);

const MAX_CUES = SEARCH.cues[1] + SEARCH.wetCues;
export const MAX_GROUND = 24;
const LOST_STATES = ['returned', 'sold'];

const spotList = (list, max) =>
  is.arr(list, max) && list.every(id => BY_ID.has(id)) && new Set(list).size === list.length;
const groundOk = g =>
  is.obj(g) &&
  Object.hasOwn(MAPS, g.map) &&
  is.int(g.x, 0, 99) &&
  is.int(g.y, 0, 99) &&
  Object.hasOwn(ITEMS, g.item);
const personOk = s =>
  is.obj(s) &&
  spotList(s.cues, MAX_CUES) &&
  spotList(s.done, SPOTS.length) &&
  is.int(s.miss, 0, 999) &&
  is.obj(s.found) &&
  Object.entries(s.found).every(([k, day]) => Object.hasOwn(ITEMS, k) && is.int(day, 1)) &&
  is.arr(s.ground, MAX_GROUND) &&
  s.ground.every(groundOk) &&
  is.obj(s.lost) &&
  Object.entries(s.lost).every(([k, v]) => Object.hasOwn(ITEMS, k) && LOST_STATES.includes(v));

/** 一天里的哪个时段：清早、白天、傍晚、夜里。 */
export const periodOf = minute =>
  minute < CALENDAR.morningEnd
    ? 'dawn'
    : minute < CALENDAR.dusk
      ? 'day'
      : minute < CALENDAR.dark
        ? 'dusk'
        : 'night';

/** 这一类这一季有没有东西可翻（不看雨、不看时辰）。 */
const inSeason = (kind, season) =>
  SEARCH_FINDS[kind].finds.some(f => !f.seasons || f.seasons.includes(season));

export const search = {
  id: 'sim.search',
  provides: ['search'],
  requires: [
    'schema',
    'commands',
    'queries',
    'reactions',
    'compute',
    'core',
    'clock',
    'people',
    'pack',
    'weather',
    'quality',
  ],
  writes: ['search'],
  install(ctx) {
    const { schema, commands, queries, reactions, compute, core, clock, people, pack } =
      ctx.services;
    const { weather, quality } = ctx.services;

    /**
     * 这一天哪几处有动静：每处照日子、种子、它在名单里的位置得一个数，数小的先挑。
     * 先每张图一处（哪张图先挑也照这个数），还要的再从剩下的里挑，能翻的地方多的图挑中的也多。
     */
    function pickCues(w, who) {
      const day = w.clock.day;
      const seed = w.meta.seed;
      const salt = Object.keys(w.packs).indexOf(who) + 1;
      const season = dateOf(day).season;
      const [lo, hi] = SEARCH.cues;
      const wet = weather.wetLately(w) ? SEARCH.wetCues : 0;
      const n = lo + Math.floor(noise(seed, day, salt) * (hi - lo + 1)) + wet;
      const scored = SPOTS.map((s, i) => ({ s, r: noise(seed, day, salt, i + 1) })).filter(x =>
        inSeason(x.s.kind, season),
      );
      const best = new Map();
      for (const x of scored) if (!(best.get(x.s.map)?.r <= x.r)) best.set(x.s.map, x);
      const first = [...best.values()].sort((a, b) => a.r - b.r).slice(0, n);
      const rest = scored
        .filter(x => !first.includes(x))
        .sort((a, b) => a.r - b.r)
        .slice(0, Math.max(0, n - first.length));
      return [...first, ...rest].map(x => x.s.id);
    }

    const fresh = (w, who) => ({
      cues: pickCues(w, who),
      done: [],
      miss: 0,
      found: {},
      ground: [],
      lost: {},
    });

    schema.slice('search', {
      initial: (env, w) => Object.fromEntries(Object.keys(w.packs).map(id => [id, fresh(w, id)])),
      validate: (all, w) =>
        (is.keyedBy(all, Object.keys(w.packs)) && Object.values(all).every(personOk)) || 'search',
    });

    reactions.on(
      'day.started',
      s => {
        const w = s.world;
        for (const [who, me] of Object.entries(w.search)) {
          me.done = [];
          me.cues = pickCues(w, who);
        }
      },
      { priority: 30 },
    );

    const mine = w => w.search[people.who(w)];

    /** 站在 at 这儿，面前 spot 那一格能不能翻；能翻是 null，不能翻是给人看的原因。 */
    function why(w, spot, at = null) {
      const me = people.me(w);
      const here = at || me;
      const s = spot && BY_ID.get(idOf(me.map, spot.x, spot.y));
      if (!s) return SEARCH_LINES.nothing;
      if (!near(here, s)) return SEARCH_LINES.far;
      if (mine(w).done.includes(s.id)) return SEARCH_LINES.done;
      if (weather.has(w, 'storm')) return '打雷了，别在树底下、水边待着';
      if (me.energy < people.quote(w, 'search').value) return SEARCH_LINES.tired;
      if (pack.room(w, people.who(w)) < 1 && !people.atHome(w, people.who(w), here))
        return SEARCH_LINES.full;
      return null;
    }

    /** 此刻这一处翻得出的几样。有动静的地方一定给一样：时辰对不上就不看时辰，再不行就不看雨。 */
    function finds(w, kind, cued) {
      const season = dateOf(w.clock.day).season;
      const wet = weather.wetLately(w);
      const when = periodOf(w.clock.minute);
      const all = SEARCH_FINDS[kind].finds.filter(f => !f.seasons || f.seasons.includes(season));
      const strict = all.filter(f => (!f.wet || wet) && (!f.when || f.when.includes(when)));
      if (strict.length || !cued) return strict;
      const anyTime = all.filter(f => !f.wet || wet);
      return anyTime.length ? anyTime : all;
    }

    /** 没动静的地方翻出东西的机会（百分数）和明细。 */
    function luck(w, who) {
      const { base, miss, min, max } = SEARCH.luck;
      const start = { value: base, parts: [{ id: 'base', label: '底子', delta: base }] };
      const r = compute.run('search.chance', { w, who }, start);
      const n = w.search[who]?.miss || 0;
      compute.part(r, 'miss', `连着${n}处没翻到`, n * miss);
      return { value: Math.max(min, Math.min(max, r.value)), parts: r.parts };
    }

    commands.register('search', ({ draft, input, fact }) => {
      const w = draft.world;
      const me = people.place(w, input.at);
      const who = people.who(w);
      const spot = is.obj(input.spot) && BY_ID.get(idOf(me.map, input.spot.x, input.spot.y));
      const reason = why(w, spot || null);
      if (reason) refuse(reason);
      people.spend(w, draft, 'search', fact);
      clock.elapse(w, SEARCH.minutes, fact);
      const s = w.search[who];
      s.done.push(spot.id);
      const cued = s.cues.includes(spot.id);
      const where = { who, map: spot.map, x: spot.x, y: spot.y, kind: spot.kind, cued };
      let pool = [];
      if (cued) pool = finds(w, spot.kind, true);
      else if (core.random(w) * 100 < luck(w, who).value) pool = finds(w, spot.kind, false);
      if (!pool.length) {
        s.miss = Math.min(999, s.miss + 1);
        const none = SEARCH_FINDS[spot.kind].none;
        const line = core.stable(none, w.clock.day + spot.x * 7 + spot.y * 13);
        fact('search.empty', { ...where, line });
        return;
      }
      s.miss = 0;
      const f = core.weighted(
        w,
        pool.map(x => [x, SEARCH.odds[x.odds]]),
      );
      const got = quality.roll(w, who, 'forage', {}, f.item);
      const name = ITEMS[got.item].name;
      const first = !Object.hasOwn(s.found, plainOf(got.item));
      s.found[plainOf(got.item)] ??= w.clock.day;
      pack.receive(w, who, got.item, f.n, '路边翻到的');
      // 手机上一条提示放不下几句：翻到时那句之外只再说一句，头一回出极品最要紧，其次是极品，再次是头一回找到
      const more = got.first
        ? fill(FIRST_FINE, { name })
        : got.fine
          ? fill(SEARCH_LINES.fine, { name })
          : first
            ? fill(SEARCH_LINES.first, { name })
            : '';
      const line = f.line + more;
      fact('search.found', { ...where, item: got.item, n: f.n, fine: got.fine, first, line });
    });

    queries.define('search.why', (w, spot, at = null) => why(w, spot, at));
    queries.define('search.spots', (w, map = people.me(w).map) => {
      const s = mine(w);
      return SPOTS.filter(x => x.map === map).map(x => ({
        x: x.x,
        y: x.y,
        kind: x.kind,
        cue: s.cues.includes(x.id),
        done: s.done.includes(x.id),
      }));
    });
    queries.define('search', w => {
      const who = people.who(w);
      const s = w.search[who];
      return {
        luck: luck(w, who),
        cost: people.quote(w, 'search'),
        found: Object.entries(s.found).map(([item, day]) => ({
          item,
          name: ITEMS[item].name,
          day,
        })),
      };
    });

    ctx.provide('search', Object.freeze({ spots: SEARCH_SPOTS }));
  },
};
