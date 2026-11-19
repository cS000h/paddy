// 人。所有人物是同一种数据；玩家只是“当前操控的那个人”（world.player.controls）。
// 这样将来换下一代接班时，只要把 controls 指向另一个人，规则一行都不用改。
//   person.place {x, y, dir}  记下操控的人走到了哪（走路本身不经过规则）
//   sleep {at}                回屋歇息 → 第二天早上，体力恢复
//   travel {x, y, at}         站在路牌旁上路，到下一张地图
//   travel.to {to}            照着全村地图走到某处：一段路花 CALENDAR.legMinutes 分钟
// 花体力统一走 people.spend()：做的是 content/actions.js 里登记的哪一件事，价钱经过
// 'action.cost' 计算管道（饿了、渴了、有本事、吃了什么，都在那里加减），并发出 action.performed。
// 一觉能歇回多少，经过 'sleep.restore' 计算管道（睡得晚、空着肚子，都在那里扣）。
import { is, check } from '../../kernel/schema.js';
import { refuse } from '../../kernel/dispatch.js';
import { PEOPLE, HERO, ON_MAP } from '../../content/people.js';
import { ENERGY_MAX } from '../../content/items.js';
import { ACTIONS } from '../../content/actions.js';
import {
  MAPS,
  START_MAP,
  spot,
  walkable,
  isHome,
  actAt,
  routeTo,
} from '../../content/maps/index.js';
import { CALENDAR } from '../../content/calendar.js';

const DIRS = ['up', 'down', 'left', 'right'];
const sign = n => (n > 0 ? '+' + n : '−' + -n);

