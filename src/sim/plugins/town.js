// 阿满进县城（东西和话在 content/town.js）：逢三逢八进城，那天不在村里；托他捎县城家具，回村那天清早到家；
// 回村那天有时带回一张县城大单，凑齐了交给他换钱和县城家具，过期作罢不罚。
// 存档记托捎的货、眼下的大单（交了多少）、上一张单子是哪天来的、做成过几张。
//   town.ask   {item, at}  托捎一件 → town.asked {item, coins, line}
//   town.hand  {item, at}  交大单的货（身上有多少交多少，交够为止）→ town.handed {item, n, done, coins, line}
import { is } from '../../kernel/schema.js';
import { refuse } from '../../kernel/dispatch.js';
import { ITEMS } from '../../content/items.js';
import { kindOf } from '../../content/pantry.js';
import { dateOf } from '../../content/calendar.js';
import { fill } from '../../content/text.js';
import { DECOR } from '../../content/furniture.js';
import { TOWN_RULES as R, ERRANDS, ORDERS, TOWN_WORDS as W } from '../../content/town.js';
import { near } from './people.js';
import { noise } from '../noise.js';
import { registerResidentOptions } from '../resident-options.js';

const ORDER_IDS = Object.keys(ORDERS);
const ERRAND_IDS = Object.keys(ERRANDS);
const styleOf = id => {
  const [slot, style] = id.split('.');
  return DECOR[slot].styles[style];
};
export const isTripDay = day => day % R.every === R.tripDay;
export const isBackDay = day => day % R.every === R.backDay;
const needText = need =>
  Object.entries(need)
    .map(([k, n]) => `${ITEMS[k].name}${n}份`)
    .join('、');

