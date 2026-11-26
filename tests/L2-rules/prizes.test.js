// L2 规则：彩头（Gemini G-06、G-13）。抽中极品之后再按档抽一回彩头，不当季的不出；彩头照原来那样下锅、
// 卖价是寻常的好几倍、送谁都是天大的面子；图谱最后一页是彩头，收到过的画出来。规则测试一律通过端口发命令；
// 出不出彩头太稀罕，在端口外头直接看抽签的那一步（sim/prize-pick.js），其余用改过的存档摆出来。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../../src/port/game.js';
import { newGame, must, carried } from '../helpers.js';
import { ITEMS, plainOf, kindOf } from '../../src/content/items.js';
import { PRIZES, PRIZE_OF, PRIZE_PRICE, prizeId } from '../../src/content/prizes.js';
import { prizeFor } from '../../src/sim/prize-pick.js';

/** 一局新开的，行囊里塞几样东西、图谱里记几样收到过的彩头。 */
function withPrizes(pack = {}, found = {}) {
  const save = structuredClone(newGame().save());
  Object.assign(save.state.world.packs.hero.items, pack);
  Object.assign(save.state.world.quality.hero.found, found);
  return createGame({ saved: save, debug: true });
}

test('十四样彩头各出在一样收成里，按「一年碰得上几回」分档；不当季的不出', () => {
  assert.equal(Object.keys(PRIZES).length, 14);
  assert.equal(new Set(Object.values(PRIZES).map(p => p.item)).size, 14, '一样收成只有一个彩头');
  for (const [id, d] of Object.entries(PRIZES)) {
    assert.ok(ITEMS[prizeId(id)], `${id} 没登记成物品`);
    assert.ok(ITEMS[d.item + '.fine'], `${d.item} 没有极品，彩头抽不到`);
    for (const line of [d.got, d.line, d.clue, ...Object.values(d.say)])
      assert.ok(line.length <= 30, `${id} 的话太长：${line}`);
  }
  // 天天能收的鸡蛋比一年采不了几回的茶叶难出
  assert.ok(PRIZES.doubleYolkEgg.odds < PRIZES.preQingmingTea.odds);
  assert.equal(prizeFor('egg', 1, 0), 'doubleYolkEgg');
  assert.equal(prizeFor('egg', 1, 0.99), null);
  assert.equal(prizeFor('tea', 0, 0), 'preQingmingTea');
  assert.equal(prizeFor('tea', 2, 0), null, '明前雀舌只在春天出');
  assert.equal(prizeFor('rice', 0, 0), null, '没有彩头的东西不出');
  // 只有又大又沉的五样举过头顶（G-13 审稿）
  const lift = Object.keys(PRIZES).filter(id => PRIZES[id].lift);
  assert.deepEqual(lift.sort(), [
    'doubleYolkEgg',
    'goldenCabbage',
    'goldenRedCarp',
    'jadeRadish',
    'pumpkinKing',
  ]);
  assert.equal(PRIZE_OF.pumpkin, 'pumpkinKing');
});

test('彩头照原来那样下锅、送人，卖价是寻常的好几倍，买不到', () => {
  const king = ITEMS['prize.pumpkinKing'];
  assert.equal(king.name, '南瓜王');
  assert.equal(plainOf('prize.pumpkinKing'), 'pumpkin');
  assert.equal(kindOf('prize.goldenRedCarp'), 'fish');
  assert.equal(king.sell, ITEMS.pumpkin.sell * PRIZE_PRICE);
  assert.equal(king.buy, 0);
});

test('送彩头：送谁都是天大的面子，情分照最爱吃的那一道算', () => {
  const g = withPrizes({ 'prize.jadeRadish': 1, radish: 1 });
  const out = g.dispatch('gift', { to: 'aman', item: 'prize.jadeRadish' });
  assert.equal(out.ok, true);
  const given = out.facts.find(f => f.type === 'gift.given').data;
  assert.equal(given.liked, true);
  assert.equal(carried(g, 'prize.jadeRadish'), 0);
  const h = withPrizes({ radish: 1 });
  const plain = h.dispatch('gift', { to: 'aman', item: 'radish' });
  const known = game => game.ask('bonds').find(b => b.id === 'aman').known;
  assert.ok(known(g) > known(h), '送彩头比送寻常萝卜交情深');
  assert.equal(plain.ok, true);
});

test('图谱最后一页是彩头：收到过的画出来、写哪天头回收到，没收到的写线索', () => {
  const g = withPrizes({}, { 'prize.pumpkinKing': 1 });
  const page = g.ask('catalog').at(-1);
  assert.equal(page.id, 'prize');
  assert.deepEqual([page.found, page.total], [1, 14]);
  const king = page.entries.find(e => e.prize === 'pumpkinKing');
  assert.equal(king.found, true);
  assert.match(king.date, /第 1 日/);
  const egg = page.entries.find(e => e.prize === 'doubleYolkEgg');
  assert.deepEqual([egg.found, egg.clue], [false, PRIZES.doubleYolkEgg.clue]);
  must(g, 'sleep');
});
