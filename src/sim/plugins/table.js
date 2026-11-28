// 手上端着的菜、屋里饭桌上摆着的菜（东西和话在 content/table.js）。热菜从灶台端起（cooking 插件的
// dish.carry），端着走到窗下饭桌放下，坐下按整桌吃（cooking 插件的 table.eat）。端着能出门送人、端给过客。
// 存档记每人手上端着哪几样、每户桌上摆着哪几样（整份饭菜，和灶台上的一样校验）。
//   dish.set  {at}      手上的放到桌上 → dish.set {who, id, n, line}
//   dish.lift {id, at}  桌上的端回手上 → dish.lifted {who, id}
//   查询 table(at) → {hands, dishes, seats, here}：手上的、桌上的、桌上能摆几样、是不是站在饭桌边
//   服务 table.hands(w, 人)、table.dishes(w)、table.hold(w, 人, 菜)、table.drop(w, 人, 菜id) → 菜或 null、
//        table.clear(w) → 桌上的全部撤下来、table.at(w, 位置?) → 是不是站在饭桌边
import { is } from '../../kernel/schema.js';
import { refuse } from '../../kernel/dispatch.js';
import { MAPS } from '../../content/maps/index.js';
import { TABLE, TABLE_LINES } from '../../content/table.js';
import { validDish } from '../dish.js';
import { near } from './people.js';

export const table = {
  id: 'sim.table',
  provides: ['table'],
  requires: ['schema', 'commands', 'queries', 'people', 'store'],
  writes: ['hands', 'tables'],
  install(ctx) {
    const { schema, commands, queries, people, store } = ctx.services;
    schema.slice('hands', {
      initial: (env, w) => Object.fromEntries(Object.keys(w.packs).map(id => [id, []])),
      validate: (all, w) =>
        (is.keyedBy(all, Object.keys(w.packs)) &&
          Object.values(all).every(l => is.arr(l, TABLE.hands) && l.every(validDish))) ||
        'hands',
    });
    schema.slice('tables', {
      initial: (env, w) => Object.fromEntries(Object.keys(w.households).map(id => [id, []])),
      validate: (all, w) =>
        (is.keyedBy(all, Object.keys(w.households)) &&
          Object.values(all).every(l => is.arr(l, TABLE.seats) && l.every(validDish))) ||
        'tables',
    });
    const mine = w => w.tables[store.id(w)];
    /** 站在自家屋里饭桌跟前没有（at 给了就先照它看）。 */
    const atTable = (w, at = null) => {
      const p = at ? { ...people.me(w), ...at } : people.me(w);
      if (!people.atHome(w, people.who(w), at)) return false;
      return MAPS[p.map].objects.some(([, x, y, o]) => o?.dining && near(p, { x, y }));
    };
    const hold = ctx.own((w, id, dish) => {
      if (w.hands[id].length >= TABLE.hands) refuse(TABLE_LINES.hands);
      w.hands[id].push(dish);
    });
    const drop = ctx.own((w, id, dishId) => {
      const list = w.hands[id];
      const i = list.findIndex(d => d.id === dishId);
      return i < 0 ? null : list.splice(i, 1)[0];
    });
    const lift = ctx.own((w, dishId) => {
      const list = mine(w);
      const i = list.findIndex(d => d.id === dishId);
      return i < 0 ? null : list.splice(i, 1)[0];
    });
    const clear = ctx.own(w => mine(w).splice(0));

    commands.register('dish.set', ({ draft, input, fact }) => {
      const w = draft.world;
      people.place(w, input.at);
      if (!atTable(w)) refuse(TABLE_LINES.where);
      const id = people.who(w);
      const dish = w.hands[id][0];
      if (!dish) refuse(TABLE_LINES.nothing);
      const list = mine(w);
      if (list.length >= TABLE.seats) refuse(TABLE_LINES.full);
      list.push(w.hands[id].shift());
      const line = TABLE_LINES.set[Math.min(2, list.length - 1)];
      fact('dish.set', { who: id, id: dish.id, n: list.length, line });
    });
    commands.register('dish.lift', ({ draft, input, fact }) => {
      const w = draft.world;
      people.place(w, input.at);
      if (!atTable(w)) refuse(TABLE_LINES.where);
      const id = people.who(w);
      if (w.hands[id].length >= TABLE.hands) refuse(TABLE_LINES.hands);
      const dish = lift(w, input.id);
      if (!dish) refuse('桌上没有这一样');
      w.hands[id].push(dish);
      fact('dish.lifted', { who: id, id: dish.id });
    });
    queries.define('table', (w, at = null) => ({
      hands: w.hands[people.who(w)],
      dishes: mine(w),
      seats: TABLE.seats,
      here: atTable(w, at),
    }));
    ctx.provide(
      'table',
      Object.freeze({
        hands: (w, id) => w.hands[id] || [],
        dishes: w => mine(w),
        hold,
        drop,
        lift,
        clear,
        at: atTable,
      }),
    );
  },
};
