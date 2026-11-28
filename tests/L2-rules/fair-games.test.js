import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, must, refused, stocked, carried } from '../helpers.js';
import { FAIR_GAMES } from '../../src/content/fair-games.js';

const play = (g, type, input, fact) => {
  const out = g.dispatch(type, input);
  assert.ok(out.ok, out.reason);
  return out.facts.find(f => f.type === fact).data;
};

/** 一直睡到某个摊子在集日摆出来，回到那个摊位跟前；返回 {g, at}。 */
function fairWith(id, items = {}) {
  let g = newGame();
  for (let n = 0; n < 80; n++) {
    must(g, 'sleep');
    const day = g.ask('clock').day;
    const spot = g.ask('stalls').indexOf(id);
    if (day % 5 === 0 && spot >= 0) {
      g = stocked(g, items);
      for (const [item, k] of Object.entries(items))
        must(g, 'pack.put', { item, n: k, at: { x: 8, y: 11 } });
      must(g, 'travel.to', { to: 'market' });
      return { g, at: { x: [8, 14, 20][spot], y: 17 } };
    }
  }
  throw new Error(id + ' 一直没在集日摆出来');
}

test('肉摊猜斤两：集日、人在摊前才玩，押两文，猜中退押钱得肉，猜偏了得葱；一天一回', () => {
  const { g, at } = fairWith('meat');
  assert.match(refused(g, 'fair.guess', { choice: 'right', at: { x: 2, y: 13 } }), /跟前/);
  assert.match(refused(g, 'fair.guess', { choice: 'maybe', at }), /偏轻/);
  const coins = g.ask('home').coins;
  const pork = carried(g, 'pork');
  const f = play(g, 'fair.guess', { choice: 'right', at }, 'fair.guessed');
  if (f.win) {
    assert.equal(g.ask('home').coins, coins);
    assert.equal(carried(g, 'pork'), pork + 1);
  } else {
    assert.equal(g.ask('home').coins, coins - FAIR_GAMES.meat.cost);
    assert.ok(carried(g, 'scallion') >= FAIR_GAMES.meat.lose.n);
  }
  assert.equal(refused(g, 'fair.guess', { choice: 'right', at }), FAIR_GAMES.meat.lines.done);
  assert.ok(g.ask('fair.game', 'meat', at).reason);
});

test('菜苗摊比大瓜：拿行囊里的大菜上秤，菜还归你；压过榜首得菜种，没压过得葱；不能称的不收', () => {
  const { g, at } = fairWith('veg', { pumpkin: 1, rice: 1 });
  assert.match(refused(g, 'fair.weigh', { item: 'rice', at }), /上不了秤/);
  assert.equal(g.ask('fair.game', 'veg', at).reason, '');
  const f = play(g, 'fair.weigh', { item: 'pumpkin', at }, 'fair.weighed');
  assert.match(f.weight, /斤/);
  assert.equal(carried(g, 'pumpkin'), 1, '称完还归你');
  if (!f.win) assert.ok(carried(g, 'scallion') >= 1);
  assert.equal(refused(g, 'fair.weigh', { item: 'pumpkin', at }), FAIR_GAMES.veg.lines.done);
});

test('不是集日没有小玩意', () => {
  const g = newGame();
  assert.match(g.ask('fair.game', 'meat').reason, /集日/);
  assert.equal(g.ask('fair.game', 'fish'), null);
});
