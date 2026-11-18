import { is } from '../../kernel/schema.js';
import { refuse } from '../../kernel/dispatch.js';
import { ITEMS } from '../../content/items.js';
import { dateOf, isFairDay } from '../../content/calendar.js';
import { MAPS, actAt } from '../../content/maps/index.js';
import { STAPLES, SOMETIMES, FRESH } from '../../content/market.js';
import { near } from './people.js';
export const market = {
  id: 'sim.market',
  requires: [
    'schema',
    'commands',
    'queries',
    'reactions',
    'core',
    'people',
    'pack',
    'store',
    'weather',
    'compute',
  ],
  writes: ['shops'],
  install(ctx) {
    const { schema, commands, queries, reactions, core, people, pack, store, weather, compute } =
      ctx.services;
    schema.slice('shops', {
      initial: () => ({ day: 0, wares: { market: [], tea: [] } }),
      validate: s =>
        (is.int(s.day) &&
          ['market', 'tea'].every(
            k =>
              is.arr(s.wares[k], 80) &&
              s.wares[k].every(
                x =>
                  ITEMS[x.item] &&
                  is.int(x.left, 0, 99) &&
                  is.int(x.price, 1) &&
                  Array.isArray(x.why),
              ),
          )) ||
        'shops',
    });
    const rint = (w, a, b) => a + Math.floor(core.random(w) * (b - a + 1));
    const priced = (w, item, left, why = []) => {
      const it = ITEMS[item],
        d = dateOf(w.clock.day),
        wet = weather.has(w, 'wet'),
        reasons = [...why];
      if (it.kind === 'food' && it.season?.includes(d.season)) {
        if (d.dayOfSeason <= 2 && it.season.length <= 2) reasons.push(['刚上市', 1]);
        else if (d.dayOfSeason >= 5 && d.dayOfSeason <= 10 && it.price > 1 && left >= 3)
          reasons.push(['正当季', -1]);
      }
      if (wet && (it.tags.includes('green') || item === 'wood')) reasons.push(['下雨不好收', 1]);
      if (wet && item === 'umbrella') reasons.push(['下雨天好卖', 2]);
      if (left <= 1 && it.price >= 3) reasons.push(['货少', 1]);
      return {
        item,
        left,
        price: Math.max(1, it.buy + reasons.reduce((n, r) => n + r[1], 0)),
        why: reasons,
      };
    };
    function lay(w) {
      const si = dateOf(w.clock.day).season,
        wet = weather.has(w, 'wet'),
        fair = isFairDay(w.clock.day);
      const wares = { market: [], tea: [] };
      const add = (shop, item, a, b, why = []) =>
        wares[shop].push(priced(w, item, rint(w, a, b), why));
      for (const [item, [a, b]] of Object.entries(STAPLES))
        add(
          'market',
          item,
          item === 'wood' && wet ? Math.max(1, a - 2) : a,
          item === 'wood' && wet ? b - 2 : b,
        );
      for (const [item, chance] of Object.entries(SOMETIMES))
        if (
          core.random(w) <
          ((item === 'umbrella' && wet) || (item === 'flask' && si === 1) ? 1 : chance)
        )
          add('market', item, 1, 2);
      for (const it of Object.values(ITEMS)) {
        if (
          it.kind === 'food' &&
          it.buy &&
          it.season?.includes(si) &&
          !STAPLES[it.id] &&
          !it.tags.includes('meat') &&
          core.random(w) < (wet && it.tags.includes('green') ? 0.5 : 0.75)
        )
          add('market', it.id, wet ? 1 : 2, wet ? 3 : 5);
        if (
          it.kind === 'seed' &&
          it.buy &&
          (!it.season || it.season.includes(si)) &&
          (it.id === 'seed.qingcai' || core.random(w) < 0.6)
        )
          add('market', it.id, 1, 3);
      }
      if (!fair && core.random(w) < (si === 3 ? 0.5 : 0.3)) add('market', 'pork', 1, 2);
      add('tea', 'cake', 3, 6);
      add('tea', 'bun', 3, 6);
      if (si === 1) add('tea', 'melon', 2, 4);
      if (si >= 2) add('tea', 'yam', 2, 4);
      if (core.random(w) < 0.4) add('tea', 'candy', 2, 3);
      if (fair) {
        add('tea', 'pork', 2, 4, [['集日肉摊', -1]]);
        add('tea', 'wholeChicken', 1, 2);
        if (si >= 2 && core.random(w) < 0.7) add('tea', 'lambLeg', 1, 1);
        if (si === 3 && core.random(w) < 0.5) add('tea', 'porkSlab', 1, 1);
      }
      w.shops = { day: w.clock.day, wares };
    }
    const stock = (w, shop) =>
      w.shops.wares[shop].map(x => {
        const it = ITEMS[x.item],
          why = [...x.why];
        let price = x.price;
        if (
          w.clock.minute >= 900 &&
          (FRESH.includes(it.id) || (it.kind === 'food' && it.season)) &&
          price > 1
        ) {
          price--;
          why.push(['傍晚处理', -1]);
        }
        return { ...x, price, why, name: it.name, qty: it.qty };
      });
    const nearShop = (w, shop, at) => {
      if (!['market', 'tea'].includes(shop)) return false;
      const p = people.me(w);
      return MAPS[p.map].objects.some(
        ([k, x, y]) => actAt(MAPS[p.map], x, y)?.shop === shop && near(at || p, { x, y }),
      );
    };
    const visit = (w, input) => {
      people.place(w, input.at);
      if (!nearShop(w, input.shop)) refuse('走到柜台前再买卖');
      if (w.shops.day !== w.clock.day) lay(w);
    };
    commands.register('market.visit', ({ draft, input }) => visit(draft.world, input));
    commands.register('market.buy', ({ draft, input, fact }) => {
      const w = draft.world;
      visit(w, input);
      const x = stock(w, input.shop).find(x => x.item === input.item);
      if (!x || !x.left) refuse('今天卖完了，明早再来');
      store.pay(w, x.price, '买' + x.name);
      pack.receive(w, people.who(w), x.item, x.qty, '铺子买的');
      w.shops.wares[input.shop].find(a => a.item === x.item).left--;
      fact('market.bought', { who: people.who(w), item: x.item, n: x.qty, price: x.price });
    });
    commands.register('market.sell', ({ draft, input, fact }) => {
      const w = draft.world;
      visit(w, input);
      const it = ITEMS[input.item];
      if (!it?.sell) refuse('铺子不收这样东西');
      const n = input.n ?? 1;
      if (!is.int(n, 1, 99)) refuse('一次卖一至九十九份');
      pack.use(w, people.who(w), it.id, n, '卖给铺子');
      const q = compute.run(
        'sale.price',
        { w, who: people.who(w), item: it.id },
        { value: it.sell * n, parts: [] },
      );
      store.earn(w, q.value, '卖' + it.name);
      fact('market.sold', { who: people.who(w), item: it.id, n, coins: q.value });
    });
    reactions.on('day.started', s => lay(s.world), { priority: 35 });
    reactions.on(
      'time.passed',
      (s, e) => {
        if (Math.floor(e.data.from / 180) === Math.floor(e.data.minute / 180)) return;
        for (const rows of Object.values(s.world.shops.wares))
          for (const x of rows)
            if (
              x.left &&
              (FRESH.includes(x.item) || ITEMS[x.item].season) &&
              core.random(s.world) < 0.35
            )
              x.left--;
      },
      { priority: 35 },
    );
    queries.define('market', (w, shop = 'market', at) => ({
      fair: isFairDay(w.clock.day),
      ready: w.shops.day === w.clock.day,
      near: nearShop(w, shop, at),
      wares: stock(w, shop),
    }));
  },
};
