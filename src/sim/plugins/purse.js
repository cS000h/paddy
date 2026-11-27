// 家底：村里另外几户和杂货铺钱匣的钱、年景和手头紧的那一笔。玩家家里的钱照旧归 sim.household。
// 每天清早按营生和年景进出一点钱；有时碰上一笔大开销（修船、抓药），钱不够的那一截记成「手头紧」，
// 以后进的钱先填它。换季那天按上一季的天气和一点运气重定年景。玩家在杂货铺买卖，钱从铺子的钱匣进出。
// 随机都用「固定的随机」（sim/noise.js）：不动存档里的随机数，家底的事不会把别处的收成带偏。
//   服务 purse.houseOf(人) → 户、purse.coins(w, 户)、purse.short(w, 户)、purse.fortune(w, 户)、
//        purse.move(w, 户, 加减, 缘由) → 实际动了多少（钱不够时只给到 0）
//   查询 purse → 各户叫什么、什么营生、年景怎样、是不是手头紧（钱数只有自己家的看得见，在 home 里）
//   事实 purse.spent {house, id, title, n, short}、purse.fortune {house, fortune, word, line}
import { is } from '../../kernel/schema.js';
import { noise } from '../noise.js';
import { dateOf, isFairDay } from '../../content/calendar.js';
import {
  HOUSES,
  TRADES,
  EXPENSES,
  EXPENSE_SIZE,
  EXPENSE_ODDS,
  SPENT_KEEP,
  fortuneWord,
} from '../../content/purse.js';
import { FORTUNE_LINES } from '../../content/purse-lines.js';

const IDS = Object.keys(HOUSES);
const MAX_COINS = 1e6;
const houseOk = (/** @type {any} */ h) =>
  is.obj(h) &&
  is.int(h.coins, 0, MAX_COINS) &&
  is.int(h.fortune, -2, 2) &&
  (h.short === null ||
    (is.obj(h.short) &&
      Object.hasOwn(EXPENSES, h.short.id) &&
      is.int(h.short.n, 1, MAX_COINS) &&
      is.int(h.short.day, 1)));
const spentOk = (/** @type {any} */ x) =>
  is.obj(x) &&
  IDS.includes(x.house) &&
  Object.hasOwn(EXPENSES, x.id) &&
  is.int(x.day, 1) &&
  is.int(x.n, 1, MAX_COINS);

/** 一季的天气攒成几档年景：下雨的日子离营生最喜欢的差得越多越差，大雨天扣，再看换到的这一季。 */
function fortuneOf(/** @type {any} */ t, /** @type {any} */ tally, season, luck) {
  let n = luck;
  if (t.wet !== undefined) n -= Math.abs(tally.wet - t.wet) / 4;
  if (t.heavy) n -= tally.heavy * t.heavy;
  if (t.seasons) n += t.seasons[season];
  return Math.max(-2, Math.min(2, Math.round(n)));
}

