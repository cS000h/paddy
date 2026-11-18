import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../../src/port/game.js';
import { MAPS, walkable } from '../../src/content/maps/index.js';
import { newGame, must, refused, wait } from '../helpers.js';
function travel(g, to) {
  const map = MAPS[g.ask('hero').map],
    row = map.objects.find(o => o[3]?.to === to);
  assert.ok(row, `${map.id}没有去${to}的出口`);
  const [, x, y] = row;
  const [dx, dy] = [
    [0, 1],
    [0, -1],
    [1, 0],
    [-1, 0],
  ].find(([dx, dy]) => walkable(map, x + dx, y + dy));
  must(g, 'travel', { x, y, at: { x: x + dx, y: y + dy, dir: 'up' } });
  assert.equal(g.ask('hero').map, to);
}
test('小屋能进出，室内做饭存取睡觉；存档留在屋里，出门行囊不丢', () => {
  const g = newGame();
  assert.match(refused(g, 'travel', { x: 8, y: 9, at: { x: 20, y: 15 } }), /门边/);
  travel(g, 'cottage');
  must(g, 'pack.put', { item: 'rice', at: { x: 12, y: 7 } });
  must(g, 'cook', { items: ['rice'], method: 'stew', at: { x: 15, y: 8 } });
  must(g, 'sleep');
  const loaded = createGame({ saved: JSON.parse(JSON.stringify(g.save())), debug: true });
  assert.equal(loaded.ask('hero').map, 'cottage');
  assert.equal(loaded.ask('kitchen').dishes.length, 1);
  travel(loaded, 'yard');
  assert.equal(loaded.ask('kitchen').dishes.length, 1);
});
test('全部村路能往返，采集点在新地图可用，居民逐时段各有去处', () => {
  const g = newGame();
  travel(g, 'creek');
  must(g, 'gather', { id: 'bamboo', at: { x: 8, y: 9 } });
  travel(g, 'hill');
  assert.equal(g.ask('residents').find(p => p.id === 'yun').map, 'hill');
  travel(g, 'creek');
  travel(g, 'river');
  assert.equal(g.ask('residents').find(p => p.id === 'zhou').map, 'river');
  travel(g, 'tea');
  travel(g, 'market');
  travel(g, 'yard');
  for (let day = 0; day < 16; day++) {
    for (let slot = 0; slot < 4; slot++) {
      for (const p of g.ask('residents'))
        if (p.visible) assert.ok(walkable(MAPS[p.map], p.x, p.y), `${p.id}的落脚处`);
      wait(g, 180);
    }
    must(g, 'sleep');
  }
});
test('柜台当面买卖、钱货一起结算，库存不能靠重进或读档刷新，傍晚鲜货降价', () => {
  const g = newGame();
  assert.match(refused(g, 'market.buy', { shop: 'market', item: 'rice' }), /柜台/);
  travel(g, 'market');
  const at = { x: 14, y: 11 },
    shop = 'market';
  must(g, 'market.visit', { shop, at });
  const rice = g.ask('market').wares.find(i => i.item === 'rice');
  const money = g.ask('home').coins;
  must(g, 'market.buy', { shop, item: 'rice', at });
  assert.equal(g.ask('home').coins, money - rice.price);
  assert.equal(g.ask('market').wares.find(i => i.item === 'rice').left, rice.left - 1);
  must(g, 'market.visit', { shop, at });
  const loaded = createGame({ saved: JSON.parse(JSON.stringify(g.save())), debug: true });
  assert.deepEqual(loaded.ask('market'), g.ask('market'));
  const fresh = g.ask('market').wares.find(i => i.item === 'tofu');
  wait(g, 540);
  assert.equal(g.ask('market').wares.find(i => i.item === 'tofu').price, fresh.price - 1);
  must(g, 'market.sell', { shop, item: 'rice', at });
  const before = JSON.stringify(g.save());
  assert.match(refused(g, 'market.sell', { shop, item: 'lambLeg', at }), /羊腿/);
  assert.equal(JSON.stringify(g.save()), before);
});
test('茶摊喝茶补水，听闲话每天一次；集日有肉摊，下棋长人情', () => {
  const g = newGame();
  travel(g, 'tea');
  const at = { x: 17, y: 11 };
  const coins = g.ask('home').coins;
  must(g, 'tea.do', { kind: 'drink', at });
  assert.equal(g.ask('body').thirst, 100);
  assert.equal(g.ask('home').coins, coins - 1);
  must(g, 'tea.do', { kind: 'listen', at });
  assert.match(refused(g, 'tea.do', { kind: 'listen', at }), /做过/);
  wait(g, 360);
  const before = g.ask('bonds').find(p => p.id === 'shi').known;
  must(g, 'tea.do', { kind: 'chess', at });
  assert.ok(g.ask('bonds').find(p => p.id === 'shi').known > before);
  for (let n = 1; n < 5; n++) must(g, 'sleep');
  assert.ok(g.ask('market', 'tea').fair);
  assert.ok(g.ask('market', 'tea').wares.some(i => i.item === 'wholeChicken'));
});

test('照着全村地图走过去：沿路一段段走，每段花十分钟；走不到、没这地方、就在这儿都拒绝', async () => {
  const { routeTo, roads } = await import('../../src/content/maps/index.js');
  const { ATLAS } = await import('../../src/content/maps/atlas.js');
  const g = newGame();
  const start = g.ask('clock').minute;
  // 小院到渡口：要经过竹径或茶摊，两段路
  assert.equal(routeTo('yard', 'river').length, 2);
  must(g, 'travel.to', { to: 'river' });
  const hero = g.ask('hero');
  assert.equal(hero.map, 'river');
  assert.ok(walkable(MAPS.river, hero.x, hero.y), '到了站在能站的地方');
  assert.equal(g.ask('clock').minute, start + 20);
  assert.match(refused(g, 'travel.to', { to: 'river' }), /就在这儿/);
  assert.match(refused(g, 'travel.to', { to: 'moon' }), /没有这个地方/);
  // 每张地图都在全村地图上，彼此都走得到；路是对称的
  for (const a of Object.keys(MAPS)) {
    assert.ok(ATLAS[a], `${a} 没画在全村地图上`);
    for (const b of Object.keys(MAPS)) if (a !== b) assert.ok(routeTo(a, b), `${a} 走不到 ${b}`);
  }
  assert.ok(roads().length >= 7);
  // 存档读回来还在渡口，接着走回小院
  const back = createGame({ saved: JSON.parse(JSON.stringify(g.save())), debug: true });
  must(back, 'travel.to', { to: 'yard' });
  assert.equal(back.ask('hero').map, 'yard');
});
