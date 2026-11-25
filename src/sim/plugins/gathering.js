// 野外：沿溪找食材、捡柴砍木、挖笋劈篾、采菌采茶、捡栗子。钓鱼另在 plugins/fishing.js。
//   gather {id, at}        → forage.finished {id, item, n, line}
import { MAPS } from '../../content/maps/index.js';
import { ENCOUNTER_WORDS as words } from '../../content/encounters.js';
import { registerResidentOptions } from '../resident-options.js';
import { is } from '../../kernel/schema.js';
import { refuse } from '../../kernel/dispatch.js';
import { OUTDOOR, FORAGE_FINDS } from '../../content/activities.js';
import { dateOf } from '../../content/calendar.js';
import { ITEMS } from '../../content/items.js';
import { FIND_TEXT, ACTIVITY_TEXT, STICKS_TEXT, STOWED } from '../../content/life-text.js';
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
    registerResidentOptions(ctx, 'yun', c => outing(c, 'hill', 'tea', '茶垄今天能采吗？'));
    const { schema, commands, queries, reactions, people, pack, body, core, compute, weather } =
      ctx.services;
    schema.slice('outings', {
      initial: (env, w) => Object.fromEntries(Object.keys(w.packs).map(id => [id, { counts: {} }])),
      validate: (all, w) =>
        (is.keyedBy(all, Object.keys(w.packs)) &&
          Object.values(all).every(
            o => is.obj(o.counts) && Object.values(o.counts).every(n => is.int(n, 0, 9999)),
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
        for (const o of Object.values(s.world.outings)) o.counts = {};
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
    queries.define('outings', (w, station, at) => ({
      weather: weather.view(w),
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