export const town = {
  id: 'sim.town',
  requires: [
    'schema',
    'commands',
    'queries',
    'reactions',
    'core',
    'people',
    'pack',
    'store',
    'residents',
    'compute',
    'decor',
  ],
  writes: ['town'],
  install(ctx) {
    const { schema, commands, queries, reactions, core, people, pack, store, residents, compute } =
      ctx.services;
    const decor = ctx.services.decor;
    schema.slice('town', {
      initial: () => ({ errands: [], order: null, last: 0, done: 0 }),
      validate: t =>
        (is.arr(t.errands, R.perTrip) &&
          t.errands.every(e => is.obj(e) && ERRAND_IDS.includes(e.item) && is.int(e.day, 0)) &&
          (t.order === null ||
            (is.obj(t.order) &&
              ORDER_IDS.includes(t.order.id) &&
              is.int(t.order.due, 0) &&
              is.obj(t.order.got) &&
              Object.entries(t.order.got).every(
                ([k, n]) => Object.hasOwn(ORDERS[t.order.id].need, k) && is.int(n, 0, 99),
              ))) &&
          is.int(t.last, 0) &&
          is.int(t.done, 0)) ||
        'town',
    });

    /** 这张单子的奖励：县城家具（有了的跳过）和钱。 */
    function reward(w, def) {
      const pieces = [def.decor || []].flat().filter(id => !decor.owns(w, id));
      return pieces.length
        ? { decor: pieces[0], coins: def.coins }
        : { decor: null, coins: def.instead || def.coins };
    }

    /** 阿满在不在跟前（进城那天不在村里）。 */
    function atAman(w, at) {
      people.place(w, at);
      if (isTripDay(w.clock.day)) refuse(W.away_refuse);
      const him = residents.positions(w).find(p => p.id === 'aman');
      const me = people.me(w);
      if (!him?.visible || him.map !== me.map || !near(me, him)) refuse(W.far);
    }

    // 回村那天清早：托捎的货到家；有时带回一张新单子。过期的单子作罢。
    reactions.on(
      'day.started',
      s => {
        const w = s.world,
          day = w.clock.day;
        if (w.town.order && day > w.town.order.due) {
          const def = ORDERS[w.town.order.id];
          core.post(w, { title: W.expired, text: '阿满说：“' + def.lines.late + '”' });
          w.town.order = null;
        }
        if (!isBackDay(day)) return;
        const came = w.town.errands.filter(e => e.day < day - 1);
        if (came.length) {
          for (const e of came) decor.grant(w, e.item);
          w.town.errands = w.town.errands.filter(e => e.day >= day - 1);
          core.post(w, {
            title: '阿满捎回来了',
            text:
              fill(W.arrived, { names: came.map(e => styleOf(e.item).name).join('、') }) +
              '“' +
              ERRANDS[came[0].item].line +
              '”',
          });
        }
        if (w.town.order || (w.town.last && day - w.town.last < R.orderGap) || day < R.orderGap - 1)
          return;
        const season = dateOf(day).season;
        const tier = w.town.done < 2 ? 1 : w.town.done < 5 ? 2 : 3;
        const pool = ORDER_IDS.filter(
          id => ORDERS[id].season === season && ORDERS[id].tier <= tier,
        );
        if (!pool.length) return;
        // 挑哪张照当天的种子算，不抽存档里的随机数（不然后面钓鱼、比鱼抽到的都跟着变）
        const id = pool[Math.floor(noise(w.deals?.seed || 0, day, 977) * pool.length)];
        const def = ORDERS[id];
        w.town.order = { id, due: day + def.days, got: {} };
        w.town.last = day;
        const r = reward(w, def);
        core.post(w, {
          title: W.orderTitle,
          text:
            fill(W.orderText, {
              who: def.who,
              need: needText(def.need),
              days: def.days,
              coins: r.coins,
              extra: r.decor ? '，另送' + styleOf(r.decor).name : '',
            }) +
            '阿满说：“' +
            def.lines.give +
            '”',
        });
      },
      { priority: 36 },
    );

    // 进城那天阿满整天不在村里（夜里也在城里歇）；茶摊上有人说起他
    compute.tap(
      'resident.positions',
      (r, { w, slot }) => {
        if (isTripDay(w.clock.day) && Object.hasOwn(r.value, 'aman')) r.value.aman = null;
      },
      { priority: 30 },
    );
    compute.tap('tea.gossip', (r, { w }) => {
      if (isTripDay(w.clock.day)) r.value = core.stable(W.away, w.clock.day);
    });

    commands.register('town.ask', ({ draft, input, fact }) => {
      const w = draft.world;
      if (!ERRAND_IDS.includes(input.item)) refuse('阿满捎不来这个');
      atAman(w, input.at);
      if (w.town.errands.length >= R.perTrip) refuse(W.full);
      if (decor.owns(w, input.item) || w.town.errands.some(e => e.item === input.item))
        refuse(W.had);
      const coins = styleOf(input.item).price + ERRANDS[input.item].fee;
      store.pay(w, coins, '托阿满捎' + styleOf(input.item).name);
      w.town.errands.push({ item: input.item, day: w.clock.day });
      const lines = W.ask;
      const line = lines[coins >= 120 ? 1 : w.town.errands.length > 1 ? 2 : 0];
      fact('town.asked', { item: input.item, coins, line: '“' + line + '”' });
    });

    commands.register('town.hand', ({ draft, input, fact }) => {
      const w = draft.world;
      atAman(w, input.at);
      const o = w.town.order;
      if (!o) refuse(W.noOrder);
      const def = ORDERS[o.id];
      const kind = ITEMS[input.item] ? kindOf(input.item) : null;
      const left = kind && Object.hasOwn(def.need, kind) ? def.need[kind] - (o.got[kind] || 0) : 0;
      if (left < 1) refuse(W.notNeeded);
      const n = Math.min(left, pack.count(w, people.who(w), input.item));
      if (n < 1) refuse(`身上没带${ITEMS[input.item].name}`);
      pack.use(w, people.who(w), input.item, n, '交给阿满捎进城');
      o.got[kind] = (o.got[kind] || 0) + n;
      const done = Object.entries(def.need).every(([k, need]) => (o.got[k] || 0) >= need);
      let coins = 0;
      let line = `阿满把${ITEMS[input.item].name}${n}份码进板车：“还差的你慢慢凑。”`;
      if (done) {
        const r = reward(w, def);
        coins = r.coins;
        store.earn(w, coins, def.who + '的单子');
        if (r.decor) decor.grant(w, r.decor);
        w.town.order = null;
        w.town.done = Math.min(9999, w.town.done + 1);
        line = '“' + def.lines.done + '”';
      }
      fact('town.handed', { item: input.item, n, done, coins, line });
    });

    // 和阿满说话时多一组「进县城」：看看单子、交单子上的货、托他捎家具
    registerResidentOptions(ctx, 'aman', ({ ask, at, day }) => {
      const t = ask('town');
      /** @type {Array<Record<string, any>>} */
      const rows = [];
      const o = t.order;
      if (o) {
        const left = o.need.filter(x => x.got < x.n);
        rows.push({
          key: 'town.order.' + o.id + '.' + left.length,
          group: '进县城',
          label: '县城的单子',
          line: `“${o.who}的单子：${o.need.map(x => `${x.name}${x.got}/${x.n}`).join('、')}，第${o.due}日前交齐。”`,
        });
        for (const g of ask('goods', at).filter(g => g.carried > 0))
          if (left.some(x => x.item === kindOf(g.id)))
            rows.push({
              key: ['town.hand', day, g.id, g.carried].join('.'),
              group: '进县城',
              label: `交${g.name}（带着${g.carried}份）`,
              icon: g.id,
              confirm: `把${g.name}交给阿满`,
              command: 'town.hand',
              input: { item: g.id },
              result: 'town.handed',
            });
      }
      for (const e of t.offer)
        if (!e.had)
          rows.push({
            key: ['town.ask', day, e.id, t.room].join('.'),
            group: '进县城',
            label: `托捎${e.name} · ${e.coins}文`,
            reason: t.room < 1 ? W.full : '',
            confirm: `托阿满捎${e.name}（货钱加脚钱${e.coins}文）`,
            command: 'town.ask',
            input: { item: e.id },
            result: 'town.asked',
          });
      return rows;
    });

    // 阿满这边的事：今天在不在、托捎了什么、能捎什么、眼下的大单
    queries.define('town', w => {
      const o = w.town.order;
      const def = o && ORDERS[o.id];
      return {
        away: isTripDay(w.clock.day),
        errands: w.town.errands.map(e => e.item),
        offer: ERRAND_IDS.map(id => ({
          id,
          name: styleOf(id).name,
          coins: styleOf(id).price + ERRANDS[id].fee,
          had: decor.owns(w, id) || w.town.errands.some(e => e.item === id),
        })),
        room: R.perTrip - w.town.errands.length,
        order: def
          ? {
              id: o.id,
              who: def.who,
              why: def.why,
              due: o.due,
              need: Object.entries(def.need).map(([item, n]) => ({
                item,
                name: ITEMS[item].name,
                n,
                got: o.got[item] || 0,
              })),
              reward: reward(w, def),
            }
          : null,
      };
    });
  },
};