export const purse = {
  id: 'sim.purse',
  provides: ['purse'],
  requires: ['schema', 'queries', 'reactions', 'weather'],
  writes: ['purses'],
  install(ctx) {
    const { schema, queries, reactions, weather } = ctx.services;

    schema.slice('purses', {
      initial: () => ({
        houses: Object.fromEntries(
          IDS.map(id => [id, { coins: HOUSES[id].coins, fortune: 0, short: null }]),
        ),
        tally: { wet: 0, heavy: 0 },
        spent: [],
      }),
      validate: p =>
        (is.obj(p) &&
          is.keyedBy(p.houses, IDS) &&
          Object.values(p.houses).every(houseOk) &&
          is.obj(p.tally) &&
          is.int(p.tally.wet, 0, 99) &&
          is.int(p.tally.heavy, 0, 99) &&
          is.arr(p.spent, SPENT_KEEP) &&
          p.spent.every(spentOk)) ||
        'purses',
    });

    const houseOf = (/** @type {string} */ who) =>
      IDS.find(id => HOUSES[id].members.includes(who)) || null;
    const coins = (w, id) => w.purses.houses[id]?.coins ?? 0;
    const short = (w, id) => w.purses.houses[id]?.short ?? null;
    const fortune = (w, id) => w.purses.houses[id]?.fortune ?? 0;

    /** 进钱先填手头紧的那一截；出钱最多出到 0。返回实际动了多少。 */
    function move(w, id, n, why = null) {
      const h = w.purses.houses[id];
      if (!h || !Number.isInteger(n) || !n) return 0;
      if (n < 0) {
        const out = Math.min(h.coins, -n);
        h.coins -= out;
        return -out;
      }
      let left = n;
      if (h.short) {
        const fill = Math.min(h.short.n, left);
        h.short.n -= fill;
        left -= fill;
        if (!h.short.n) h.short = null;
      }
      h.coins = Math.min(MAX_COINS, h.coins + left);
      void why; // 缘由先不记；村志工具从事实里看
      return n;
    }

    /** 碰上一笔大开销：钱够就付，不够的记成手头紧。 */
    function spend(w, id, exp, emit) {
      const h = w.purses.houses[id],
        n = EXPENSE_SIZE[EXPENSES[exp].size];
      const paid = Math.min(h.coins, n);
      h.coins -= paid;
      if (paid < n) h.short = { id: exp, n: n - paid, day: w.clock.day };
      const list = w.purses.spent;
      list.push({ house: id, id: exp, day: w.clock.day, n });
      if (list.length > SPENT_KEEP) list.splice(0, list.length - SPENT_KEEP);
      emit('purse.spent', {
        house: id,
        id: exp,
        title: EXPENSES[exp].title,
        n,
        short: n - paid,
      });
    }

    function pickExpense(w, id, i) {
      const season = dateOf(w.clock.day).season,
        wet = weather.has(w, 'wet');
      /** @type {Array<[string, number]>} */
      const pool = Object.entries(/** @type {Record<string, any>} */ (EXPENSES))
        .filter(
          ([, e]) =>
            (e.house === id || e.house === null) &&
            (!e.seasons || e.seasons.includes(season)) &&
            (!e.poor || w.purses.houses[id].fortune <= -2),
        )
        .map(([k, e]) => [k, (e.house ? 2 : 1) * (wet && e.wet ? 2 : 1)]);
      const total = pool.reduce((n, [, x]) => n + x, 0);
      let roll = noise(w.meta.seed, w.clock.day, 811, i) * total;
      for (const [k, x] of pool) if ((roll -= x) < 0) return k;
      return pool[pool.length - 1][0];
    }

    // 清早：先看是不是换季（按上一季的天气定年景），再记今天的天气，最后各户进出钱、碰大开销。
    reactions.on(
      'day.started',
      (s, e, emit) => {
        const w = s.world,
          p = w.purses,
          d = dateOf(w.clock.day);
        if (d.dayOfSeason === 1 && w.clock.day > 1) {
          IDS.forEach((id, i) => {
            const luck = Math.floor(noise(w.meta.seed, w.clock.day, 733, i) * 3) - 1;
            const n = fortuneOf(TRADES[HOUSES[id].trade], p.tally, d.season, luck);
            p.houses[id].fortune = n;
            const say = n > 0 ? 'good' : n < 0 ? 'bad' : null;
            const line = say ? FORTUNE_LINES[id][say] : null;
            emit('purse.fortune', { house: id, fortune: n, word: fortuneWord(n), line });
          });
          p.tally = { wet: 0, heavy: 0 };
        }
        if (weather.has(w, 'wet')) p.tally.wet = Math.min(99, p.tally.wet + 1);
        if (weather.has(w, 'heavy')) p.tally.heavy = Math.min(99, p.tally.heavy + 1);
        const fair = isFairDay(w.clock.day);
        IDS.forEach((id, i) => {
          const h = p.houses[id],
            t = TRADES[HOUSES[id].trade];
          const jitter = Math.floor(noise(w.meta.seed, w.clock.day, 701, i) * 3) - 1;
          const earn = Math.max(0, t.earn + h.fortune * t.swing + (fair ? t.fair || 0 : 0));
          move(w, id, earn + jitter > 0 ? earn + jitter : 0);
          move(w, id, -t.spend);
          if (h.short) return;
          const odds = EXPENSE_ODDS.base + Math.max(0, -h.fortune) * EXPENSE_ODDS.bad;
          if (noise(w.meta.seed, w.clock.day, 757, i) < odds)
            spend(w, id, pickExpense(w, id, i), emit);
        });
      },
      { priority: 40 },
    );

    // 玩家在杂货铺买卖：钱匣进出。茶摊是另一回事，不算进铺子。
    reactions.on('market.bought', (s, e) => {
      if (e.data.shop === 'market') move(s.world, 'shop', e.data.price);
    });
    reactions.on('market.sold', (s, e) => {
      if (e.data.shop === 'market') move(s.world, 'shop', -e.data.coins);
    });

    queries.define('purse', w =>
      IDS.map(id => {
        const h = w.purses.houses[id];
        return {
          id,
          name: HOUSES[id].name,
          members: [...HOUSES[id].members],
          trade: TRADES[HOUSES[id].trade].name,
          fortune: h.fortune,
          fortuneWord: fortuneWord(h.fortune),
          short: h.short ? EXPENSES[h.short.id].title : null,
        };
      }),
    );

    ctx.provide('purse', Object.freeze({ houseOf, coins, short, fortune, move: ctx.own(move) }));
  },
};
