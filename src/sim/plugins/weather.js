import { is } from '../../kernel/schema.js';
import { WEATHER_TYPES, WEATHER_FREQ, SEASON_BASE } from '../../content/weather.js';
import { dateOf } from '../../content/calendar.js';
export const weather = {
  id: 'sim.weather',
  provides: ['weather'],
  requires: ['schema', 'reactions', 'queries', 'core'],
  writes: ['weather'],
  install(ctx) {
    const { schema, reactions, queries, core } = ctx.services;
    schema.slice('weather', {
      initial: () => ({ now: 'sunny', history: ['sunny'] }),
      validate: x =>
        (Object.hasOwn(WEATHER_TYPES, x.now) &&
          is.arr(x.history, 7) &&
          x.history.every(k => WEATHER_TYPES[k])) ||
        'weather',
    });
    const has = (w, tag) => WEATHER_TYPES[w.weather.now].tags.includes(tag);
    const wetLately = w =>
      w.weather.history.slice(-2).some(k => WEATHER_TYPES[k].tags.includes('wet'));
    reactions.on(
      'day.started',
      (s, e, emit) => {
        const w = s.world,
          si = dateOf(w.clock.day).season,
          from = w.weather.now;
        const to = core.weighted(
          w,
          Object.entries(WEATHER_FREQ).map(([k, n]) => [k, n[si]]),
        );
        w.weather.now = to;
        w.weather.history.push(to);
        if (w.weather.history.length > 7) w.weather.history.shift();
        emit('weather.changed', { from, to });
      },
      { priority: 5 },
    );
    const view = w => ({
      code: w.weather.now,
      ...WEATHER_TYPES[w.weather.now],
      temperature: SEASON_BASE[dateOf(w.clock.day).season] + WEATHER_TYPES[w.weather.now].temp,
    });
    queries.define('weather', view);
    ctx.provide('weather', Object.freeze({ has, wetLately, view }));
  },
};
