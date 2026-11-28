import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, must, refused } from '../helpers.js';
import { createGame } from '../../src/port/game.js';
import { ORDERS, TOWN_WORDS } from '../../src/content/town.js';
import { ITEMS } from '../../src/content/items.js';

/** 改存档：钱、橱柜里的东西、日子，读回来一局。 */
function tweak(g, fn) {
  const saved = JSON.parse(JSON.stringify(g.save()));
  fn(saved.state.world);
  return createGame({ saved, debug: true });
}
/** 走到阿满跟前，返回站的格子。 */
function toAman(g) {
  const p = g.ask('residents').find(v => v.id === 'aman');
  assert.ok(p.visible, '阿满在村里');
  if (p.map !== g.ask('hero').map) must(g, 'travel.to', { to: p.map });
  return { x: p.x, y: p.y };
}
const sleepTo = (g, day) => {
  while (g.ask('clock').day < day) must(g, 'sleep');
};

test('托阿满捎县城家具：付货钱加脚钱，进城那天他不在，回村那天清早到家、摆设里就有了；每趟最多两件', () => {
  let g = tweak(newGame(), w => (w.households.home.coins = 1000));
  sleepTo(g, 2);
  const at = toAman(g);
  const rows = g.ask('interaction.options', 'aman', at).filter(r => r.group === '进县城');
  assert.ok(rows.some(r => r.command === 'town.ask' && r.input.item === 'sill.celadon'));
  const coins = g.ask('home').coins;
  must(g, 'town.ask', { item: 'sill.celadon', at });
  assert.equal(g.ask('home').coins, coins - 95 - 8);
  assert.equal(refused(g, 'town.ask', { item: 'sill.celadon', at }), TOWN_WORDS.had);
  must(g, 'town.ask', { item: 'table.lacquer', at });
  assert.equal(refused(g, 'town.ask', { item: 'rug.embroidered', at }), TOWN_WORDS.full);
  must(g, 'sleep'); // 第 3 日：进城
  assert.equal(g.ask('residents').find(v => v.id === 'aman').visible, false, '进城那天不在村里');
  assert.equal(g.ask('decor').sill.styles.find(s => s.id === 'celadon').owned, false);
  must(g, 'sleep'); // 第 4 日：回村
  assert.ok(g.ask('decor').sill.styles.find(s => s.id === 'celadon').owned, '青瓷梅瓶到家了');
  assert.ok(g.ask('notes', 4).some(n => n.title === '阿满捎回来了'));
  assert.deepEqual(g.ask('town').errands, []);
  g = tweak(g, () => {});
  assert.ok(g.ask('decor').table.styles.find(s => s.id === 'lacquer').owned);
});

test('县城大单：回村那天清早递来，分几回交给阿满，交齐给钱和县城家具；过期作罢不罚', () => {
  let g = newGame();
  sleepTo(g, 9);
  const o = g.ask('town').order;
  assert.ok(o, '第 9 日阿满带回一张单子');
  assert.equal(ORDERS[o.id].tier, 1, '头几张是容易的');
  assert.ok(g.ask('notes', 9).some(n => n.title === TOWN_WORDS.orderTitle));
  // 把单子上要的东西放进行囊（各备够数），分两回交
  g = tweak(g, w => {
    for (const x of o.need) w.packs.hero.items[x.item] = x.n;
    w.packs.hero.cap = 12;
    w.packs.hero.items = Object.fromEntries(o.need.map(x => [x.item, x.n]));
  });
  const at = toAman(g);
  const coins = g.ask('home').coins;
  const [first, ...rest] = o.need;
  must(g, 'town.hand', { item: first.item, at });
  assert.equal(g.ask('town').order.need[0].got, first.n);
  assert.equal(refused(g, 'town.hand', { item: first.item, at }), TOWN_WORDS.notNeeded);
  for (const x of rest) must(g, 'town.hand', { item: x.item, at });
  assert.equal(g.ask('town').order, null);
  assert.equal(g.ask('home').coins, coins + o.reward.coins);
  // 下一张至少十天以后；放着不交就过期
  sleepTo(g, 19);
  const next = g.ask('town').order;
  if (next) {
    sleepTo(g, next.due + 1);
    assert.equal(g.ask('town').order, null);
    assert.ok(g.ask('notes', next.due + 1).some(n => n.title === TOWN_WORDS.expired));
  }
});

test('大单的东西游戏里都有，当季会来，奖励比零卖多一些但不到两倍', () => {
  for (const [id, o] of Object.entries(ORDERS)) {
    let sell = 0;
    for (const [item, n] of Object.entries(o.need)) {
      assert.ok(ITEMS[item], `${id} 要的 ${item} 是游戏里有的东西`);
      sell += ITEMS[item].sell * n;
    }
    assert.ok(o.coins > sell && o.coins < sell * 2, `${id}：零卖 ${sell}，给 ${o.coins}`);
    if (o.instead) assert.ok(o.instead > o.coins && o.instead < sell * 2, `${id} 有了家具改给的钱`);
    for (const d of [o.decor || []].flat()) assert.ok(d.split('.').length === 2, d);
  }
});
