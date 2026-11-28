import { ENCOUNTER_WORDS as words } from '../../content/encounters.js';
import { registerResidentOptions } from '../resident-options.js';
import { is } from '../../kernel/schema.js';
import { refuse } from '../../kernel/dispatch.js';
import { ITEMS } from '../../content/items.js';
import { dateOf, isFairDay } from '../../content/calendar.js';
import { MAPS, actAt } from '../../content/maps/index.js';
import { STAPLES, SOMETIMES, FRESH, TAKES, RESALE, TAKE_WORDS } from '../../content/market.js';
import { takeKind } from '../../content/pantry.js';
import { STALLS, STALL_IDS, FAIR_NOTES, stallShop, stallOf } from '../../content/stalls.js';
import { fill } from '../../content/text.js';
import { pickStalls, layStall, stallTakes, stallLeft, stallQuote } from '../stall-rules.js';
import { near } from './people.js';
function qiao({ ask, person, at }) {
  if (person.place !== 'market') return [];
  const market = ask('market', 'market', at);
  return market.ready
    ? market.wares
        .filter(i => i.left > 0)
        .slice(0, 4)
        .map(i => ({
          key: 'stock.' + i.item,
          group: '看今日货价',
          label: i.name,
          line: words.stock(i.name, i.price, i.left),
        }))
    : [];
}

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
    'purse',
  ],
  writes: ['shops'],
  install(ctx) {
    registerResidentOptions(ctx, 'qiao', qiao);
    /** 摊子的说明：谁的摊、收哪几类、今天还收几份、吆喝一句。不是摊子返回 null。 */
    const stallInfo = (w, shop) => {
      const id = stallOf(shop);
      if (!id) return null;
      const s = STALLS[id],
        fair = isFairDay(w.clock.day),
        took = w.shops.day === w.clock.day ? w.shops.stallTook[id] || 0 : 0,
        calls = fair ? s.lines.fair : s.lines.hawk;
      return {
        id,
        name: s.name,
        owner: s.owner,
        who: s.who,
        takes: s.takes,
        left: stallLeft(fair, took),
        hawk: calls[(w.clock.day + Math.floor(w.clock.minute / 60)) % calls.length],
      };
    };
    const {
      schema,
      commands,
      queries,
      reactions,
      core,
      people,
      pack,
      store,
      weather,
      compute,
      purse,
    } = ctx.services;
    schema.slice('shops', {
      initial: () => ({
        day: 0,
        wares: { market: [], tea: [] },
        took: {},
        paid: 0,
        out: [null, null, null],
        stallTook: {},
      }),
      validate: s =>
        (is.int(s.day) &&
          is.arr(s.out, 3) &&
          s.out.length === 3 &&
          s.out.every(id => id === null || STALL_IDS.includes(id)) &&
          is.obj(s.stallTook) &&
          Object.entries(s.stallTook).every(
            ([k, n]) => STALL_IDS.includes(k) && is.int(n, 1, 99),
          ) &&
          is.obj(s.took) &&
          Object.entries(s.took).every(([k, n]) => Object.hasOwn(TAKES, k) && is.int(n, 1, 999)) &&
          is.int(s.paid, 0) &&
          is.obj(s.wares) &&
          ['market', 'tea'].every(k => Object.hasOwn(s.wares, k)) &&
          Object.keys(s.wares).every(k => ['market', 'tea'].includes(k) || stallOf(k)) &&
          Object.keys(s.wares).every(
            k =>
              is.arr(s.wares[k], 80) &&
              s.wares[k].every(
                x =>
                  is.obj(x) &&
                  Object.hasOwn(ITEMS, x.item) &&
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
        // 村里铺子不卖的东西（鱼虾、山货）摊子也卖，照卖价的两倍要
        price: Math.max(1, (it.buy || it.sell * 2) + reasons.reduce((n, r) => n + r[1], 0)),
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
      // 杂货铺平常只卖放得住的（米、油盐酱醋、柴、常备菜种）；鲜菜、鲜肉归路南的摊子
      for (const it of Object.values(ITEMS)) {
        if (
          it.kind === 'seed' &&
          it.buy &&
          (!it.season || it.season.includes(si)) &&
          (it.id === 'seed.qingcai' || core.random(w) < 0.6)
        )
          add('market', it.id, 1, 3);
      }
      add('tea', 'cake', 3, 6);
      add('tea', 'bun', 3, 6);
      if (si === 1) add('tea', 'melon', 2, 4);
      if (si >= 2) add('tea', 'yam', 2, 4);
      if (core.random(w) < 0.4) add('tea', 'candy', 2, 3);
      // 路南的摊子：平常一个，集日三个，各摆各的货
      const out = pickStalls(fair, () => core.random(w));
      for (const id of out.filter(Boolean)) {
        wares[stallShop(id)] = [];
        layStall(id, { fair, season: si, random: () => core.random(w), add });
      }
      const names = out.filter(Boolean).map(id => STALLS[id].name);
      if (fair)
        core.post(w, {
          ...FAIR_NOTES.day,
          text: fill(FAIR_NOTES.day.text, { names: names.join('、') }),
        });
      else if (isFairDay(w.clock.day + 1)) core.post(w, FAIR_NOTES.eve);
      // 昨天收进的货今早转手卖到外头，钱多一成回到钱匣
      if (w.shops.paid) purse.move(w, 'shop', Math.round(w.shops.paid * RESALE), '收的货转手卖了');
      w.shops = { day: w.clock.day, wares, took: {}, paid: 0, out, stallTook: {} };
    }
    const stock = (w, shop) =>
      (w.shops.wares[shop] || []).map(x => {
        const it = ITEMS[x.item],
          why = [...x.why];
        let price = x.price;
        const stall = STALLS[stallOf(shop)];
        if (
          w.clock.minute >= 900 &&
          (stall ? stall.drop : FRESH.includes(it.id) || (it.kind === 'food' && it.season)) &&
          price > 1
        ) {
          price--;
          why.push(['傍晚处理', -1]);
        }
        return { ...x, price, why, name: it.name, qty: it.qty };
      });
    /** 今天这个摊子摆在哪个摊位（0、1、2），没出来是 -1。 */
    const spotOf = (w, shop) =>
      w.shops.day === w.clock.day ? w.shops.out.indexOf(stallOf(shop)) : -1;
    const nearShop = (w, shop, at) => {
      const p = people.me(w);
      if (stallOf(shop)) {
        const i = spotOf(w, shop);
        return (
          i >= 0 &&
          MAPS[p.map].objects.some(
            ([k, x, y, d]) => k === 'stall' && d?.spot === i && near(at || p, { x, y }),
          )
        );
      }
      if (!['market', 'tea'].includes(shop)) return false;
      return MAPS[p.map].objects.some(
        ([k, x, y]) => actAt(MAPS[p.map], x, y)?.shop === shop && near(at || p, { x, y }),
      );
    };
    const visit = (w, input) => {
      people.place(w, input.at);
      if (w.shops.day !== w.clock.day) lay(w);
      if (!nearShop(w, input.shop))
        refuse(stallOf(input.shop) ? '今天这个摊子没摆出来' : '走到柜台前再买卖');
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
      fact('market.bought', {
        who: people.who(w),
        shop: input.shop,
        item: x.item,
        n: x.qty,
        price: x.price,
      });
    });
    /** 卖 n 份给铺子能拿多少：每天每类前几份原价，再多半价，收满两倍就不收（full）。 */
    function quote(w, item, n) {
      const kind = takeKind(item),
        cap = TAKES[kind],
        took = w.shops.day === w.clock.day ? w.shops.took[kind] || 0 : 0;
      if (took + n > cap * 2) return { value: 0, half: 0, full: true };
      const whole = Math.max(0, Math.min(n, cap - took));
      const half = n - whole;
      const price = ITEMS[item].sell;
      return {
        value: whole * price + half * Math.max(1, Math.floor(price / 2)),
        half,
        full: false,
      };
    }
    commands.register('market.sell', ({ draft, input, fact }) => {
      const w = draft.world;
      if (input.shop === 'tea') refuse(TAKE_WORDS.tea);
      visit(w, input);
      const it = ITEMS[input.item];
      if (!it?.sell) refuse('铺子不收这样东西');
      const n = input.n ?? 1;
      if (!is.int(n, 1, 99)) refuse('一次卖一至九十九份');
      const stall = stallOf(input.shop);
      if (stall) return sellToStall(w, stall, it, n, fact);
      const offer = quote(w, it.id, n);
      if (offer.full) refuse(TAKE_WORDS.full);
      pack.use(w, people.who(w), it.id, n, '卖给铺子');
      const q = compute.run(
        'sale.price',
        { w, who: people.who(w), item: it.id },
        { value: offer.value, parts: [] },
      );
      if (purse.coins(w, 'shop') < q.value) refuse(TAKE_WORDS.broke);
      store.earn(w, q.value, '卖' + it.name);
      const kind = takeKind(it.id);
      w.shops.took[kind] = (w.shops.took[kind] || 0) + n;
      w.shops.paid += q.value;
      fact('market.sold', {
        who: people.who(w),
        shop: input.shop,
        item: it.id,
        n,
        coins: q.value,
        half: offer.half,
      });
    });
    // 卖给摊子：钱是摊主从外头带来的，不走村里的钱匣；每摊每天原价收几份，再收同样多半价
    function sellToStall(w, stall, it, n, fact) {
      if (!stallTakes(stall, it.id)) refuse(`${STALLS[stall].owner}不收这样东西`);
      const fair = isFairDay(w.clock.day);
      const offer = stallQuote(fair, w.shops.stallTook[stall] || 0, it.id, n);
      if (offer.full) refuse(STALLS[stall].lines.full);
      pack.use(w, people.who(w), it.id, n, '卖给' + STALLS[stall].name);
      const q = compute.run(
        'sale.price',
        { w, who: people.who(w), item: it.id },
        { value: offer.value, parts: [] },
      );
      store.earn(w, q.value, '卖' + it.name);
      w.shops.stallTook[stall] = (w.shops.stallTook[stall] || 0) + n;
      const said = STALLS[stall].lines.take;
      fact('market.sold', {
        who: people.who(w),
        shop: stallShop(stall),
        item: it.id,
        n,
        coins: q.value,
        half: offer.half,
        line: said[(w.shops.stallTook[stall] + w.clock.day) % said.length],
      });
    }
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
      buys: shop === 'market' || !!stallOf(shop),
      stall: stallInfo(w, shop),
      /** 铺子今天每类还收几份原价、几份半价（kind → {full, half}）。 */
      takes: Object.fromEntries(
        Object.entries(TAKES).map(([k, cap]) => {
          const took = w.shops.day === w.clock.day ? w.shops.took[k] || 0 : 0;
          return [
            k,
            { full: Math.max(0, cap - took), half: Math.max(0, cap * 2 - Math.max(cap, took)) },
          ];
        }),
      ),
    }));
    /** 今天三个摊位上各是哪个摊子（摊子编号或 null），画面照这个摆摊棚。 */
    queries.define('stalls', w =>
      w.shops.day === w.clock.day ? [...w.shops.out] : [null, null, null],
    );
  },
};
