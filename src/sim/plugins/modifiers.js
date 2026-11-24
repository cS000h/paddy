// 时限修正（册子里叫「身边风物」）：加、查、按天过期。
// 修正和历练对六项的加减接进 compute 'attr'（六项由人物档案 sim.persona 合算）；
// 时限修正同时接入别的计算管道（体力、收成、关系、经验、歇息）。
import { is, check } from '../../kernel/schema.js';
import { EARNED_ATTRS, MODIFIERS } from '../../content/modifiers.js';
import { TRAITS } from '../../content/growth.js';
import { WORK_KINDS } from '../../content/actions.js';

const MAX_MODS = 12;

export const modifiers = {
  id: 'sim.modifiers',
  provides: ['modifiers'],
  requires: ['schema', 'queries', 'reactions', 'compute', 'core', 'people', 'growth'],
  writes: ['modifiers'],
  install(ctx) {
    const { schema, queries, reactions, compute, core, people, growth } = ctx.services;

    const modOk = m =>
      is.obj(m) && Object.hasOwn(MODIFIERS, m.id) && is.int(m.until, 1) && is.str(m.from, 40);

    schema.slice('modifiers', {
      initial: (env, w) => Object.fromEntries(Object.keys(w.packs).map(id => [id, []])),
      validate: (all, w) =>
        check([
          [is.keyedBy(all, Object.keys(w.packs)), 'whose'],
          [
            Object.values(all).every(
              list =>
                is.arr(list, MAX_MODS) &&
                list.every(modOk) &&
                new Set(list.map(m => m.id)).size === list.length,
            ),
            'list',
          ],
        ]),
    });

    const active = (w, who = people.who(w)) =>
      (w.modifiers[who] || []).filter(m => m.until > w.clock.day);

    const has = (w, id, who = people.who(w)) => active(w, who).some(m => m.id === id);

    const add = ctx.own((w, who, id, days = null, from = '日常') => {
      const def = Object.hasOwn(MODIFIERS, id) ? MODIFIERS[id] : null;
      const list = w.modifiers[who];
      if (!def || !list) return false;
      const dur = is.int(days, 1, 60) ? days : def.days;
      const until = w.clock.day + dur;
      const label = String(from || '日常').slice(0, 40);
      const existing = list.find(m => m.id === id);
      if (existing) {
        existing.until = Math.max(existing.until, until);
        existing.from = label;
      } else {
        if (list.length >= MAX_MODS) list.shift();
        list.push({ id, until, from: label });
      }
      core.log(w, who, 'mod:' + id, dur, def.name);
      return true;
    });

    // 六项里的两样：做出来的历练，和还没过期的身边风物。
    compute.tap(
      'attr',
      (r, { w, who = people.who(w), attr }) => {
        for (const [t, map] of Object.entries(EARNED_ATTRS))
          if (map[attr] && growth.has(w, t, who))
            compute.part(r, 'earned.' + t, TRAITS[t].name, map[attr]);
        for (const m of active(w, who))
          compute.part(r, 'mod.' + m.id, MODIFIERS[m.id].name, MODIFIERS[m.id].attrs?.[attr] || 0);
      },
      { priority: 60 },
    );

    // 每天清早清掉已经到期的修正。
    reactions.on(
      'day.started',
      s => {
        const day = s.world.clock.day;
        for (const [who, list] of Object.entries(s.world.modifiers))
          s.world.modifiers[who] = list.filter(m => m.until > day);
      },
      { priority: 18 },
    );

    // 吃到拿手热饭时给 3 天「好饭提劲」，让做饭更有正反馈。
    reactions.on(
      'meal.eaten',
      (s, e) => {
        if (!e.data.snack && (e.data.quality === 'great' || e.data.quality === 'good')) {
          const days = e.data.quality === 'great' ? 3 : 2;
          add(s.world, e.data.who, 'good_meal', days, '吃了' + (e.data.dish || '热饭'));
        }
      },
      { priority: 45 },
    );

    // 接入计算管道：干活体力、收成与采集、关系涨幅、经验涨幅、睡醒体力。
    compute.tap(
      'action.cost',
      (r, { w, who, action }) => {
        if (action.base <= 0 || !WORK_KINDS.includes(action.kind)) return;
        for (const m of active(w, who)) {
          const def = MODIFIERS[m.id];
          if (def.cost && (def.cost < 0 || action.base >= 4))
            compute.part(r, 'mod.' + m.id, def.name, def.cost);
        }
      },
      { priority: 68 },
    );

    compute.tap(
      'action.yield',
      (r, { w, who = people.who(w), action }) => {
        for (const m of active(w, who)) {
          const def = MODIFIERS[m.id];
          if (def.yieldFarm && action?.kind === 'farm')
            compute.part(r, 'mod.' + m.id, def.name, def.yieldFarm);
          if (def.yieldForage && ['forage', 'fish'].includes(action?.kind))
            compute.part(r, 'mod.' + m.id, def.name, def.yieldForage);
        }
      },
      { priority: 68 },
    );

    compute.tap(
      'relation.gain',
      (r, { w, who = people.who(w) }) => {
        for (const m of active(w, who)) {
          const def = MODIFIERS[m.id];
          if (def.relation) compute.part(r, 'mod.' + m.id, def.name, def.relation);
        }
      },
      { priority: 68 },
    );

    compute.tap(
      'xp.gain',
      (r, { w, who = people.who(w) }) => {
        for (const m of active(w, who)) {
          const def = MODIFIERS[m.id];
          if (def.xp) compute.part(r, 'mod.' + m.id, def.name, def.xp);
        }
      },
      { priority: 68 },
    );

    compute.tap(
      'sleep.restore',
      (r, { w, who }) => {
        for (const m of active(w, who)) {
          const def = MODIFIERS[m.id];
          if (def.sleep) compute.part(r, 'mod.' + m.id, def.name, def.sleep);
        }
      },
      { priority: 55 },
    );

    queries.define('modifiers', w => {
      const who = people.who(w);
      return {
        list: active(w, who).map(m => {
          const def = MODIFIERS[m.id];
          return {
            id: m.id,
            name: def.name,
            kind: def.kind,
            desc: def.desc,
            from: m.from,
            left: m.until - w.clock.day,
          };
        }),
      };
    });

    ctx.provide('modifiers', Object.freeze({ add, has, active }));
  },
};
