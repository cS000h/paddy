// 白天歇晌：上床时除了睡到天亮，还能歇一个时辰、躺到傍晚。只走时辰、回体力，不过天，一天一回。
// 床铺合不合时令（凉席、厚棉被）：清早醒来按今天的季节给心情加减。数在 content/body.js。
//   nap {mode: 'hour'|'dusk', at} → nap.taken {who, mode, minutes, energy, line}
//   查询 nap → {ok, why, hour, dusk}：现在能不能歇晌、不能的话为什么；两样各睡到几点、回多少体力
// 要站在床边。醒来会误了今天的约（rest.keep 管道），就不让躺，时辰、体力、次数都不动。
import { is } from '../../kernel/schema.js';
import { refuse } from '../../kernel/dispatch.js';
import { NAP, NAP_LINES, BED_SEASON } from '../../content/body.js';
import { dateOf } from '../../content/calendar.js';
import { MAPS } from '../../content/maps/index.js';
import { near } from './people.js';

export const nap = {
  id: 'sim.nap',
  requires: ['schema', 'commands', 'reactions', 'queries', 'compute', 'people', 'clock', 'body'],
  writes: ['naps'],
  install(ctx) {
    const { schema, commands, reactions, queries, compute, people, clock, body } = ctx.services;
    schema.slice('naps', {
      initial: (env, w) => Object.fromEntries(Object.keys(w.packs).map(id => [id, -1])),
      validate: (all, w) =>
        (is.keyedBy(all, Object.keys(w.packs)) && Object.values(all).every(d => is.int(d, -1))) ||
        'naps',
    });

    /** 现在歇不了晌的原因；歇得了是 null。 */
    const plan = (w, mode) => {
      const minutes = mode === 'hour' ? NAP.hour : Math.max(0, NAP.dusk - w.clock.minute);
      const energy = Math.min(NAP.max, Math.round((NAP.perHour * minutes) / 60));
      return { minutes, until: w.clock.minute + minutes, energy };
    };
    const why = (w, mode = 'dusk') => {
      const id = people.who(w);
      const p = people.me(w);
      const bed = MAPS[p.map].objects.find(([k]) => k === 'bed');
      if (p.map !== 'cottage' || !bed || !near(p, { x: bed[1], y: bed[2] })) return NAP_LINES.where;
      const m = w.clock.minute;
      if (m < NAP.from) return NAP_LINES.early;
      if (m >= NAP.to) return NAP_LINES.late;
      if (w.naps[id] === w.clock.day) return NAP_LINES.again;
      const until = plan(w, mode).until;
      return compute.run('rest.keep', { w, until }, { value: '' }).value || null;
    };

    commands.register('nap', ({ draft, input, fact }) => {
      const w = draft.world;
      if (input.mode !== 'hour' && input.mode !== 'dusk') refuse('歇多久没说清');
      people.place(w, input.at);
      const no = why(w, input.mode);
      if (no) refuse(no);
      const id = people.who(w);
      const { minutes, energy } = plan(w, input.mode);
      people.restore(w, id, energy, '歇了个晌');
      body.mood(w, id, NAP.mood, '歇了个晌');
      w.naps[id] = w.clock.day;
      clock.elapse(w, minutes, fact);
      fact('nap.taken', {
        who: id,
        mode: input.mode,
        minutes,
        energy,
        line: NAP_LINES[input.mode],
      });
    });

    reactions.on('day.started', s => {
      const w = s.world;
      const bed = BED_SEASON[w.decor?.on?.bed];
      if (!bed) return;
      const season = dateOf(w.clock.day).season;
      const id = people.who(w);
      if (bed.fit.includes(season)) body.mood(w, id, BED_SEASON.mood, bed.good);
      else if (bed.miss.includes(season)) body.mood(w, id, -BED_SEASON.mood, bed.bad);
    });

    queries.define('nap', w => {
      const no = why(w, 'hour') && why(w, 'dusk');
      const one = mode => {
        const { until, energy } = plan(w, mode);
        return { ok: !why(w, mode), why: why(w, mode), until, energy };
      };
      return { ok: !no, why: no || null, hour: one('hour'), dusk: one('dusk') };
    });
  },
};
