// 地上冒出来的时令野货：每天清早各张图冒几样，落在树下、竹边、花丛草边能站人的地方，雨后多；
// 走到跟前（或踩上去）就捡起来，不花体力、不花工夫。冒什么、落在哪类东西旁边见 content/ground.js。
//   ground.pick {at, x, y} → ground.picked {who, map, x, y, item, n, fine, line}
//   查询 ground(map) → 这张图上还没捡的 [{x, y, item}]
// 落在哪儿只看日子、种子、地点（sim/noise.js），不动存档里的随机数，别处的收成照旧。
import { is } from '../../kernel/schema.js';
import { refuse } from '../../kernel/dispatch.js';
import { MAPS, walkable, farmable, actAt } from '../../content/maps/index.js';
import { ITEMS } from '../../content/items.js';
import { dateOf } from '../../content/calendar.js';
import { FIRST_FINE, fineId } from '../../content/quality.js';
import { SEARCH_LINES } from '../../content/search.js';
import { GROUND, GROUND_FINDS } from '../../content/ground.js';
import { fill } from '../../content/text.js';
import { noise } from '../noise.js';
import { near } from './people.js';
import { SEARCH_SPOTS } from './search.js';

const ITEM_SET = new Set(GROUND_FINDS.map(f => f.item));
const BY_ITEM = new Map(GROUND_FINDS.map(f => [f.item, f]));
const SIDES = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];
// 有野地的图（翻找点所在的图），按名字排好，挑的时候顺序固定
const FIELD_MAPS = [...new Set(SEARCH_SPOTS.map(s => s.map))].sort();

/** 这张图上，挨着某几类东西、能站人、不是菜地也不是灶台井台的格子。 */
function tilesNear(map, kinds) {
  const m = MAPS[map];
  const out = new Map();
  for (const s of SEARCH_SPOTS)
    if (s.map === map && kinds.includes(s.kind))
      for (const [dx, dy] of SIDES) {
        const x = s.x + dx,
          y = s.y + dy;
        if (walkable(m, x, y) && !farmable(m, x, y) && !actAt(m, x, y))
          out.set(`${x},${y}`, { x, y });
      }
  return [...out.values()].sort((a, b) => a.y - b.y || a.x - b.x);
}

const itemOk = g =>
  is.obj(g) &&
  Object.hasOwn(MAPS, g.map) &&
  is.int(g.x, 0, 99) &&
  is.int(g.y, 0, 99) &&
  ITEM_SET.has(g.item);
const personOk = p => is.obj(p) && is.arr(p.items, GROUND.max) && p.items.every(itemOk);

export const ground = {
  id: 'sim.ground',
  requires: ['schema', 'commands', 'reactions', 'queries', 'people', 'pack', 'weather', 'quality'],
  writes: ['ground'],
  install(ctx) {
    const { schema, commands, reactions, queries, people, pack, weather, quality } = ctx.services;

    schema.slice('ground', {
      initial: (env, w) => Object.fromEntries(Object.keys(w.packs).map(id => [id, { items: [] }])),
      validate: (all, w) =>
        (is.keyedBy(all, Object.keys(w.packs)) && Object.values(all).every(personOk)) || 'ground',
    });

    /** 这一天冒在哪儿：每张图先看当季能冒哪几样，再照种子挑几样、各落一格。 */
    function sprout(w, who) {
      const day = w.clock.day;
      const seed = w.meta.seed;
      const salt = Object.keys(w.packs).indexOf(who) + 1;
      const season = dateOf(day).season;
      const wet = weather.wetLately(w);
      const pool = GROUND_FINDS.filter(f => f.seasons.includes(season) && (!f.wet || wet));
      const [lo, hi] = GROUND.perMap;
      const items = [];
      FIELD_MAPS.forEach((map, mi) => {
        const here = pool
          .map(f => ({ f, tiles: tilesNear(map, f.near) }))
          .filter(x => x.tiles.length);
        if (!here.length) return;
        const n =
          lo + Math.floor(noise(seed, day, salt, mi + 1) * (hi - lo + 1)) + (wet ? GROUND.wet : 0);
        for (let k = 0; k < n && items.length < GROUND.max; k++) {
          const pickF = here[Math.floor(noise(seed, day, salt, mi + 1, k + 1, 1) * here.length)];
          const free = pickF.tiles.filter(
            t => !items.some(g => g.map === map && g.x === t.x && g.y === t.y),
          );
          if (!free.length) continue;
          const t = free[Math.floor(noise(seed, day, salt, mi + 1, k + 1, 2) * free.length)];
          items.push({ map, x: t.x, y: t.y, item: pickF.f.item });
        }
      });
      return items;
    }

    // 新的一天：昨天没捡的烂在地里了，换一批
    reactions.on(
      'day.started',
      s => {
        for (const [who, me] of Object.entries(s.world.ground)) me.items = sprout(s.world, who);
      },
      { priority: 30 },
    );

    commands.register('ground.pick', ({ draft, input, fact }) => {
      const w = draft.world;
      const me = people.place(w, input.at);
      const who = people.who(w);
      const list = w.ground[who].items;
      const i = list.findIndex(g => g.map === me.map && g.x === input.x && g.y === input.y);
      if (i < 0) refuse('这儿没有东西');
      const g = list[i];
      if (!near(me, g)) refuse('走到跟前再捡');
      const home = people.atHome(w, who);
      if (!pack.fits(w, who, g.item) && !home) refuse(SEARCH_LINES.full);
      // 极品另占一格：放不下就不抽，免得抽中了反倒拿不走
      const got =
        pack.fits(w, who, fineId(g.item)) || home
          ? quality.roll(w, who, 'forage', {}, g.item)
          : { item: g.item, fine: false, first: false };
      list.splice(i, 1);
      pack.receive(w, who, got.item, 1, '地上捡的');
      const name = ITEMS[got.item].name;
      const more = got.first
        ? fill(FIRST_FINE, { name })
        : got.fine
          ? fill(SEARCH_LINES.fine, { name })
          : '';
      const line = BY_ITEM.get(g.item).line + more;
      fact('ground.picked', {
        who,
        map: g.map,
        x: g.x,
        y: g.y,
        item: got.item,
        n: 1,
        fine: got.fine,
        line,
      });
    });

    queries.define('ground', (w, map = people.me(w).map) =>
      w.ground[people.who(w)].items
        .filter(g => g.map === map)
        .map(({ x, y, item }) => ({ x, y, item })),
    );
  },
};
