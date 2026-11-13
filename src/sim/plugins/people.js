// 人。所有人物是同一种数据；玩家只是“当前操控的那个人”（world.player.controls）。
// 这样将来换下一代接班时，只要把 controls 指向另一个人，规则一行都不用改。
//   person.place {x, y, dir}  记下操控的人走到了哪（走路本身不经过规则）
//   sleep {at}                回屋歇息 → 第二天早上，体力恢复
// 花体力统一走 people.spend()，价钱经过 'action.cost' 计算管道，别的插件可以加减它。
import { is, check } from '../../kernel/schema.js';
import { PEOPLE, HERO, ON_MAP } from '../../content/people.js';
import { ENERGY_MAX } from '../../content/items.js';
import { MAPS, START_MAP, spot, walkable } from '../../content/maps/index.js';

const DIRS = ['up', 'down', 'left', 'right'];

export const people = {
  id: 'sim.people',
  provides: ['people'],
  requires: ['schema', 'commands', 'reactions', 'compute', 'queries', 'clock'],
  writes: ['people', 'player'],
  install(ctx) {
    const { schema, commands, reactions, compute, queries, clock } = ctx.services;

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
          [
            is.obj(all) && Object.keys(all).every(id => Object.hasOwn(PEOPLE, id)),
            'unknown person',
          ],
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
      validate: (p, w) => Object.hasOwn(w.people, p.controls) || 'controls nobody',
    });

    const me = w => w.people[w.player.controls];

    // 把操控的人放到某一格。命令里带的 at 就是外壳告诉规则“我现在站在这儿”。
    const place = ctx.own((w, at) => {
      const p = me(w);
      if (!at) return p;
      if (!is.int(at.x, 0, 999) || !is.int(at.y, 0, 999) || !walkable(MAPS[p.map], at.x, at.y))
        throw new Error('那儿站不了人');
      p.x = at.x;
      p.y = at.y;
      if (DIRS.includes(at.dir)) p.dir = at.dir;
      return p;
    });

    const cost = (s, action, base) =>
      compute.run('action.cost', { s, w: s.world, action }, { value: base, parts: [] });

    const spend = ctx.own((w, s, action, base, fact) => {
      const p = me(w);
      const price = Math.max(0, cost(s, action, base).value);
      if (p.energy < price) throw new Error('太累了，回屋歇一歇吧');
      p.energy -= price;
      if (price) fact('energy.spent', { id: w.player.controls, n: price, left: p.energy, action });
    });

    commands.register('person.place', ({ draft, input }) => {
      place(draft.world, input);
    });

    commands.register('sleep', ({ draft, input, fact }) => {
      place(draft.world, input.at);
      clock.nextDay(draft.world, fact);
    });

    reactions.on(
      'day.started',
      (s, e) => {
        for (const p of Object.values(s.world.people)) p.energy = e.data.late ? 80 : ENERGY_MAX;
      },
      { priority: 10 },
    );

    queries.define('hero', w => ({
      id: w.player.controls,
      ...PEOPLE[w.player.controls],
      ...me(w),
      energyMax: ENERGY_MAX,
    }));

    ctx.provide('people', Object.freeze({ me, place, spend, cost }));
  },
};

/** 两格是不是挨着（含斜角和同一格）。锄地、说话都要求挨着。 */
export const near = (a, b) => Math.abs(a.x - b.x) <= 1 && Math.abs(a.y - b.y) <= 1;
