// 院门边的收菜筐。阿满是村里送菜的：晚上把菜放进筐里，他清早收走、留下钱；
// 也可以在筐里留钱托他捎东西（种子、米面、调料），第二天早上送到。
//   basket.put   {item, n, at}  → basket.filled
//   basket.order {item, n, at}  → basket.ordered      （先付钱）
//   day.started  → basket.sold {coins, goods}, basket.delivered {item, n}，各留一张便条
import { ENCOUNTER_WORDS as words } from '../../content/encounters.js';
import { registerResidentOptions } from '../resident-options.js';
import { is, check } from '../../kernel/schema.js';
import { near } from './people.js';
import { ITEMS } from '../../content/items.js';
import { BASKET_WARES, basketTakes } from '../../content/pantry.js';

function aman({ ask, day, at, person }) {
  const basket = ask('basket');
  const choices = [];
  const r = basket.receipt;
  if (r) {
    const goods = Object.entries(r.goods)
      .map(([id, n]) => ITEMS[id].name + ' ' + n + '份')
      .join('、');
    choices.push({
      key: 'bill.' + r.day,
      label: '上回那筐卖了多少？',
      line: words.receipt(r.day, goods, r.coins),
    });
  }
  if (!near(at, person)) return choices;
  const coins = ask('home').coins;
  for (const ware of basket.wares) {
    const before = basket.order.find(x => x.id === ware.id)?.n || 0;
    choices.push({
      key: ['order', day, ware.id, before].join('.'),
      group: '托他捎货',
      label: ware.name + ' ×' + ware.qty + ' · ' + ware.buy + '文',
      icon: ware.id,
      reason: coins < ware.buy ? '钱不够' : '',
      confirm: '付' + ware.buy + '文，明早捎' + ware.qty + '份' + ware.name,
      command: 'basket.order',
      input: { to: 'aman', item: ware.id, n: 1, day, before },
      result: 'basket.ordered',
      line: words.ordered(ware.name),
    });
  }
  return choices;
}

export const basket = {
  id: 'sim.basket',
  provides: ['basket'],
  requires: [
    'schema',
    'commands',
    'reactions',
    'queries',
    'core',
    'people',
    'store',
    'pack',
    'compute',
    'residents',
  ],
  writes: ['basket'],
  install(ctx) {
    registerResidentOptions(ctx, 'aman', aman);
    const { schema, commands, reactions, queries, core, people, store, pack, compute } =
      ctx.services;

    const goodsOk = g =>
      is.obj(g) &&
      Object.entries(g).every(([k, n]) => Object.hasOwn(ITEMS, k) && is.int(n, 1, 999));

    schema.slice('basket', {
      initial: () => ({ goods: {}, order: {}, receipt: null }),
      validate: b =>
        check([
          [goodsOk(b.goods), 'goods'],
          [goodsOk(b.order), 'order'],
          [
            b.receipt === null ||
              (is.obj(b.receipt) &&
                is.int(b.receipt.day, 1) &&
                is.int(b.receipt.coins, 0) &&
                goodsOk(b.receipt.goods) &&
                Object.keys(b.receipt.goods).length > 0),
            'receipt',
          ],
        ]),
    });

    commands.register('basket.put', ({ draft, input, fact }) => {
      const w = draft.world;
      people.place(w, input.at);
      if (!basketTakes(input.item) || !is.int(input.n, 1, 999))
        return { ok: false, reason: '阿满只收吃的和手艺活' };
      pack.use(w, people.who(w), input.item, input.n, '放进收菜筐');
      w.basket.goods[input.item] = (w.basket.goods[input.item] || 0) + input.n;
      fact('basket.filled', { item: input.item, n: input.n });
      return undefined;
    });

    commands.register('basket.order', ({ draft, input, fact }) => {
      const w = draft.world;
      people.place(w, input.at);
      if (input.to !== undefined) {
        const aman = ctx.services.residents.positions(w).find(p => p.id === 'aman');
        const me = people.me(w);
        if (input.to !== 'aman' || !aman.visible || aman.map !== me.map || !near(me, aman))
          return { ok: false, reason: '走到阿满跟前再托他捎货' };
        if (input.day !== w.clock.day || input.before !== (w.basket.order[input.item] || 0))
          return { ok: false, reason: '这张单子变过了，重新看一眼' };
      }
      const def = ITEMS[input.item];
      if (!BASKET_WARES.includes(input.item) || !is.int(input.n, 1, 99))
        return { ok: false, reason: '阿满捎不了这个' };
      store.pay(w, def.buy * input.n, `托阿满捎${def.name}`);
      w.basket.order[input.item] = (w.basket.order[input.item] || 0) + input.n;
      fact('basket.ordered', { item: input.item, n: input.n, coins: def.buy * input.n });
      return undefined;
    });

    reactions.on(
      'day.started',
      (s, e, emit) => {
        const w = s.world;
        const sold = Object.entries(w.basket.goods);
        if (sold.length) {
          const coins = sold.reduce(
            (sum, [item, n]) =>
              sum +
              compute.run(
                'sale.price',
                { w, who: people.who(w), item },
                { value: ITEMS[item].sell, parts: [] },
              ).value *
                n,
            0,
          );
          store.earn(w, coins, '阿满留下的菜钱');
          const what = sold.map(([item, n]) => `${ITEMS[item].name} ${n} 份`).join('、');
          core.post(w, {
            title: '阿满来过了',
            text: `筐里的${what}被收走了，筐底压着 ${coins} 文钱，还有半截没哼完的小调。`,
          });
          w.basket.receipt = { day: w.clock.day, coins, goods: { ...w.basket.goods } };
          emit('basket.sold', { coins, goods: w.basket.goods });
          w.basket.goods = {};
        }
        // 一回买的可能不止一份（盐一包是四份）。东西先往身上放，放不下就收进橱柜
        for (const [item, bought] of Object.entries(w.basket.order)) {
          const n = bought * ITEMS[item].qty;
          const where = pack.deliver(w, people.who(w), item, n, '阿满捎来的');
          core.post(w, {
            title: '阿满捎来的',
            text:
              `筐里多了一包${ITEMS[item].name}，一共 ${n} 份。` +
              (where === 'store' ? '你收进了橱柜。' : ''),
          });
          emit('basket.delivered', { item, n });
        }
        w.basket.order = {};
      },
      { priority: 45 },
    );

    queries.define('basket', w => ({
      receipt: w.basket.receipt,
      goods: Object.entries(w.basket.goods).map(([id, n]) => ({ ...ITEMS[id], n })),
      order: Object.entries(w.basket.order).map(([id, n]) => ({ ...ITEMS[id], n })),
      wares: BASKET_WARES.map(id => ITEMS[id]),
    }));

    ctx.provide('basket', Object.freeze({}));
  },
};
