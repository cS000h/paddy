import { is } from '../../kernel/schema.js';
import { refuse } from '../../kernel/dispatch.js';
import { OUTDOOR, FISH_BITE, FISH_TIMING } from '../../content/activities.js';
import { dateOf } from '../../content/calendar.js';
import { atStation } from '../stations.js';
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
    const { schema, commands, queries, reactions, people, pack, body, core, compute, weather } =
      ctx.services;
    schema.slice('outings', {
      initial: (env, w) =>
        Object.fromEntries(Object.keys(w.packs).map(id => [id, { counts: {}, fish: null }])),
      validate: (all, w) =>
        Object.entries(all).every(
          ([id, o]) =>
            w.people[id] &&
            is.obj(o.counts) &&
            Object.values(o.counts).every(n => is.int(n, 0, 9999)) &&
            (o.fish === null ||
              (Number.isFinite(o.fish.roll) &&
                o.fish.roll >= 0 &&
                o.fish.roll < 1 &&
                is.int(o.fish.day, 1))),
        ) || 'outings',
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
      if (a.id === 'fish' && w.clock.minute >= 1140) return '天黑了，明天再来钓';
      if (people.me(w).energy < people.quote(w, a.id).value) return '太累了，先歇歇';
      return null;
    };
    const table = w => {
      const wet = weather.wetLately(w);

      const base = [
        [
          ['herb', 5],
          ['shepherd', 4],
          ['shoot', wet ? 4 : 1],
          ['potato', 2],
          ['mushroom', wet ? 2 : 0],
        ],
        [
          ['herb', 6],
          ['potato', 3],
          ['ginger', 2],
          ['leaf', 1],
          ['mushroom', wet ? 2 : 0],
        ],
        [
          ['potato', 4],
          ['herb', 3],
          ['bean', 2],
          ['mushroom', wet ? 3 : 1],
          ['ginger', 1],
        ],
        [
          ['shoot', 2],
          ['herb', 1],
          ['ginger', 2],
        ],
      ][dateOf(w.clock.day).season];
      return compute.run(
        'forage.table',
        { w, who: people.who(w) },
        { value: base.filter(([, n]) => Number(n) > 0), parts: [] },
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
      const item =
        a.id === 'forage'
          ? core.weighted(w, table(w))
          : a.id === 'sticks'
            ? 'wood'
            : a.id === 'logs'
              ? 'log'
              : a.item;
      const n = yieldOf(
        w,
        a,
        a.id === 'sticks' ? (weather.has(w, 'wet') ? 1 : 2) : a.id === 'logs' ? 2 : a.n || 1,
      );
      pack.receive(w, people.who(w), item, n, '在野外找到的');
      fact('forage.finished', { who: people.who(w), id: a.id, item, n });
    });
    const chance = (w, timing) => {
      let p = FISH_BITE[w.weather.now];
      if (w.weather.now === 'sunny' && (w.clock.minute < 540 || w.clock.minute >= 1020)) p += 0.2;
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
        fact('fish.caught', { who: people.who(w), n, timing });
      } else {
        body.mood(w, people.who(w), -1, '鱼脱钩了');
        fact('fish.missed', { who: people.who(w), timing });
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
