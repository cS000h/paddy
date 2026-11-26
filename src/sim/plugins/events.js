// 随机小事引擎：晨起小事、场景遇事与过几天后续。
// 每件小事落在地图上的具体位置（map, x, y），玩家走到跟前在底部对话条里处理。
// 走图翻找时，有动静的地方偶尔碰上一件（content/events-search.js）；钓完一竿偶尔碰上一件
// （content/events-fishing.js）；出一锅偶尔碰上一件（content/events-stove.js）。这三样各自一天最多一件。
//   event.choose {choice, at} → pulse.resolved {id, title, success, line, map, x, y, seen}
import { is, check } from '../../kernel/schema.js';
import { refuse } from '../../kernel/dispatch.js';
import { EVENTS, MORNING_EVENTS, SCENE_EVENTS, SEARCH_EVENTS } from '../../content/events.js';
import { FISHING_EVENTS, STOVE_EVENTS } from '../../content/events.js';
import { STOVE_EVENT } from '../../content/events-stove.js';
import { FISHING_EVENT } from '../../content/events-fishing.js';
import { ITEMS } from '../../content/items.js';
import { checkChance } from '../../content/events.js';
import { SEARCH } from '../../content/search.js';
import { dateOf } from '../../content/calendar.js';
import { PEOPLE } from '../../content/people.js';
import { periodOf } from './search.js';
import { MODIFIERS } from '../../content/modifiers.js';
import { ATTRS, TEMPERS, LINES_OF_ORIGIN, OLD_TRAITS } from '../../content/traits.js';
import { TRAITS } from '../../content/growth.js';
import { MAPS, walkable, farmable, actAt } from '../../content/maps/index.js';
import { near } from './people.js';

/** 做法要的那一样叫什么：开局的旧特质已经换成性情或出身线，报换过去的名字；做出来的历练照旧。 */
const needName = t => {
  const to = OLD_TRAITS[t];
  if (!to) return TRAITS[t].name;
  return to.temper ? TEMPERS[to.temper].name : LINES_OF_ORIGIN[to.line].name;
};

