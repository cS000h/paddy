// 体感归每个人。冷热、饥饿和食物/特质共同经过管道决定干活费力程度。
import { is } from '../../kernel/schema.js';
import { FEEL_BANDS } from '../../content/weather.js';
export const comfort = {
  id: 'sim.comfort',
  provides: ['comfort'],
  requires: ['schema', 'queries', 'compute', 'reactions', 'people', 'weather', 'body', 'core'],
  writes: ['sensations'],
  install(ctx) {
    const { schema, queries, compute, reactions, people, weather, body, core } = ctx.services;
    schema.slice('sensations', {
      initial: (env, w) =>
        Object.fromEntries(Object.keys(w.packs).map(id => [id, { chill: null }])),
      validate: (all, w) =>
        (is.keyedBy(all, Object.keys(w.packs)) &&
          Object.values(all).every(v => is.obj(v) && (v.chill === null || is.int(v.chill, 1)))) ||
        'sensations',
    });
    const band = v => {
      const row = FEEL_BANDS.find(r => v <= Number(r[0]));
      return { id: row[1], word: row[2] };
    };
    // 下着雨，身上又没披蓑衣（计算管道 'body.dry'，sim/plugins/attire.js）
    const rained = (w, who) =>
      weather.has(w, 'wet') &&
      !(compute.run('body.dry', { w, who }, { value: 0, parts: [] }).value > 0);
    const feel = (w, id) =>
      compute.run('body.feel', { w, who: id }, { value: weather.view(w).temperature, parts: [] });
    compute.tap(
      'body.feel',
      (r, { w, who }) => {
        if (body.get(w, who)?.hunger < 20) compute.part(r, 'body.hungry', '饿着肚子', -2);
        if (w.people[who]?.energy < 25) compute.part(r, 'body.tired', '累了', -1);
        if (w.sensations[who]?.chill) compute.part(r, 'body.chill', '着凉', -3);
        if (rained(w, who) && !people.atHome(w, who)) compute.part(r, 'body.wet', '淋了雨', -2);
        if (people.atHome(w, who) && r.value <= 10) compute.part(r, 'body.indoor', '屋里避风', 2);
      },
      { priority: 10 },
    );
    compute.tap(
      'action.cost',
      (r, { w, who, action }) => {
        if (action.base <= 0) return;
        const b = band(feel(w, who).value).id;
        if (action.outdoor && ['freezing', 'scorching', 'cold', 'hot'].includes(b))
          compute.part(
            r,
            'body.comfort',
            b === 'cold' || b === 'freezing' ? '天冷手脚慢' : '天热出汗多',
            ['freezing', 'scorching'].includes(b) ? 2 : 1,
          );
        if (w.sensations[who]?.chill) compute.part(r, 'body.chill', '着凉没力气', 2);
      },
      { priority: 20 },
    );
    reactions.on(
      'action.performed',
      (s, e, emit) => {
        const w = s.world,
          id = e.data.who,
          c = w.sensations[id];
        if (
          !c ||
          c.chill ||
          !e.data.outdoor ||
          ['rest', 'sky', 'social', 'chore'].includes(e.data.kind)
        )
          return;
        const b = band(feel(w, id).value).id;
        if (!rained(w, id) && !['cold', 'freezing'].includes(b)) return;
        const p = compute.run(
          'chill.chance',
          { w, who: id },
          {
            value: (b === 'freezing' ? 0.3 : 0.18) + (w.people[id].energy < 30 ? 0.1 : 0),
            parts: [],
          },
        ).value;
        if (core.random(w) < p) {
          c.chill = w.clock.day;
          body.mood(w, id, -4, '淋雨着凉了');
          emit('body.chilled', { who: id });
        }
      },
      { priority: 40 },
    );
    reactions.on(
      'meal.eaten',
      (s, e, emit) => {
        const w = s.world,
          id = e.data.who;
        if (w.sensations[id]?.chill && e.data.buff === 'warm') {
          w.sensations[id].chill = null;
          body.mood(w, id, 3, '热汤下肚');
          emit('body.recovered', { who: id });
        }
      },
      { priority: 40 },
    );
    reactions.on(
      'day.started',
      (s, e, emit) => {
        const w = s.world;
        for (const [id, c] of Object.entries(w.sensations))
          if (c.chill && (w.clock.day - c.chill >= 2 || core.random(w) < 0.5)) {
            c.chill = null;
            emit('body.recovered', { who: id });
          }
      },
      { priority: 30 },
    );
    reactions.on(
      'time.passed',
      (s, e) => {
        if (Math.floor(e.data.from / 180) === Math.floor(e.data.minute / 180)) return;
        const w = s.world;
        for (const id of Object.keys(w.sensations)) {
          const b = band(feel(w, id).value);
          const n = { mild: 1, warm: 1, cool: 0, cold: -1, hot: -1, freezing: -2, scorching: -2 }[
            b.id
          ];
          body.mood(w, id, n, '体感' + b.word);
        }
      },
      { priority: 70 },
    );
    /** 某人此刻身上觉得怎样：{value 体感温度, id 哪一档, word, chill 着没着凉, parts}。 */
    const sense = (w, id) => {
      const r = feel(w, id);
      return { ...r, ...band(r.value), chill: !!w.sensations[id]?.chill };
    };
    queries.define('comfort', w => sense(w, people.who(w)));
    ctx.provide('comfort', Object.freeze({ sense }));
  },
};
