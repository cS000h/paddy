// 家当。东西和钱属于“一户”，不属于某个人：将来成家、传家时，家当跟着这一户走。
// 现在只有一户（home），操控的人就是户里的人。别的插件要动家当，一律走 store 服务。
import { is, check } from '../../kernel/schema.js';
import { ITEMS, CAN_CAPACITY } from '../../content/items.js';
import { HERO } from '../../content/people.js';

export const household = {
  id: 'sim.household',
  provides: ['store'],
  requires: ['schema', 'queries'],
  writes: ['households'],
  install(ctx) {
    const { schema, queries } = ctx.services;

    schema.slice('households', {
      initial: () => ({
        home: { members: [HERO], coins: 24, items: { 'seed.qingcai': 12 }, can: CAN_CAPACITY },
      }),
      validate: all =>
        check([
          [is.obj(all) && is.obj(all.home), 'home'],
          [
            Object.values(all).every(
              h =>
                is.arr(h.members, 12) &&
                is.int(h.coins) &&
                is.int(h.can, 0, CAN_CAPACITY) &&
                is.obj(h.items) &&
                Object.entries(h.items).every(
                  ([k, n]) => Object.hasOwn(ITEMS, k) && is.int(n, 1, 9999),
                ),
            ),
            'household fields',
          ],
        ]),
    });

    const home = w => w.households.home;
    const count = (w, item) => home(w).items[item] || 0;

    const add = ctx.own((w, item, n) => {
      if (!Object.hasOwn(ITEMS, item) || !is.int(n, 1)) throw new Error('没有这样东西');
      home(w).items[item] = count(w, item) + n;
    });

    const take = ctx.own((w, item, n) => {
      if (!is.int(n, 1) || count(w, item) < n)
        throw new Error(`${ITEMS[item]?.name || '东西'}不够了`);
      const left = count(w, item) - n;
      if (left) home(w).items[item] = left;
      else delete home(w).items[item];
    });

    const pay = ctx.own((w, n) => {
      if (!is.int(n, 0) || home(w).coins < n) throw new Error('钱不够');
      home(w).coins -= n;
    });

    const earn = ctx.own((w, n) => {
      home(w).coins += n;
    });

    const pour = ctx.own(w => {
      if (home(w).can < 1) throw new Error('水壶空了，去水缸、水井或溪边打水');
      home(w).can -= 1;
    });

    const refill = ctx.own(w => {
      home(w).can = CAN_CAPACITY;
    });

    queries.define('home', w => ({
      coins: home(w).coins,
      can: home(w).can,
      canMax: CAN_CAPACITY,
      items: Object.entries(home(w).items).map(([id, n]) => ({ ...ITEMS[id], n })),
    }));

    const water = w => home(w).can;

    ctx.provide('store', Object.freeze({ count, water, add, take, pay, earn, pour, refill }));
  },
};
