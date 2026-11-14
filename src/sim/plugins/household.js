// 家当。家里存的东西和钱属于“一户”，不属于某个人：将来成家、传家时，家当跟着这一户走。
// 身上带的东西归个人（见 pack 插件）。现在只有一户（home），这里的“家”都指操控的人所在的那一户。
// 别的插件要动家当，一律走 store 服务。
import { is, check } from '../../kernel/schema.js';
import { refuse } from '../../kernel/dispatch.js';
import { ITEMS, CAN_CAPACITY } from '../../content/items.js';
import { START_STORE, eatenAs } from '../../content/pantry.js';
import { HERO } from '../../content/people.js';

export const household = {
  id: 'sim.household',
  provides: ['store'],
  requires: ['schema', 'queries', 'core'],
  writes: ['households'],
  install(ctx) {
    const { schema, queries, core } = ctx.services;

    schema.slice('households', {
      initial: () => ({
        home: { members: [HERO], coins: 24, items: { ...START_STORE }, can: CAN_CAPACITY },
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

    const who = w => w.player.controls;
    const home = w =>
      Object.values(w.households).find(h => h.members.includes(who(w))) || w.households.home;
    const count = (w, item) => home(w).items[item] || 0;

    const add = ctx.own((w, item, n, why = null) => {
      if (!Object.hasOwn(ITEMS, item) || !is.int(n, 1)) throw new Error('没有这样东西：' + item);
      home(w).items[item] = count(w, item) + n;
      core.log(w, who(w), 'item:' + item, n, why);
    });

    const take = ctx.own((w, item, n, why = null) => {
      if (!is.int(n, 1) || count(w, item) < n) refuse(`${ITEMS[item]?.name || '东西'}不够了`);
      const left = count(w, item) - n;
      if (left) home(w).items[item] = left;
      else delete home(w).items[item];
      core.log(w, who(w), 'item:' + item, -n, why);
    });

    const pay = ctx.own((w, n, why = null) => {
      if (!is.int(n, 0) || home(w).coins < n) refuse('钱不够');
      home(w).coins -= n;
      core.log(w, who(w), 'coins', -n, why);
    });

    const earn = ctx.own((w, n, why = null) => {
      home(w).coins += n;
      core.log(w, who(w), 'coins', n, why);
    });

    const pour = ctx.own(w => {
      if (home(w).can < 1) refuse('水壶空了，去水缸、水井或溪边打水');
      home(w).can -= 1;
    });

    const refill = ctx.own(w => {
      home(w).can = CAN_CAPACITY;
    });

    queries.define('home', w => ({
      coins: home(w).coins,
      can: home(w).can,
      canMax: CAN_CAPACITY,
      items: Object.entries(home(w).items).map(([id, n]) => ({
        ...ITEMS[id],
        n,
        eat: eatenAs(id),
      })),
    }));

    const water = w => home(w).can;
    /** 家里存的全部东西：{物品: 份数}。只读。 */
    const items = w => home(w).items;

    ctx.provide(
      'store',
      Object.freeze({ count, items, water, add, take, pay, earn, pour, refill }),
    );
  },
};
