import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, must, refused } from '../helpers.js';
import { createGame } from '../../src/port/game.js';
import { DECOR } from '../../src/content/furniture.js';
import { FURNITURE_SKETCHES } from '../../src/art/furniture-sketches.js';
import { DECOR_OBJECT_OF } from '../../src/art/furniture.js';

/** 一局有钱的新游戏，人站在小屋里挂轴跟前。 */
function inCottage(coins = 500) {
  const saved = JSON.parse(JSON.stringify(newGame().save()));
  saved.state.world.households.home.coins = coins;
  const g = createGame({ saved, debug: true });
  must(g, 'travel.to', { to: 'cottage' });
  return { g, at: { x: 10, y: 5, dir: 'up' } };
}

test('小屋摆设：托人置办一样当场换上、花掉那么多钱；收着的随时换回原样再换回来；不加任何数值', () => {
  const { g, at } = inCottage();
  const coins = g.ask('home').coins;
  const body = () => {
    const { energy, energyMax } = g.ask('hero');
    return JSON.stringify({ energy, energyMax, body: g.ask('body') });
  };
  const before = body();
  must(g, 'decor.buy', { slot: 'bed', style: 'quilt', at });
  assert.equal(g.ask('home').coins, coins - DECOR.bed.styles.quilt.price);
  assert.equal(g.ask('decor').bed.on, 'quilt');
  assert.equal(body(), before, '力气、心情都没变');
  assert.equal(refused(g, 'decor.buy', { slot: 'bed', style: 'quilt', at }), '这样已经有了');
  assert.equal(refused(g, 'decor.set', { slot: 'bed', style: 'quilt', at }), '现在摆的就是这样');
  must(g, 'decor.set', { slot: 'bed', style: 'default', at });
  assert.equal(g.ask('decor').bed.on, 'default');
  must(g, 'decor.set', { slot: 'bed', style: 'quilt', at });
  assert.equal(refused(g, 'decor.set', { slot: 'rug', style: 'stripe', at }), '这样还没置办');
  assert.match(refused(g, 'decor.buy', { slot: 'rug', style: 'embroidered', at }), /阿满/);
  assert.equal(refused(g, 'decor.buy', { slot: 'sofa', style: 'x', at }), '没有这样摆设');
  const saved = g.save().state.world.decor;
  assert.deepEqual(saved, { owned: ['bed.quilt'], on: { bed: 'quilt' } });
});

test('钱不够置办不了；不在小屋里换不了', () => {
  const { g, at } = inCottage(10);
  assert.ok(refused(g, 'decor.buy', { slot: 'bed', style: 'canopy', at }));
  must(g, 'travel.to', { to: 'yard' });
  assert.match(
    refused(g, 'decor.buy', { slot: 'sill', style: 'jar', at: { x: 8, y: 11 } }),
    /小屋/,
  );
});

test('每处四样都有图，价钱在 20 到 150 文之间，原样不要钱', () => {
  for (const [slot, d] of Object.entries(DECOR)) {
    const styles = Object.entries(d.styles);
    assert.equal(styles.length, 4, slot);
    for (const [style, s] of styles) {
      assert.ok(FURNITURE_SKETCHES[`${slot}_${style}`], `${slot}_${style} 有字符画`);
      if (style === 'default') assert.equal(s.price, 0);
      else assert.ok(s.price >= 20 && s.price <= 150, `${slot}.${style} 价钱`);
    }
  }
});

test('摆设贴的物件，画那边和规则那边说的是同一个', () => {
  for (const [slot, d] of Object.entries(DECOR))
    assert.equal(DECOR_OBJECT_OF[slot], d.object, slot);
});
