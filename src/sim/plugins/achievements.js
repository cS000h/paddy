import { is } from '../../kernel/schema.js';
import { ACHIEVEMENTS } from '../../content/achievements.js';
export const achievements = {
  id: 'sim.achievements',
  requires: ['schema', 'reactions', 'queries', 'people'],
  writes: ['achievements'],
  install(ctx) {
    const { schema, reactions, queries, people } = ctx.services;
    const ids = new Set(ACHIEVEMENTS.map(a => a.id));
    schema.slice('achievements', {
      initial: (env, w) =>
        Object.fromEntries(Object.keys(w.packs).map(id => [id, { counts: {}, earned: {} }])),
      validate: (all, w) =>
        (is.keyedBy(all, Object.keys(w.packs)) &&
          Object.values(all).every(
            a =>
              is.obj(a.counts) &&
              is.obj(a.earned) &&
              Object.entries(a.counts).every(([k, n]) => ids.has(k) && is.int(n)) &&
              Object.entries(a.earned).every(([k, d]) => ids.has(k) && is.int(d, 1)),
          )) ||
        'achievements',
    });
    for (const event of new Set(ACHIEVEMENTS.map(a => a.event)))
      reactions.on(
        event,
        (s, e, emit) => {
          const w = s.world,
            id = e.data.who || people.who(w),
            state = w.achievements[id];
          if (!state) return;
          for (const a of ACHIEVEMENTS.filter(a => a.event === event)) {
            if (
              state.earned[a.id] ||
              Object.entries(a.where || {}).some(([k, v]) => e.data[k] !== v)
            )
              continue;
            const n = a.amount ? e.data[a.amount] : 1;
            if (!Number.isFinite(n) || n <= 0) continue;
            state.counts[a.id] = Math.min(a.goal, (state.counts[a.id] || 0) + n);
            if (state.counts[a.id] >= a.goal) {
              state.earned[a.id] = w.clock.day;
              emit('achievement.earned', { who: id, id: a.id, name: a.name });
            }
          }
        },
        { priority: 80 },
      );
    queries.define('achievements', w => {
      const state = w.achievements[people.who(w)];
      return ACHIEVEMENTS.map(a => ({
        ...a,
        count: state.counts[a.id] || 0,
        day: state.earned[a.id] || null,
      }));
    });
  },
};
