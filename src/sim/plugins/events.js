// 随机随机事件引擎：晨起小事、场景触发与过几天后续。
// 低打扰节奏：每天最多自动挂起 1 条事件，玩家随时点开处理；
// 选项支持稳稳项、带明确成功率的五维属性检定项、以及特质独有项。
//   event.choose {choice} → pulse.resolved {id, title, success, line}
import { is, check } from '../../kernel/schema.js';
import { refuse } from '../../kernel/dispatch.js';
import { EVENTS, MORNING_EVENTS, SCENE_EVENTS, checkChance } from '../../content/events.js';
import { STATS, MODIFIERS } from '../../content/modifiers.js';
import { TRAITS } from '../../content/growth.js';

const MAX_DELAYED = 16;

export const events = {
  id: 'sim.events',
  provides: ['pulse'],
  requires: [
    'schema',
    'commands',
    'queries',
    'reactions',
    'core',
    'people',
    'store',
    'pack',
    'body',
    'growth',
    'modifiers',
  ],
  writes: ['pulse'],
  install(ctx) {
    const { schema, commands, queries, reactions, core, people, store, pack, body, growth } =
      ctx.services;
    const { modifiers } = ctx.services;

    const activeOk = a =>
      a === null || (is.obj(a) && Object.hasOwn(EVENTS, a.id) && is.int(a.day, 1));
    const delayedOk = d => is.obj(d) && Object.hasOwn(EVENTS, d.id) && is.int(d.day, 1);

    schema.slice('pulse', {
      initial: () => ({ active: null, delayed: [], done: {}, lastDay: 0 }),
      validate: p =>
        check([
          [is.obj(p), 'obj'],
          [activeOk(p.active), 'active'],
          [is.arr(p.delayed, MAX_DELAYED) && p.delayed.every(delayedOk), 'delayed'],
          [
            is.obj(p.done) &&
              Object.entries(p.done).every(([k, d]) => Object.hasOwn(EVENTS, k) && is.int(d, 1)),
            'done',
          ],
          [is.int(p.lastDay, 0), 'lastDay'],
        ]),
    });

    const eligible = (w, list) =>
      list.filter(id => !w.pulse.done[id] || w.clock.day - w.pulse.done[id] >= 5);

    const spawn = (w, id) => {
      w.pulse.active = { id, day: w.clock.day };
      w.pulse.lastDay = w.clock.day;
    };

    const tryScene = (w, trigger, chance) => {
      if (w.pulse.active || w.pulse.lastDay >= w.clock.day) return;
      if (core.random(w) >= chance) return;
      const pool = eligible(
        w,
        SCENE_EVENTS.filter(id => EVENTS[id].trigger === trigger),
      );
      if (!pool.length) return;
      const id = pool[Math.floor(core.random(w) * pool.length)];
      spawn(w, id);
    };

    // 清早随机：优先触发到期的过几天伏笔，否则按概率抽 1 条晨起小事。
    reactions.on(
      'day.started',
      s => {
        const w = s.world;
        const day = w.clock.day;
        if (w.pulse.active && day - w.pulse.active.day >= 2) w.pulse.active = null;
        if (w.pulse.active) return;
        const idx = w.pulse.delayed.findIndex(d => d.day <= day);
        if (idx >= 0) {
          const next = w.pulse.delayed.splice(idx, 1)[0];
          spawn(w, next.id);
          core.post(w, { title: EVENTS[next.id].title, text: EVENTS[next.id].text });
          return;
        }
        if (day < 2 || core.random(w) >= 0.45) return;
        const pool = eligible(w, MORNING_EVENTS);
        if (!pool.length) return;
        const id = pool[Math.floor(core.random(w) * pool.length)];
        spawn(w, id);
      },
      { priority: 52 },
    );

    // 动作与场景随机：下地、采集、做饭、喝茶、赶集后时而有小事。
    reactions.on(
      'action.performed',
      (s, e) => {
        const k = e.data.kind;
        if (k === 'farm') tryScene(s.world, 'farm', 0.12);
        else if (k === 'forage' || k === 'fish') tryScene(s.world, 'forage', 0.18);
      },
      { priority: 75 },
    );
    reactions.on('meal.cooked', s => tryScene(s.world, 'cook', 0.2), { priority: 75 });
    reactions.on('tea.done', s => tryScene(s.world, 'tea', 0.25), { priority: 75 });
    reactions.on('market.bought', s => tryScene(s.world, 'market', 0.22), { priority: 75 });

    const applyOutcome = (w, who, out, title) => {
      if (out.coins > 0) store.earn(w, out.coins, title);
      if (out.mood) body.mood(w, who, out.mood, title);
      if (out.energy > 0) people.restore(w, who, out.energy, title);
      if (out.give) pack.deliver(w, who, out.give.item, out.give.n, title);
      if (out.mod && Object.hasOwn(MODIFIERS, out.mod))
        modifiers.add(w, who, out.mod, null, title);
      if (out.delay && Object.hasOwn(EVENTS, out.delay.id)) {
        if (w.pulse.delayed.length >= MAX_DELAYED) w.pulse.delayed.shift();
        w.pulse.delayed.push({ id: out.delay.id, day: w.clock.day + out.delay.days });
      }
    };

    commands.register('event.choose', ({ draft, input, fact }) => {
      const w = draft.world;
      const cur = w.pulse.active;
      if (!cur) refuse('眼下没有待处理的小事');
      const ev = EVENTS[cur.id];
      const idx = input.choice;
      if (!is.int(idx, 0, ev.choices.length - 1)) refuse('没有这个选项');
      const choice = ev.choices[idx];
      const who = people.who(w);
      if (choice.reqTrait && !growth.has(w, choice.reqTrait, who))
        refuse(`需要「${TRAITS[choice.reqTrait].name}」特质`);
      if (choice.cost?.coins) store.pay(w, choice.cost.coins, ev.title);

      let success = true;
      let outcome = choice;
      if (choice.check) {
        const val = modifiers.stats(w, who).values[choice.check.stat] || 2;
        const pct = checkChance(val, choice.check.dc);
        success = core.random(w) * 100 < pct;
        outcome = success ? choice.onOk : choice.onFail;
      }
      applyOutcome(w, who, outcome, ev.title);
      w.pulse.active = null;
      w.pulse.done[ev.id] = w.clock.day;
      w.pulse.lastDay = w.clock.day;
      fact('pulse.resolved', {
        who,
        id: ev.id,
        title: ev.title,
        success,
        line: outcome.line,
      });
    });

    queries.define('events', w => {
      const who = people.who(w);
      const cur = w.pulse.active;
      if (!cur) return { active: null, delayed: w.pulse.delayed.length };
      const ev = EVENTS[cur.id];
      const statValues = modifiers.stats(w, who).values;
      const coins = w.households.home.coins;
      return {
        delayed: w.pulse.delayed.length,
        active: {
          id: ev.id,
          day: cur.day,
          title: ev.title,
          text: ev.text,
          choices: ev.choices.map((c, index) => {
            const needTrait = c.reqTrait ? TRAITS[c.reqTrait].name : null;
            const hasTrait = !c.reqTrait || growth.has(w, c.reqTrait, who);
            const hasCoins = !c.cost?.coins || coins >= c.cost.coins;
            const checkInfo = c.check
              ? {
                  stat: c.check.stat,
                  statName: STATS[c.check.stat].name,
                  statValue: statValues[c.check.stat],
                  chance: checkChance(statValues[c.check.stat], c.check.dc),
                }
              : null;
            return {
              index,
              label: c.label,
              reqTrait: c.reqTrait || null,
              traitName: needTrait,
              costCoins: c.cost?.coins || 0,
              check: checkInfo,
              disabled: !hasTrait || !hasCoins,
              reason: !hasTrait
                ? `需要「${needTrait}」`
                : !hasCoins
                  ? `需要 ${c.cost.coins} 文`
                  : null,
            };
          }),
        },
      };
    });

    ctx.provide('pulse', Object.freeze({ active: w => w.pulse.active }));
  },
};
