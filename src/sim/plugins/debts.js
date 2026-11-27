// 借和还（执行方案 M9）。数和话在 content/debts.js，开口借钱、还钱的话在 content/purse-lines.js；
// 接济、顺手拿、传闲话在 sim/plugins/quiet-deeds.js，欠账的写法和查询的样子在 sim/debts.js。
//   清早：到期的守信的自己还（凑不齐先还一点），不守信的拖两天，拖过宽限就是赖账、见闻传开；
//     手头紧的找肯借的借，跟你更近乎（或村里没人借得出）就站到你院门口，见面先开口（'talk.news'）
//   你也能：开口借钱、上门还钱、上门讨债、借给门口那位、接济手头紧的（命令 debt.do）
//   事实 debt.asked、debt.done {kind, who, n, line, notes}、debt.repaid {who, n, line}、debt.welshed
//   查询 debts → 你欠谁、谁欠你、今天谁在门口等；debts.options(w, 谁) 接话里的几行
import { refuse } from '../../kernel/dispatch.js';
import { is } from '../../kernel/schema.js';
import { KINDS, debtOk, askOk, fill, debtsView } from '../debts.js';
import { noise } from '../noise.js';
import { ON_MAP, PEOPLE } from '../../content/people.js';
import { EXPENSES } from '../../content/purse.js';
import { EXPENSE_TEXT, REPAY_LINES } from '../../content/purse-lines.js';
import {
  LEDGER as L,
  LEDGER_GROUP,
  LEND_REPLY,
  ASK_REPLY,
  PAID_BACK,
  YOU_LATE,
  DOOR_NOTES,
  ASK_DOING,
  LEDGER_LABELS as LABEL,
} from '../../content/debts.js';
import { aiOf } from '../deeds.js';

const HERO = 'hero';