const MAX_DELAYED = 16;
// 就地遇事落在主角身边哪一格：先左右上下，再斜角。面前那一格留给手上正干的活。
const AROUND = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
  [-1, -1],
  [1, -1],
  [-1, 1],
  [1, 1],
];
const AHEAD = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

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
    'persona',
    'weather',
    'social',
    'opinion',
    'residents',
  ],
  writes: ['pulse'],
  install(ctx) {
    const { schema, commands, queries, reactions, core, people, store, pack, body, growth } =
      ctx.services;
    const { modifiers, persona, weather, social, opinion, residents } = ctx.services;

    const activeOk = a =>
      a === null ||
      (is.obj(a) &&
        Object.hasOwn(EVENTS, a.id) &&
        is.int(a.day, 1) &&
        Object.hasOwn(MAPS, a.map) &&
        is.int(a.x, 0, 99) &&
        is.int(a.y, 0, 99));
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
      list.filter(
        id => !w.pulse.done[id] || (!EVENTS[id].once && w.clock.day - w.pulse.done[id] >= 5),
      );

    const spawn = (w, id, here = null) => {
      const def = EVENTS[id].spot;
      const pos = here && Object.hasOwn(MAPS, here.map) ? here : def;
      w.pulse.active = { id, day: w.clock.day, map: pos.map, x: pos.x, y: pos.y };
      w.pulse.lastDay = w.clock.day;
    };

    // 就地遇事落在主角身边空着的一格，不压在脚下：压在脚下的话，接着按「做」、点地，
    // 都会先打开这件事，手上的活（锄地、浇水、播种）被截走。四周没有空地才用默认的地方。
    const beside = w => {
      const me = people.me(w);
      const map = MAPS[me.map];
      const ahead = AHEAD[me.dir] || [0, 0];
      const taken = (x, y) =>
        w.visitors?.active.some(v => v.map === me.map && v.x === x && v.y === y);
      for (const [dx, dy] of AROUND) {
        if (dx === ahead[0] && dy === ahead[1]) continue;
        const x = me.x + dx;
        const y = me.y + dy;
        if (!walkable(map, x, y) || farmable(map, x, y) || actAt(map, x, y) || taken(x, y))
          continue;
        return { map: me.map, x, y };
      }
      return null;
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
      spawn(w, id, beside(w));
    };

    /** 这件翻找、钓鱼、灶边小事此刻碰得上吗：图、翻的那一类、季节、时段、天气、雨、锅里做的什么。 */
    const fits = (w, when, map, kind, meal = null) =>
      (!when.maps || when.maps.includes(map)) &&
      (!when.methods || when.methods.includes(meal?.method)) &&
      (!when.fish || !!meal?.fish) &&
      (!when.weather || when.weather.includes(w.weather.now)) &&
      (!when.kinds || when.kinds.includes(kind)) &&
      (!when.seasons || when.seasons.includes(dateOf(w.clock.day).season)) &&
      (!when.periods || when.periods.includes(periodOf(w.clock.minute))) &&
      (when.wet === undefined || when.wet === weather.wetLately(w)) &&
      (!when.rainTomorrow || weather.wetTomorrow(w));

    // 翻找、钓鱼碰上的小事：手上有一件没处理，或今天这一样已经碰上过一件，就不再碰。
    const meet = (w, list, chance, map, kind, at, meal = null) => {
      if (w.pulse.active) return;
      const trigger = EVENTS[list[0]].trigger;
      const done = w.pulse.done;
      if (Object.keys(done).some(id => done[id] === w.clock.day && EVENTS[id].trigger === trigger))
        return;
      if (core.random(w) * 100 >= chance) return;
      const pool = eligible(w, list).filter(id => fits(w, EVENTS[id].when, map, kind, meal));
      if (!pool.length) return;
      const id = pool[Math.floor(core.random(w) * pool.length)];
      spawn(w, id, beside(w) || at);
    };
    // 翻的是有动静的地方，才有机会碰上
    const searched = (s, e) => {
      const d = e.data;
      if (d.cued)
        meet(s.world, Object.keys(SEARCH_EVENTS), SEARCH.event, d.map, d.kind, {
          map: d.map,
          x: d.x,
          y: d.y,
        });
    };
    reactions.on('search.found', searched, { priority: 75 });
    reactions.on('search.empty', searched, { priority: 75 });
    // 一竿收了（钓上、空竿、跑了）
    const fished = s => {
      const me = people.me(s.world);
      const at = { map: me.map, x: me.x, y: me.y };
      meet(s.world, Object.keys(FISHING_EVENTS), FISHING_EVENT, me.map, null, at);
    };
    for (const type of ['fish.caught', 'fish.missed', 'fish.lost'])
      reactions.on(type, fished, { priority: 75 });
    // 出了一锅：做法、锅里有没有鱼
    reactions.on(
      'meal.cooked',
      (s, e) => {
        const me = people.me(s.world);
        const at = { map: me.map, x: me.x, y: me.y };
        const meal = {
          method: e.data.method,
          fish: e.data.items.some(k => k.startsWith('fish')),
        };
        meet(s.world, Object.keys(STOVE_EVENTS), STOVE_EVENT, me.map, null, at, meal);
      },
      { priority: 74 },
    );

    // 清早小事：优先触发到期的后续，否则按概率抽 1 条晨起小事落在具体位置。
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
          core.post(w, { title: EVENTS[next.id].title, text: EVENTS[next.id].spot.hint });
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

    // 动作与场景遇事：下地、采集、做饭、喝茶、赶集后就地发生小事。
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

    /** 这会儿在这张图上、看得见主角的乡邻（夜里在自家门里应声的不算）。 */
    const onlookers = w => {
      const me = people.me(w);
      return residents
        .positions(w)
        .filter(p => p.visible && !p.atDoor && p.map === me.map)
        .map(p => p.id);
    };

    /** 结果落下去；返回看见主角昧下东西的人。 */
    const applyOutcome = (w, who, out, title) => {
      if (out.coins > 0) store.earn(w, out.coins, title);
      if (out.mood) body.mood(w, who, out.mood, title);
      if (out.energy) people.restore(w, who, out.energy, title);
      if (out.bond) {
        social.relate(w, out.bond, 2, title);
        opinion.note(w, out.bond, who, 'helped');
      }
      if (out.foresee) weather.foresee(w);
      const seen = out.grey ? onlookers(w) : [];
      if (out.blame && !seen.includes(out.blame)) seen.push(out.blame);
      for (const id of seen) opinion.note(w, id, who, 'sly');
      if (out.give) pack.deliver(w, who, out.give.item, out.give.n, title);
      if (out.mod && Object.hasOwn(MODIFIERS, out.mod)) modifiers.add(w, who, out.mod, null, title);
      if (out.delay && Object.hasOwn(EVENTS, out.delay.id)) {
        if (w.pulse.delayed.length >= MAX_DELAYED) w.pulse.delayed.shift();
        w.pulse.delayed.push({ id: out.delay.id, day: w.clock.day + out.delay.days });
      }
      return seen;
    };

    commands.register('event.choose', ({ draft, input, fact }) => {
      const w = draft.world;
      const cur = w.pulse.active;
      if (!cur) refuse('眼下没有待处理的小事');
      const me = people.place(w, input.at);
      if (me.map !== cur.map || !near(me, cur)) refuse('走到跟前再处理这件事');
      const ev = EVENTS[cur.id];
      const idx = input.choice;
      if (!is.int(idx, 0, ev.choices.length - 1)) refuse('没有这个选项');
      const choice = ev.choices[idx];
      const who = people.who(w);
      if (choice.reqTrait && !growth.has(w, choice.reqTrait, who))
        refuse(`需要「${needName(choice.reqTrait)}」`);
      if (choice.cost?.coins) store.pay(w, choice.cost.coins, ev.title);
      if (choice.use) {
        if (!pack.has(w, who, choice.use.item, choice.use.n))
          refuse(`身上没有${ITEMS[choice.use.item].name}`);
        pack.use(w, who, choice.use.item, choice.use.n, ev.title);
      }

      let success = true;
      let outcome = choice;
      if (choice.check) {
        const val = persona.attrs(w, who).values[choice.check.attr];
        const pct = checkChance(val, choice.check.dc);
        success = core.random(w) * 100 < pct;
        outcome = success ? choice.onOk : choice.onFail;
      }
      const seen = applyOutcome(w, who, outcome, ev.title);
      const names = seen.map(id => PEOPLE[id].name).join('、');
      w.pulse.active = null;
      w.pulse.done[ev.id] = w.clock.day;
      w.pulse.lastDay = w.clock.day;
      fact('pulse.resolved', {
        who,
        id: ev.id,
        title: ev.title,
        success,
        line: outcome.grey && names ? `${outcome.line}${names}都看在眼里。` : outcome.line,
        map: cur.map,
        x: cur.x,
        y: cur.y,
        seen,
      });
    });

    queries.define('events', w => {
      const who = people.who(w);
      const cur = w.pulse.active;
      if (!cur) return { active: null, delayed: w.pulse.delayed.length };
      const ev = EVENTS[cur.id];
      const attrs = persona.attrs(w, who).values;
      const coins = w.households.home.coins;
      return {
        delayed: w.pulse.delayed.length,
        active: {
          id: ev.id,
          day: cur.day,
          map: cur.map,
          x: cur.x,
          y: cur.y,
          place: ev.spot.place,
          hint: ev.spot.hint,
          title: ev.title,
          text: ev.text,
          choices: ev.choices.map((c, index) => {
            const needTrait = c.reqTrait ? needName(c.reqTrait) : null;
            const hasTrait = !c.reqTrait || growth.has(w, c.reqTrait, who);
            const hasCoins = !c.cost?.coins || coins >= c.cost.coins;
            const hasItem = !c.use || pack.has(w, who, c.use.item, c.use.n);
            const checkInfo = c.check
              ? {
                  attr: c.check.attr,
                  attrName: ATTRS[c.check.attr],
                  attrValue: attrs[c.check.attr],
                  chance: checkChance(attrs[c.check.attr], c.check.dc),
                }
              : null;
            return {
              index,
              label: c.label,
              reqTrait: c.reqTrait || null,
              traitName: needTrait,
              costCoins: c.cost?.coins || 0,
              check: checkInfo,
              disabled: !hasTrait || !hasCoins || !hasItem,
              reason: !hasTrait
                ? `需要「${needTrait}」`
                : !hasCoins
                  ? `需要 ${c.cost.coins} 文`
                  : !hasItem
                    ? `身上没有${ITEMS[c.use.item].name}`
                    : null,
            };
          }),
        },
      };
    });

    ctx.provide('pulse', Object.freeze({ active: w => w.pulse.active }));
  },
};
