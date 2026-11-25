import { is } from '../../kernel/schema.js';
import { refuse } from '../../kernel/dispatch.js';
import {
  WEATHER_TYPES as TYPES,
  WEATHER_FREQ as FREQ,
  SEASON_BASE,
  SLOT_TEMP,
  SHIFTS,
  WEATHER_RULES as RULES,
} from '../../content/weather.js';
import { dateOf, CALENDAR } from '../../content/calendar.js';
const slot = minute =>
  Math.max(0, Math.min(3, Math.floor((minute - CALENDAR.dayStart) / RULES.slotMinutes)));
export const weather = {
  id: 'sim.weather',
  provides: ['weather'],
  requires: ['schema', 'reactions', 'queries', 'commands', 'compute', 'people', 'core'],
  writes: ['weather'],
  install(ctx) {
    const { schema, reactions, queries, commands, compute, people, core } = ctx.services;
    const table = si =>
      Object.entries(FREQ)
        .map(([k, n]) => [k, n[si]])
        .filter(([, n]) => Number(n) > 0);
    const next = (w, today, si) =>
      FREQ[today][si] > 0 && core.random(w) < RULES.persist ? today : core.weighted(w, table(si));
    schema.slice('weather', {
      initial: () => ({
        now: 'sunny',
        today: 'sunny',
        history: ['sunny'],
        tomorrow: 'cloudy',
        forecast: 'cloudy',
        acc: 50,
        jitter: 0,
        wetDays: 0,
        dryDays: 1,
        looked: 0,
      }),
      validate: x =>
        (['now', 'today', 'tomorrow', 'forecast'].every(k => Object.hasOwn(TYPES, x[k])) &&
          is.arr(x.history, 7) &&
          x.history.every(k => TYPES[k]) &&
          is.int(x.acc, 0, 100) &&
          is.int(x.jitter, -3, 3) &&
          ['wetDays', 'dryDays', 'looked'].every(k => is.int(x[k]))) ||
        'weather',
    });
    const has = (w, tag) => TYPES[w.weather.now].tags.includes(tag);
    const wetLately = w =>
      has(w, 'wet') || w.weather.history.slice(-2).some(k => TYPES[k].tags.includes('wet'));
    const accuracy = (w, bonus) =>
      Math.max(
        0.3,
        Math.min(
          0.95,
          compute.run(
            'forecast.accuracy',
            { w, who: people.who(w) },
            { value: RULES.forecast + bonus, parts: [] },
          ).value,
        ),
      );
    const forecast = (w, bonus = 0) => {
      const acc = accuracy(w, bonus);
      w.weather.forecast =
        core.random(w) < acc
          ? w.weather.tomorrow
          : core.weighted(w, table(dateOf(w.clock.day + 1).season));
      w.weather.acc = Math.round(acc * 100);
    };
    const view = w => ({
      code: w.weather.now,
      ...TYPES[w.weather.now],
      temperature:
        SEASON_BASE[dateOf(w.clock.day).season] +
        SLOT_TEMP[slot(w.clock.minute)] +
        TYPES[w.weather.now].temp +
        w.weather.jitter,
      forecast: { name: TYPES[w.weather.forecast].name, acc: w.weather.acc },
      wetDays: w.weather.wetDays,
      dryDays: w.weather.dryDays,
      looked: w.weather.looked === w.clock.day,
    });
    reactions.on(
      'day.started',
      (s, e, emit) => {
        const w = s.world,
          x = w.weather,
          si = dateOf(w.clock.day).season,
          from = x.now;
        const to = FREQ[x.tomorrow][si] > 0 ? x.tomorrow : core.weighted(w, table(si));
        x.today = x.now = to;
        x.jitter = Math.floor(core.random(w) * 5) - 2;
        x.history.push(to);
        if (x.history.length > 7) x.history.shift();
        if (has(w, 'wet')) {
          x.wetDays++;
          x.dryDays = 0;
        } else {
          x.dryDays++;
          x.wetDays = 0;
        }
        x.tomorrow = next(w, to, dateOf(w.clock.day + 1).season);
        forecast(w);
        core.post(w, {
          title: '清早的天色',
          text: `${TYPES[to].name}，${view(w).temperature}°上下。看云色，明天可能${TYPES[x.forecast].name}（把握${x.acc}%）。`,
        });
        emit('weather.changed', { from, to, cause: 'dawn' });
      },
      { priority: 5 },
    );
    reactions.on(
      'time.passed',
      (s, e, emit) => {
        const w = s.world;
        for (let k = slot(e.data.from) + 1; k <= slot(e.data.minute); k++) {
          const si = dateOf(w.clock.day).season;
          const rule = SHIFTS.find(
            r =>
              r.from.includes(w.weather.now) &&
              (!r.seasons || r.seasons.includes(si)) &&
              (r.slot === undefined || k === r.slot),
          );
          if (!rule || core.random(w) >= rule.chance) continue;
          const from = w.weather.now,
            to = rule.to[Math.floor(core.random(w) * rule.to.length)];
          w.weather.now = to;
          core.post(w, { title: '天色变了', text: rule.text });
          emit('weather.changed', { from, to, cause: 'shift' });
        }
      },
      { priority: 5 },
    );
    compute.tap(
      'action.cost',
      (r, { w, action }) => {
        if (action.outdoor && action.base > 0 && has(w, 'wet'))
          compute.part(
            r,
            'weather.wet',
            has(w, 'snow') ? '雪地难走' : has(w, 'heavy') ? '雨大路滑' : '雨天路滑',
            has(w, 'heavy') ? 3 : 2,
          );
      },
      { priority: 10 },
    );
    compute.tap(
      'forecast.accuracy',
      (r, { w }) => {
        if (
          w.weather.history.length >= 2 &&
          w.weather.history.slice(-2).every(c => c === w.weather.today)
        )
          compute.part(r, 'weather.steady', '近两日天气稳定', 0.05);
      },
      { priority: 10 },
    );
    commands.register('sky.look', ({ draft, input, fact }) => {
      const w = draft.world;
      people.place(w, input.at);
      if (w.weather.looked === w.clock.day) refuse('今天仔细看过天了');
      people.spend(w, draft, 'sky', fact);
      w.weather.looked = w.clock.day;
      forecast(w, RULES.lookBonus);
      fact('sky.looked', { who: people.who(w), acc: w.weather.acc });
    });
    queries.define('weather', view);
    /** 明天会不会下雨下雪（真的天，不是看云色猜的）。 */
    const wetTomorrow = w => TYPES[w.weather.tomorrow].tags.includes('wet');
    /** 看出了明天的天：看云色的说法换成真的，把握九成五。 */
    const foresee = ctx.own(w => {
      w.weather.forecast = w.weather.tomorrow;
      w.weather.acc = 95;
    });
    ctx.provide('weather', Object.freeze({ has, wetLately, view, wetTomorrow, foresee }));
  },
};
