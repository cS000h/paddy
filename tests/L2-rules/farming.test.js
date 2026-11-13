// L2 规则：种田。一律通过端口发命令。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, must, refused, plant, growOne, plotAt, FIELD } from '../helpers.js';

test('锄地、播种、浇水，各扣各的体力和物料', () => {
  const g = newGame();
  assert.deepEqual(must(g, 'farm.till', FIELD), ['energy.spent', 'plot.tilled', 'guide.done']);
  must(g, 'farm.sow', FIELD);
  must(g, 'farm.water', FIELD);
  assert.equal(g.ask('hero').energy, 100 - 4 - 1 - 2);
  const home = g.ask('home');
  assert.equal(home.items.find(i => i.id === 'seed.qingcai').n, 11);
  assert.equal(home.can, 9);
  assert.deepEqual(plotAt(g, FIELD.x, FIELD.y), {
    x: 6,
    y: 19,
    wet: true,
    crop: 'qingcai',
    stage: 0,
    ripe: false,
  });
});

test('顺序不对、够不着、不是菜地，都会被拒绝并说明原因', () => {
  const g = newGame();
  assert.equal(refused(g, 'farm.sow', FIELD), '先用锄头把地锄松');
  assert.equal(refused(g, 'farm.till', { ...FIELD, x: 9 }), '够不着，走近一点');
  assert.equal(refused(g, 'farm.till', { x: 6, y: 17, at: FIELD.at }), '这儿不是菜地');
  must(g, 'farm.till', FIELD);
  assert.equal(refused(g, 'farm.till', FIELD), '这一格已经锄过了');
  assert.equal(refused(g, 'farm.harvest', FIELD), '这一格还没种东西');
  must(g, 'farm.sow', FIELD);
  assert.equal(refused(g, 'farm.sow', FIELD), '这一格已经种上了');
  must(g, 'farm.water', FIELD);
  assert.equal(refused(g, 'farm.water', FIELD), '今天浇过了，土还润着');
  assert.equal(refused(g, 'farm.harvest', FIELD), '青菜还没长成');
});

test('画面问“为什么不行”和命令拒绝的原因是同一句话', () => {
  const g = newGame();
  assert.equal(
    g.ask('farm.why', 'seed', FIELD.x, FIELD.y, FIELD.at),
    refused(g, 'farm.sow', FIELD),
  );
  assert.equal(g.ask('farm.why', 'hoe', FIELD.x, FIELD.y, FIELD.at), null);
});

test('浇过水的作物每天长一截，三个早晨后成熟；没浇水就不长', () => {
  const g = newGame();
  plant(g);
  assert.ok(must(g, 'sleep').includes('crop.grew'));
  assert.equal(plotAt(g, 6, 19).stage, 1);
  assert.equal(plotAt(g, 6, 19).wet, false, '过了一夜土就干了');
  assert.ok(!must(g, 'sleep').includes('crop.grew'), '没浇水不长');
  must(g, 'farm.water', FIELD);
  must(g, 'sleep');
  must(g, 'farm.water', FIELD);
  must(g, 'sleep');
  assert.equal(plotAt(g, 6, 19).ripe, true);
});

test('采收：菜进了家当，这一格还是锄过的地', () => {
  const g = newGame();
  growOne(g);
  assert.ok(must(g, 'farm.harvest', FIELD).includes('crop.harvested'));
  assert.equal(g.ask('home').items.find(i => i.id === 'veg.qingcai').n, 1);
  assert.deepEqual(plotAt(g, 6, 19), {
    x: 6,
    y: 19,
    wet: false,
    crop: null,
    stage: -1,
    ripe: false,
  });
});

test('水壶会空，挨着水缸、水井、水沟或溪水才能打满', () => {
  const g = newGame();
  for (let i = 0; i < 10; i++) {
    const spot = { x: 6 + i, y: 19, at: { x: 6 + i, y: 18, dir: 'down' } };
    must(g, 'farm.till', spot);
    must(g, 'farm.water', spot);
  }
  const eleventh = { x: 16, y: 19, at: { x: 16, y: 18, dir: 'down' } };
  must(g, 'farm.till', eleventh);
  assert.equal(refused(g, 'farm.water', eleventh), '水壶空了，去水缸、水井或溪边打水');
  assert.equal(refused(g, 'farm.refill', { x: 16, y: 18, at: eleventh.at }), '这儿没有水');
  must(g, 'farm.refill', { x: 18, y: 18, at: { x: 17, y: 18, dir: 'right' } }); // 水井
  assert.equal(g.ask('home').can, 10);
  assert.equal(
    refused(g, 'farm.refill', { x: 18, y: 18, at: { x: 17, y: 18, dir: 'right' } }),
    '水壶已经满了',
  );
});

test('体力用完就干不动了，睡一觉恢复；睡得太晚回不满', () => {
  const g = newGame();
  let n = 0;
  for (let y = 19; y <= 25 && n < 25; y++)
    for (let x = 6; x <= 17 && n < 25; x++, n++)
      must(g, 'farm.till', { x, y, at: { x, y, dir: 'down' } });
  assert.equal(g.ask('hero').energy, 0);
  assert.equal(
    refused(g, 'farm.till', { x: 17, y: 25, at: { x: 17, y: 25, dir: 'down' } }),
    '太累了，回屋歇一歇吧',
  );
  must(g, 'sleep');
  assert.equal(g.ask('hero').energy, 100);
  for (let i = 0; i < 9; i++) must(g, 'clock.advance', { minutes: 120 });
  assert.equal(g.ask('clock').late, true);
  must(g, 'sleep');
  assert.equal(g.ask('hero').energy, 80);
});
