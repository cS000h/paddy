// 院门边的收菜筐。阿满是村里送菜的：晚上把菜放进筐里，他清早收走、留下钱；
// 也可以在筐里留钱托他捎东西（种子、米面、调料），第二天早上送到。
//   basket.put   {item, n, at}  → basket.filled
//   basket.order {item, n, at}  → basket.ordered      （先付钱）
//   day.started  → basket.sold {coins, goods}, basket.delivered {item, n}，各留一张便条
import { is, check } from '../../kernel/schema.js';
import { ITEMS } from '../../content/items.js';
import { BASKET_WARES, basketTakes } from '../../content/pantry.js';

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
  ],
  writes: ['basket'],
  install(ctx) {
    const { schema, commands, reactions, queries, core, people, store, pack, compute } =
      ctx.services;

    const goodsOk = g =>
      is.obj(g) &&
      Object.entries(g).every(([k, n]) => Object.hasOwn(ITEMS, k) && is.int(n, 1, 999));

    schema.slice('basket', {
      initial: () => ({ goods: {}, order: {} }),
      validate: b =>
        check([
          [goodsOk(b.goods), 'goods'],
          [goodsOk(b.order), 'order'],
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
          emit('basket.sold', { coins, goods: w.basket.goods });
          w.basket.goods = {};
        }
        // 一回买的可能不止一份（盐一包是四份）。东西先往身上放，放不下就收进橱柜
        for (const [item, bought] of Object.entries(w.basket.order)) {
          const n = bought * ITEMS[item].qty;
          const where = pack.receive(w, people.who(w), item, n, '阿满捎来的');
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
      goods: Object.entries(w.basket.goods).map(([id, n]) => ({ ...ITEMS[id], n })),
      order: Object.entries(w.basket.order).map(([id, n]) => ({ ...ITEMS[id], n })),
      wares: BASKET_WARES.map(id => ITEMS[id]),
    }));

    ctx.provide('basket', Object.freeze({}));
  },
};
