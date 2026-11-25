// L2-18 地上冒野货：每天清早各张野地图冒几样当季的，落在能站人的地方、第二天换一批；同一局同一天落点一样；
// 走到跟前捡，不花体力；远了、没东西、行囊满了照实拒绝；捡起来记进图鉴。规则一律通过端口问和做。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAPS, walkable, farmable } from '../../src/content/maps/index.js';
import { GROUND, GROUND_FINDS } from '../../src/content/ground.js';
import { dateOf } from '../../src/content/calendar.js';
import { newGame, must, refused, HOME } from '../helpers.js';

const all = g => Object.keys(MAPS).flatMap(m => g.ask('ground', m).map(x => ({ ...x, map: m })));

test('清早冒出来：当季的、落在能站人的地方，第二天换一批；同一种子同一天一样', () => {
  const g = newGame(5);
  assert.equal(all(g).length, 0, '头一天还没冒');
  must(g, 'sleep');
  const today = all(g);
  assert.ok(today.length >= 3 && today.length <= GROUND.max, `冒了 ${today.length} 样`);
  const season = dateOf(g.ask('clock').day).season;
  for (const x of today) {
    const f = GROUND_FINDS.find(f => f.item === x.item);
    assert.ok(f.seasons.includes(season), x.item + ' 不当季');
    assert.ok(walkable(MAPS[x.map], x.x, x.y) && !farmable(MAPS[x.map], x.x, x.y));
  }
  assert.equal(new Set(today.map(x => `${x.map}:${x.x},${x.y}`)).size, today.length);
  const twin = newGame(5);
  must(twin, 'sleep');
  assert.deepEqual(all(twin), today);
  must(g, 'sleep');
  assert.notDeepEqual(all(g), today);
});

test('捡：站到旁边就捡得起来，不花体力；远了、没东西照实拒绝；捡过就没了，记进图鉴', () => {
  const g = newGame(5);
  must(g, 'sleep');
  const yard = g.ask('ground', 'yard');
  let x = yard[0];
  if (!x) {
    // 院里没冒就换一天
    for (let i = 0; i < 6 && !g.ask('ground', 'yard').length; i++) must(g, 'sleep');
    x = g.ask('ground', 'yard')[0];
  }
  assert.ok(x, '院里该有一天冒出东西');
  assert.match(refused(g, 'ground.pick', { at: HOME, x: x.x + 9, y: x.y }), /没有东西/);
  if (Math.abs(HOME.x - x.x) > 1 || Math.abs(HOME.y - x.y) > 1)
    assert.match(refused(g, 'ground.pick', { at: HOME, x: x.x, y: x.y }), /跟前/);
  const energy = g.ask('hero').energy;
  const out = g.dispatch('ground.pick', { at: { x: x.x, y: x.y, dir: 'down' }, x: x.x, y: x.y });
  assert.equal(out.ok, true, out.reason);
  const f = out.facts.find(f => f.type === 'ground.picked');
  assert.ok(f.data.line);
  assert.equal(g.ask('hero').energy, energy);
  assert.ok(!g.ask('ground', 'yard').some(y => y.x === x.x && y.y === x.y));
  const plain = f.data.item.replace(/\.fine$/, '');
  const book = g
    .ask('catalog')
    .flatMap(p => p.entries)
    .find(e => e.item === plain);
  if (book) assert.ok(book.found);
});
