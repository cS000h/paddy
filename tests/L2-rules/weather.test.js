import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, must, refused, growOne, FIELD, HOME, wait, stocked, STOVE } from '../helpers.js';
import { CROPS } from '../../src/content/items.js';

test('看天每天一次：提高预报把握、增长看天本事，不能重复刷经验', () => {
  const g = newGame();
  const old = g.ask('weather').forecast.acc;
  must(g, 'sky.look', { at: HOME });
  assert.ok(g.ask('weather').forecast.acc >= old + 20);
  assert.ok(g.ask('growth').skills.find(s => s.id === 'sky').xp > 0);
  assert.equal(refused(g, 'sky.look'), '今天仔细看过天了');
  must(g, 'sleep');
  assert.equal(g.ask('weather').looked, false);
  must(g, 'sky.look');
});

test('七种作物按时令下种，十四天换季', () => {
  for (const c of Object.values(CROPS)) {
    const g = stocked(newGame(7), { [c.seed]: 1 });
    must(g, 'pack.put', { item: c.seed, at: HOME });
    must(g, 'sleep');
    must(g, 'farm.till', FIELD);
    if (!c.seasons.includes(0))
      assert.match(refused(g, 'farm.sow', { ...FIELD, seed: c.seed }), /这个时节/);
    while (!c.seasons.includes(g.ask('clock').season)) must(g, 'sleep');
    must(g, 'farm.sow', { ...FIELD, seed: c.seed });
    assert.equal(g.ask('farm.detail', 6, 19).crop, c.id);
  }
  const g = newGame();
  for (let i = 1; i < 15; i++) must(g, 'sleep');
  assert.deepEqual([g.ask('clock').season, g.ask('clock').dayOfSeason], [1, 1]);
});

test('浇地与排水各有用处；施肥取灶灰，重复操作不扣资源', () => {
  const g = newGame();
  growOne(g);
  must(g, 'farm.care', { ...FIELD, kind: 'drain' });
  assert.equal(g.ask('farm.detail', 6, 19).drained, true);
  const saved = JSON.stringify(g.save());
  assert.equal(refused(g, 'farm.care', { ...FIELD, kind: 'drain' }), '已经挖过沟了');
  assert.equal(JSON.stringify(g.save()), saved);
  assert.equal(refused(g, 'farm.care', { ...FIELD, kind: 'weed' }), '没有杂草');
  assert.equal(refused(g, 'farm.care', { ...FIELD, kind: 'bugs' }), '没有菜虫');
  assert.match(refused(g, 'farm.care', { ...FIELD, kind: 'manure' }), /灰/);
  for (let i = 0; i < 3; i++)
    must(g, 'cook', {
      items: ['rice'],
      method: 'stew',
      at: { x: STOVE.x + 1, y: STOVE.y, dir: 'up' },
    });
  must(g, 'farm.care', { ...FIELD, kind: 'manure' });
  assert.equal(g.ask('farm.detail', 6, 19).fert, 8);
  assert.equal(refused(g, 'farm.care', { ...FIELD, kind: 'manure' }), '今天施过肥了');
});

test('天气预报与体感逐日变化，冬季的冷会进花体力的解释', () => {
  const g = newGame(3);
  let rain = false,
    shifted = false;
  g.on('weather.changed', f => {
    if (f.data.cause === 'shift') shifted = true;
  });
  for (let day = 1; day < 44; day++) {
    if (g.ask('weather').tags.includes('wet')) rain = true;
    wait(g, 720);
    must(g, 'sleep');
  }
  assert.ok(rain);
  assert.ok(shifted);
  assert.ok(g.ask('comfort').value < 15);
  assert.ok(g.ask('action.cost', 'hoe').parts.some(p => p.id === 'body.comfort'));
});
