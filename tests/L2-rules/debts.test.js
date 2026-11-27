// L2-28 借、还、帮、传、拿（第 3 块，执行方案 M9）：你能找处得来的村民借钱、按日子还；手头紧的村民
// 先找你或村里人借，站到你院门口开口（全村隔几天才有一回），你借足、借一半或不借，不借不记仇；
// 欠你的到日子自己送来、还捎点东西，不守信的拖着，拖过宽限拿东西抵了账；村民之间拖久了才赖账；
// 大方的悄悄接济；心烦又缺钱、不守信的趁铺子没人顺手拿，厚道的从不拿；茶摊上的闲话你听得到，也能说给人听。
// 一律通过端口发命令、问查询；要搭的场面从存档里摆好再读进来。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../../src/port/game.js';
import { newGame, must, refused } from '../helpers.js';
import {
  LEDGER,
  LEND_REPLY,
  ASK_REPLY,
  PAID_BACK,
  PAY_YOU,
  YOU_LATE,
  LISTEN,
  LEDGER_DOINGS,
} from '../../src/content/debts.js';
import { EXPENSE_TEXT } from '../../src/content/purse-lines.js';
import { ITEMS } from '../../src/content/pantry.js';
import { WHY } from '../../src/content/opinion.js';
import { ON_MAP } from '../../src/content/people.js';

const SHEET = { reason: 'keeper', keepsake: 'sickle', family: 'poor', friend: 'gui' };
const fresh = (seed = 1) => {
  const g = newGame(seed);
  must(g, 'origin.settle', SHEET);
  return g;
};
function staged(g, change) {
  const save = structuredClone(g.save());
  change(save.state.world);
  return createGame({ saved: save, debug: true });
}
const act = (g, type, input = {}) => {
  const out = g.dispatch(type, input);
  assert.equal(out.ok, true, `${type}：${out.reason}`);
  return out;
};
const fact = (out, type) => out.facts.find(f => f.type === type)?.data;
const where = (g, id) => g.ask('residents').find(p => p.id === id);
/** 站到那人那张图上。 */
const beside = (g, id) => {
  const p = where(g, id);
  return staged(g, w =>
    Object.assign(w.people.hero, { map: p.map, x: p.x, y: p.y + 1, dir: 'up' }),
  );
};
const sleepDays = (g, n) => {
  const facts = [];
  for (let i = 0; i < n; i++) facts.push(...act(g, 'sleep').facts);
  return facts;
};
const itemN = (g, id) => g.ask('home').items.find(x => x.id === id)?.n || 0;
const witnessed = (g, act2) => g.save().state.world.witness.list.filter(x => x.act === act2);
/** 除了这几户，别家都穷得借不出钱。 */
const poorBut = (w, keep = []) => {
  for (const [id, h] of Object.entries(w.purses.houses)) if (!keep.includes(id)) h.coins = 2;
};

test('数据对得上：六位村民的话都齐，来由都在好感表里', () => {
  for (const id of ON_MAP) {
    for (const t of [LEND_REPLY, ASK_REPLY]) assert.equal(Object.keys(t[id]).length, 3, id);
    assert.ok(PAID_BACK[id] && YOU_LATE[id] && PAY_YOU[id].repay && PAY_YOU[id].dunned, id);
    assert.ok(ITEMS[PAY_YOU[id].gift] && PAY_YOU[id].late.length === 2, id);
  }
  for (const k of [
    'lent',
    'repaid',
    'refused',
    'overdue',
    'welshed',
    'dunned',
    'relieved',
    'confided',
    'tattled',
  ])
    assert.ok(WHY[k], k);
  for (const d of Object.values(LEDGER_DOINGS))
    assert.ok(d.line.includes('{b}') || d.line.includes('{place}'));
  for (const t of Object.values(EXPENSE_TEXT)) assert.equal(t.ask.length, 2);
});

