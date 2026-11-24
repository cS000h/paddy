// 野外：沿溪找食材、捡柴砍木、挖笋劈篾、采菌采茶、捡栗子，和钓鱼。
//   gather {id, at}        → forage.finished {id, item, n, line}
//   fish.cast {at}         → fish.cast          下竿时就定好这一竿的运气
//   fish.reel {value, at}  → fish.caught {n, timing, line} | fish.missed {timing, line}
import { MAPS } from '../../content/maps/index.js';
import { ENCOUNTER_WORDS as words } from '../../content/encounters.js';
import { registerResidentOptions } from '../resident-options.js';
import { is } from '../../kernel/schema.js';
import { refuse } from '../../kernel/dispatch.js';
import { OUTDOOR, FISH_BITE, FISH_TIMING, FORAGE_FINDS } from '../../content/activities.js';
import { CALENDAR, dateOf } from '../../content/calendar.js';
import { ITEMS } from '../../content/items.js';
import {
  FIND_TEXT,
  ACTIVITY_TEXT,
  STICKS_TEXT,
  STOWED,
  FISH_TEXT,
} from '../../content/life-text.js';
import { fill } from '../../content/text.js';
import { atStation } from '../stations.js';

// 找到东西时的一段话（沿用 0.12）：先找这件事自己的说法，没有就按找到的东西说。
function foundLine(a, item, n) {
  let story = ACTIVITY_TEXT[a.id] || FIND_TEXT[item] || '';
  if (a.id === 'forage') story = FIND_TEXT[item];
  if (a.id === 'sticks') story = n > 1 ? STICKS_TEXT.many : STICKS_TEXT.few;
  return fill(story, { n }) + fill(STOWED, { item: ITEMS[item].name, n });
}

function outing({ ask, person }, place, id, label) {
  if (person.place !== place) return [];
  const station = MAPS[person.map].objects.find(o => o[3]?.station === id);
  if (!station) return [];
  const activity = ask('outings', id, { x: station[1], y: station[2] }).options.find(
    a => a.id === id,
  );
  return [
    {
      key: 'outing.' + id,
      label,
      line: activity.reason || words.outing(id, activity.left),
    },
  ];
}

