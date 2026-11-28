// 手上端着的菜、屋里饭桌上摆着的菜、碗架上的碗盘（东西和话在 content/table.js）。热菜从灶台端起
// （cooking 插件的 dish.carry），端着走到窗下饭桌放下，坐下按整桌吃（cooking 插件的 table.eat）。
// 端着能出门送人、端给过客。存档记每人手上端着哪几样、每户桌上摆着哪几样（整份饭菜，和灶台上的一样
// 校验），还有每户有几只碗盘、几只脏着搁在桌上、几只脏的抱在手上。干净的不记，照这几样算出来。
//   dish.set   {at}      手上的放到桌上 → dish.set {who, id, n, line}
//   dish.lift  {id, at}  桌上的端回手上 → dish.lifted {who, id}
//   dish.clear {at}      桌上的脏碗一次全抱走 → dish.cleared {who, bowl, plate, line}
//   dish.wash  {at}      在院里水缸边把抱着的脏碗洗了，自己回到碗架 → dish.washed {who, n, line}
//   早上起来，手上、桌上放过两天的菜馊掉倒了，碗盘脏着 → dish.spoiled {who, names, line}
//   查询 table(at) → {hands, dishes, seats, here, ware}：手上的、桌上的、桌上能摆几样、
//        是不是站在饭桌边、碗盘 {own, clean, dirty, stack}
//   服务 table.hands(w, 人)、table.dishes(w)、table.hold(w, 人, 菜)、table.drop(w, 人, 菜id) → 菜或 null、
//        table.clear(w) → 桌上的全部吃掉（碗盘脏着留在桌上）、table.at(w, 位置?) → 是不是站在饭桌边、
//        table.clean(w, 碗盘) → 碗架上还有几只干净的
import { is } from '../../kernel/schema.js';
import { refuse } from '../../kernel/dispatch.js';
import { MAPS } from '../../content/maps/index.js';
import { CALENDAR } from '../../content/calendar.js';
import { fill } from '../../content/text.js';
import { TABLE, TABLE_LINES, WARE, STALE, wareOf } from '../../content/table.js';
import { validDish } from '../dish.js';
import { near } from './people.js';

const KINDS = Object.keys(WARE.start);
const none = () => Object.fromEntries(KINDS.map(k => [k, 0]));
const validWare = c => is.obj(c) && KINDS.every(k => is.int(c[k], 0, 20));
const sum = c => KINDS.reduce((n, k) => n + c[k], 0);