export const people = {
  id: 'sim.people',
  provides: ['people'],
  requires: ['schema', 'commands', 'reactions', 'compute', 'queries', 'core', 'clock'],
  writes: ['people', 'player'],
  install(ctx) {
    const { schema, commands, reactions, compute, queries, core, clock } = ctx.services;

    schema.slice('people', {
      initial: () => {
        const start = spot(MAPS[START_MAP], 'start');
        const all = { [HERO]: { energy: ENERGY_MAX, map: START_MAP, ...start } };
        for (const id of ON_MAP)
          all[id] = { energy: ENERGY_MAX, map: START_MAP, x: 0, y: 0, dir: 'down' };
        return all;
      },
      validate: all =>
        check([
          [is.keyedBy(all, Object.keys(PEOPLE)), 'not everyone in content/people.js'],
          [
            Object.values(all).every(
              p =>
                is.int(p.energy, 0, ENERGY_MAX) &&
                Object.hasOwn(MAPS, p.map) &&
                is.int(p.x, 0, 999) &&
                is.int(p.y, 0, 999) &&
                DIRS.includes(p.dir),
            ),
            'person fields',
          ],
        ]),
    });

    schema.slice('player', {
      initial: () => ({ controls: HERO }),
      // 操控的人得是某一户里的人：身体、行囊、本事都按户里的人建
      validate: (p, w) =>
        (is.str(p.controls, 40) &&
          Object.hasOwn(w.people, p.controls) &&
          Object.values(w.households).some(h => h.members.includes(p.controls))) ||
        'controls nobody in a household',
    });

    const who = w => w.player.controls;
    const me = w => w.people[who(w)];

    // 把操控的人放到某一格。命令里带的 at 就是外壳告诉规则“我现在站在这儿”。
    const place = ctx.own((w, at) => {
      const p = me(w);
      if (!at) return p;
      if (!is.int(at.x, 0, 999) || !is.int(at.y, 0, 999) || !walkable(MAPS[p.map], at.x, at.y))
        refuse('那儿站不了人');
      p.x = at.x;
      p.y = at.y;
      if (DIRS.includes(at.dir)) p.dir = at.dir;
      return p;
    });

    /** 这个人此刻在不在自家院子里。at 给了就按 at 算（画面问的时候，人可能还没报站位）。 */
    const atHome = (w, id = who(w), at = null) => {
      const p = w.people[id];
      const here = at || p;
      return isHome(MAPS[p.map], here.x, here.y);
    };

    /** 做 id 这件事要花多少体力：{value, parts}。parts 里是每一条加减和它的原因。只读。 */
    function quote(w, id, s = null) {
      const spec = ACTIONS[id];
      if (!spec) throw new Error('没有登记这件事：' + id);
      const action = { id, kind: spec.kind, outdoor: !!spec.outdoor, base: spec.energy };
      const r = compute.run(
        'action.cost',
        { s, w, who: who(w), action },
        { value: spec.energy, parts: [] },
      );
      if (r.value < 0) {
        r.parts.push({ id: 'floor', label: '最少为0', delta: -r.value });
        r.value = 0;
      }
      return r;
    }
    const reasons = q => q.parts.filter(p => p.id !== 'floor');

    const spend = ctx.own((w, s, id, fact) => {
      const p = me(w);
      const q = quote(w, id, s);
      if (p.energy < q.value) refuse('太累了，回屋歇一歇吧');
      p.energy -= q.value;
      const spec = ACTIONS[id];
      const extra = reasons(q).map(x => x.label + sign(x.delta));
      core.log(
        w,
        who(w),
        'energy',
        -q.value,
        spec.label + (extra.length ? `（${extra.join('，')}）` : ''),
      );
      fact('action.performed', {
        who: who(w),
        id,
        kind: spec.kind,
        outdoor: !!spec.outdoor,
        energy: q.value,
        applied: q.parts.map(x => x.id),
      });
      return q;
    });

    const restore = ctx.own((w, id, n, why = null) => {
      const p = w.people[id];
      const before = p.energy;
      p.energy = Math.max(0, Math.min(ENERGY_MAX, before + n));
      core.log(w, id, 'energy', p.energy - before, why);
    });

    commands.register('travel', ({ draft, input, fact }) => {
      const w = draft.world,
        p = place(w, input.at),
        from = p.map;
      const door = actAt(MAPS[from], input.x, input.y);
      if (!door?.to || !near(p, door)) refuse('走到路口或门边再过去');
      const dest = MAPS[door.to],
        at = spot(dest, door.arrival);
      if (!walkable(dest, at.x, at.y)) refuse('那边暂时过不去');
      p.map = dest.id;
      Object.assign(p, at);
      fact('person.travelled', { who: who(w), from, to: p.map, ...at, name: dest.name });
    });

    // 照着全村地图走过去：沿路一段段走，每段花上一会儿时辰；到了，站在最后那块路牌指的地方。
    // 和亲自走过去是同一条路（routeTo 按路牌算），只是不用一张张地图去找路口。
    commands.register('travel.to', ({ draft, input, fact }) => {
      const w = draft.world,
        p = place(w, input.at),
        from = p.map;
      if (!Object.hasOwn(MAPS, input.to)) refuse('没有这个地方');
      if (input.to === from) refuse('你就在这儿');
      const legs = routeTo(from, input.to);
      if (!legs) refuse('从这儿走不过去');
      const dest = MAPS[input.to],
        at = spot(dest, legs.at(-1).door.arrival);
      if (!walkable(dest, at.x, at.y)) refuse('那边暂时过不去');
      p.map = dest.id;
      Object.assign(p, at);
      clock.elapse(w, legs.length * CALENDAR.legMinutes, fact);
      fact('person.travelled', { who: who(w), from, to: p.map, ...at, name: dest.name });
    });

    commands.register('person.place', ({ draft, input }) => {
      place(draft.world, input);
    });

    commands.register('sleep', ({ draft, input, fact }) => {
      const w = draft.world;
      const p = place(w, input.at);
      const bed = MAPS[p.map].spots[`${who(w)}.bed`];
      if (bed) [p.x, p.y, p.dir] = bed; // 睡下就是回到了自己的铺位，第二天从这儿起身
      clock.nextDay(w, fact);
    });

    compute.tap(
      'sleep.restore',
      (r, { late }) => {
        if (late) compute.part(r, 'sleep.late', '睡得太晚', -20);
      },
      { priority: 10 },
    );

    reactions.on(
      'day.started',
      (s, e) => {
        const w = s.world;
        for (const [id, p] of Object.entries(w.people)) {
          const r = compute.run(
            'sleep.restore',
            { s, w, who: id, late: e.data.late, minute: e.data.minute },
            { value: ENERGY_MAX, parts: [] },
          );
          const before = p.energy;
          p.energy = Math.max(0, Math.min(ENERGY_MAX, r.value));
          if (id !== who(w)) continue;
          const why = r.parts.map(x => x.label).join('，');
          core.log(w, id, 'energy', p.energy - before, '睡了一觉' + (why ? `（${why}）` : ''));
        }
      },
      { priority: 10 },
    );

    queries.define('hero', (w, at) => ({
      id: who(w),
      ...PEOPLE[who(w)],
      ...me(w),
      // 穿戴是另一个插件的事（sim/plugins/wardrobe.js），它接在这条管道上；没装它就是人物底子的样子
      look: compute.run(
        'person.look',
        { w, who: who(w) },
        { value: PEOPLE[who(w)].look, parts: [] },
      ).value,
      energyMax: ENERGY_MAX,
      atHome: atHome(w, who(w), at || null),
    }));

    // 做一件事之前先看价钱：{value, parts, label}。画面的提示用它，所以和实际扣的是同一个数。
    queries.define('action.cost', (w, id) => {
      const q = quote(w, id);
      return { value: q.value, parts: reasons(q), label: ACTIONS[id].label };
    });

    ctx.provide('people', Object.freeze({ me, who, place, atHome, quote, spend, restore }));
  },
};

/** 两格是不是挨着（含斜角和同一格）。锄地、说话都要求挨着。 */
export const near = (a, b) => Math.abs(a.x - b.x) <= 1 && Math.abs(a.y - b.y) <= 1;