export const gathering = {
  id: 'sim.gathering',
  provides: ['outings'],
  requires: [
    'schema',
    'commands',
    'queries',
    'reactions',
    'people',
    'pack',
    'body',
    'core',
    'compute',
    'weather',
  ],
  writes: ['outings'],
  install(ctx) {
    registerResidentOptions(ctx, 'zhou', c => outing(c, 'river', 'fish', '今天还能下几竿？'));
    registerResidentOptions(ctx, 'yun', c => outing(c, 'hill', 'tea', '茶垄今天能采吗？'));
    const { schema, commands, queries, reactions, people, pack, body, core, compute, weather } =
      ctx.services;
    schema.slice('outings', {
      initial: (env, w) =>
        Object.fromEntries(Object.keys(w.packs).map(id => [id, { counts: {}, fish: null }])),
      validate: (all, w) =>
        (is.keyedBy(all, Object.keys(w.packs)) &&
          Object.values(all).every(
            o =>
              is.obj(o.counts) &&
              Object.values(o.counts).every(n => is.int(n, 0, 9999)) &&
              (o.fish === null ||
                (is.obj(o.fish) &&
                  Number.isFinite(o.fish.roll) &&
                  o.fish.roll >= 0 &&
                  o.fish.roll < 1 &&
                  is.int(o.fish.day, 1))),
          )) ||
        'outings',
    });
    const mine = w => w.outings[people.who(w)];
    const count = (w, id) => mine(w).counts[id] || 0;
    const mark = ctx.own((w, id) => {
      mine(w).counts[id] = count(w, id) + 1;
    });
    reactions.on(
      'day.started',
      s => {
        for (const o of Object.values(s.world.outings)) {
          o.counts = {};
          o.fish = null;
        }
      },
      { priority: 20 },
    );
    const why = (w, a, at) => {
      if (!a) return '没有这件事';
      if (!atStation(w, people, a.station, at)) return '走到采集点旁边再动手';
      if (count(w, a.id) >= a.limit) return '今天已经找过了，明天再来';
      if (weather.has(w, 'storm')) return '打雷了，别在水边和林子里待着';
      if (a.seasons && !a.seasons.includes(dateOf(w.clock.day).season)) return '还没到时节';
      if (a.id === 'mushroom' && !weather.wetLately(w)) return '雨后才会冒菌子';
      if (['forage', 'shoot', 'logs'].includes(a.id) && weather.has(w, 'snow'))
        return '雪盖着，今天找不着';
      if (a.id === 'tea' && weather.has(w, 'heavy')) return '雨太大，茶叶泡了水就不香了';
      if (a.id === 'fish' && w.clock.minute >= CALENDAR.dark) return '天黑了，明天再来钓';
      if (people.me(w).energy < people.quote(w, a.id).value) return '太累了，先歇歇';
      return null;
    };
    // 沿溪找食材找到什么：按季节和近来下没下雨查 content/activities.js 的 FORAGE_FINDS。
    const table = w => {
      const wet = weather.wetLately(w);
      const season = FORAGE_FINDS[dateOf(w.clock.day).season];
      /** @type {[string, number][]} */
      const finds = Object.entries(season).map(([item, n]) => [
        item,
        Array.isArray(n) ? n[wet ? 1 : 0] : n,
      ]);
      return compute.run(
        'forage.table',
        { w, who: people.who(w) },
        { value: finds.filter(([, n]) => n > 0), parts: [] },
      ).value;
    };
    const yieldOf = (w, a, n) => {
      const id = people.who(w),
        r = compute.run('action.yield', { w, who: id, action: a }, { value: n, parts: [] });
      if (r.parts.some(p => p.id === 'buff.fresh')) body.useBuff(w, id, 'fresh');
      return r.value;
    };
    commands.register('gather', ({ draft, input, fact }) => {
      const w = draft.world;
      people.place(w, input.at);
      const a = OUTDOOR[input.id];
      const reason = why(w, a, null);
      if (reason) refuse(reason);
      if (a.id === 'fish') refuse('先下竿');
      people.spend(w, draft, a.id, fact);
      mark(w, a.id);
      // 沿溪找食材是抽签；枯枝下雨天潮着，只捡得一小捆；其余照 content 里写的东西和份数。
      const item = a.id === 'forage' ? core.weighted(w, table(w)) : a.item;
      const wetSticks = a.id === 'sticks' && weather.has(w, 'wet');
      const n = yieldOf(w, a, wetSticks ? 1 : a.n || 1);
      pack.receive(w, people.who(w), item, n, '在野外找到的');
      fact('forage.finished', {
        who: people.who(w),
        id: a.id,
        item,
        n,
        line: foundLine(a, item, n),
      });
    });
    const chance = (w, timing) => {
      let p = FISH_BITE[w.weather.now];
      if (
        w.weather.now === 'sunny' &&
        (w.clock.minute < CALENDAR.morningEnd || w.clock.minute >= 1020)
      )
        p += 0.2;
      p += timing === 'great' ? 0.25 : timing === 'good' ? 0.1 : -0.3;
      return Math.max(
        0.05,
        Math.min(
          0.97,
          compute.run('fish.chance', { w, who: people.who(w) }, { value: p, parts: [] }).value,
        ),
      );
    };
    commands.register('fish.cast', ({ draft, input, fact }) => {
      const w = draft.world;
      people.place(w, input.at);
      if (mine(w).fish) refuse('浮漂还在水里，先提竿');
      const reason = why(w, OUTDOOR.fish, null);
      if (reason) refuse(reason);
      people.spend(w, draft, 'fish', fact);
      mark(w, 'fish');
      mine(w).fish = { roll: core.random(w), day: w.clock.day };
      fact('fish.cast', { who: people.who(w) });
    });
    commands.register('fish.reel', ({ draft, input, fact }) => {
      const w = draft.world;
      people.place(w, input.at);
      const attempt = mine(w).fish;
      if (!attempt || !atStation(w, people, 'fish')) refuse('先去钓点下竿');
      if (!is.int(input.value, 0, 100)) refuse('没看清浮漂');
      const distance = Math.abs(input.value - FISH_TIMING.center);
      const timing =
        distance <= FISH_TIMING.great ? 'great' : distance <= FISH_TIMING.half ? 'good' : 'late';
      mine(w).fish = null;
      if (attempt.roll < chance(w, timing)) {
        const n = yieldOf(w, OUTDOOR.fish, timing === 'great' ? 2 : 1);
        pack.receive(w, people.who(w), 'fish', n, '钓上来的');
        const line = n > 1 ? fill(FISH_TEXT.more, { n }) : FISH_TEXT.one;
        fact('fish.caught', { who: people.who(w), n, timing, line });
      } else {
        body.mood(w, people.who(w), -1, '鱼脱钩了');
        fact('fish.missed', { who: people.who(w), timing, line: FISH_TEXT.missed });
      }
    });
    queries.define('outings', (w, station, at) => ({
      weather: weather.view(w),
      pending: !!mine(w).fish,
      options: Object.values(OUTDOOR)
        .filter(a => a.station === station)
        .map(a => ({
          ...a,
          reason: why(w, a, at),
          left: a.limit - count(w, a.id),
          cost: people.quote(w, a.id),
        })),
    }));
    ctx.provide('outings', Object.freeze({ count, mark }));
  },
};
