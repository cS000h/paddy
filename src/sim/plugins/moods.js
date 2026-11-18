// 乡邻今天的心情（0–100）。每天清早往各人平常的心情回落三分之一，再看天气、添一点说不清的起伏；
// 你和他熟了一步、送了他最爱吃的，他会高兴一点。心情决定说话前的动作和看上去的样子（content/talk.js）。
//   day.started → 各人的心情重新算过（不发事实，只改数）
import { is } from '../../kernel/schema.js';
import { ON_MAP } from '../../content/people.js';
import { BASE_MOOD, WEATHER_MOOD, moodBand } from '../../content/talk.js';

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

export const moods = {
  id: 'sim.moods',
  provides: ['moods'],
  requires: ['schema', 'reactions', 'core'],
  writes: ['moods'],
  install(ctx) {
    const { schema, reactions, core } = ctx.services;

    schema.slice('moods', {
      initial: () => ({ ...BASE_MOOD }),
      validate: all =>
        (is.keyedBy(all, ON_MAP) && ON_MAP.every(id => is.int(all[id], 0, 100))) || 'moods',
    });

    reactions.on(
      'day.started',
      s => {
        const w = s.world;
        for (const id of ON_MAP) {
          const m = w.moods[id];
          const pull = Math.round((BASE_MOOD[id] - m) / 3);
          const sky = WEATHER_MOOD[id][w.weather.today] || 0;
          const jitter = Math.floor(core.random(w) * 9) - 4;
          w.moods[id] = clamp(m + pull + sky + jitter, 5, 98);
        }
      },
      { priority: 20 },
    );

    ctx.provide(
      'moods',
      Object.freeze({
        /** 让 id 高兴（n 为负就是不高兴）一点。 */
        cheer: ctx.own((w, id, n) => {
          w.moods[id] = clamp(w.moods[id] + n, 0, 100);
        }),
        /** 今天的心情：{value, id: good|ok|meh|low, word}。 */
        band: (w, id) => ({ value: w.moods[id], ...moodBand(w.moods[id]) }),
      }),
    );
  },
};