export const debts = {
  id: 'sim.debts',
  requires: [
    'schema',
    'commands',
    'queries',
    'reactions',
    'compute',
    'core',
    'people',
    'store',
    'persona',
    'residents',
    'opinion',
    'purse',
    'witness',
    'stress',
  ],
  writes: ['debts'],
  install(ctx) {
    const { schema, commands, queries, reactions, compute, core, people, store } = ctx.services;
    const { persona, residents, opinion, purse, witness, stress } = ctx.services;

    // debts 欠账；seq 欠账编号；ask 今天在你院门口等着借钱的那位；asked 每人上回找你借是哪天
    schema.slice('debts', {
      initial: () => ({ seq: 0, debts: [], ask: null, asked: {} }),
      validate: x =>
        (is.obj(x) &&
          is.int(x.seq, 0) &&
          is.arr(x.debts, L.keepDebts) &&
          x.debts.every(debtOk) &&
          askOk(x.ask) &&
          is.obj(x.asked) &&
          Object.entries(x.asked).every(([k, d]) => ON_MAP.includes(k) && is.int(d, 1))) ||
        'debts',
    });

    /** 便条：DOOR_NOTES 里的一条，填上人名和钱数。 */
    const postNote = (w, key, map) =>
      core.post(w, {
        title: fill(DOOR_NOTES[key].title, map),
        text: fill(DOOR_NOTES[key].text, map),
      });
    const name = id => (id === HERO ? '你' : PEOPLE[id].name);
    /** 这个人手里的钱：你看自家，村民看他那一户。 */
    const coinsOf = (w, id) =>
      id === HERO ? store.coins(w) : purse.coins(w, purse.houseOf(id) || '');
    /** 钱从谁手里到谁手里。 */
    function pass(w, from, to, n, why) {
      if (from === HERO) store.pay(w, n, why);
      else purse.move(w, purse.houseOf(from), -n, why);
      if (to === HERO) store.earn(w, n, why);
      else purse.move(w, purse.houseOf(to), n, why);
    }
    const shortOf = (w, id) => (id === HERO ? null : purse.short(w, purse.houseOf(id) || ''));
    const owes = (w, borrower, lender) =>
      w.debts.debts.find(d => d.borrower === borrower && d.lender === lender);

    function lendWill(w, lender, borrower) {
      const ai = aiOf(persona.get(w, lender));
      return opinion.of(w, lender, borrower).value - ai.greed / 4 + ai.honor / 10 + ai.trust / 10;
    }
    /** 借给多少：借足、一半，或 0。手里要留够 keep。 */
    function lendHow(w, lender, borrower, n) {
      const will = lendWill(w, lender, borrower),
        has = coinsOf(w, lender) - L.keep;
      if (will >= L.lend.full && has >= n) return n;
      const half = Math.ceil(n / 2);
      if (will >= L.lend.half && has >= half) return half;
      return 0;
    }

    function addDebt(w, lender, borrower, n, why) {
      const G = w.debts,
        day = w.clock.day;
      G.seq += 1;
      G.debts.push({ id: G.seq, lender, borrower, n, day, due: day + L.term, why, state: 'open' });
      if (G.debts.length > L.keepDebts) G.debts.splice(0, G.debts.length - L.keepDebts);
    }
    const mapOf = (w, id) =>
      id === HERO ? people.me(w).map : residents.positions(w).find(p => p.id === id)?.map || 'yard';

    function settle(w, d, why) {
      pass(w, d.borrower, d.lender, d.n, why);
      w.debts.debts = w.debts.debts.filter(x => x !== d);
      witness.record(w, {
        who: d.borrower,
        to: d.lender,
        act: 'repay',
        map: mapOf(w, d.borrower),
        seenBy: [],
      });
    }

    /** 守信的到期就还；不守信的拖两天才还（钱够的话）；拖过宽限就是赖账。 */
    function dueDay(w, d, emit) {
      const day = w.clock.day,
        b = d.borrower;
      if (b === HERO) {
        if (day === d.due) postNote(w, 'heroLate', { a: name(d.lender), n: d.n });
        if (day > d.due && d.state === 'open') {
          d.state = 'late';
          opinion.note(w, d.lender, HERO, 'overdue');
        }
        if (day > d.due + L.grace && d.state !== 'bad') {
          d.state = 'bad';
          opinion.note(w, d.lender, HERO, 'welshed');
          witness.record(w, { who: HERO, to: d.lender, act: 'welsh', map: 'tea', seenBy: [] });
          postNote(w, 'heroWelsh', { a: name(d.lender), n: d.n });
        }
        return;
      }
      if (day < d.due) return;
      const ai = aiOf(persona.get(w, b));
      const wait = ai.honor < 0 ? 2 : 0;
      if (day < d.due || d.state === 'bad') return;
      const has = day >= d.due + wait ? coinsOf(w, b) : 0;
      if (has >= d.n) {
        const n = d.n;
        settle(w, d, '还' + name(d.lender) + '的钱');
        opinion.note(w, d.lender, b, 'repaid');
        if (d.lender === HERO) {
          const line = REPAY_LINES[b].repay;
          postNote(w, 'repay', { a: name(b), n, line });
          emit('debt.repaid', { who: b, n, line: `${name(b)}：${line}` });
        }
        return;
      }
      // 凑不齐：守信的有多少先还多少，剩下的接着欠
      if (has > 0 && ai.honor >= 0) {
        pass(w, b, d.lender, has, '先还' + name(d.lender) + '一点');
        d.n -= has;
      }
      if (d.state === 'open') {
        d.state = 'late';
        if (d.lender === HERO)
          postNote(w, 'late', { a: name(b), n: d.n, line: REPAY_LINES[b].late });
      }
      // 拖过宽限就是赖账；厚道的人一直认这笔账，只是慢
      if (day > d.due + L.grace && ai.honor < 30) {
        d.state = 'bad';
        opinion.note(w, d.lender, b, 'welshed');
        witness.record(w, { who: b, to: d.lender, act: 'welsh', map: mapOf(w, b), seenBy: [] });
        if (d.lender === HERO) {
          const line = fill(DOOR_NOTES.welsh.text, { a: name(b), n: d.n });
          postNote(w, 'welsh', { a: name(b), n: d.n });
          emit('debt.welshed', { who: b, line });
        }
      }
    }

    /** 手头紧的村民：先找村里好感最高、肯借的；没人借，又对你有点好感，就到你院门口等。 */
    function needy(w, emit) {
      const G = w.debts,
        day = w.clock.day;
      ON_MAP.forEach((id, i) => {
        const sh = shortOf(w, id);
        if (!sh || G.debts.some(d => d.borrower === id)) return;
        const n = Math.min(L.ask.max, sh.n);
        const canAsk =
          !G.ask &&
          day >= L.ask.from &&
          !(G.asked[id] && day - G.asked[id] < L.ask.again) &&
          opinion.of(w, id, HERO).value >= L.ask.opinion &&
          noise(w.meta.seed, day, 977, i) < L.ask.odds;
        const lenders = ON_MAP.filter(x => x !== id)
          .map(x => ({ x, will: lendWill(w, x, id) }))
          .sort((a, b) => b.will - a.will || ON_MAP.indexOf(a.x) - ON_MAP.indexOf(b.x));
        // 跟你比跟村里谁都近乎，先来找你
        const best = lenders.find(({ x }) => lendHow(w, x, id, n));
        const heroFirst =
          canAsk && (!best || opinion.of(w, id, HERO).value + L.ask.lean >= best.will);
        if (best && !heroFirst) {
          const x = best.x,
            got = lendHow(w, x, id, n);
          pass(w, x, id, got, '借给' + name(id));
          addDebt(w, x, id, got, sh.id);
          opinion.note(w, id, x, 'lent');
          witness.record(w, { who: id, to: x, act: 'borrow', map: mapOf(w, id), seenBy: [] });
          return;
        }
        if (!canAsk) return;
        G.ask = { who: id, n, why: sh.id, day };
        G.asked[id] = day;
        emit('debt.asked', { who: id, line: `${name(id)}${ASK_DOING}` });
      });
    }

    reactions.on(
      'day.started',
      (s, e, emit) => {
        const w = s.world;
        w.debts.ask = null;
        for (const d of [...w.debts.debts]) dueDay(w, d, emit);
        needy(w, emit);
      },
      { priority: 72 },
    );
    // 门口那位：清早到午前站在你院门口
    compute.tap(
      'resident.positions',
      (r, { w, slot }) => {
        const a = w.debts?.ask;
        if (!a || slot === null || slot > 1 || a.day !== w.clock.day) return;
        if (r.waiting === a.who || !r.value[a.who]) return;
        r.value[a.who] = 'yard';
        r.spots[a.who] = 'gate.1';
        r.doing[a.who] = ASK_DOING;
      },
      { priority: 52 },
    );

    compute.tap(
      'talk.news',
      (r, { w, to }) => {
        const G = w.debts;
        if (!G) return;
        if (G.ask?.who === to && G.ask.day === w.clock.day) {
          const known = opinion.of(w, to, HERO).value >= 15 ? 0 : 1;
          const ask = G.ask.why ? EXPENSE_TEXT[G.ask.why].ask[known] : null;
          if (ask) r.value = ask;
          return;
        }
        const mine = owes(w, HERO, to);
        if (mine && mine.state !== 'open') r.value = YOU_LATE[to];
      },
      { priority: 86 },
    );

    function near(w, to) {
      const p = residents.positions(w).find(x => x.id === to);
      return !!p?.visible && p.map === people.me(w).map;
    }

    function rows(w, to) {
      const out = [];
      const G = w.debts;
      const row = (kind, label, input, reason = '') => ({
        key: `debt.${kind}.${input.n ?? ''}`,
        group: LEDGER_GROUP,
        label,
        reason,
        command: 'debt.do',
        input: { kind, to, ...input },
        result: 'debt.done',
      });
      if (G.ask?.who === to && G.ask.day === w.clock.day) {
        const n = G.ask.n,
          half = Math.ceil(n / 2);
        const poor = m => (store.coins(w) < m ? `钱不够，要${m}文` : '');
        out.push(row('lend', fill(LABEL.lendFull, { n }), { n }, poor(n)));
        if (half < n) out.push(row('lend', LABEL.lendHalf, { n: half }, poor(half)));
        out.push(row('lend', LABEL.lendNone, { n: 0 }));
      }
      const mine = owes(w, HERO, to);
      if (mine) {
        const reason = store.coins(w) < mine.n ? `钱不够，要${mine.n}文` : '';
        out.push(row('repay', fill(LABEL.repay, { n: mine.n }), {}, reason));
      } else if (!shortOf(w, to)) {
        for (const n of L.hero) out.push(row('borrow', fill(LABEL.borrow, { n }), { n }));
      }
      const theirs = owes(w, to, HERO);
      if (theirs && w.clock.day >= theirs.due)
        out.push(row('dun', fill(LABEL.dun, { n: theirs.n }), {}));
      if (shortOf(w, to)) {
        const n = L.relief.hero;
        out.push(
          row(
            'relieve',
            fill(LABEL.relieve, { n }),
            {},
            store.coins(w) < n ? `钱不够，要${n}文` : '',
          ),
        );
      }
      return out;
    }
    queries.define('debts.options', (w, to) => (ON_MAP.includes(to) ? rows(w, to) : []));
    compute.tap('resident.options', (list, { person, ask }) => {
      list.push(...ask('debts.options', person.id));
    });

    commands.register('debt.do', ({ draft, input, fact }) => {
      const w = draft.world,
        G = w.debts;
      const { kind, to } = input || {};
      if (!KINDS.includes(kind)) refuse('没有这种事');
      if (!ON_MAP.includes(to)) refuse('没有这个人');
      if (!near(w, to)) refuse(`${name(to)}不在跟前`);
      const notes = [];
      let line = '',
        n = 0;
      if (kind === 'borrow') {
        n = input.n;
        if (!L.hero.includes(n)) refuse('借多少说不清');
        if (owes(w, HERO, to)) refuse(`还欠着${name(to)}的钱`);
        const got = lendHow(w, to, HERO, n);
        const say = got === n ? 'yes' : got ? 'half' : 'no';
        line = LEND_REPLY[to][say];
        if (got) {
          pass(w, to, HERO, got, '向' + name(to) + '借的');
          addDebt(w, to, HERO, got, null);
          witness.record(w, { who: HERO, to, act: 'borrow', map: mapOf(w, to), seenBy: [] });
          notes.push(`借了${got}文，${L.term}天后还`);
        } else opinion.note(w, HERO, to, 'refused');
        n = got;
      } else if (kind === 'repay') {
        const d = owes(w, HERO, to);
        if (!d) refuse(`不欠${name(to)}的钱`);
        if (store.coins(w) < d.n) refuse(`钱不够，要${d.n}文`);
        n = d.n;
        settle(w, d, '还' + name(to) + '的钱');
        if (d.state === 'open') opinion.note(w, to, HERO, 'repaid');
        line = PAID_BACK[to];
      } else if (kind === 'dun') {
        const d = owes(w, to, HERO);
        if (!d) refuse(`${name(to)}不欠你的钱`);
        if (w.clock.day < d.due) refuse('还没到日子');
        opinion.note(w, to, HERO, 'dunned');
        if (coinsOf(w, to) >= d.n) {
          n = d.n;
          settle(w, d, '还你的钱');
          line = REPAY_LINES[to].paid;
        } else line = REPAY_LINES[to].broke;
        stress.apply(w, HERO, ['confront'], fact);
      } else if (kind === 'lend') {
        const a = G.ask;
        if (a?.who !== to || a.day !== w.clock.day) refuse(`${name(to)}没开口借钱`);
        n = input.n;
        const half = Math.ceil(a.n / 2);
        if (![a.n, half, 0].includes(n)) refuse('借多少说不清');
        if (store.coins(w) < n) refuse(`钱不够，要${n}文`);
        const say = n === a.n ? 'full' : n ? 'half' : 'none';
        line = ASK_REPLY[to][say];
        if (n) {
          pass(w, HERO, to, n, '借给' + name(to));
          addDebt(w, HERO, to, n, a.why);
          opinion.note(w, to, HERO, 'lent');
          stress.apply(w, HERO, ['help'], fact);
          notes.push(`借出${n}文，${L.term}天后到期`);
        } else {
          opinion.note(w, to, HERO, 'refused');
          stress.apply(w, HERO, ['refuse'], fact);
        }
        G.ask = null;
      } else {
        n = L.relief.hero;
        if (!shortOf(w, to)) refuse(`${name(to)}眼下不缺钱`);
        if (store.coins(w) < n) refuse(`钱不够，要${n}文`);
        pass(w, HERO, to, n, '接济' + name(to));
        opinion.note(w, to, HERO, 'relieved');
        witness.record(w, { who: HERO, to, act: 'relief', map: mapOf(w, to) });
        stress.apply(w, HERO, ['help', 'gift'], fact);
        line = ASK_REPLY[to].full;
      }
      fact('debt.done', { kind, who: to, n, line, notes });
    });

    queries.define('debts', w => debtsView(w, name));
  },
};
