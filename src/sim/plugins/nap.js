// 白天歇晌：上床时除了睡到天亮，还能歇一个时辰、躺到傍晚。只走时辰、回体力，不过天，一天一回。
// 床铺合不合时令（凉席、厚棉被）：清早醒来按今天的季节给心情加减。数在 content/body.js。
//   nap {mode: 'hour'|'dusk', at} → nap.taken {who, mode, minutes, energy, line}
//   查询 nap → {ok, why}：现在能不能歇晌，不能的话为什么
import { is } from '../../kernel/schema.js';
import { refuse } from '../../kernel/dispatch.js';
import { NAP, NAP_LINES, BED_SEASON } from '../../content/body.js';
import { dateOf } from '../../content/calendar.js';

export const nap = {
  id: 'sim.nap',
  requires: ['schema', 'commands', 'reactions', 'queries', 'people', 'clock', 'body'],
  writes: ['naps'],
  install(ctx) {
    const { schema, commands, reactions, queries, people, clock, body } = ctx.services;
    schema.slice('naps', {
      initial: (env, w) => Object.fromEntries(Object.keys(w.packs).map(id => [id, -1])),
      validate: (all, w) =>
        (is.keyedBy(all, Object.keys(w.packs)) && Object.values(all).every(d => is.int(d, -1))) ||
        'naps',
    });

    /** 现在歇不了晌的原因；歇得了是 null。 */
    const why = w => {
      const id = people.who(w);
      if (people.me(w).map !== 'cottage') return NAP_LINES.where;
      const m = w.clock.minute;
      if (m < NAP.from) return NAP_LINES.early;
      if (m >= NAP.to) return NAP_LINES.late;
      if (w.naps[id] === w.clock.day) return NAP_LINES.again;
      return null;
    };

    commands.register('nap', ({ draft, input, fact }) => {
      const w = draft.world;
      if (input.mode !== 'hour' && input.mode !== 'dusk') refuse('歇多久没说清');
      people.place(w, input.at);
      const no = why(w);
      if (no) refuse(no);
      const id = people.who(w);
      const minutes = input.mode === 'hour' ? NAP.hour : NAP.dusk - w.clock.minute;
      const energy = Math.min(NAP.max, Math.round((NAP.perHour * minutes) / 60));
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
      const no = why(w);
      return { ok: !no, why: no };
    });
  },
};
