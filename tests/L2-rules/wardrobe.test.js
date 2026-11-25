// 衣装和发式（sim/plugins/wardrobe.js）：开局只有几样，衣镜只换得上有的；
// 别的去集上布摊买（平日常备、换季添新、赶集才有城里成衣），或者到野外做活时碰上。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../../src/port/game.js';
import { createSim, PLUGINS } from '../../src/sim/index.js';
import { newGame, must, refused, fishOnce } from '../helpers.js';

const MIRROR = { x: 8, y: 5, dir: 'up' };
const STALL = { x: 19, y: 11, dir: 'up' };
const have = (g, kind) =>
  g
    .ask('wardrobe')
    [kind].filter(p => p.owned)
    .map(p => p.id)
    .sort();

test('开局衣箱里只有几样；衣镜换得上有的，没有的说清楚缺什么', () => {
  const g = newGame();
  assert.deepEqual(have(g, 'coat'), ['field', 'plain']);
  assert.deepEqual(have(g, 'hair'), ['loose', 'plain', 'short', 'tail']);
  must(g, 'travel.to', { to: 'cottage' });
  const winter = { coat: 'winter', hair: 'plain', at: MIRROR };
  assert.match(refused(g, 'wardrobe.wear', winter), /衣箱里还没有柿红夹袄/);
  const braid = { coat: 'plain', hair: 'braid', at: MIRROR };
  assert.match(refused(g, 'wardrobe.wear', braid), /还不会梳垂辫/);
  assert.ok(
    must(g, 'wardrobe.wear', { coat: 'field', hair: 'tail', at: MIRROR }).includes('wardrobe.worn'),
  );
  assert.equal(g.ask('hero').look, 'hero/field/tail/2');
  assert.deepEqual(g.ask('wardrobe').worn, { coat: 'field', hair: 'tail' });
});

test('集上布摊：平日常备和当季的，赶集才有城里成衣；当面付钱，钱不够不卖，有了的不再卖', () => {
  const g = newGame();
  const pony = { kind: 'hair', id: 'pony', at: STALL };
  assert.match(refused(g, 'wardrobe.buy', pony), /布摊跟前/);
  must(g, 'travel.to', { to: 'market' });
  const stall = g.ask('wardrobe', STALL).stall;
  const ids = stall.wares.map(w => w.id);
  assert.equal(stall.near, true);
  assert.equal(stall.fair, false);
  assert.ok(ids.includes('lotus') && !ids.includes('harvest'), '春天摆荷粉衣裙，不摆秋天的暖袄');
  assert.ok(!ids.includes('hoodie'), '平日不摆城里来的成衣');
  assert.ok(!ids.includes('rain') && !ids.includes('field'), '野外碰上的、开局就有的都不在摊上');
  assert.match(refused(g, 'wardrobe.buy', { kind: 'coat', id: 'cook', at: STALL }), /钱不够/);
  const coins = g.ask('home').coins;
  assert.ok(must(g, 'wardrobe.buy', pony).includes('wardrobe.got'));
  assert.equal(g.ask('home').coins, coins - 12);
  assert.ok(have(g, 'hair').includes('pony'));
  assert.match(refused(g, 'wardrobe.buy', pony), /已经会梳了/);
  assert.match(refused(g, 'wardrobe.buy', { kind: 'coat', id: 'hoodie', at: STALL }), /今天没有/);
  // 第五天赶集：城里来的成衣摆出来了
  while (g.ask('clock').day % 5) must(g, 'sleep');
  if (g.ask('hero').map !== 'market') must(g, 'travel.to', { to: 'market' });
  const fair = g.ask('wardrobe', STALL).stall;
  assert.equal(fair.fair, true);
  assert.ok(fair.wares.some(w => w.id === 'hoodie' && w.price === 128));
});

test('野外做活时碰上：钓鱼碰上一件旧蓑衣，那段话写在事实里，只碰上一回，读档后还在', () => {
  const g = newGame(5);
  const spot = { x: 37, y: 20 };
  let found = null;
  let after = 0;
  for (let day = 0; day < 12; day++) {
    for (let i = 0; i < 3; i++) {
      const out = fishOnce(g, spot);
      assert.equal(out.ok, true);
      const got = out.facts.filter(f => f.type === 'wardrobe.got');
      if (found) after += got.length;
      found ||= got[0];
    }
    // 钓上来的鱼收进橱柜，行囊满了下不了竿
    for (const it of g.ask('pack').items.filter(i => i.id.startsWith('fish.')))
      must(g, 'pack.take', { item: it.id, n: 'all', at: { x: 8, y: 11, dir: 'down' } });
    must(g, 'sleep');
  }
  assert.ok(found, '钓了这么多回总该碰上一回');
  assert.deepEqual(
    { id: found.data.id, kind: found.data.kind, how: found.data.how },
    { id: 'rain', kind: 'coat', how: 'find' },
  );
  assert.match(found.data.line, /蓑衣/);
  assert.equal(after, 0, '碰上过的不会再碰上第二回');
  const back = createGame({ saved: JSON.parse(JSON.stringify(g.save())) });
  assert.ok(have(back, 'coat').includes('rain'));
});

// 这一条直接搭规则层：端口不让换插件，而要验的正是“少装一个插件”。
test('衣装是单独的插件：不装它，照样开局、能问能做，人物就是底子的样子', () => {
  const plugins = PLUGINS.filter(p => p.id !== 'sim.wardrobe');
  assert.equal(plugins.length, PLUGINS.length - 1);
  const sim = createSim({ debug: true, plugins });
  const world = () => sim.dispatcher.snapshot().world;
  assert.equal('wardrobe' in world(), false);
  assert.equal(sim.queries.run('hero', world()).look, 'hero');
  const revision = sim.dispatcher.snapshot().revision;
  assert.equal(sim.dispatcher.dispatch({ type: 'sleep', revision }).ok, true);
  assert.equal(sim.queries.run('hero', world()).look, 'hero');
});