export const table = {
  id: 'sim.table',
  provides: ['table'],
  requires: ['schema', 'commands', 'queries', 'reactions', 'people', 'store', 'weather'],
  writes: ['hands', 'tables', 'wares'],
  install(ctx) {
    const { schema, commands, queries, reactions, people, store, weather } = ctx.services;
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
    // own 有几只、dirty 脏着搁在桌上的、stack 脏着抱在手上的
    schema.slice('wares', {
      initial: (env, w) =>
        Object.fromEntries(
          Object.keys(w.households).map(id => [
            id,
            { own: { ...WARE.start }, dirty: none(), stack: none() },
          ]),
        ),
      validate: (all, w) =>
        (is.keyedBy(all, Object.keys(w.households)) &&
          Object.values(all).every(
            r => validWare(r.own) && validWare(r.dirty) && validWare(r.stack),
          )) ||
        'wares',
    });
    const mine = w => w.tables[store.id(w)];
    const rack = w => w.wares[store.id(w)];
    /** 碗架上还有几只干净的：有的减去脏的、端着的、桌上盛着菜的。 */
    const clean = (w, kind) => {
      const r = rack(w);
      const busy = [...Object.values(w.hands).flat(), ...mine(w)].filter(
        d => wareOf(d) === kind,
      ).length;
      return Math.max(0, r.own[kind] - r.dirty[kind] - r.stack[kind] - busy);
    };
    const holding = (w, id) => w.hands[id].length > 0 || sum(rack(w).stack) > 0;
    /** 站在自家屋里饭桌跟前没有（at 给了就先照它看）。 */
    const atTable = (w, at = null) => {
      const p = at ? { ...people.me(w), ...at } : people.me(w);
      if (!people.atHome(w, people.who(w), at)) return false;
      return MAPS[p.map].objects.some(([, x, y, o]) => o?.dining && near(p, { x, y }));
    };
    const atVat = w => {
      const p = people.me(w);
      return (
        people.atHome(w) &&
        MAPS[p.map].objects.some(([k, x, y]) => k === 'vat' && near(p, { x, y }))
      );
    };
    const hold = ctx.own((w, id, dish) => {
      if (sum(rack(w).stack)) refuse(TABLE_LINES.stack);
      if (w.hands[id].length >= TABLE.hands) refuse(TABLE_LINES.hands);
      const kind = wareOf(dish);
      if (kind && clean(w, kind) < 1) refuse(TABLE_LINES.noWare[kind]);
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
    /** 吃了一样，它的碗盘脏着留在桌上。 */
    const soil = (w, dish) => {
      const kind = wareOf(dish);
      if (kind) rack(w).dirty[kind]++;
    };
    const clear = ctx.own(w => {
      const eaten = mine(w).splice(0);
      for (const d of eaten) soil(w, d);
      return eaten;
    });

    commands.register('dish.set', ({ draft, input, fact }) => {
      const w = draft.world;
      people.place(w, input.at);
      if (!atTable(w)) refuse(TABLE_LINES.where);
      const id = people.who(w);
      const dish = w.hands[id][0];
      if (!dish) refuse(TABLE_LINES.nothing);
      const list = mine(w);
      const dirty = sum(rack(w).dirty);
      if (list.length + dirty >= TABLE.seats)
        refuse(dirty ? TABLE_LINES.dirty[list.length ? 1 : 0] : TABLE_LINES.full);
      list.push(w.hands[id].shift());
      const line = TABLE_LINES.set[Math.min(2, list.length - 1)];
      fact('dish.set', { who: id, id: dish.id, n: list.length, line });
    });
    commands.register('dish.lift', ({ draft, input, fact }) => {
      const w = draft.world;
      people.place(w, input.at);
      if (!atTable(w)) refuse(TABLE_LINES.where);
      const id = people.who(w);
      if (holding(w, id)) refuse(TABLE_LINES.hands);
      const dish = lift(w, input.id);
      if (!dish) refuse('桌上没有这一样');
      w.hands[id].push(dish);
      fact('dish.lifted', { who: id, id: dish.id });
    });
    commands.register('dish.clear', ({ draft, input, fact }) => {
      const w = draft.world;
      people.place(w, input.at);
      if (!atTable(w)) refuse(TABLE_LINES.where);
      const id = people.who(w);
      const r = rack(w);
      if (!sum(r.dirty)) refuse(TABLE_LINES.noDirty);
      if (holding(w, id)) refuse(TABLE_LINES.hands);
      r.stack = r.dirty;
      r.dirty = none();
      fact('dish.cleared', { who: id, ...r.stack, line: TABLE_LINES.cleared });
    });
    commands.register('dish.wash', ({ draft, input, fact }) => {
      const w = draft.world;
      people.place(w, input.at);
      if (!atVat(w)) refuse('到院里水缸边才好洗碗');
      const id = people.who(w);
      const r = rack(w);
      const n = sum(r.stack);
      if (!n) refuse(TABLE_LINES.noStack);
      r.stack = none();
      const L = TABLE_LINES.wash;
      const line =
        w.clock.minute >= CALENDAR.dark ? L.night : weather.has(w, 'wet') ? L.rain : L.sun;
      fact('dish.washed', { who: id, n, line });
    });
    // 剩菜照出锅那天算：手上、桌上放过两天的倒掉，碗盘脏着（灶上锅里的由 cooking 插件管）
    reactions.on(
      'day.started',
      (s, e, emit) => {
        const w = s.world;
        const stale = d => w.clock.day - d.day >= STALE.spoiled;
        const names = [];
        for (const list of [...Object.values(w.hands), mine(w)])
          for (let i = list.length - 1; i >= 0; i--)
            if (stale(list[i])) {
              const [d] = list.splice(i, 1);
              soil(w, d);
              names.unshift(d.name);
            }
        if (names.length)
          emit('dish.spoiled', {
            who: people.who(w),
            names,
            line: fill(TABLE_LINES.spoiled, { name: names.join('、') }),
          });
      },
      { priority: 30 },
    );
    queries.define('table', (w, at = null) => ({
      hands: w.hands[people.who(w)],
      dishes: mine(w),
      seats: TABLE.seats,
      here: atTable(w, at),
      ware: {
        own: { ...rack(w).own },
        clean: Object.fromEntries(KINDS.map(k => [k, clean(w, k)])),
        dirty: { ...rack(w).dirty },
        stack: { ...rack(w).stack },
      },
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
        clean,
      }),
    );
  },
};
