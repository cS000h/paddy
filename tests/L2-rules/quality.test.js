// L2 规则：收成出彩。收菜时抽一下，多半寻常、隔一阵出极品；把握摆在看地照料里，是哪几样加减的一看便知；
// 连着没出，下一回把握大一截；极品下锅认原来那样、火候宽一截，送人多记一笔。一律通过端口发命令。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, must, carried } from '../helpers.js';
import { FINE_CHANCE, FIELD_ODDS, FINE_HEAT } from '../../src/content/quality.js';
import { FIRE } from '../../src/content/cook-fire.js';

const WELL_AT = { x: 18, y: 18, at: { x: 17, y: 18, dir: 'right' } };
const STOVE = { x: 10, y: 11, dir: 'up' };
const spotAt = x => ({ x, y: 19, at: { x, y: 18, dir: 'down' } });
const SPOTS = [6, 7, 8, 9, 10, 11].map(spotAt);
const odds = (g, s) => g.ask('farm.detail', s.x, s.y).odds;
const part = (o, id) => o.parts.find(p => p.id === id);

/** 浇一格；水壶空了先去井边灌满。 */
function water(g, s) {
  if (g.dispatch('farm.water', s).ok) return;
  must(g, 'farm.refill', WELL_AT);
  must(g, 'farm.water', s);
}

/** 种下一排青菜，照料到熟，一格格收；返回每一格收菜的事实。 */
function harvestRow(g) {
  for (const s of SPOTS) {
    must(g, 'farm.till', s);
    must(g, 'farm.sow', s);
    water(g, s);
  }
  for (let day = 0; day < 8 && !SPOTS.every(s => g.ask('farm.detail', s.x, s.y).age >= 3); day++) {
    for (const s of SPOTS) if (g.ask('farm.detail', s.x, s.y).water < 14) water(g, s);
    must(g, 'sleep');
  }
  return SPOTS.map(s => {
    const before = odds(g, s);
    const fact = g.dispatch('farm.harvest', s).facts.find(f => f.type === 'crop.harvested');
    return { before, ...fact.data };
  });
}

test('看地照料写出极品的把握：底子、地力、干湿、本事、持家一样样列着，加起来就是把握', () => {
  const g = newGame();
  const [wet, dry] = [spotAt(6), spotAt(8)];
  must(g, 'farm.till', wet);
  must(g, 'farm.sow', wet);
  must(g, 'farm.water', wet);
  must(g, 'farm.till', dry);
  must(g, 'farm.sow', dry);
  const o = odds(g, wet);
  assert.deepEqual(part(o, 'base'), { id: 'base', label: '底子', delta: FINE_CHANCE.base });
  assert.deepEqual(part(o, 'field.fert'), {
    id: 'field.fert',
    label: '地力6',
    delta: FIELD_ODDS.fert,
  });
  assert.equal(part(o, 'field.moist').delta, FIELD_ODDS.moist);
  // 持家正好是底子 4 时不加不减，明细里就不列
  assert.ok(!part(o, 'attr.chijia') || /^持家\d+$/.test(part(o, 'attr.chijia').label));
  assert.equal(
    o.value,
    o.parts.reduce((n, p) => n + p.delta, 0),
    '没到顶也没到底，明细加起来就是把握',
  );
  const d = odds(g, dry);
  assert.equal(part(d, 'field.dry').label, '土干了');
  assert.equal(part(d, 'field.moist'), undefined);
  assert.equal(o.value - d.value, FIELD_ODDS.moist - FIELD_ODDS.dry, '浇透了比干着把握大');
  assert.equal(g.ask('farm.detail', 12, 19), null, '没锄过的地没有这一说');
});

test('收菜时抽一下：有寻常的也有极品，极品进了行囊、飘的是「极品青菜」；连着没出把握一回比一回大', () => {
  const g = newGame();
  const got = harvestRow(g);
  const fine = got.filter(f => f.fine);
  assert.ok(fine.length >= 1 && fine.length < got.length, '六格里有寻常的也有极品');
  for (const f of got) assert.equal(f.item, f.fine ? 'veg.qingcai.fine' : 'veg.qingcai');
  // 头一回收到极品，借这一回说说它有什么用；以后不再说
  assert.match(fine[0].line, /^头一回收到极品青菜！卖价是寻常的两倍/);
  assert.ok(got.filter(f => f !== fine[0]).every(f => f.line === null));
  const n = fine.reduce((sum, f) => sum + f.n, 0);
  assert.equal(carried(g, 'veg.qingcai.fine'), n);
  const ledger = g.ask('ledger').filter(e => e.k === 'pack:veg.qingcai.fine');
  assert.ok(ledger.length && ledger.every(e => e.text.startsWith('极品青菜 +')));
  // 收到寻常的，下一格把握多一截；收到极品，回数清零
  got.forEach((f, i) => {
    const next = got[i + 1];
    if (!next) return;
    const miss = part(next.before, 'miss');
    if (f.fine) assert.equal(miss, undefined, '出了极品就从头记');
    else assert.ok(miss && miss.delta >= FINE_CHANCE.miss && miss.label.startsWith('连着'));
  });
  // 收到过哪几样极品记在存档里
  assert.deepEqual(Object.keys(g.save().state.world.quality.hero.found), ['veg.qingcai.fine']);
});

test('极品下锅：菜名、性味照原来那样，火候宽一截；用掉的是极品那一份', () => {
  const g = newGame();
  harvestRow(g);
  const fine = { items: ['veg.qingcai.fine'], method: 'fry', at: STOVE };
  const plain = { ...fine, items: ['veg.qingcai'] };
  const [a, b] = [g.ask('cook.preview', fine), g.ask('cook.preview', plain)];
  assert.deepEqual([a.base, a.buff, a.ingredients], [b.base, b.buff, ['veg.qingcai']]);
  assert.equal(a.fire.bonus, b.fire.bonus + FINE_HEAT);
  assert.equal(a.plan.colorLong, b.plan.colorLong + FINE_HEAT * FIRE.widen);
  assert.ok(a.notes.includes('极品青菜：火候好拿捏些'));
  assert.equal(
    g.ask('cook.preview', { ...fine, items: ['veg.qingcai', 'veg.qingcai.fine'] }).ok,
    false,
  );
  const [f0, p0] = [carried(g, 'veg.qingcai.fine'), carried(g, 'veg.qingcai')];
  must(g, 'cook', fine);
  assert.deepEqual([carried(g, 'veg.qingcai.fine'), carried(g, 'veg.qingcai')], [f0 - 1, p0]);
});

test('送人：极品照原来那样看合不合心意，对方多记一笔「送的是极品」', () => {
  const g = newGame();
  harvestRow(g);
  const out = g.dispatch('gift', { to: 'gui', item: 'veg.qingcai.fine' });
  assert.equal(out.ok, true);
  const given = out.facts.find(f => f.type === 'gift.given').data;
  assert.equal(given.fine, true);
  const why = g.ask('opinion', 'gui').parts.find(p => p.id === 'why.fine');
  assert.deepEqual([why.label, why.delta], ['送的是极品', 5]);
});