test('你找桂嫂借钱：跟前才借得到，借了记账；没还清不能再借；按日子还上，账划掉', () => {
  const g = fresh();
  assert.match(refused(g, 'debt.do', { kind: 'borrow', to: 'yun', n: 20 }), /不在跟前/);
  const h = beside(g, 'gui');
  const coins = h.ask('home').coins;
  const out = act(h, 'debt.do', { kind: 'borrow', to: 'gui', n: 20 });
  const d = fact(out, 'debt.done');
  assert.equal(d.n, 20);
  assert.equal(d.line, LEND_REPLY.gui.yes);
  assert.equal(h.ask('home').coins, coins + 20);
  const [owe] = h.ask('debts').owe;
  assert.equal(owe.who, 'gui');
  assert.equal(owe.due, h.ask('clock').day + LEDGER.term);
  assert.match(refused(h, 'debt.do', { kind: 'borrow', to: 'gui', n: 10 }), /还欠着/);
  const rows = h.ask('debts.options', 'gui').map(r => r.input.kind);
  assert.ok(rows.includes('repay') && !rows.includes('borrow'));
  const back = act(h, 'debt.do', { kind: 'repay', to: 'gui' });
  assert.equal(fact(back, 'debt.done').line, PAID_BACK.gui);
  assert.equal(h.ask('home').coins, coins);
  assert.deepEqual(h.ask('debts').owe, []);
  assert.ok(h.ask('opinion', 'gui').parts.some(p => p.id === 'why.repaid'));
});

test('借了不还：过了日子对方见面就提，拖过宽限茶摊上说你赖账', () => {
  const g = beside(fresh(), 'gui');
  act(g, 'debt.do', { kind: 'borrow', to: 'gui', n: 10 });
  sleepDays(g, LEDGER.term + 1);
  assert.equal(g.ask('debts').owe[0].state, 'late');
  assert.ok(g.ask('opinion', 'gui').parts.some(p => p.id === 'why.overdue'));
  sleepDays(g, LEDGER.grace);
  assert.equal(g.ask('debts').owe[0].state, 'bad');
  assert.ok(g.ask('opinion', 'gui').parts.some(p => p.id === 'why.welshed'));
  assert.ok(witnessed(g, 'welsh').some(x => x.who === 'hero' && x.to === 'gui'));
});

test('阿满手头紧、村里没人借得出：清早站到你院门口开口，借给他，到日子他自己送来', () => {
  let g = fresh();
  sleepDays(g, 3);
  g = staged(g, w => {
    poorBut(w, ['aman']);
    w.purses.houses.aman.coins = 0;
    w.purses.houses.aman.short = { id: 'wheelOff', n: 16, day: w.clock.day };
  });
  let asked = null;
  for (let i = 0; i < 6 && !asked; i++)
    asked = fact({ facts: act(g, 'sleep').facts }, 'debt.asked');
  assert.ok(asked, '阿满没来开口');
  assert.equal(asked.who, 'aman');
  const p = where(g, 'aman');
  assert.equal(p.map, 'yard');
  const n = g.ask('debts').ask.n;
  assert.ok(n > 0 && n <= 16);
  const h = beside(g, 'aman');
  const kinds = h
    .ask('debts.options', 'aman')
    .filter(r => r.input.kind === 'lend')
    .map(r => r.input.n);
  assert.deepEqual(kinds, [n, Math.ceil(n / 2), 0]);
  // 不借也不记仇
  const no = beside(g, 'aman');
  act(no, 'debt.do', { kind: 'lend', to: 'aman', n: 0 });
  assert.ok(!no.ask('opinion', 'aman').parts.some(p => p.id === 'why.refused'));
  const coins = h.ask('home').coins;
  const cabbage = itemN(h, 'cabbage');
  const out = act(h, 'debt.do', { kind: 'lend', to: 'aman', n });
  assert.equal(fact(out, 'debt.done').line, ASK_REPLY.aman.full);
  assert.equal(h.ask('home').coins, coins - n);
  assert.equal(h.ask('debts').owed[0].who, 'aman');
  assert.equal(h.ask('debts').ask, null);
  assert.match(refused(h, 'debt.do', { kind: 'dun', to: 'aman' }), /还没到日子/);
  // 阿满攒够了钱：到日子一早送来
  const rich = staged(h, w => (w.purses.houses.aman.coins = 40));
  const facts = sleepDays(rich, LEDGER.term);
  const repaid = facts.find(f => f.type === 'debt.repaid');
  assert.ok(repaid, '到日子没送来');
  assert.equal(repaid.data.n, n);
  assert.equal(rich.ask('home').coins, coins);
  assert.deepEqual(rich.ask('debts').owed, []);
  assert.equal(itemN(rich, 'cabbage'), cabbage + 1, '还钱没捎白菜');
});

