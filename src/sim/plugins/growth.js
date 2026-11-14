import { is } from '../../kernel/schema.js';
import { refuse } from '../../kernel/dispatch.js';
import { SKILLS, TRAITS, LEVELS, LEVEL_NAMES, ORIGINS } from '../../content/growth.js';
export const level = xp => LEVELS.reduce((lv, need, i) => (xp >= need ? i : lv), 0);
export const growth = {
  id: 'sim.growth',
  provides: ['growth'],
  requires: [
    'schema',
    'commands',
    'queries',
    'reactions',
    'compute',
    'core',
    'people',
    'body',
    'weather',
  ],
  writes: ['growth'],
  install(ctx) {
    const { schema, commands, queries, reactions, compute, core, people, body, weather } =
      ctx.services;
    schema.slice('growth', {
      initial: (env, w) =>
        Object.fromEntries(
          Object.keys(w.packs).map(id => [
            id,
            {
              xp: Object.fromEntries(Object.keys(SKILLS).map(k => [k, 0])),
              traits: [],
              counters: { wetOut: 0, cold: 0, hot: 0, dawn: 0, meals: 0 },
              origin: null,
            },
          ]),
        ),
      validate: (all, w) =>
        Object.entries(all).every(
          ([id, g]) =>
            w.people[id] &&
            Object.keys(SKILLS).every(k => is.int(g.xp[k])) &&
            is.arr(g.traits, 12) &&
            new Set(g.traits).size === g.traits.length &&
            g.traits.every(k => TRAITS[k]) &&
            ['wetOut', 'cold', 'hot', 'dawn', 'meals'].every(k => is.int(g.counters[k])) &&
            (g.origin === null ||
              (ORIGINS.route.some(o => o.id === g.origin.route) &&
                ORIGINS.reply.some(o => o.id === g.origin.reply))),
        ) || 'growth',
    });
    const mine = (w, id = people.who(w)) => w.growth[id];
    const lv = (w, k, id = people.who(w)) => level(mine(w, id)?.xp[k] || 0);
    const has = (w, t, id = people.who(w)) => mine(w, id)?.traits.includes(t) || false;
    const gain = (w, id, emit, skill, n, source) => {
      const g = mine(w, id);
      if (!g) return;
      const r = compute.run('xp.gain', { w, who: id, skill, source }, { value: n, parts: [] });
      if (r.parts.some(p => p.id === 'buff.alert')) body.useBuff(w, id, 'alert');
      const before = lv(w, skill, id);
      g.xp[skill] += Math.max(0, r.value);
      const after = lv(w, skill, id);
      core.log(w, id, 'xp:' + skill, r.value, SKILLS[skill].name);
      if (after > before)
        emit('skill.leveled', {
          who: id,
          skill,
          level: after,
          name: SKILLS[skill].name,
          title: LEVEL_NAMES[after],
        });
    };
    const grant = (w, id, emit, t) => {
      if (has(w, t, id)) return;
      mine(w, id).traits.push(t);
      emit('trait.gained', { who: id, trait: t, name: TRAITS[t].name });
    };
    commands.register('origin.choose', ({ draft, input, fact }) => {
      const w = draft.world,
        id = people.who(w),
        g = mine(w, id);
      if (g.origin) refuse('已经选过了，日子往前过');
      const a = ORIGINS.route.find(o => o.id === input.route),
        b = ORIGINS.reply.find(o => o.id === input.reply);
      if (!a || !b) refuse('想好两件小事，再开始这段日子');
      g.origin = { route: a.id, reply: b.id };
      grant(w, id, fact, a.trait);
      grant(w, id, fact, b.trait);
      if (a.id === 'borrow') gain(w, id, fact, 'cook', Math.max(0, 4 - g.xp.cook), 'origin');
      fact('origin.chosen', { who: id });
    });
    reactions.on(
      'action.performed',
      (s, e, emit) => {
        const w = s.world,
          d = e.data,
          id = d.who,
          g = mine(w, id);
        if (!g) return;
        const skill = {
          farm: 'farm',
          forage: 'forage',
          fish: 'forage',
          craft: 'craft',
          sky: 'sky',
        }[d.kind];
        if (skill) gain(w, id, emit, skill, d.kind === 'sky' ? 1 : d.id === 'hand' ? 3 : 2, d.kind);
        if (d.kind === 'forage' && has(w, 'solitary', id))
          body.mood(w, id, 2, '独行：一个人在林子里自在');
        if (['rest', 'sky', 'social', 'chore'].includes(d.kind)) return;
        if (w.clock.minute < 540) g.counters.dawn++;
        if (d.outdoor) {
          if (weather.has(w, 'wet')) g.counters.wetOut++;
          const feel = compute.run(
            'body.feel',
            { w, who: id },
            { value: weather.view(w).temperature, parts: [] },
          ).value;
          if (feel < 12) g.counters.cold++;
          if (feel > 26) g.counters.hot++;
        }
      },
      { priority: 60 },
    );
    reactions.on(
      'meal.cooked',
      (s, e, emit) => {
        const w = s.world,
          d = e.data,
          id = d.who;
        mine(w, id).counters.meals += d.servings;
        gain(
          w,
          id,
          emit,
          'cook',
          1 + d.ingredients + ({ great: 2, good: 1 }[d.quality] || 0) + (d.first ? 2 : 0),
          'cook',
        );
      },
      { priority: 60 },
    );
    reactions.on(
      'person.talked',
      (s, e, emit) => {
        const w = s.world,
          id = e.data.who || people.who(w);
        if (e.data.gained) gain(w, id, emit, 'social', 1, 'talk');
        if (e.data.gained && has(w, 'lively', id)) body.mood(w, id, 2, '爱热闹：聊得开心');
      },
      { priority: 60 },
    );
    reactions.on(
      'gift.given',
      (s, e, emit) => {
        const w = s.world,
          id = e.data.who || people.who(w);
        gain(w, id, emit, 'social', 2 + (e.data.liked ? 1 : 0), 'gift');
        if (has(w, 'lively', id)) body.mood(w, id, 2, '爱热闹：送饭开心');
      },
      { priority: 60 },
    );
    reactions.onSettle(
      (s, emit) => {
        const w = s.world;
        for (const [id, g] of Object.entries(w.growth)) {
          for (const [t, key, n] of [
            ['rainwalker', 'wetOut', 6],
            ['coldproof', 'cold', 5],
            ['heatproof', 'hot', 5],
            ['hearth', 'meals', 8],
            ['earlybird', 'dawn', 6],
          ])
            if (g.counters[key] >= n) grant(w, id, emit, t);
          if (id === people.who(w) && Object.values(w.bonds.known).reduce((a, b) => a + b, 0) >= 20)
            grant(w, id, emit, 'familiar');
        }
      },
      { priority: 40 },
    );
    queries.define('growth', w => {
      const g = mine(w);
      return {
        origin: g.origin,
        skills: Object.entries(SKILLS).map(([k, d]) => ({
          id: k,
          name: d.name,
          level: lv(w, k),
          title: LEVEL_NAMES[lv(w, k)],
          xp: g.xp[k],
          next: LEVELS[lv(w, k) + 1] ?? null,
          perks: Object.entries(d.perks).map(([n, text]) => ({
            level: +n,
            text,
            on: lv(w, k) >= +n,
          })),
        })),
        traits: Object.entries(TRAITS).map(([id, d]) => ({ id, ...d, owned: has(w, id) })),
      };
    });
    ctx.provide('growth', Object.freeze({ level: lv, has }));
  },
};
