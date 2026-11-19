// 时限修正与五维属性的合算。
// 每次读五维属性时动态把「技能换算 + 十二个长期特质 + 未过期的时限修正」加总；
// 时限修正同时接入 compute 计算管道（体力、收成、关系、经验、歇息）。
import { is, check } from '../../kernel/schema.js';
import { STATS, TRAIT_STATS, MODIFIERS } from '../../content/modifiers.js';
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

    /** 动态合算五维属性：底子值（2 + 技能等级）+ 特质加成 + 未过期时限修正。 */
    function stats(w, who = people.who(w)) {
      const values = {};
      const detail = {};
      const mods = active(w, who);
      for (const [k, def] of Object.entries(STATS)) {
        const primary = growth.level(w, def.skill, who);
        const alt = 'alt' in def ? growth.level(w, def.alt, who) : 0;
        const base = 2 + Math.max(primary, alt);
        let traitSum = 0;
        for (const [t, map] of Object.entries(TRAIT_STATS))
          if (growth.has(w, t, who) && map[k]) traitSum += map[k];
        let modSum = 0;
        for (const m of mods) {
          const d = MODIFIERS[m.id].stats?.[k] || 0;
          modSum += d;
        }
        values[k] = Math.max(1, base + traitSum + modSum);
        detail[k] = {
          id: k,
          name: def.name,
          desc: def.desc,
          value: values[k],
          base,
          traitSum,
          modSum,
        };
      }
      return { values, detail };
    }

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
      const s = stats(w, who);
      return {
        stats: Object.values(s.detail),
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

    ctx.provide('modifiers', Object.freeze({ add, has, active, stats }));
  },
};