test('上门借钱不扎堆：两家同时手头紧，一周里也只有一位来开口', () => {
  let g = fresh();
  sleepDays(g, 3);
  g = staged(g, w => {
    poorBut(w, ['aman', 'qiao']);
    for (const id of ['aman', 'qiao']) {
      w.purses.houses[id].coins = 0;
      w.purses.houses[id].short = { id: 'wheelOff', n: 16, day: w.clock.day };
    }
  });
  const asks = sleepDays(g, LEDGER.ask.gap - 1).filter(f => f.type === 'debt.asked');
  assert.ok(asks.length <= 1, `来了${asks.length}回`);
});

test('小乔借了钱不守信：到日子拖着，你上门讨她还不上；拖过宽限拿东西抵了账，不赖你的', () => {
  let g = fresh();
  sleepDays(g, 3);
  g = staged(g, w => {
    poorBut(w, ['qiao']);
    w.purses.houses.qiao.coins = 0;
    w.purses.houses.qiao.short = { id: 'tuition', n: 30, day: w.clock.day };
  });
  let asked = null;
  for (let i = 0; i < 8 && !asked; i++)
    asked = fact({ facts: act(g, 'sleep').facts }, 'debt.asked');
  assert.equal(asked?.who, 'qiao');
  const h = beside(g, 'qiao');
  act(h, 'debt.do', { kind: 'lend', to: 'qiao', n: h.ask('debts').ask.n });
  sleepDays(h, LEDGER.term + 1);
  assert.equal(h.ask('debts').owed[0].state, 'late');
  const at = beside(h, 'qiao');
  const dun = act(at, 'debt.do', { kind: 'dun', to: 'qiao' });
  assert.equal(fact(dun, 'debt.done').line, PAY_YOU.qiao.dunned);
  const candy = itemN(at, 'candy');
  const facts = sleepDays(at, LEDGER.grace);
  assert.ok(facts.some(f => f.type === 'debt.repaid' && f.data.who === 'qiao'));
  assert.deepEqual(at.ask('debts').owed, []);
  assert.equal(itemN(at, 'candy'), candy + 2);
  assert.ok(!at.ask('heard').some(x => x.act === 'welsh' && x.who === 'qiao'));
  assert.ok(at.ask('notes').some(n => /抵了账/.test(n.title)));
});

test('村民之间欠钱：不守信的拖过宽限就是赖账，见闻传开', () => {
  const g = staged(fresh(), w => {
    poorBut(w);
    const day = w.clock.day;
    w.debts.seq = 1;
    w.debts.debts = [
      {
        id: 1,
        lender: 'gui',
        borrower: 'qiao',
        n: 900,
        day,
        due: day + 1,
        why: null,
        state: 'open',
      },
    ];
  });
  sleepDays(g, LEDGER.grace + 2);
  const d = g.save().state.world.debts.debts.find(x => x.borrower === 'qiao');
  assert.equal(d?.state, 'bad');
  assert.ok(witnessed(g, 'welsh').some(x => x.who === 'qiao' && x.to === 'gui'));
});

test('村民之间：手头紧的找肯借的借，到日子还；大方的悄悄接济手头紧的那户', () => {
  let g = fresh();
  sleepDays(g, 2);
  g = staged(g, w => {
    w.purses.houses.yun.coins = 0;
    w.purses.houses.yun.short = { id: 'trayMold', n: 8, day: w.clock.day };
    w.debts.asked.yun = w.clock.day; // 刚找过你，这回找村里人
    w.purses.houses.gui.coins = 80;
  });
  sleepDays(g, 1);
  const save = g.save().state.world;
  const debt = save.debts.debts.find(d => d.borrower === 'yun');
  const relief = witnessed(g, 'relief').concat(witnessed(g, 'reliefQuiet'));
  assert.ok(debt || relief.length, '云姑没借着也没人接济');
  if (debt) assert.notEqual(debt.lender, 'hero');
  // 接济：桂嫂大方、手里宽，阿满手头紧又处得来
  let r = staged(g, w => {
    w.debts.debts = [];
    w.purses.houses.aman.coins = 0;
    w.purses.houses.aman.short = { id: 'basketDrop', n: 8, day: w.clock.day };
    w.debts.asked.aman = w.clock.day;
    for (const id of ['shi', 'zhou', 'yun', 'qiao', 'shop']) w.purses.houses[id].coins = 2;
    w.purses.houses.gui.coins = 80;
    w.opinion.notes.push({ from: 'gui', to: 'aman', why: 'lent', n: 30, until: null });
  });
  // 没人借得出（桂嫂好感够但只肯接济时也算）：看接济那一笔
  sleepDays(r, 1);
  const w2 = r.save().state.world;
  assert.ok(
    w2.witness.list.some(x => (x.act === 'relief' || x.act === 'borrow') && x.to === 'aman') ||
      w2.witness.list.some(x => x.act === 'borrow' && x.who === 'aman'),
  );
});

