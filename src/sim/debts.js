// 欠账的写法（存档检查）和查询 debts 的样子，给 sim/plugins/debts.js 用。
import { is } from '../kernel/schema.js';
import { ON_MAP } from '../content/people.js';
import { EXPENSES } from '../content/purse.js';

const HERO = 'hero';
const PARTY = [HERO, ...ON_MAP];
const STATES = ['open', 'late', 'bad'];
/** 命令 debt.do 能做的几样：开口借、还、讨、借给门口那位、接济。 */
export const KINDS = Object.freeze(['borrow', 'repay', 'dun', 'lend', 'relieve']);

/** 一笔账：谁借给谁（hero 是你）、还欠几文、哪天借的、哪天到期、为了哪笔开销、拖没拖。 */
export const debtOk = (/** @type {any} */ d) =>
  is.obj(d) &&
  is.int(d.id, 1) &&
  PARTY.includes(d.lender) &&
  PARTY.includes(d.borrower) &&
  d.lender !== d.borrower &&
  is.int(d.n, 1, 999) &&
  is.int(d.day, 1) &&
  is.int(d.due, 1) &&
  (d.why === null || Object.hasOwn(EXPENSES, d.why)) &&
  STATES.includes(d.state);

/** 今天站在你院门口等着借钱的那位。 */
export const askOk = (/** @type {any} */ a) =>
  a === null ||
  (is.obj(a) &&
    ON_MAP.includes(a.who) &&
    is.int(a.n, 1, 999) &&
    (a.why === null || Object.hasOwn(EXPENSES, a.why)) &&
    is.int(a.day, 1));

/** 把 {a}、{n} 这样的空填上。 */
export const fill = (/** @type {string} */ text, /** @type {Record<string, any>} */ map) =>
  text.replace(/\{(\w+)\}/g, (m, k) => (k in map ? map[k] : m));

/** 查询 debts：你欠谁、谁欠你（对方、钱数、到期、拖没拖、为了什么），村里互欠几笔，今天谁在门口。 */
export function debtsView(/** @type {any} */ w, /** @type {(id: string) => string} */ name) {
  const G = w.debts;
  const view = (/** @type {any} */ d) => {
    const who = d.lender === HERO ? d.borrower : d.lender;
    const why = d.why ? EXPENSES[d.why].title : null;
    return { who, name: name(who), n: d.n, due: d.due, state: d.state, why };
  };
  const today = G.ask?.day === w.clock.day;
  return {
    owe: G.debts.filter((/** @type {any} */ d) => d.borrower === HERO).map(view),
    owed: G.debts.filter((/** @type {any} */ d) => d.lender === HERO).map(view),
    village: G.debts.filter((/** @type {any} */ d) => d.lender !== HERO && d.borrower !== HERO)
      .length,
    ask: today ? { who: G.ask.who, name: name(G.ask.who), n: G.ask.n } : null,
  };
}
