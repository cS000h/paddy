// 游戏里的时间。现实时间归外壳管：外壳每凑满一小段，就发一条 clock.advance。
// 规则只知道“又过了几分钟”，所以同一串命令永远得到同一个结果。
//   clock.advance {minutes} → time.passed {day, from, minute}   from 是这一段开始时的分钟
//   sleep (people 插件)     → 调 clock.nextDay() → day.ended, day.started {day, late, minute}
//                             minute 是睡下的钟点
// 到了 dayEnd 时间就停住，不催人；睡一觉才到第二天。
import { is, check } from '../../kernel/schema.js';
import { CALENDAR, dateOf, timeOf } from '../../content/calendar.js';

export const clock = {
  id: 'sim.clock',
  provides: ['clock'],
  requires: ['schema', 'commands', 'queries'],
  writes: ['clock'],
  install(ctx) {
    const { schema, commands, queries } = ctx.services;

    schema.slice('clock', {
      initial: () => ({ day: 1, minute: CALENDAR.dayStart }),
      validate: c =>
        check([
          [is.int(c.day, 1), 'day'],
          [is.int(c.minute, 0, CALENDAR.dayEnd), 'minute'],
        ]),
    });

    commands.register('clock.advance', ({ draft, input, fact }) => {
      const c = draft.world.clock;
      if (!is.int(input.minutes, 1, 120)) return { ok: false, reason: '时间只能一小段一小段地过' };
      if (c.minute >= CALENDAR.dayEnd) return { ok: false, reason: '夜深了' };
      const from = c.minute;
      c.minute = Math.min(CALENDAR.dayEnd, c.minute + input.minutes);
      fact('time.passed', { day: c.day, from, minute: c.minute });
    });

    queries.define('clock', w => ({
      day: w.clock.day,
      minute: w.clock.minute,
      late: w.clock.minute >= CALENDAR.lateSleep,
      stopped: w.clock.minute >= CALENDAR.dayEnd,
      ...dateOf(w.clock.day),
      ...timeOf(w.clock.minute),
    }));

    ctx.provide(
      'clock',
      Object.freeze({
        // 过到第二天早上。返回刚结束的那一天是不是睡晚了。
        nextDay: ctx.own((w, fact) => {
          const minute = w.clock.minute;
          const late = minute >= CALENDAR.lateSleep;
          fact('day.ended', { day: w.clock.day, late, minute });
          w.clock.day += 1;
          w.clock.minute = CALENDAR.dayStart;
          fact('day.started', { day: w.clock.day, late, minute });
          return late;
        }),
      }),
    );
  },
};