test('你接济手头紧的人：花五文，他记着这份情', () => {
  let g = fresh();
  g = staged(g, w => {
    w.purses.houses.zhou.coins = 0;
    w.purses.houses.zhou.short = { id: 'poleSnap', n: 8, day: w.clock.day };
  });
  const h = beside(g, 'zhou');
  assert.ok(h.ask('debts.options', 'zhou').some(r => r.input.kind === 'relieve'));
  const coins = h.ask('home').coins;
  act(h, 'debt.do', { kind: 'relieve', to: 'zhou' });
  assert.equal(h.ask('home').coins, coins - LEDGER.relief.hero);
  assert.ok(h.ask('opinion', 'zhou').parts.some(p => p.id === 'why.relieved'));
  assert.match(
    refused(beside(fresh(), 'zhou'), 'debt.do', { kind: 'relieve', to: 'zhou' }),
    /不缺钱/,
  );
});

test('顺手拿：心烦又缺钱的小乔趁铺子没人拿几文，第二天你看到便条；厚道的石伯从不拿', () => {
  const g = staged(fresh(), w => {
    for (const id of ['qiao', 'shi']) {
      w.purses.houses[id].coins = 0;
      w.purses.houses[id].short = { id: id === 'qiao' ? 'bookShort' : 'plowChip', n: 20, day: 1 };
      w.persona[id].stress = 60;
    }
    w.debts.asked = { qiao: w.clock.day, shi: w.clock.day };
  });
  const shop = g.save().state.world.purses.houses.shop.coins;
  for (let i = 0; i < 12; i++) act(g, 'clock.advance', { minutes: 30 });
  const took = witnessed(g, 'take');
  assert.ok(
    took.some(x => x.who === 'qiao'),
    '小乔没拿',
  );
  assert.ok(!took.some(x => x.who === 'shi'), '石伯不该拿');
  assert.ok(g.save().state.world.purses.houses.shop.coins < shop);
  assert.ok(!g.ask('heard').some(x => x.act === 'take'), '没人看见，你不知道是谁');
  assert.ok(g.ask('notes').some(n => /钱匣/.test(n.title) && /少了\d+文/.test(n.text)));
});

test('传闲话：茶摊上小乔把别人不想让人知道的事说给你听；你也能说给人听，厚道的人皱眉', () => {
  let g = fresh();
  g = staged(g, w => {
    w.witness.seq += 1;
    w.witness.list.push({
      id: w.witness.seq,
      day: w.clock.day,
      who: 'aman',
      to: 'gui',
      act: 'borrow',
      map: 'yard',
      place: null,
      coping: null,
      secret: true,
      knows: ['aman', 'gui', 'qiao'],
      until: w.clock.day + 20,
    });
  });
  while (where(g, 'qiao').place !== 'tea') act(g, 'clock.advance', { minutes: 30 });
  const t = staged(g, w => Object.assign(w.people.hero, { map: 'tea', x: 17, y: 11, dir: 'up' }));
  const out = act(t, 'tea.do', { kind: 'listen', at: { x: 17, y: 11 } });
  const heard = fact(out, 'gossip.heard');
  assert.ok(heard, '没听到闲话');
  assert.match(heard.line, /凑过来说：.*阿满.*桂嫂/);
  assert.ok(t.ask('heard').some(x => x.act === 'borrow' && x.who === 'aman'));
  // 说给石伯（厚道）听：他皱眉，记你一笔
  const s = beside(t, 'shi');
  const told = act(s, 'gossip.tell', { to: 'shi' });
  const d = fact(told, 'gossip.told');
  assert.ok(d.secret);
  assert.ok(d.notes[0].endsWith(LISTEN.honest.replace('{who}', '阿满')), d.notes[0]);
  assert.ok(s.ask('opinion', 'shi').parts.some(p => p.id === 'why.tattled'));
  assert.match(refused(beside(fresh(), 'zhou'), 'gossip.tell', { to: 'zhou' }), /没什么/);
});
