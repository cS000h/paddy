// 乡邻买卖：每户每天按自家营生想要一两样东西，走到跟前可以卖给这家（钱从这家钱匣出），
// 也可以拿去换他家有的。卖和换都不加好感，和送礼分开。今天想要什么只看日子和种子（sim/noise.js），不进存档；
// 存档只记今天跟谁做了几回。
//   neighbor.sell {to, item, at} → neighbor.sold {to, house, item, coins, line}
//   neighbor.swap {to, item, at} → neighbor.swapped {to, house, item, give, n, line}
import { is } from '../../kernel/schema.js';
import { refuse } from '../../kernel/dispatch.js';
import { noise } from '../noise.js';
import { ITEMS } from '../../content/items.js';
import { kindOf, inSeason } from '../../content/pantry.js';
import { dateOf } from '../../content/calendar.js';
import { fill } from '../../content/text.js';
import { NEIGHBORS, NEIGHBOR_RULES as R, NEIGHBOR_WORDS as W } from '../../content/neighbors.js';
import { registerResidentOptions } from '../resident-options.js';
import { near } from './people.js';

const IDS = Object.keys(NEIGHBORS);

/** 这户今天想要哪几样（照季节挑，同一天同一局总是一样）。 */
export function wantsToday(w, id) {
  const season = dateOf(w.clock.day).season;
  const pool = NEIGHBORS[id].wants.filter(k => inSeason(k, season));
  const picked = [];
  for (let k = 0; picked.length < Math.min(R.perDay, pool.length) && k < 20; k++) {
    const i = Math.floor(noise(w.meta.seed, w.clock.day, 919, IDS.indexOf(id), k) * pool.length);
    if (!picked.includes(pool[i])) picked.push(pool[i]);
  }
  return picked;
}

export const neighbors = {
  id: 'sim.neighbors',
  requires: [
    'schema',
    'commands',
    'queries',
    'core',
    'people',
    'pack',
    'store',
    'purse',
    'compute',
    'residents',
  ],
  writes: ['deals'],
  install(ctx) {
    const { schema, commands, people, pack, store, purse, compute, residents } = ctx.services;
    schema.slice('deals', {
      initial: () => ({ day: 0, n: {} }),
      validate: d =>
        (is.int(d.day, 0) &&
          is.obj(d.n) &&
          Object.entries(d.n).every(([k, n]) => IDS.includes(k) && is.int(n, 1, 99))) ||
        'deals',
    });
    const dealsToday = (w, id) => (w.deals.day === w.clock.day ? w.deals.n[id] || 0 : 0);
    const priceOf = (w, item) =>
      compute.run(
        'sale.price',
        { w, who: people.who(w), item },
        { value: ITEMS[item].sell, parts: [] },
      ).value;

    /** 共同的检查：人在跟前、今天还能做、他要这样东西、我带着。 */
    function check(w, input) {
      people.place(w, input.at);
      const to = input.to;
      if (!IDS.includes(to)) refuse('没有这户人家');
      const him = residents.positions(w).find(p => p.id === to);
      const me = people.me(w);
      if (!him?.visible || him.map !== me.map || !near(me, him)) refuse(W.far);
      if (dealsToday(w, to) >= R.dealsPerDay) refuse(W.done);
      if (!ITEMS[input.item] || !wantsToday(w, to).includes(kindOf(input.item)))
        refuse(W.notWanted);
      pack.use(w, people.who(w), input.item, 1, '卖给乡邻');
      if (w.deals.day !== w.clock.day) w.deals = { day: w.clock.day, n: {} };
      w.deals.n[to] = dealsToday(w, to) + 1;
      return { to, house: purse.houseOf(to), name: ITEMS[input.item].name };
    }

    commands.register('neighbor.sell', ({ draft, input, fact }) => {
      const w = draft.world;
      if (NEIGHBORS[input.to]?.buys === false) refuse('他手头没闲钱，只换不买');
      const coins = ITEMS[input.item]?.sell ? priceOf(w, input.item) : 0;
      const { to, house, name } = check(w, input);
      if (!coins) refuse('这样东西卖不了钱');
      if (purse.coins(w, house) < coins) refuse(W.broke);
      purse.move(w, house, -coins, '买了' + name);
      store.earn(w, coins, '卖给乡邻' + name);
      fact('neighbor.sold', {
        to,
        house,
        item: input.item,
        coins,
        line: fill(W.sold, { item: name, coins }),
      });
    });

    commands.register('neighbor.swap', ({ draft, input, fact }) => {
      const w = draft.world;
      const { to, house, name } = check(w, input);
      const { item, n } = NEIGHBORS[to].swap;
      pack.receive(w, people.who(w), item, n, '和乡邻换的');
      fact('neighbor.swapped', {
        to,
        house,
        item: input.item,
        give: item,
        n,
        line: fill(W.swapped, { item: name, give: ITEMS[item].name + (n > 1 ? n + '份' : '') }),
      });
    });

    for (const to of IDS)
      registerResidentOptions(ctx, to, ({ ask, at, day }) => {
        const wants = ask('neighbor.wants', to);
        /** @type {Array<Record<string, any>>} */
        const rows = [
          {
            key: 'wants.' + day,
            group: '买卖',
            label: '今天要些什么？',
            line: wants.items.length
              ? fill(W.wants, { items: wants.items.map(k => ITEMS[k].name).join('、') })
              : W.none,
          },
        ];
        const goods = ask('goods', at).filter(
          g => g.carried > 0 && wants.items.includes(kindOf(g.id)),
        );
        for (const g of goods) {
          const done = wants.left < 1 ? W.done : '';
          if (wants.buys)
            rows.push({
              key: ['sell', day, g.id, wants.left].join('.'),
              group: '买卖',
              label: `卖${g.name} · ${g.sell}文`,
              icon: g.id,
              reason: done || (!g.sell ? '卖不了钱' : ''),
              confirm: `卖一份${g.name}`,
              command: 'neighbor.sell',
              input: { to, item: g.id },
              result: 'neighbor.sold',
            });
          const s = NEIGHBORS[to].swap;
          rows.push({
            key: ['swap', day, g.id, wants.left].join('.'),
            group: '买卖',
            label: `拿${g.name}换${ITEMS[s.item].name}${s.n > 1 ? '×' + s.n : ''}`,
            icon: s.item,
            reason: done,
            confirm: `一份${g.name}换他的${ITEMS[s.item].name}`,
            command: 'neighbor.swap',
            input: { to, item: g.id },
            result: 'neighbor.swapped',
          });
        }
        return rows;
      });

    ctx.services.queries.define('neighbor.wants', (w, to) => ({
      items: IDS.includes(to) ? wantsToday(w, to) : [],
      left: IDS.includes(to) ? R.dealsPerDay - dealsToday(w, to) : 0,
      buys: NEIGHBORS[to]?.buys !== false,
      swap: NEIGHBORS[to]?.swap || null,
    }));
  },
};
